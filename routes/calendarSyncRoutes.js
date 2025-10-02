import express from 'express';
import calendarSyncService from '../services/calendarSyncService.js';
import User from '../models/expertInformation.js';

const router = express.Router();

// Helper function to find user by ID
const findUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

// ==================== APPOINTMENT SYNC ROUTES ====================

// Sync specific appointment to all connected calendars
router.post('/:userId/appointments/:appointmentId/sync', async (req, res) => {
  try {
    const { userId, appointmentId } = req.params;
    const user = await findUserById(userId);

    const appointment = user.appointments.find(apt => apt.id === appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const activeProviders = user.calendarProviders.filter(cp => cp.isActive);
    if (activeProviders.length === 0) {
      return res.status(400).json({ error: 'No active calendar providers found' });
    }

    const results = [];
    for (const provider of activeProviders) {
      try {
        const syncResult = await calendarSyncService.syncAppointmentToProvider(
          userId, 
          appointment, 
          { id: provider._id }
        );
        
        results.push({
          provider: provider.provider,
          email: provider.email,
          success: true,
          eventId: syncResult.id
        });
      } catch (error) {
        results.push({
          provider: provider.provider,
          email: provider.email,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Appointment sync completed',
      appointmentId,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync all appointments to all connected calendars
router.post('/:userId/appointments/sync-all', async (req, res) => {
  try {
    const { userId } = req.params;
    const results = await calendarSyncService.syncAllAppointments(userId);

    res.json({
      message: 'All appointments sync completed',
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete appointment from external calendars
router.delete('/:userId/appointments/:appointmentId/sync', async (req, res) => {
  try {
    const { userId, appointmentId } = req.params;
    const user = await findUserById(userId);

    const activeProviders = user.calendarProviders.filter(cp => cp.isActive);
    const results = [];

    for (const provider of activeProviders) {
      try {
        await calendarSyncService.deleteAppointmentFromProvider(
          userId, 
          appointmentId, 
          { id: provider._id }
        );
        
        results.push({
          provider: provider.provider,
          email: provider.email,
          success: true
        });
      } catch (error) {
        results.push({
          provider: provider.provider,
          email: provider.email,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Appointment deletion sync completed',
      appointmentId,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PROVIDER SYNC ROUTES ====================

// Sync appointments to specific provider
router.post('/:userId/providers/:providerId/sync', async (req, res) => {
  try {
    const { userId, providerId } = req.params;
    const user = await findUserById(userId);

    const provider = user.calendarProviders.find(
      cp => cp._id.toString() === providerId
    );

    if (!provider) {
      return res.status(404).json({ error: 'Calendar provider not found' });
    }

    if (!provider.isActive) {
      return res.status(400).json({ error: 'Calendar provider is not active' });
    }

    const results = [];
    for (const appointment of user.appointments) {
      try {
        const syncResult = await calendarSyncService.syncAppointmentToProvider(
          userId, 
          appointment, 
          { id: provider._id }
        );
        
        results.push({
          appointmentId: appointment.id,
          appointmentTitle: appointment.title,
          success: true,
          eventId: syncResult.id
        });
      } catch (error) {
        results.push({
          appointmentId: appointment.id,
          appointmentTitle: appointment.title,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      message: `Sync to ${provider.provider} completed`,
      provider: {
        provider: provider.provider,
        email: provider.email
      },
      syncedCount: results.filter(r => r.success).length,
      failedCount: results.filter(r => !r.success).length,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sync status for user
router.get('/:userId/sync-status', async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    const providers = user.calendarProviders.map(provider => ({
      id: provider._id,
      provider: provider.provider,
      email: provider.email,
      isActive: provider.isActive,
      lastSync: provider.lastSync,
      tokenExpiry: provider.tokenExpiry,
      subscriptionExpiry: provider.subscriptionExpiry,
      mappedAppointments: user.appointmentMappings.filter(
        mapping => mapping.provider === provider.provider
      ).length
    }));

    const totalAppointments = user.appointments.length;
    const totalMappings = user.appointmentMappings.length;

    res.json({
      totalAppointments,
      totalMappings,
      providers,
      syncHealth: {
        fullySync: providers.every(p => p.isActive && p.mappedAppointments === totalAppointments),
        partialSync: providers.some(p => p.isActive && p.mappedAppointments > 0),
        noSync: providers.every(p => !p.isActive || p.mappedAppointments === 0)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== BATCH OPERATIONS ====================

// Batch sync multiple users (for background jobs)
router.post('/batch-sync', async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }

    const results = await calendarSyncService.batchSyncUsers(userIds);

    const summary = {
      totalUsers: userIds.length,
      successfulUsers: results.filter(r => r.success).length,
      failedUsers: results.filter(r => !r.success).length,
      results
    };

    res.json({
      message: 'Batch sync completed',
      summary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Renew expiring subscriptions
router.post('/renew-subscriptions', async (req, res) => {
  try {
    const results = await calendarSyncService.renewExpiringSubscriptions();

    const summary = {
      totalRenewals: results.length,
      successfulRenewals: results.filter(r => r.success).length,
      failedRenewals: results.filter(r => !r.success).length,
      results
    };

    res.json({
      message: 'Subscription renewal completed',
      summary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MANUAL SYNC TRIGGERS ====================

// Force refresh tokens for all providers
router.post('/:userId/refresh-tokens', async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const results = [];

    for (const provider of user.calendarProviders) {
      if (provider.isActive) {
        try {
          await calendarSyncService.refreshProviderToken(user, provider);
          results.push({
            provider: provider.provider,
            email: provider.email,
            success: true
          });
        } catch (error) {
          results.push({
            provider: provider.provider,
            email: provider.email,
            success: false,
            error: error.message
          });
        }
      }
    }

    res.json({
      message: 'Token refresh completed',
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
