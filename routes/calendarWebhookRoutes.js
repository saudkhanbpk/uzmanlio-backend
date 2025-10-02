import express from 'express';
import crypto from 'crypto';
import calendarSyncService from '../services/calendarSyncService.js';

const router = express.Router();

// Middleware to verify Google webhook signatures
const verifyGoogleWebhook = (req, res, next) => {
  const channelId = req.headers['x-goog-channel-id'];
  const channelToken = req.headers['x-goog-channel-token'];
  const resourceId = req.headers['x-goog-resource-id'];
  const resourceState = req.headers['x-goog-resource-state'];

  // Verify the webhook token
  if (channelToken !== process.env.GOOGLE_WEBHOOK_TOKEN) {
    return res.status(401).json({ error: 'Invalid webhook token' });
  }

  req.googleWebhook = {
    channelId,
    channelToken,
    resourceId,
    resourceState
  };

  next();
};

// Middleware to verify Microsoft webhook signatures
const verifyMicrosoftWebhook = (req, res, next) => {
  const validationToken = req.query.validationToken;
  
  // Handle subscription validation
  if (validationToken) {
    return res.status(200).send(validationToken);
  }

  // Verify webhook signature for actual notifications
  const signature = req.headers['x-ms-signature'];
  if (signature && process.env.MICROSOFT_WEBHOOK_SECRET) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.MICROSOFT_WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('base64');

    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  }

  next();
};

// Google Calendar webhook endpoint
router.post('/google', verifyGoogleWebhook, async (req, res) => {
  try {
    const { channelId, resourceId, resourceState } = req.googleWebhook;

    console.log('Google webhook received:', {
      channelId,
      resourceId,
      resourceState,
      headers: req.headers
    });

    // Handle different resource states
    switch (resourceState) {
      case 'sync':
        // Initial sync notification - can be ignored
        console.log('Google calendar sync notification received');
        break;
        
      case 'exists':
        // Calendar event changed
        console.log('Google calendar event changed');
        
        // In a full implementation, you would:
        // 1. Find the user associated with this channel/resource
        // 2. Fetch the updated events from Google Calendar
        // 3. Compare with your database and sync changes
        // 4. Update appointment mappings as needed
        
        await calendarSyncService.handleWebhookNotification('google', {
          channelId,
          resourceId,
          resourceState,
          timestamp: new Date()
        });
        break;
        
      case 'not_exists':
        // Calendar or event deleted
        console.log('Google calendar event deleted');
        break;
        
      default:
        console.log('Unknown Google webhook state:', resourceState);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Google webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Microsoft Graph webhook endpoint
router.post('/microsoft', verifyMicrosoftWebhook, async (req, res) => {
  try {
    const notifications = req.body.value || [];

    console.log('Microsoft webhook received:', {
      notificationCount: notifications.length,
      notifications: notifications.map(n => ({
        subscriptionId: n.subscriptionId,
        changeType: n.changeType,
        resource: n.resource
      }))
    });

    for (const notification of notifications) {
      const { subscriptionId, changeType, resource, resourceData } = notification;

      console.log('Processing Microsoft notification:', {
        subscriptionId,
        changeType,
        resource
      });

      // Handle different change types
      switch (changeType) {
        case 'created':
          console.log('Microsoft calendar event created');
          break;
          
        case 'updated':
          console.log('Microsoft calendar event updated');
          break;
          
        case 'deleted':
          console.log('Microsoft calendar event deleted');
          break;
          
        default:
          console.log('Unknown Microsoft change type:', changeType);
      }

      // In a full implementation, you would:
      // 1. Find the user associated with this subscription
      // 2. Fetch the updated event from Microsoft Graph
      // 3. Compare with your database and sync changes
      // 4. Update appointment mappings as needed

      await calendarSyncService.handleWebhookNotification('microsoft', {
        subscriptionId,
        changeType,
        resource,
        resourceData,
        timestamp: new Date()
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Microsoft webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test webhook endpoints (for development)
router.get('/test/google', (req, res) => {
  res.json({
    message: 'Google webhook endpoint is active',
    expectedHeaders: [
      'x-goog-channel-id',
      'x-goog-channel-token',
      'x-goog-resource-id',
      'x-goog-resource-state'
    ],
    webhookUrl: `${process.env.BASE_URL}/api/calendar/webhooks/google`
  });
});

router.get('/test/microsoft', (req, res) => {
  res.json({
    message: 'Microsoft webhook endpoint is active',
    expectedHeaders: [
      'x-ms-signature'
    ],
    webhookUrl: `${process.env.BASE_URL}/api/calendar/webhooks/microsoft`
  });
});

// Webhook health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      google: '/api/calendar/webhooks/google',
      microsoft: '/api/calendar/webhooks/microsoft'
    }
  });
});

export default router;
