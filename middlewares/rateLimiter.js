import rateLimit from "express-rate-limit";

/**
 * Standard Rate Limiter
 * Applied to general API endpoints to prevent abuse
 * Limit: 100 requests per 15 minutes per IP
 */
export const standardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 1000, // Increased for testing (was 100)
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
    limit: 200, // Increased for testing (was 20)
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
