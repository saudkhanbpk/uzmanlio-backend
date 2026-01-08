import axios from 'axios';

const TEAMS_TENANT_ID = process.env.MICROSOFT_TENANT_ID || 'common';
const TEAMS_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const TEAMS_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;

console.log('🔍 Microsoft Teams Config Check:', {
    hasTenantId: !!TEAMS_TENANT_ID,
    hasClientId: !!TEAMS_CLIENT_ID,
    hasClientSecret: !!TEAMS_CLIENT_SECRET,
    tenantId: TEAMS_TENANT_ID === 'common' ? 'common (multi-tenant)' : 'custom'
});

/**
 * Microsoft Teams Service for creating Online Meetings via Graph API
 * Uses Application permissions (Client Credentials flow) for server-to-server auth
 */
class TeamsService {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Get Access Token using Client Credentials OAuth Flow
     * Requires Azure AD App with Application permissions: OnlineMeetings.ReadWrite.All
     */
    async getAccessToken() {
        // Return existing token if still valid (with 1 min buffer)
        if (this.accessToken && this.tokenExpiry && Date.now() < (this.tokenExpiry - 60000)) {
            return this.accessToken;
        }

        if (!TEAMS_CLIENT_ID || !TEAMS_CLIENT_SECRET) {
            console.error('❌ Microsoft Teams API credentials missing in .env');
            throw new Error('Microsoft Teams API credentials not configured');
        }

        try {
            console.log('🔄 Fetching new Microsoft Teams Access Token...');

            const tokenUrl = `https://login.microsoftonline.com/${TEAMS_TENANT_ID}/oauth2/v2.0/token`;

            const params = new URLSearchParams();
            params.append('client_id', TEAMS_CLIENT_ID);
            params.append('client_secret', TEAMS_CLIENT_SECRET);
            params.append('scope', 'https://graph.microsoft.com/.default');
            params.append('grant_type', 'client_credentials');

            const response = await axios.post(tokenUrl, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            this.accessToken = response.data.access_token;
            // Token usually expires in 3600 seconds
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

            console.log('✅ Microsoft Teams Access Token refreshed');
            return this.accessToken;
        } catch (error) {
            console.error('❌ Error fetching Microsoft Teams token:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Microsoft Teams');
        }
    }

    /**
     * Create a Microsoft Teams Online Meeting
     * @param {Object} eventData - Meeting details
     * @param {string} organizerEmail - Email of the meeting organizer (must be a licensed user in your tenant)
     * @returns {Object} Created meeting details
     */
    async createMeeting(eventData, organizerEmail) {
        try {
            const token = await this.getAccessToken();

            if (!organizerEmail) {
                throw new Error('Organizer email is required to create Teams meeting');
            }

            // Calculate start and end times in ISO 8601 format
            const startDateTime = new Date(`${eventData.date}T${eventData.time}:00`);
            const durationMinutes = parseInt(eventData.duration) || 60;
            const endDateTime = new Date(startDateTime.getTime() + (durationMinutes * 60000));

            const meetingDetails = {
                subject: eventData.title || 'Uzmanlio Meeting',
                startDateTime: startDateTime.toISOString(),
                endDateTime: endDateTime.toISOString(),
                lobbyBypassSettings: {
                    scope: 'everyone', // Allow guests to bypass lobby
                    isDialInBypassEnabled: true
                },
                allowedPresenters: 'organizer',
                isEntryExitAnnounced: false,
                allowMeetingChat: 'enabled',
                allowTeamworkReactions: true
            };

            console.log('🚀 Creating Microsoft Teams Meeting:', meetingDetails.subject);

            // Create online meeting on behalf of the organizer
            const response = await axios.post(
                `https://graph.microsoft.com/v1.0/users/${organizerEmail}/onlineMeetings`,
                meetingDetails,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Microsoft Teams Meeting created successfully');

            return {
                id: response.data.id,
                join_url: response.data.joinWebUrl,
                start_url: response.data.joinWebUrl, // Teams uses same URL for host
                meeting_id: response.data.id,
                dial_in: response.data.audioConferencing?.dialinUrl || null,
                passcode: response.data.audioConferencing?.tollNumber || null
            };
        } catch (error) {
            console.error('❌ Error creating Teams meeting:', error.response?.data || error.message);

            // Provide helpful error messages
            if (error.response?.status === 403) {
                throw new Error('Teams meeting creation failed: Missing OnlineMeetings.ReadWrite.All permission or user not licensed for Teams');
            }
            if (error.response?.status === 404) {
                throw new Error('Teams meeting creation failed: Organizer email not found in tenant');
            }

            throw new Error('Failed to create Microsoft Teams meeting');
        }
    }

    /**
     * Delete a Microsoft Teams Meeting
     * @param {string} meetingId - The meeting ID to delete
     * @param {string} organizerEmail - Email of the meeting organizer
     */
    async deleteMeeting(meetingId, organizerEmail) {
        try {
            const token = await this.getAccessToken();

            await axios.delete(
                `https://graph.microsoft.com/v1.0/users/${organizerEmail}/onlineMeetings/${meetingId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            console.log('✅ Microsoft Teams Meeting deleted successfully');
            return true;
        } catch (error) {
            console.error('❌ Error deleting Teams meeting:', error.response?.data || error.message);
            throw new Error('Failed to delete Microsoft Teams meeting');
        }
    }
}

export default new TeamsService();
