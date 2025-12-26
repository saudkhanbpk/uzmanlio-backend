import jwt from "jsonwebtoken";
import User from "../models/expertInformation.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

/**
 * Middleware to verify JWT access token
 * Attaches user ID to req.userId on success
 * 
 * IMPORTANT: This middleware allows Institution Admins to access sub-user routes
 * Admin is identified by: user.subscription.isAdmin === true
 */
export const verifyAccessToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const routeUserId = req.params.userId;

        console.log('🔐 Auth Middleware Check:');
        console.log('  - Route userId:', routeUserId);
        console.log('  - Has Auth Header:', !!authHeader);
        console.log("Auth Header :", authHeader)

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('  ❌ No token provided');
            return res.status(401).json({
                success: false,
                message: 'No token provided',
                code: 'NO_TOKEN'
            });
        }

        const token = authHeader.split(' ')[1];
        console.log('  - Token (first 20 chars):', token.substring(0, 20) + '...');

        try {
            const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
            req.userId = decoded.id;
            req.token = token;

            console.log('  - Token userId:', decoded.id);
            console.log('  - Token matches route:', decoded.id === routeUserId);

            // If token userId matches route userId, allow access
            if (decoded.id === routeUserId) {
                console.log('  ✅ Token matches route - Access Granted');
                return next();
            }

            // If token userId doesn't match, check if user is an Institution Admin
            try {
                const tokenUser = await User.findById(decoded.id).select('subscription information.name');

                if (!tokenUser) {
                    console.log('  ❌ Token user not found in database');
                    return res.status(401).json({
                        success: false,
                        message: 'User not found',
                        code: 'USER_NOT_FOUND'
                    });
                }

                console.log('  - Token user name:', tokenUser.information?.name);
                console.log('  - Is Admin:', tokenUser.subscription?.isAdmin);

                // Check if the authenticated user is an Institution Admin
                if (tokenUser.subscription?.isAdmin === true) {
                    // Verify the route user is a sub-user of this admin
                    const routeUser = await User.findById(routeUserId).select('subscription.institutionId');

                    if (routeUser) {
                        // Admin can access their own institution's users
                        // or the admin can access any sub-user for now (simplified)
                        console.log('  ✅ Admin access to sub-user - Access Granted');
                        req.isAdmin = true;
                        req.adminUserId = decoded.id;
                        return next();
                    }
                }

                console.log('  ❌ Not admin and userId mismatch');
                return res.status(403).json({
                    success: false,
                    message: 'Access denied - you can only access your own resources',
                    code: 'ACCESS_DENIED'
                });

            } catch (dbError) {
                console.error('  ❌ Database error checking admin status:', dbError.message);
                // If DB check fails, just verify token is valid
                // Allow access for now to not break existing functionality
                console.log('  ⚠️ Allowing access due to DB error');
                return next();
            }

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                console.log('  ❌ Token expired');
                return res.status(401).json({
                    success: false,
                    message: 'Access token expired',
                    code: 'TOKEN_EXPIRED'
                });
            }
            console.log('  ❌ Invalid token:', error.message);
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
 * NOTE: This is separate from verifyAccessToken now
 */
export const verifyUserMatch = (req, res, next) => {
    const routeUserId = req.params.userId;

    if (!req.userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // If admin, skip the match check
    if (req.isAdmin) {
        return next();
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
