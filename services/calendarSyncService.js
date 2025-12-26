import { GoogleCalendarService, MicrosoftCalendarService, decryptToken, encryptToken } from './calendarService.js';
import User from '../models/expertInformation.js';
import AppointmentMapping from '../models/appointmentsMapping.js';
import event from '../models/event.js';

export class CalendarSyncService {
  constructor() {
    this.googleService = new GoogleCalendarService();
    this.microsoftService = new MicrosoftCalendarService();
  }

  // Convert internal appointment to calendar event format
  appointmentToEventData(appointment, timeZone = 'UTC') {
    const startDateTime = new Date(`${appointment.date}T${appointment.time}:00`);
    const endDateTime = new Date(startDateTime.getTime() + (appointment.duration * 60000));

    return {
      title: appointment.title,
      description: `Uzmanlio Appointment\nType: ${appointment.serviceType}\nDuration: ${appointment.duration} minutes\nStatus: ${appointment.status}${appointment.notes ? `\n\nNotes: ${appointment.notes}` : ''}`,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      timeZone: timeZone,
      attendees: appointment.clientEmail ? [appointment.clientEmail] : []
    };
  }

  // Sync appointment to external calendar
  async syncAppointmentToProvider(userId, appointment, provider) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");

      // ✅ Use providerId instead of _id/id
      const calendarProvider = user.calendarProviders.find(
        (cp) => cp.providerId === provider.providerId && cp.isActive
      );

      if (!calendarProvider) {
        throw new Error("Calendar provider not found or inactive");
      }

      // Refresh token if expired
      if (new Date() >= calendarProvider.tokenExpiry) {
        await this.refreshProviderToken(user, calendarProvider);
      }

      const eventData = this.appointmentToEventData(appointment);
      let providerEvent;

      // Check if appointment already exists
      let existingMapping = await AppointmentMapping.findOne({
        appointmentId: appointment.id,
        provider: calendarProvider.provider,
        ExpertId: userId
      });

      if (existingMapping) {
        // ✅ Update existing event
        if (calendarProvider.provider === "google") {
          providerEvent = await this.googleService.updateEvent(
            calendarProvider.accessToken,
            calendarProvider.calendarId,
            existingMapping.providerEventId,
            eventData
          );
        } else if (calendarProvider.provider === "microsoft") {
          providerEvent = await this.microsoftService.updateEvent(
            calendarProvider.accessToken,
            calendarProvider.calendarId,
            existingMapping.providerEventId,
            eventData
          );
        }

        existingMapping.lastSynced = new Date();
        await existingMapping.save();
      } else {
        // ✅ Create new event
        if (calendarProvider.provider === "google") {
          providerEvent = await this.googleService.createEvent(
            calendarProvider.accessToken,
            calendarProvider.calendarId,
            eventData
          );
        } else if (calendarProvider.provider === "microsoft") {
          providerEvent = await this.microsoftService.createEvent(
            calendarProvider.accessToken,
            calendarProvider.calendarId,
            eventData
          );
        }

        // Add mapping
        await AppointmentMapping.create({
          ExpertId: userId,
          appointmentId: appointment.id,
          provider: calendarProvider.provider,
          providerEventId: providerEvent.id,
          calendarId: calendarProvider.calendarId || "primary",
          lastSynced: new Date(),
        });
      }

      // ✅ Update last sync
      calendarProvider.lastSync = new Date();
      await user.save();

      return providerEvent;
    } catch (error) {
      console.error(`❌ Failed to sync appointment to ${provider.provider}:`, error);
      throw error;
    }
  }




  //Sync Multiple Events To Google OR Outlook
  async syncMultipleAppointmentsToProvider(userId, appointments, provider) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");

      // check the provider Exists and its status
      const calendarProvider = provider;
      // user.calendarProviders.find(
      //   (cp) => cp.providerId === provider.providerId && cp.isActive
      // );

      if (!calendarProvider) {
        throw new Error("Calendar provider not found or inactive");
      }

      // Refresh token if expired
      if (new Date() >= calendarProvider.tokenExpiry) {
        await this.refreshProviderToken(user, calendarProvider);
      }

      const syncedResults = [];

      // Loop through all appointments
      for (const appointment of appointments) {
        try {
          const eventData = this.appointmentToEventData(appointment);
          let providerEvent;

          // Check if appointment already exists
          let existingMapping = await AppointmentMapping.findOne({
            appointmentId: appointment.id,
            provider: calendarProvider.provider,
            ExpertId: userId
          });

          if (existingMapping) {
            // Update existing event
            if (calendarProvider.provider === "google") {
              providerEvent = await this.googleService.updateEvent(
                calendarProvider.accessToken,
                calendarProvider.calendarId,
                existingMapping.providerEventId,
                eventData
              );
            } else if (calendarProvider.provider === "microsoft") {
              providerEvent = await this.microsoftService.updateEvent(
                calendarProvider.accessToken,
                calendarProvider.calendarId,
                existingMapping.providerEventId,
                eventData
              );
            }

            existingMapping.lastSynced = new Date();
            await existingMapping.save();
          } else {
            // Create new event
            if (calendarProvider.provider === "google") {
              providerEvent = await this.googleService.createEvent(
                calendarProvider.accessToken,
                calendarProvider.calendarId,
                eventData
              );
            } else if (calendarProvider.provider === "microsoft") {
              providerEvent = await this.microsoftService.createEvent(
                calendarProvider.accessToken,
                calendarProvider.calendarId,
                eventData
              );
            }

            // Add new mapping
            await AppointmentMapping.create({
              ExpertId: userId,
              appointmentId: appointment.id,
              provider: calendarProvider.provider,
              providerEventId: providerEvent.id,
              calendarId: calendarProvider.calendarId || "primary",
              lastSynced: new Date(),
            });
          }

          // ✅ Add to results
          syncedResults.push({
            appointmentId: appointment.id,
            providerEvent,
            status: "success",
          });
        } catch (appointmentError) {
          console.error(
            `❌ Failed to sync appointment ${appointment.id} to ${calendarProvider.provider}:`,
            appointmentError
          );
          syncedResults.push({
            appointmentId: appointment.id,
            error: appointmentError.message,
            status: "failed",
          });
        }
      }
      // ✅ Update provider sync time
      calendarProvider.lastSync = new Date();
      await user.save();

      return syncedResults;
    } catch (error) {
      console.error(`❌ Failed to sync appointments to ${provider.provider}:`, error);
      throw error;
    }
  }

  //Update Appointment in External Calendar
  // Update an existing appointment in the external calendar
  async updateAppointmentInProvider(userId, appointment, provider) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");

      // Find the active provider by providerId (not _id)
      const calendarProvider = user.calendarProviders.find(
        (cp) => cp.providerId === provider.providerId && cp.isActive
      );

      if (!calendarProvider) {
        throw new Error("Calendar provider not found or inactive");
      }

      // Refresh token if expired
      if (new Date() >= calendarProvider.tokenExpiry) {
        await this.refreshProviderToken(user, calendarProvider);
      }

      // Find the existing mapping for this appointment
      const mapping = await AppointmentMapping.findOne({
        appointmentId: appointment.id,
        provider: calendarProvider.provider,
        ExpertId: userId
      });

      if (!mapping) {
        throw new Error(
          `No existing mapping found for appointment ${appointment.id} in ${calendarProvider.provider}`
        );
      }

      // Convert local appointment to provider event structure
      const eventData = this.appointmentToEventData(appointment);

      let updatedEvent;
      if (calendarProvider.provider === "google") {
        // ✅ Update Google Calendar event
        updatedEvent = await this.googleService.updateEvent(
          calendarProvider.accessToken,
          calendarProvider.calendarId,
          mapping.providerEventId,
          eventData
        );
      } else if (calendarProvider.provider === "microsoft") {
        // ✅ Update Microsoft Outlook event
        updatedEvent = await this.microsoftService.updateEvent(
          calendarProvider.accessToken,
          calendarProvider.calendarId,
          mapping.providerEventId,
          eventData
        );
      } else {
        throw new Error("Unsupported calendar provider");
      }

      // Update mapping info
      mapping.lastSynced = new Date();
      await mapping.save();
      calendarProvider.lastSync = new Date();
      await user.save();

      console.log(
        `✅ Appointment ${appointment.id} updated in ${calendarProvider.provider} calendar`
      );

      return updatedEvent;
    } catch (error) {
      console.error(`❌ Failed to update appointment in provider:`, error);
      throw error;
    }
  }


  // Delete appointment from external calendar
  async deleteAppointmentFromProvider(userId, appointmentId, provider) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const calendarProvider = user.calendarProviders.find(
        cp => cp.providerId === provider.providerId && cp.isActive
      );

      if (!calendarProvider) {
        throw new Error('Calendar provider not found or inactive');
      }

      const mapping = await AppointmentMapping.findOne({
        appointmentId: appointmentId,
        provider: calendarProvider.provider,
        ExpertId: userId
      });

      if (!mapping) {
        console.log('No mapping found for appointment, skipping external deletion');
        return;
      }

      // Check if token needs refresh
      if (new Date() >= calendarProvider.tokenExpiry) {
        await this.refreshProviderToken(user, calendarProvider);
      }

      // Delete from external calendar
      if (calendarProvider.provider === 'google') {
        await this.googleService.deleteEvent(
          calendarProvider.accessToken,
          calendarProvider.calendarId,
          mapping.providerEventId
        );
      } else if (calendarProvider.provider === 'microsoft') {
        await this.microsoftService.deleteEvent(
          calendarProvider.accessToken,
          calendarProvider.calendarId,
          mapping.providerEventId
        );
      }

      // Remove mapping
      await AppointmentMapping.deleteOne({
        appointmentId: appointmentId,
        provider: calendarProvider.provider,
        ExpertId: userId
      });

      calendarProvider.lastSync = new Date();
      await user.save();
    } catch (error) {
      console.error(`Failed to delete appointment from ${provider.provider}:`, error);
      throw error;
    }
  }

  // Sync all appointments for a user to all active providers
  async syncAllAppointments(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const activeProviders = user.calendarProviders.filter(cp => cp.isActive);
      const results = [];

      for (const provider of activeProviders) {
        const UserAppointments = await event.find({ expertId: userId });
        try {
          for (const appointment of UserAppointments) {
            await this.syncAppointmentToProvider(userId, appointment, { id: provider._id });
          }
          results.push({
            provider: provider.provider,
            email: provider.email,
            success: true,
            syncedCount: user.appointments.length
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

      return results;
    } catch (error) {
      console.error('Failed to sync all appointments:', error);
      throw error;
    }
  }

  // Refresh provider token
  async refreshProviderToken(user, provider) {
    try {
      let newTokens;

      if (provider.provider === 'google') {
        newTokens = await this.googleService.refreshAccessToken(decryptToken(provider.refreshToken));
      } else if (provider.provider === 'microsoft') {
        newTokens = await this.microsoftService.refreshAccessToken(decryptToken(provider.refreshToken));
      }

      if (newTokens) {
        provider.accessToken = encryptToken(newTokens.access_token);
        if (newTokens.refresh_token) {
          provider.refreshToken = encryptToken(newTokens.refresh_token);
        }
        provider.tokenExpiry = new Date(Date.now() + (newTokens.expires_in * 1000));
        await user.save();
      }
    } catch (error) {
      console.error(`Failed to refresh ${provider.provider} token:`, error);
      // Mark provider as inactive if refresh fails
      provider.isActive = false;
      await user.save();
      throw error;
    }
  }

  // Handle webhook notifications
  async handleWebhookNotification(provider, payload) {
    try {
      // This is a simplified webhook handler
      // In production, you'd want to:
      // 1. Verify the webhook signature
      // 2. Parse the notification payload
      // 3. Fetch updated events from the provider
      // 4. Sync changes back to your database

      console.log(`Received ${provider} webhook notification:`, payload);

      // For now, just log the notification
      // You can implement full sync logic here based on the notification type

      return { success: true, message: 'Webhook processed' };
    } catch (error) {
      console.error(`Failed to handle ${provider} webhook:`, error);
      throw error;
    }
  }

  // Batch sync for multiple users (for background jobs)
  async batchSyncUsers(userIds) {
    const results = [];

    for (const userId of userIds) {
      try {
        const syncResults = await this.syncAllAppointments(userId);
        results.push({
          userId,
          success: true,
          providers: syncResults
        });
      } catch (error) {
        results.push({
          userId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Renew expiring subscriptions
  async renewExpiringSubscriptions() {
    try {
      const users = await User.find({
        'calendarProviders.subscriptionExpiry': {
          $lt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expiring in 24 hours
        }
      });

      const results = [];

      for (const user of users) {
        for (const provider of user.calendarProviders) {
          if (provider.subscriptionExpiry &&
            provider.subscriptionExpiry < new Date(Date.now() + 24 * 60 * 60 * 1000) &&
            provider.provider === 'google') {

            try {
              // Stop old subscription
              await this.googleService.stopWatching(
                provider.accessToken,
                provider.subscriptionId,
                provider.calendarId
              );

              // Create new subscription
              const webhookUrl = `${process.env.BASE_URL}/api/calendar/webhooks/google`;
              const newSubscription = await this.googleService.watchCalendar(
                provider.accessToken,
                provider.calendarId,
                webhookUrl
              );

              provider.subscriptionId = newSubscription.id;
              provider.subscriptionExpiry = new Date(newSubscription.expiration);

              results.push({
                userId: user._id,
                provider: 'google',
                email: provider.email,
                success: true
              });
            } catch (error) {
              results.push({
                userId: user._id,
                provider: 'google',
                email: provider.email,
                success: false,
                error: error.message
              });
            }
          }
        }

        await user.save();
      }

      return results;
    } catch (error) {
      console.error('Failed to renew expiring subscriptions:', error);
      throw error;
    }
  }
}

export default new CalendarSyncService();
