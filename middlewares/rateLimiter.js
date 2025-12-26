import rateLimit from "express-rate-limit";

/**
 * Standard Rate Limiter
 * Applied to general API endpoints to prevent abuse
 * Limit: 100 requests per 15 minutes per IP
 */
export const standardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        success: false,
        error: "Too many requests, please try again later.",
        code: "TOO_MANY_REQUESTS"
    }
});

/**
 * Auth Rate Limiter
 * Applied to sensitive endpoints (Login, Register, OTP/SMS)
 * Limit: 20 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20, // Strict limit for auth/sms routes
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        success: false,
        error: "Too many login/verification attempts, please try again later.",
        code: "TOO_MANY_AUTH_ATTEMPTS"
    }
});

export default {
    standardLimiter,
    authLimiter
};
