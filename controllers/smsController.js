// controllers/smsController.js
import { sendSms, sendOtp } from '../services/netgsmService.js';

/**
 * Send SMS message
 * POST /api/sms/send
 * @body {phone: string, message: string}
 */
export const sendSmsMessage = async (req, res) => {
    try {
        const { phone, message } = req.body;

        // Validate input
        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                error: 'Phone number and message are required'
            });
        }

        if (message.length > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Message is too long (max 1000 characters)'
            });
        }

        // Send SMS
        const result = await sendSms(phone, message);

        if (result.success) {
            return res.status(200).json({
                success: true,
                jobID: result.jobID,
                message: 'SMS sent successfully'
            });
        } else {
            return res.status(500).json({
                success: false,
                error: result.error || 'Failed to send SMS',
                code: result.code
            });
        }

    } catch (error) {
        console.error('❌ SMS Controller Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error while sending SMS'
        });
    }
};

/**
 * Send OTP SMS
 * POST /api/sms/send-otp
 * @body {phone: string, otp: string}
 */
export const sendOtpMessage = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        // Validate input
        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                error: 'Phone number and OTP code are required'
            });
        }

        // Validate OTP format (should be numeric and reasonable length)
        if (!/^\d{4,8}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid OTP format (must be 4-8 digits)'
            });
        }

        // Send OTP SMS
        const result = await sendOtp(phone, otp);

        if (result.success) {
            return res.status(200).json({
                success: true,
                jobID: result.jobID,
                message: 'OTP sent successfully'
            });
        } else {
            return res.status(500).json({
                success: false,
                error: result.error || 'Failed to send OTP',
                code: result.code
            });
        }

    } catch (error) {
        console.error('❌ OTP SMS Controller Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error while sending OTP'
        });
    }
};
