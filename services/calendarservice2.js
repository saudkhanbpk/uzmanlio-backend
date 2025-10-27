import { google } from 'googleapis';
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

dotenv.config();

// ------------------ Encryption Helpers ------------------
const ENCRYPTION_KEY = process.env.CALENDAR_ENCRYPTION_KEY || 'default-key-change-in-production';

export const encryptToken = (token) =>
  CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();

export const decryptToken = (encryptedToken) => {
  const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// ------------------ Google Calendar ------------------

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export const getGoogleAuthUrl = () => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
};

export const exchangeGoogleCodeForTokens = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

export const refreshGoogleAccessToken = async (refreshToken) => {
  oauth2Client.setCredentials({ refresh_token: decryptToken(refreshToken) });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
};

export const getGoogleUserInfo = async (accessToken) => {
  oauth2Client.setCredentials({ access_token: decryptToken(accessToken) });
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data;
};

export const createGoogleEvent = async (accessToken, calendarId, eventData) => {
  oauth2Client.setCredentials({ access_token: decryptToken(accessToken) });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary: eventData.title,
    description: eventData.description || '',
    start: { dateTime: eventData.startDateTime, timeZone: eventData.timeZone || 'UTC' },
    end: { dateTime: eventData.endDateTime, timeZone: eventData.timeZone || 'UTC' },
    attendees: eventData.attendees || [],
  };

  const response = await calendar.events.insert({
    calendarId: calendarId || 'primary',
    resource: event,
  });

  return response.data;
};

export const updateGoogleEvent = async (accessToken, calendarId, eventId, eventData) => {
  oauth2Client.setCredentials({ access_token: decryptToken(accessToken) });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const event = {
    summary: eventData.title,
    description: eventData.description || '',
    start: { dateTime: eventData.startDateTime, timeZone: eventData.timeZone || 'UTC' },
    end: { dateTime: eventData.endDateTime, timeZone: eventData.timeZone || 'UTC' },
    attendees: eventData.attendees || [],
  };

  const response = await calendar.events.update({
    calendarId: calendarId || 'primary',
    eventId,
    resource: event,
  });

  return response.data;
};

export const deleteGoogleEvent = async (accessToken, calendarId, eventId) => {
  oauth2Client.setCredentials({ access_token: decryptToken(accessToken) });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.events.delete({
    calendarId: calendarId || 'primary',
    eventId,
  });
};

export const watchGoogleCalendar = async (accessToken, calendarId, webhookUrl) => {
  oauth2Client.setCredentials({ access_token: decryptToken(accessToken) });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

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

  return response.data;
};

export const stopGoogleWatch = async (accessToken, channelId, resourceId) => {
  oauth2Client.setCredentials({ access_token: decryptToken(accessToken) });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  await calendar.channels.stop({
    resource: {
      id: channelId,
      resourceId,
    },
  });
};

// ------------------ Microsoft Calendar ------------------

const microsoftConfig = {
  clientId: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  redirectUri: process.env.MICROSOFT_REDIRECT_URI,
  authority: 'https://login.microsoftonline.com/common'
};

export const getMicrosoftAuthUrl = () => {
  const scopes = ['Calendars.ReadWrite', 'User.Read', 'offline_access'];
  return `${microsoftConfig.authority}/oauth2/v2.0/authorize?` +
    `client_id=${microsoftConfig.clientId}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(microsoftConfig.redirectUri)}&` +
    `scope=${encodeURIComponent(scopes.join(' '))}&` +
    `response_mode=query&prompt=consent`;
};

export const exchangeMicrosoftCodeForTokens = async (code) => {
  const tokenUrl = `${microsoftConfig.authority}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: microsoftConfig.clientId,
    client_secret: microsoftConfig.clientSecret,
    code,
    redirect_uri: microsoftConfig.redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) throw new Error(`Token exchange failed: ${response.statusText}`);
  return await response.json();
};

export const refreshMicrosoftAccessToken = async (refreshToken) => {
  const tokenUrl = `${microsoftConfig.authority}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: microsoftConfig.clientId,
    client_secret: microsoftConfig.clientSecret,
    refresh_token: decryptToken(refreshToken),
    grant_type: 'refresh_token',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) throw new Error(`Token refresh failed: ${response.statusText}`);
  return await response.json();
};

export const getMicrosoftUserInfo = async (accessToken) => {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: {
      Authorization: `Bearer ${decryptToken(accessToken)}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error(`Failed to get user info: ${response.statusText}`);
  return await response.json();
};

export const createMicrosoftEvent = async (accessToken, calendarId, eventData) => {
  const event = {
    subject: eventData.title,
    body: { contentType: 'HTML', content: eventData.description || '' },
    start: { dateTime: eventData.startDateTime, timeZone: eventData.timeZone || 'UTC' },
    end: { dateTime: eventData.endDateTime, timeZone: eventData.timeZone || 'UTC' },
    attendees: eventData.attendees?.map(email => ({
      emailAddress: { address: email, name: email },
    })) || [],
  };

  const path = calendarId ? `/me/calendars/${calendarId}/events` : '/me/events';
  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${decryptToken(accessToken)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) throw new Error(`Failed to create event: ${response.statusText}`);
  return await response.json();
};

export const updateMicrosoftEvent = async (accessToken, calendarId, eventId, eventData) => {
  const event = {
    subject: eventData.title,
    body: { contentType: 'HTML', content: eventData.description || '' },
    start: { dateTime: eventData.startDateTime, timeZone: eventData.timeZone || 'UTC' },
    end: { dateTime: eventData.endDateTime, timeZone: eventData.timeZone || 'UTC' },
    attendees: eventData.attendees?.map(email => ({
      emailAddress: { address: email, name: email },
    })) || [],
  };

  const path = calendarId
    ? `/me/calendars/${calendarId}/events/${eventId}`
    : `/me/events/${eventId}`;

  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${decryptToken(accessToken)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) throw new Error(`Failed to update event: ${response.statusText}`);
  return await response.json();
};

export const deleteMicrosoftEvent = async (accessToken, calendarId, eventId) => {
  const path = calendarId
    ? `/me/calendars/${calendarId}/events/${eventId}`
    : `/me/events/${eventId}`;

  const response = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${decryptToken(accessToken)}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) throw new Error(`Failed to delete event: ${response.statusText}`);
};
