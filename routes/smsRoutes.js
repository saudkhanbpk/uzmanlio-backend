// routes/smsRoutes.js
import express from 'express';
import { sendSmsMessage, sendOtpMessage } from '../controllers/smsController.js';
// import { verifyToken } from '../middlewares/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiter for OTP requests (prevent abuse)
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per 15 minutes per IP
    message: {
        success: false,
        error: 'Too many OTP requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for general SMS requests
const smsLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute per IP
    message: {
        success: false,
        error: 'Too many SMS requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * @route   POST /api/sms/send
 * @desc    Send SMS message (authenticated users only)
 * @access  Private
 */
router.post('/send', smsLimiter, sendSmsMessage);

/**
 * @route   POST /api/sms/send-otp
 * @desc    Send OTP SMS (public endpoint with strict rate limiting)
 * @access  Public
 */
router.post('/send-otp', otpLimiter, sendOtpMessage);

export default router;
