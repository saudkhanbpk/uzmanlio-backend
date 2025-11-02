import express from 'express';
import { GoogleCalendarService, MicrosoftCalendarService, encryptToken } from '../services/calendarService.js';
import User from '../models/expertInformation.js';
import { CalendarSyncService } from '../services/calendarSyncService.js';

const router = express.Router();
const googleService = new GoogleCalendarService();
const microsoftService = new MicrosoftCalendarService();

const calendarSyncService = new CalendarSyncService();

// Helper function to find user by ID
const findUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

// ==================== GOOGLE CALENDAR AUTH ====================

// Start Google OAuth flow
router.get('/google/auth/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await findUserById(userId); // Validate user exists

    const authUrl = googleService.getAuthUrl();
    
    // Store userId in session or as state parameter for callback
    const stateParam = Buffer.from(JSON.stringify({ userId, provider: 'google' })).toString('base64');
    const authUrlWithState = `${authUrl}&state=${stateParam}`;
    
    res.json({ authUrl: authUrlWithState });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Google OAuth callback
// router.get('/google/callback', async (req, res) => {
//   try {
//     const { code, state } = req.query;
    
//     if (!code) {
//       return res.status(400).json({ error: 'Authorization code not provided' });
//     }

//     // Decode state to get userId
//     const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
//     const user = await findUserById(userId);

//     // Exchange code for tokens
//     const tokens = await googleService.exchangeCodeForTokens(code);
    
//     if (!tokens.refresh_token) {
//       return res.status(400).json({ 
//         error: 'Refresh token not received. Please revoke app access and try again.' 
//       });
//     }

//     // Get user info from Google
//     const userInfo = await googleService.getUserInfo(tokens.access_token);

//     // Calculate token expiry
//     const tokenExpiry = new Date(Date.now() + (tokens.expiry_date || 3600 * 1000));

//     // Check if provider already exists
//     const existingProviderIndex = user.calendarProviders.findIndex(
//       provider => provider.provider === 'google' && provider.email === userInfo.email
//     );
//     console.log("Access and Refresh Tokens To Get Encrypted:",tokens)

//     const providerData = {
//       provider: 'google',
//       providerId: userInfo.id,
//       email: userInfo.email,
//       accessToken: encryptToken(tokens.access_token),
//       refreshToken: encryptToken(tokens.refresh_token),
//       tokenExpiry: tokenExpiry,
//       calendarId: 'primary',
//       isActive: true,
//       lastSync: new Date(),
//     };

//     if (existingProviderIndex >= 0) {
//       // Update existing provider
//       user.calendarProviders[existingProviderIndex] = {
//         ...user.calendarProviders[existingProviderIndex],
//         ...providerData
//       };
//     } else {
//       // Add new provider
//       user.calendarProviders.push(providerData);
//     }

//     await user.save();

//     // Setup webhook subscription
//   try {
//   const webhookUrl = `${process.env.BASE_URL}/api/calendar/webhooks/google`;
//   const subscription = await googleService.watchCalendar(tokens.access_token, 'primary', webhookUrl);

//   console.log("📡 Google webhook response:", subscription); // 🔍 check what it actually returns

//   const providerIndex = existingProviderIndex >= 0 ? existingProviderIndex : user.calendarProviders.length - 1;

//   user.calendarProviders[providerIndex].subscriptionId = subscription.id;

//   // ✅ Safely handle expiration
//   if (subscription.expiration && !isNaN(Number(subscription.expiration))) {
//     user.calendarProviders[providerIndex].subscriptionExpiry = new Date(Number(subscription.expiration));
//   } else {
//     console.warn("⚠️ Missing expiration in Google response, setting fallback expiry.");
//     user.calendarProviders[providerIndex].subscriptionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // +1 day
//   }

//   await user.save();
// } catch (webhookError) {
//   console.error("❌ Failed to setup Google webhook:", webhookError);
// }


//     res.json({ 
//       success: true, 
//       message: 'Google Calendar connected successfully',
//       provider: {
//         provider: 'google',
//         email: userInfo.email,
//         isActive: true
//       }
//     });

//    //Uploading the Current Events Of user To Google Calendar from database if Any
//     try {
//       console.log("UserID for Sync :", userId)
//       console.log("Events for Sync :", user.events)
//       const events = user.events;
//       const provider = user.calendarProviders.find(provider => provider.provider === 'google');
      
//       if(events.length > 0){
//         calendarSyncService.syncMultipleAppointmentsToProvider(userId, events, provider)
//       }
      
//     } catch (error) {
      
//     }
//   } catch (error) {
//     console.error('Google OAuth callback error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/calendar?error=missing_code`);
    }

    // Decode userId from state
    const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
    const user = await findUserById(userId);
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/calendar?error=user_not_found`);
    }

    // Exchange code for tokens
    const tokens = await googleService.exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/dashboard/calendar?error=no_refresh_token`
      );
    }

    // Get user info from Google
    const userInfo = await googleService.getUserInfo(tokens.access_token);

    const tokenExpiry = new Date(
      Date.now() + (tokens.expiry_date || tokens.expires_in * 1000 || 3600 * 1000)
    );

    // Find or create provider
    const existingProviderIndex = user.calendarProviders.findIndex(
      (provider) => provider.provider === 'google' && provider.email === userInfo.email
    );

    const providerData = {
      provider: 'google',
      providerId: userInfo.id,
      email: userInfo.email,
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      tokenExpiry,
      calendarId: 'primary',
      isActive: true,
      lastSync: new Date(),
    };

    if (existingProviderIndex >= 0) {
      user.calendarProviders[existingProviderIndex] = {
        ...user.calendarProviders[existingProviderIndex],
        ...providerData,
      };
    } else {
      user.calendarProviders.push(providerData);
    }

    await user.save();

    // Setup webhook
    try {
      const webhookUrl = `${process.env.BASE_URL}/api/calendar/webhooks/google`;
      const subscription = await googleService.watchCalendar(tokens.access_token, 'primary', webhookUrl);

      const providerIndex = existingProviderIndex >= 0 ? existingProviderIndex : user.calendarProviders.length - 1;

      user.calendarProviders[providerIndex].subscriptionId = subscription.id;
      user.calendarProviders[providerIndex].subscriptionExpiry =
        subscription.expiration && !isNaN(Number(subscription.expiration))
          ? new Date(Number(subscription.expiration))
          : new Date(Date.now() + 24 * 60 * 60 * 1000);

      await user.save();
    } catch (webhookError) {
      console.error('❌ Failed to setup Google webhook:', webhookError);
    }

    // Background sync user events
    try {
      const provider = user.calendarProviders.find((p) => p.provider === 'google');
      if (user.events?.length > 0) {
        setImmediate(() =>
          calendarSyncService.syncMultipleAppointmentsToProvider(userId, user.events, provider)
        );
      }
    } catch (syncError) {
      console.error('⚠️ Background sync failed:', syncError);
    }

    // ✅ Redirect to frontend with success message
    return res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/calendar?status=success&provider=google`
    );

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/calendar?error=${encodeURIComponent(error.message)}`
    );
  }
});


// ==================== MICROSOFT CALENDAR AUTH ====================

// Start Microsoft OAuth flow
router.get('/microsoft/auth/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await findUserById(userId); // Validate user exists

    const authUrl = microsoftService.getAuthUrl();
    
    // Store userId in session or as state parameter for callback
    const stateParam = Buffer.from(JSON.stringify({ userId, provider: 'microsoft' })).toString('base64');
    const authUrlWithState = `${authUrl}&state=${stateParam}`;
    
    res.json({ authUrl: authUrlWithState });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Microsoft OAuth callback
// router.get('/microsoft/callback', async (req, res) => {
//   try {
//     const { code, state } = req.query;
    
//     if (!code) {
//       return res.status(400).json({ error: 'Authorization code not provided' });
//     }

//     // Decode state to get userId
//     const { userId } = JSON.parse(Buffer.from(state, 'base64').toString());
//     const user = await findUserById(userId);

//     // Exchange code for tokens
//     const tokens = await microsoftService.exchangeCodeForTokens(code);
    
//     if (!tokens.refresh_token) {
//       return res.status(400).json({ 
//         error: 'Refresh token not received. Please try again.' 
//       });
//     }

//     // Get user info from Microsoft
//     const userInfo = await microsoftService.getUserInfo(tokens.access_token);

//     // Calculate token expiry
//     const tokenExpiry = new Date(Date.now() + (tokens.expires_in * 1000));

//     // Check if provider already exists
//     const existingProviderIndex = user.calendarProviders.findIndex(
//       provider => provider.provider === 'microsoft' && provider.email === userInfo.mail || userInfo.userPrincipalName
//     );

//     const providerData = {
//       provider: 'microsoft',
//       providerId: userInfo.id,
//       email: userInfo.mail || userInfo.userPrincipalName,
//       accessToken: encryptToken(tokens.access_token),
//       refreshToken: encryptToken(tokens.refresh_token),
//       tokenExpiry: tokenExpiry,
//       calendarId: null, // Will use default calendar
//       isActive: true,
//       lastSync: new Date(),
//     };

//     if (existingProviderIndex >= 0) {
//       // Update existing provider
//       user.calendarProviders[existingProviderIndex] = {
//         ...user.calendarProviders[existingProviderIndex],
//         ...providerData
//       };
//     } else {
//       // Add new provider
//       user.calendarProviders.push(providerData);
//     }

//     await user.save();

//      //Uploading the Current Events Of user To Google Calendar from database if Any
//     try {
//       console.log("UserID for Sync :", userId)
//       console.log("Events for Sync :", user.events)
//       const events = user.events;
//       const provider = user.calendarProviders.find(provider => provider.provider === 'microsoft');
      
//       if(events.length > 0){
//         calendarSyncService.syncMultipleAppointmentsToProvider(userId, events, provider)
//       }
      
//     } catch (error) {
      
//     }

//     res.json({ 
//       success: true, 
//       message: 'Microsoft Calendar connected successfully',
//       provider: {
//         provider: 'microsoft',
//         email: userInfo.mail || userInfo.userPrincipalName,
//         isActive: true
//       }
//     });
//   } catch (error) {
//     console.error('Microsoft OAuth callback error:', error);
//     res.status(500).json({ error: error.message });
//   }
// });
router.get("/microsoft/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/calendar?calendarSync=failed`);
    }

    // Decode state to get userId
    const { userId } = JSON.parse(Buffer.from(state, "base64").toString());
    const user = await findUserById(userId);
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/calendar?calendarSync=failed`);
    }

    // Exchange code for tokens
    const tokens = await microsoftService.exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/calendar?calendarSync=failed`);
    }

    // Get user info from Microsoft
    const userInfo = await microsoftService.getUserInfo(tokens.access_token);
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    // Check if provider already exists
    const existingProviderIndex = user.calendarProviders.findIndex(
      (provider) =>
        provider.provider === "microsoft" &&
        (provider.email === userInfo.mail || provider.email === userInfo.userPrincipalName)
    );

    const providerData = {
      provider: "microsoft",
      providerId: userInfo.id,
      email: userInfo.mail || userInfo.userPrincipalName,
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      tokenExpiry,
      calendarId: null,
      isActive: true,
      lastSync: new Date(),
    };

    if (existingProviderIndex >= 0) {
      user.calendarProviders[existingProviderIndex] = {
        ...user.calendarProviders[existingProviderIndex],
        ...providerData,
      };
    } else {
      user.calendarProviders.push(providerData);
    }

    await user.save();

    // 🔁 Sync existing events (non-blocking)
    setImmediate(async () => {
      try {
        console.log("Syncing events for Microsoft:", userId);
        const events = user.events || [];
        const provider = user.calendarProviders.find(
          (p) => p.provider === "microsoft"
        );
        if (events.length > 0 && provider) {
          await calendarSyncService.syncMultipleAppointmentsToProvider(userId, events, provider);
        }
      } catch (syncErr) {
        console.error("Error syncing events to Microsoft:", syncErr);
      }
    });

    // ✅ Redirect user to frontend with success message
    return res.redirect(
      `${process.env.FRONTEND_URL}/dashboard/calendar?calendarSync=microsoft-success`
    );

  } catch (error) {
    console.error("❌ Microsoft OAuth callback error:", error);
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard/calendar?calendarSync=failed`);
  }
});


// ==================== PROVIDER MANAGEMENT ====================

// Get connected calendar providers
router.get('/:userId/providers', async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    
    const providers = user.calendarProviders.map(provider => ({
      id: provider._id,
      provider: provider.provider,
      email: provider.email,
      isActive: provider.isActive,
      lastSync: provider.lastSync,
      tokenExpiry: provider.tokenExpiry
    }));

    res.json({ providers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Disconnect calendar provider
router.delete('/:userId/providers/:providerId', async (req, res) => {
  try {
    const { userId, providerId } = req.params;
    const user = await findUserById(userId);

    const providerIndex = user.calendarProviders.findIndex(
      provider => provider._id.toString() === providerId
    );

    if (providerIndex === -1) {
      return res.status(404).json({ error: 'Calendar provider not found' });
    }

    const provider = user.calendarProviders[providerIndex];

    // Stop webhook subscription if exists
    if (provider.subscriptionId && provider.provider === 'google') {
      try {
        await googleService.stopWatching(
          provider.accessToken, 
          provider.subscriptionId, 
          provider.calendarId
        );
      } catch (error) {
        console.error('Failed to stop Google webhook:', error);
      }
    }

    // Remove provider
    user.calendarProviders.splice(providerIndex, 1);
    
    // Remove associated appointment mappings
    user.appointmentMappings = user.appointmentMappings.filter(
      mapping => mapping.provider !== provider.provider || 
                 mapping.calendarId !== provider.calendarId
    );

    await user.save();

    res.json({ message: 'Calendar provider disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle provider active status
router.patch('/:userId/providers/:providerId/toggle', async (req, res) => {
  try {
    const { userId, providerId } = req.params;
    const user = await findUserById(userId);

    const provider = user.calendarProviders.find(
      provider => provider._id.toString() === providerId
    );

    if (!provider) {
      return res.status(404).json({ error: 'Calendar provider not found' });
    }

    provider.isActive = !provider.isActive;
    await user.save();

    res.json({ 
      message: `Calendar provider ${provider.isActive ? 'activated' : 'deactivated'}`,
      provider: {
        id: provider._id,
        provider: provider.provider,
        email: provider.email,
        isActive: provider.isActive
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
