// services/netgsmService.js
// Netgsm SMS sender helper (Direct REST API v2)
// Usage: sendSms(phone, message)
import axios from 'axios';

// Environment variables
const NETGSM_USERNAME = process.env.NETGSM_USERCODE || process.env.NETGSM_USERNAME;
const NETGSM_PASSWORD = process.env.NETGSM_PASSWORD;
const NETGSM_MSGHEADER = process.env.NETGSM_MSGHEADER;
const NETGSM_API_URL = 'https://api.netgsm.com.tr/sms/rest/v2/send';

/**
 * Send SMS via NetGSM API
 * @param {string} phone - Phone number (10 digits, can have leading 0)
 * @param {string} message - SMS message content
 * @returns {Promise<{success: boolean, jobID?: string, error?: string, code?: string}>}
 */
export async function sendSms(phone, message) {
    // Validate environment variables
    if (!NETGSM_USERNAME || !NETGSM_PASSWORD) {
        console.error('Netgsm credentials not configured');
        return {
            success: false,
            error: 'SMS service not configured. Please contact support.'
        };
    }

    if (!NETGSM_MSGHEADER) {
        console.error('Netgsm MsgHeader not configured');
        return {
            success: false,
            error: 'SMS sender header not configured.'
        };
    }

    // Validate and format phone number
    if (!phone) {
        return {
            success: false,
            error: 'Invalid phone number format'
        };
    }

    // Format phone number
    let formattedPhone = phone.toString().replace(/\D/g, '');

    // Standardize to 10 digits or international format
    if (formattedPhone.length === 11 && formattedPhone.startsWith('05')) {
        formattedPhone = formattedPhone.substring(1);
    } else if (formattedPhone.length === 12 && formattedPhone.startsWith('905')) {
        formattedPhone = formattedPhone.substring(2);
    }

    if (formattedPhone.length !== 10 || !formattedPhone.startsWith('5')) {
        if (!formattedPhone.startsWith('00')) {
            return {
                success: false,
                error: 'Phone number must be a valid Turkish mobile number (5xxxxxxxxx)'
            };
        }
    }



    try {
        const payload = {
            msgheader: NETGSM_MSGHEADER,
            messages: [
                {
                    msg: message,
                    no: formattedPhone
                }
            ],
            encoding: 'TR', // Support Turkish characters
            iysfilter: '0' // Informational
        };

        // Basic Auth
        const auth = Buffer.from(`${NETGSM_USERNAME}:${NETGSM_PASSWORD}`).toString('base64');

        const response = await axios.post(NETGSM_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            timeout: 30000
        });

        console.log('Netgsm API response:', response.data);

        // API Response: { code: "00", jobID: "...", description: "queued" }
        const { code, jobID, description } = response.data;

        if (code === '00') {
            return {
                success: true,
                jobID: jobID || response.data['Job ID'] // Key might be "Job ID" or "jobID" based on docs/example mismatch
            };
        } else {
            // Map codes
            const errorMessages = {
                '20': 'Message text error or too long.',
                '30': 'Invalid credentials or API access restricted.',
                '40': 'Sender name (Header) not defined.',
                '50': 'Balance insufficient.',
                '70': 'Invalid parameters.',
                '80': 'Sending limit exceeded.',
                '85': 'Duplicate submission limit.'
            };

            const detailedError = errorMessages[code] || description || 'Unknown error';

            return {
                success: false,
                error: detailedError,
                code
            };
        }

    } catch (err) {
        console.error('Netgsm API request error:', err.response ? err.response.data : err.message);

        // Handle 406 or other HTTP errors that might contain the API error code
        if (err.response && err.response.data && err.response.data.code) {
            return {
                success: false,
                error: err.response.data.description || 'API Error',
                code: err.response.data.code
            };
        }

        return { success: false, error: err.message };
    }
}

/**
 * Send OTP SMS (for backward compatibility)
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 * @returns {Promise<{success: boolean, jobID?: string, error?: string, code?: string}>}
 */
export async function sendOtp(phone, otp) {
    const message = `Uzmanlio Doğrulama Kodu: ${otp}`;
    return sendSms(phone, message);
}

export function handleSmsError(result) {
    return {
        statusCode: 500,
        errorMessage: result.error || 'Failed to send SMS',
    };
}
