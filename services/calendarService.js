import { google } from 'googleapis';
// Note: Microsoft Graph client will be used via fetch API instead of SDK for simplicity
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_KEY = process.env.CALENDAR_ENCRYPTION_KEY || '37d5baac21de6cf4e91459343db6ef2e678a4a61eb2570402246e311c02370c5';

// Encryption utilities
export const encryptToken = (token) => {
  console.log("Token to Encrypt:", token)
  const encryptedToken = CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
  console.log("Token Encrypted:", encryptedToken)
  return encryptedToken;
};

export const decryptToken = (encryptedToken) => {
  if (!encryptedToken || typeof encryptedToken !== 'string') return encryptedToken;

  // If token looks like a normal Google token (starts with ya29.), skip decryption
  if (encryptedToken.startsWith('ya29.') || encryptedToken.startsWith('1//')) {
    return encryptedToken;
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
    const decryptedToken = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedToken || encryptedToken;
  } catch (error) {
    console.error('Decryption failed, returning raw token:', error);
    return encryptedToken;
  }
};


// Google Calendar Service
export class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }



  //Getting the authURL from google to send it to frontend as a response  and to redirect the frontend to the 
  //google sign in Page
  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // Force consent to get refresh token
    });
  }

  async exchangeCodeForTokens(code) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }


  async refreshAccessToken(refreshToken) {
    this.oauth2Client.setCredentials({
      refresh_token: decryptToken(refreshToken)
    });

    const { credentials } = await this.oauth2Client.refreshToken(refreshToken);
    return credentials;
  }


  async getUserInfo(accessToken) {
    this.oauth2Client.setCredentials({
      access_token: decryptToken(accessToken)
    });

    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const { data } = await oauth2.userinfo.get();
    return data;
  }

  async createEvent(accessToken, calendarId, eventData) {
    this.oauth2Client.setCredentials({
      access_token: decryptToken(accessToken)
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const event = {
      summary: eventData.title,
      description: eventData.description || '',
      start: {
        dateTime: eventData.startDateTime,
        timeZone: eventData.timeZone || 'UTC',
      },
      end: {
        dateTime: eventData.endDateTime,
        timeZone: eventData.timeZone || 'UTC',
      },
      attendees: eventData.attendees || [],
    };

    const response = await calendar.events.insert({
      calendarId: calendarId || 'primary',
      resource: event,
    });

    return response.data;
  }



  //   async updateEvent(accessToken, calendarId, eventId, eventData) {
  //   try {
  //     this.oauth2Client.setCredentials({
  //       access_token: decryptToken(accessToken),
  //     });

  //     const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });

  //     const event = {
  //       summary: eventData.title,
  //       description: eventData.description || "",
  //       start: {
  //         dateTime: new Date(eventData.startDateTime).toISOString(),
  //         timeZone: eventData.timeZone || "UTC",
  //       },
  //       end: {
  //         dateTime: new Date(eventData.endDateTime).toISOString(),
  //         timeZone: eventData.timeZone || "UTC",
  //       },
  //       attendees: eventData.attendees || [],
  //     };

  //     const response = await calendar.events.update({
  //       calendarId: calendarId || "primary",
  //       eventId,
  //       resource: event,
  //     });

  //     return response.data;
  //   } catch (error) {
  //     console.error("❌ Google updateEvent error:", error);
  //     throw new Error(`Failed to update Google event: ${error.message}`);
  //   }
  // }
  async createEvent(accessToken, calendarId, eventData) {
    this.oauth2Client.setCredentials({
      access_token: decryptToken(accessToken),
    });

    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });

    const event = {
      summary: eventData.title,
      description: eventData.description || "",
      start: {
        dateTime: new Date(eventData.startDateTime).toISOString(),
        timeZone: eventData.timeZone || "UTC",
      },
      end: {
        dateTime: new Date(eventData.endDateTime).toISOString(),
        timeZone: eventData.timeZone || "UTC",
      },
      attendees: eventData.attendees || [],

      // THIS generates the Google Meet link
      conferenceData: {
        createRequest: {
          requestId: "meet-" + Date.now(),
          conferenceSolutionKey: { type: "hangoutsMeet" }
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: calendarId || "primary",
      conferenceDataVersion: 1,   //Required
      resource: event,
    });

    console.log("Meet Link Generated:", response.data.hangoutLink);

    return response.data;
  }

  async updateEvent(accessToken, calendarId, eventId, eventData) {
    this.oauth2Client.setCredentials({
      access_token: decryptToken(accessToken),
    });

    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });

    // Fetch existing event to see if it already has a meet link
    const existing = await calendar.events.get({
      calendarId: calendarId || "primary",
      eventId: eventId
    });

    const event = {
      summary: eventData.title,
      description: eventData.description || "",
      start: {
        dateTime: new Date(eventData.startDateTime).toISOString(),
        timeZone: eventData.timeZone || "UTC",
      },
      end: {
        dateTime: new Date(eventData.endDateTime).toISOString(),
        timeZone: eventData.timeZone || "UTC",
      },
      attendees: eventData.attendees || [],
    };

    // If it's an online event and doesn't have a meet link, add one
    if (eventData.isOnline && !existing.data.hangoutLink) {
      event.conferenceData = {
        createRequest: {
          requestId: "meet-update-" + Date.now(),
          conferenceSolutionKey: { type: "hangoutsMeet" }
        }
      };
    }

    const response = await calendar.events.update({
      calendarId: calendarId || "primary",
      eventId: eventId,
      conferenceDataVersion: 1,
      resource: event,
    });

    return response.data;
  }



  async deleteEvent(accessToken, calendarId, eventId) {
    this.oauth2Client.setCredentials({
      access_token: decryptToken(accessToken)
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    await calendar.events.delete({
      calendarId: calendarId || 'primary',
      eventId: eventId,
    });
  }

  async watchCalendar(accessToken, calendarId, webhookUrl) {
    this.oauth2Client.setCredentials({
      access_token: decryptToken(accessToken)
    });
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const watchRequest = {
      id: `uzmanlio-${Date.now()}`,
      type: 'web_hook',
      address: webhookUrl,
      token: process.env.GOOGLE_WEBHOOK_TOKEN,
    };

    const response = await calendar.events.watch({
      calendarId: calendarId || 'primary',
      resource: watchRequest,
    });

    const data = response.data;

    // ✅ Always include a fallback expiration
    if (!data.expiration || isNaN(Number(data.expiration))) {
      data.expiration = Date.now() + 24 * 60 * 60 * 1000; // Default to +1 day
    }

    return data;
  }


  async stopWatching(accessToken, channelId, resourceId) {
    this.oauth2Client.setCredentials({
      access_token: decryptToken(accessToken)
    });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    await calendar.channels.stop({
      resource: {
        id: channelId,
        resourceId: resourceId,
      },
    });
  }
}

// Microsoft Calendar Service
export class MicrosoftCalendarService {
  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID;
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    this.redirectUri = process.env.MICROSOFT_REDIRECT_URI;
    this.authority = 'https://login.microsoftonline.com/common';
  }

  getAuthUrl() {
    const scopes = ['Calendars.ReadWrite', 'User.Read', 'offline_access'];
    const authUrl = `${this.authority}/oauth2/v2.0/authorize?` +
      `client_id=${this.clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `scope=${encodeURIComponent(scopes.join(' '))}&` +
      `response_mode=query&` +
      `prompt=consent`;

    return authUrl;
  }

  async exchangeCodeForTokens(code) {
    const tokenUrl = `${this.authority}/oauth2/v2.0/token`;

    const params = new URLSearchParams();
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);
    params.append('code', code);
    params.append('redirect_uri', this.redirectUri);
    params.append('grant_type', 'authorization_code');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async refreshAccessToken(refreshToken) {
    const tokenUrl = `${this.authority}/oauth2/v2.0/token`;

    const params = new URLSearchParams();
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);
    params.append('refresh_token', refreshToken);
    params.append('grant_type', 'refresh_token');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async getUserInfo(accessToken) {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${decryptToken(accessToken)}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    return await response.json();
  }

  async createEvent(accessToken, calendarId, eventData) {
    const event = {
      subject: eventData.title,
      body: {
        contentType: 'HTML',
        content: eventData.description || '',
      },
      start: {
        dateTime: eventData.startDateTime,
        timeZone: eventData.timeZone || 'UTC',
      },
      end: {
        dateTime: eventData.endDateTime,
        timeZone: eventData.timeZone || 'UTC',
      },
      attendees: eventData.attendees?.map(email => ({
        emailAddress: { address: email, name: email },
      })) || [],
      // Enable Teams meeting
      isOnlineMeeting: eventData.isOnline || false,
      onlineMeetingProvider: eventData.isOnline ? 'teamsForBusiness' : undefined
    };

    const calendarPath = calendarId ? `/me/calendars/${calendarId}/events` : '/me/events';
    const response = await fetch(`https://graph.microsoft.com/v1.0${calendarPath}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${decryptToken(accessToken)}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Microsoft event: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Teams Link Generated:", data.onlineMeeting?.joinUrl);
    return data;
  }


  async updateEvent(accessToken, calendarId, eventId, eventData) {
    try {
      const decryptedToken = decryptToken(accessToken);

      const event = {
        subject: eventData.title,
        body: {
          contentType: "HTML",
          content: eventData.description || "",
        },
        start: {
          dateTime: new Date(eventData.startDateTime).toISOString(),
          timeZone: eventData.timeZone || "UTC",
        },
        end: {
          dateTime: new Date(eventData.endDateTime).toISOString(),
          timeZone: eventData.timeZone || "UTC",
        },
        attendees:
          eventData.attendees?.map((email) => ({
            emailAddress: { address: email, name: email },
            type: "required",
          })) || [],
        // Preserve or enable Teams meeting
        isOnlineMeeting: eventData.isOnline || false,
        onlineMeetingProvider: eventData.isOnline ? 'teamsForBusiness' : undefined
      };

      const eventPath = calendarId
        ? `/me/calendars/${calendarId}/events/${eventId}`
        : `/me/events/${eventId}`;

      const response = await fetch(`https://graph.microsoft.com/v1.0${eventPath}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${decryptedToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Microsoft update failed: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Microsoft updateEvent error:", error);
      throw new Error(`Failed to update Microsoft event: ${error.message}`);
    }
  }


  async deleteEvent(accessToken, calendarId, eventId) {
    const eventPath = calendarId ?
      `/me/calendars/${calendarId}/events/${eventId}` :
      `/me/events/${eventId}`;

    const response = await fetch(`https://graph.microsoft.com/v1.0${eventPath}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${decryptToken(accessToken)}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete event: ${response.statusText}`);
    }
  }
}
