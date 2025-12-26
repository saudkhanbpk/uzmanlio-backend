// services/netgsmService.js
// Netgsm SMS sender helper (ESM version)
// Usage: sendSms(phone, message)
import axios from 'axios';
import xml2js from 'xml2js';

const NETGSM_USERCODE = process.env.NETGSM_USERCODE;
const NETGSM_PASSWORD = process.env.NETGSM_PASSWORD;
const NETGSM_MSGHEADER = process.env.NETGSM_MSGHEADER;
const NETGSM_OTP_URL = process.env.NETGSM_OTP_URL;

// Debug: Log the actual values being used
console.log('🔧 Netgsm Configuration:');
console.log('   URL:', NETGSM_OTP_URL);
console.log('   Usercode:', NETGSM_USERCODE);
console.log('   Password:', NETGSM_PASSWORD ? NETGSM_PASSWORD.substring(0, 5) + '*' : 'NOT SET');
console.log('   Msgheader:', NETGSM_MSGHEADER);

/**
 * Send SMS via NetGSM API
 * @param {string} phone - Phone number (10 digits, can have leading 0)
 * @param {string} message - SMS message content
 * @returns {Promise<{success: boolean, jobID?: string, error?: string, code?: string}>}
 */
export async function sendSms(phone, message) {
    // Validate environment variables
    if (!NETGSM_USERCODE || !NETGSM_PASSWORD) {
        console.error('❌ Netgsm credentials not configured');
        return {
            success: false,
            error: 'SMS service not configured. Please contact support.'
        };
    }

    // Validate and format phone number
    if (!phone || phone.length < 10) {
        return {
            success: false,
            error: 'Invalid phone number format'
        };
    }

    // Format phone number for Netgsm (get last 10 digits, must start with 5)
    let formattedPhone = phone.toString().replace(/\D/g, '').slice(-10);

    if (formattedPhone.length !== 10 || !formattedPhone.startsWith('5')) {
        return {
            success: false,
            error: 'Phone number must be 10 digits starting with 5 (Turkish mobile format)'
        };
    }

    console.log('📱 Original phone:', phone);
    console.log('📱 Formatted phone:', formattedPhone);

    console.log('📱 Using msgheader:', NETGSM_MSGHEADER);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mainbody>
  <header>
    <company dil="TR">Netgsm</company>
    <usercode>${NETGSM_USERCODE}</usercode>
    <password>${NETGSM_PASSWORD}</password>
    <type>1:n</type>
    <msgheader>${NETGSM_MSGHEADER}</msgheader>
  </header>
  <body>
    <msg><![CDATA[${message}]]></msg>
    <no>${formattedPhone}</no>
  </body>
</mainbody>`;

    console.log('📤 Sending SMS to Netgsm API...');
    console.log('📱 Phone:', phone);
    console.log('💬 Message:', message);
    console.log('🔑 Using usercode:', NETGSM_USERCODE);
    console.log('🔑 Using password:', NETGSM_PASSWORD ? 'SET' : 'NOT SET');
    console.log('📋 XML Request:', xml);

    try {
        let response = await axios.post(NETGSM_OTP_URL, xml, {
            headers: {
                'Content-Type': 'text/xml',
                'Accept': 'application/xml-dtd'
            },
            timeout: 30000, // Increased to 30 seconds
        });

        console.log('📥 Netgsm raw response:', response.data);

        // Netgsm can return plain text errors or XML. We try to handle both.
        let result = {};
        let code, jobID, error;

        // Try parsing as XML
        try {
            const parsed = await xml2js.parseStringPromise(response.data, { explicitArray: false });
            if (parsed && parsed.mainbody) {
                // If it's the full XML response structure
                code = parsed.mainbody.header.responseCode || parsed.mainbody.body.msg; // Structure varies, need to be careful
                // Actually NetGSM OTP usually returns simple text or specific XML based on endpoint. 
                // Let's assume standard structure: <main><code/><jobID/><error/></main>
                if (parsed.main) {
                    code = parsed.main.code;
                    jobID = parsed.main.jobID;
                    error = parsed.main.error;
                }
            } else if (parsed && parsed.xml) {
                // Format observed previously
                code = parsed.xml.main.code;
                jobID = parsed.xml.main.jobID;
                error = parsed.xml.main.error;
            }
        } catch (parseError) {
            console.log('⚠️ Response is not XML, treating as plain text');
            // If not XML, might be plain text code like "30" or "00 123456"
            const parts = response.data.toString().trim().split(' ');
            if (parts.length > 0) {
                code = parts[0];
                if (parts.length > 1) jobID = parts[1];
            }
        }

        // Check for error 32 (operator code error)
        if (code === '32') {
            console.log('⚠ Error 32: Phone operator not supported by msgheader');
        }

        console.log('📊 Parsed response:', { code, jobID, error });

        // Netgsm error codes with user-friendly messages
        const errorMessages = {
            '20': 'Mesaj metninde ki problemden dolayı gönderilemediği durumda alınan hatadır.',
            '30': 'Geçersiz kullanıcı adı, şifre veya kullanıcınızın API erişim izninin olmadığı durumdur.',
            '32': 'Bu telefon numarası operatörü şu anda desteklenmiyor. Lütfen farklı bir numara deneyin.',
            '40': 'Mesaj başlığınızın (Gönderici Adınızın) sistemde tanımlı olmadığı durumdur.',
            '50': 'Abone hesabınızda yeterli kredinin olmadığı durumdur.',
            '60': 'Kota aşımı. Günlük gönderim limitinizi aştığınız durumdur.',
            '70': 'Hatalı sorgulama. Gönderdiğiniz parametrelerden birisi hatalıdır.'
        };

        if (code === '00' || code === '0') {
            return { success: true, jobID };
        } else {
            const detailedError = errorMessages[code] || error || 'Unknown error';
            console.error(`❌ Netgsm Error Code ${code}: ${detailedError}`);

            // For error 32, provide a user-friendly message
            if (code === '32') {
                return {
                    success: false,
                    error: 'Bu telefon numarası operatörü şu anda desteklenmiyor. Lütfen farklı bir numara deneyin veya destek ile iletişime geçin.',
                    code,
                    technical_error: error
                };
            }

            return { success: false, error: detailedError, code };
        }
    } catch (err) {
        console.error('❌ Netgsm API error:', err.message);
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

