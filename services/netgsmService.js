// services/netgsmService.js
// NetGSM SMS sender using official @netgsm/sms SDK
import { Netgsm } from '@netgsm/sms';

// Environment variables
const NETGSM_USERCODE = process.env.NETGSM_USERCODE || process.env.NETGSM_USERNAME;
const NETGSM_PASSWORD = process.env.NETGSM_PASSWORD;
const NETGSM_MSGHEADER = process.env.NETGSM_MSGHEADER;

// Initialize NetGSM client
let netgsmClient = null;

function getClient() {
    if (!netgsmClient) {
        if (!NETGSM_USERCODE || !NETGSM_PASSWORD) {
            throw new Error('NetGSM credentials not configured');
        }

        console.log('Initializing NetGSM client with username:', NETGSM_USERCODE);

        netgsmClient = new Netgsm({
            username: NETGSM_USERCODE,
            password: NETGSM_PASSWORD,
        });

        console.log('NetGSM client initialized:', !!netgsmClient);
        console.log('sendRestSms method exists:', typeof netgsmClient.sendRestSms);
    }
    return netgsmClient;
}

/**
 * Send SMS via NetGSM SDK
 * @param {string} phone - Phone number (10 digits, can have leading 0)
 * @param {string} message - SMS message content
 * @returns {Promise<{success: boolean, jobID?: string, error?: string, code?: string}>}
 */
export async function sendSms(phone, message) {
    // Validate environment variables
    if (!NETGSM_USERCODE || !NETGSM_PASSWORD) {
        console.error('NetGSM credentials not configured');
        return {
            success: false,
            error: 'SMS service not configured. Please contact support.'
        };
    }

    if (!NETGSM_MSGHEADER) {
        console.error('NetGSM MsgHeader not configured');
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
        const client = getClient();

        // Check if message contains Turkish characters
        const hasTurkishChars = /[ğüşıöçĞÜŞİÖÇ]/g.test(message);

        // Prepare message object as SDK expects
        const messageData = {
            msg: message,
            no: formattedPhone
        };

        console.log('Sending SMS with data:', { msgheader: NETGSM_MSGHEADER, messages: [messageData], encoding: hasTurkishChars ? 'TR' : undefined });

        // Send SMS using SDK - correct method is sendRestSms
        const response = await client.sendRestSms({
            msgheader: NETGSM_MSGHEADER,
            messages: [messageData],
            ...(hasTurkishChars && { encoding: 'TR' }) // Add encoding only if Turkish chars present
        });

        console.log('NetGSM API response:', response);

        // SDK returns { jobid, code, description }
        // Code '00' means success
        if (response.code === '00' || response.jobid) {
            return {
                success: true,
                jobID: response.jobid
            };
        } else {
            // Map error codes
            const errorMessages = {
                '20': 'Message text error or too long.',
                '30': 'Invalid credentials or API access restricted.',
                '40': 'Sender name (Header) not defined.',
                '50': 'Balance insufficient.',
                '70': 'Invalid parameters.',
                '80': 'Sending limit exceeded.',
                '85': 'Duplicate submission limit.'
            };

            const detailedError = errorMessages[response.code] || response.description || 'Unknown error';

            return {
                success: false,
                error: detailedError,
                code: response.code
            };
        }

    } catch (err) {
        console.error('NetGSM SDK error:', err);

        // The SDK throws errors with { status, code, jobid, description } structure
        if (err.code) {
            const errorMessages = {
                '20': 'Message text error or too long.',
                '30': 'Invalid credentials or API access restricted.',
                '40': 'Sender name (Header) not defined.',
                '50': 'Balance insufficient.',
                '70': 'Invalid parameters.',
                '80': 'Sending limit exceeded.',
                '85': 'Duplicate submission limit.'
            };

            const detailedError = errorMessages[err.code] || err.description || 'Unknown error';

            return {
                success: false,
                error: detailedError,
                code: err.code
            };
        }

        // Handle other SDK errors
        if (err.response?.data) {
            return {
                success: false,
                error: err.response.data.description || 'API Error',
                code: err.response.data.code
            };
        }

        return {
            success: false,
            error: err.message || 'Failed to send SMS'
        };
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
