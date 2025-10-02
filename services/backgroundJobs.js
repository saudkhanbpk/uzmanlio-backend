import cron from 'node-cron';
import calendarSyncService from './calendarSyncService.js';
import User from '../models/expertInformation.js';

class BackgroundJobService {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  // Initialize all background jobs
  init() {
    if (this.isInitialized) {
      console.log('Background jobs already initialized');
      return;
    }

    console.log('Initializing background jobs...');

    // Token refresh job - runs every hour
    this.scheduleTokenRefresh();

    // Subscription renewal job - runs every 6 hours
    this.scheduleSubscriptionRenewal();

    // Daily sync health check - runs daily at 2 AM
    this.scheduleSyncHealthCheck();

    // Weekly full sync - runs every Sunday at 3 AM
    this.scheduleWeeklyFullSync();

    this.isInitialized = true;
    console.log('Background jobs initialized successfully');
  }

  // Schedule token refresh job
  scheduleTokenRefresh() {
    const job = cron.schedule('0 * * * *', async () => {
      console.log('Running token refresh job...');
      try {
        await this.refreshExpiringTokens();
        console.log('Token refresh job completed successfully');
      } catch (error) {
        console.error('Token refresh job failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('tokenRefresh', job);
    job.start();
    console.log('Token refresh job scheduled (every hour)');
  }

  // Schedule subscription renewal job
  scheduleSubscriptionRenewal() {
    const job = cron.schedule('0 */6 * * *', async () => {
      console.log('Running subscription renewal job...');
      try {
        await this.renewExpiringSubscriptions();
        console.log('Subscription renewal job completed successfully');
      } catch (error) {
        console.error('Subscription renewal job failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('subscriptionRenewal', job);
    job.start();
    console.log('Subscription renewal job scheduled (every 6 hours)');
  }

  // Schedule sync health check
  scheduleSyncHealthCheck() {
    const job = cron.schedule('0 2 * * *', async () => {
      console.log('Running sync health check job...');
      try {
        await this.performSyncHealthCheck();
        console.log('Sync health check job completed successfully');
      } catch (error) {
        console.error('Sync health check job failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('syncHealthCheck', job);
    job.start();
    console.log('Sync health check job scheduled (daily at 2 AM UTC)');
  }

  // Schedule weekly full sync
  scheduleWeeklyFullSync() {
    const job = cron.schedule('0 3 * * 0', async () => {
      console.log('Running weekly full sync job...');
      try {
        await this.performWeeklyFullSync();
        console.log('Weekly full sync job completed successfully');
      } catch (error) {
        console.error('Weekly full sync job failed:', error);
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.jobs.set('weeklyFullSync', job);
    job.start();
    console.log('Weekly full sync job scheduled (Sundays at 3 AM UTC)');
  }

  // Refresh expiring tokens
  async refreshExpiringTokens() {
    try {
      // Find users with tokens expiring in the next 2 hours
      const expiryThreshold = new Date(Date.now() + 2 * 60 * 60 * 1000);
      
      const users = await User.find({
        'calendarProviders.tokenExpiry': { $lt: expiryThreshold },
        'calendarProviders.isActive': true
      });

      console.log(`Found ${users.length} users with expiring tokens`);

      let refreshedCount = 0;
      let failedCount = 0;

      for (const user of users) {
        for (const provider of user.calendarProviders) {
          if (provider.isActive && provider.tokenExpiry < expiryThreshold) {
            try {
              await calendarSyncService.refreshProviderToken(user, provider);
              refreshedCount++;
              console.log(`Refreshed token for ${provider.provider} - ${provider.email}`);
            } catch (error) {
              failedCount++;
              console.error(`Failed to refresh token for ${provider.provider} - ${provider.email}:`, error.message);
            }
          }
        }
      }

      console.log(`Token refresh summary: ${refreshedCount} refreshed, ${failedCount} failed`);
      return { refreshedCount, failedCount };
    } catch (error) {
      console.error('Error in refreshExpiringTokens:', error);
      throw error;
    }
  }

  // Renew expiring subscriptions
  async renewExpiringSubscriptions() {
    try {
      const results = await calendarSyncService.renewExpiringSubscriptions();
      
      const renewedCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      console.log(`Subscription renewal summary: ${renewedCount} renewed, ${failedCount} failed`);
      return { renewedCount, failedCount, results };
    } catch (error) {
      console.error('Error in renewExpiringSubscriptions:', error);
      throw error;
    }
  }

  // Perform sync health check
  async performSyncHealthCheck() {
    try {
      // Find users with active calendar providers
      const users = await User.find({
        'calendarProviders.isActive': true
      });

      console.log(`Checking sync health for ${users.length} users`);

      let healthyUsers = 0;
      let unhealthyUsers = 0;
      const issues = [];

      for (const user of users) {
        const activeProviders = user.calendarProviders.filter(cp => cp.isActive);
        const totalAppointments = user.appointments.length;
        
        let userHealthy = true;

        for (const provider of activeProviders) {
          const mappedAppointments = user.appointmentMappings.filter(
            mapping => mapping.provider === provider.provider
          ).length;

          // Check if sync is significantly behind
          const syncAge = Date.now() - provider.lastSync.getTime();
          const maxSyncAge = 7 * 24 * 60 * 60 * 1000; // 7 days

          if (mappedAppointments < totalAppointments * 0.8 || syncAge > maxSyncAge) {
            userHealthy = false;
            issues.push({
              userId: user._id,
              provider: provider.provider,
              email: provider.email,
              issue: mappedAppointments < totalAppointments * 0.8 ? 'incomplete_sync' : 'stale_sync',
              mappedAppointments,
              totalAppointments,
              lastSync: provider.lastSync
            });
          }
        }

        if (userHealthy) {
          healthyUsers++;
        } else {
          unhealthyUsers++;
        }
      }

      console.log(`Sync health check summary: ${healthyUsers} healthy, ${unhealthyUsers} unhealthy users`);
      
      if (issues.length > 0) {
        console.log('Sync issues found:', issues);
        // In production, you might want to send alerts or notifications here
      }

      return { healthyUsers, unhealthyUsers, issues };
    } catch (error) {
      console.error('Error in performSyncHealthCheck:', error);
      throw error;
    }
  }

  // Perform weekly full sync
  async performWeeklyFullSync() {
    try {
      // Get all users with active calendar providers
      const users = await User.find({
        'calendarProviders.isActive': true
      });

      console.log(`Starting weekly full sync for ${users.length} users`);

      const userIds = users.map(user => user._id.toString());
      const results = await calendarSyncService.batchSyncUsers(userIds);

      const successfulUsers = results.filter(r => r.success).length;
      const failedUsers = results.filter(r => !r.success).length;

      console.log(`Weekly full sync summary: ${successfulUsers} successful, ${failedUsers} failed`);
      return { successfulUsers, failedUsers, results };
    } catch (error) {
      console.error('Error in performWeeklyFullSync:', error);
      throw error;
    }
  }

  // Stop all jobs
  stopAllJobs() {
    console.log('Stopping all background jobs...');
    
    for (const [jobName, job] of this.jobs) {
      job.stop();
      console.log(`Stopped job: ${jobName}`);
    }

    this.jobs.clear();
    this.isInitialized = false;
    console.log('All background jobs stopped');
  }

  // Get job status
  getJobStatus() {
    const status = {};
    
    for (const [jobName, job] of this.jobs) {
      status[jobName] = {
        running: job.running,
        scheduled: job.scheduled
      };
    }

    return {
      initialized: this.isInitialized,
      totalJobs: this.jobs.size,
      jobs: status
    };
  }

  // Manual job triggers (for testing/admin purposes)
  async runJobManually(jobName) {
    switch (jobName) {
      case 'tokenRefresh':
        return await this.refreshExpiringTokens();
      case 'subscriptionRenewal':
        return await this.renewExpiringSubscriptions();
      case 'syncHealthCheck':
        return await this.performSyncHealthCheck();
      case 'weeklyFullSync':
        return await this.performWeeklyFullSync();
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

// Create singleton instance
const backgroundJobService = new BackgroundJobService();

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('Received SIGINT, stopping background jobs...');
  backgroundJobService.stopAllJobs();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, stopping background jobs...');
  backgroundJobService.stopAllJobs();
  process.exit(0);
});

export default backgroundJobService;
