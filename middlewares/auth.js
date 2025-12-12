import jwt from "jsonwebtoken";
import User from "../models/expertInformation.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access-secret";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh-secret";

/**
 * Middleware to verify JWT access token
 * Attaches user ID to req.userId on success
 */
export const verifyAccessToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'No token provided',
                code: 'NO_TOKEN'
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
            req.userId = decoded.id;
            req.token = token;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Access token expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

/**
 * Optional auth middleware - doesn't fail if no token
 * Useful for routes that work with or without auth
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
                req.userId = decoded.id;
                req.token = token;
            } catch {
                // Token invalid, but continue without auth
                req.userId = null;
            }
        }
        next();
    } catch (error) {
        next();
    }
};

/**
 * Verify refresh token
 * Returns decoded payload or null if invalid
 */
export const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, REFRESH_TOKEN_SECRET);
    } catch (error) {
        return null;
    }
};

/**
 * Middleware to check if authenticated user matches route userId
 */
export const verifyUserMatch = (req, res, next) => {
    const routeUserId = req.params.userId;

    if (!req.userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Check if authenticated user matches the route user
    if (routeUserId && req.userId !== routeUserId) {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }

    next();
};

export default {
    verifyAccessToken,
    verifyRefreshToken,
    optionalAuth,
    verifyUserMatch
};
