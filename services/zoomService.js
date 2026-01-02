import axios from 'axios';

const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

console.log('🔍 Zoom Config Check:', {
    hasAccountId: !!ZOOM_ACCOUNT_ID,
    hasClientId: !!ZOOM_CLIENT_ID,
    hasClientSecret: !!ZOOM_CLIENT_SECRET,
    accountIdPrefix: ZOOM_ACCOUNT_ID ? ZOOM_ACCOUNT_ID.substring(0, 4) : 'none'
});

/**
 * Zoom Service Handling Server-to-Server OAuth and Meeting Creation
 */
class ZoomService {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Get Access Token using Server-to-Server OAuth
     */
    async getAccessToken() {
        // Return existing token if still valid (with 1 min buffer)
        if (this.accessToken && this.tokenExpiry && Date.now() < (this.tokenExpiry - 60000)) {
            return this.accessToken;
        }

        if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
            console.error('❌ Zoom API credentials missing in .env');
            throw new Error('Zoom API credentials not configured');
        }

        try {
            console.log('🔄 Fetching new Zoom Access Token...');
            const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

            const response = await axios.post(
                `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
                {},
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.accessToken = response.data.access_token;
            // Token usually expires in 3600 seconds
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

            console.log('✅ Zoom Access Token refreshed');
            return this.accessToken;
        } catch (error) {
            console.error('❌ Error fetching Zoom token:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Zoom');
        }
    }

    /**
     * Create a Zoom Meeting
     * @param {Object} eventData - Meeting details
     * @returns {Object} Created meeting details
     */
    async createMeeting(eventData) {
        try {
            const token = await this.getAccessToken();

            const meetingDetails = {
                topic: eventData.title || 'Uzmanlio Meeting',
                type: 2, // Scheduled meeting
                start_time: `${eventData.date}T${eventData.time}:00`, // Zoom uses local time if timezone is set
                duration: eventData.duration || 60,
                timezone: 'Europe/Istanbul',
                settings: {
                    host_video: true,
                    participant_video: true,
                    join_before_host: false,
                    mute_upon_entry: true,
                    waiting_room: true,
                    auto_recording: 'none'
                }
            };

            console.log('🚀 Creating Zoom Meeting:', meetingDetails.topic);

            const response = await axios.post(
                'https://api.zoom.us/v2/users/me/meetings',
                meetingDetails,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Zoom Meeting created successfully');

            return {
                id: response.data.id,
                join_url: response.data.join_url,
                start_url: response.data.start_url
            };
        } catch (error) {
            console.error('❌ Error creating Zoom meeting:', error.response?.data || error.message);
            throw new Error('Failed to create Zoom meeting');
        }
    }
}

export default new ZoomService();
