import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../../models/expertInformation.js';
import Institution from '../../models/institution.js';
import {
    getExpertProfileViews,
    getExpertProfileViewsByPeriod,
    getInstitutionProfileViews,
    getInstitutionProfileViewsByPeriod,
    getAggregatedExpertAnalytics,
    getDetailedAnalytics,
    getExpertRealtimeVisitors
} from '../../services/googleAnalyticsService.js';

const router = express.Router();

// Token secret - fallback provided but should be set in .env for production
if (!process.env.ACCESS_TOKEN_SECRET) {
    console.warn("⚠️ WARNING: ACCESS_TOKEN_SECRET not set in .env - using fallback value.");
}
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access-secret";

/**
 * Authentication middleware
 */
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log("🔐 Analytics Auth - Full Authorization header:", authHeader);
    console.log("🔐 Analytics Auth - Extracted token (first 50 chars):", token ? token.substring(0, 50) + "..." : "NO TOKEN");
    console.log("🔐 Analytics Auth - Token length:", token ? token.length : 0);

    if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
        console.log("🔐 Analytics Auth - Token decoded successfully, user ID:", decoded.id);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.log("🔐 Analytics Auth - Token verification FAILED:", error.message);
        return res.status(403).json({ success: false, error: 'Invalid token' });
    }
};

/**
 * Helper to get date range based on period
 */
const getDateRange = (period, year) => {
    const today = new Date();
    let startDate, endDate;

    if (period === 'daily') {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        startDate = sevenDaysAgo.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
    } else if (period === 'weekly') {
        const sixWeeksAgo = new Date(today);
        sixWeeksAgo.setDate(today.getDate() - 42);
        startDate = sixWeeksAgo.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
    } else if (period === 'monthly') {
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
    } else {
        // Custom date range - expect startDate and endDate in query
        startDate = null;
        endDate = null;
    }

    return { startDate, endDate };
};

/**
 * GET /api/analytics/expert/:expertId/profile-views
 * Get profile views for an expert
 * - Experts can only access their own analytics
 * - Admins can access any expert in their institution
 */
router.get('/expert/:expertId/profile-views', authenticateToken, async (req, res) => {
    try {
        const { expertId } = req.params;
        const { period = 'monthly', year = new Date().getFullYear(), startDate, endDate } = req.query;
        const currentUser = req.user;

        // Check authorization
        const isOwnProfile = currentUser._id.toString() === expertId;
        const isAdmin = currentUser.subscription?.isAdmin === true;

        // Check if admin has access to this expert
        let hasAdminAccess = false;
        if (isAdmin && !isOwnProfile) {
            const institution = await Institution.findOne({ Admin: currentUser._id });
            if (institution) {
                const expertUser = await User.findById(expertId);
                hasAdminAccess = expertUser?.subscription?.institutionId?.toString() === institution._id.toString();
            }
        }

        if (!isOwnProfile && !hasAdminAccess) {
            return res.status(403).json({
                success: false,
                error: 'You can only view your own analytics'
            });
        }

        // Get analytics data
        let analyticsData;
        if (startDate && endDate) {
            analyticsData = await getExpertProfileViews(expertId, startDate, endDate);
        } else {
            const dateRange = getDateRange(period, parseInt(year));
            if (dateRange.startDate) {
                analyticsData = await getExpertProfileViews(expertId, dateRange.startDate, dateRange.endDate);
            } else {
                analyticsData = await getExpertProfileViewsByPeriod(expertId, period, parseInt(year));
                analyticsData = { success: true, data: analyticsData };
            }
        }

        res.json({
            success: true,
            expertId,
            period,
            year,
            ...analyticsData
        });

    } catch (error) {
        console.error('Error fetching expert analytics:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch analytics'
        });
    }
});

/**
 * GET /api/analytics/expert/:expertId/realtime
 * Get real-time visitors for an expert's profile
 */
router.get('/expert/:expertId/realtime', authenticateToken, async (req, res) => {
    try {
        const { expertId } = req.params;
        const currentUser = req.user;

        // Check authorization
        const isOwnProfile = currentUser._id.toString() === expertId;
        const isAdmin = currentUser.subscription?.isAdmin === true;

        if (!isOwnProfile && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'You can only view your own analytics'
            });
        }

        const realtimeData = await getExpertRealtimeVisitors(expertId);

        res.json({
            success: true,
            expertId,
            ...realtimeData
        });

    } catch (error) {
        console.error('Error fetching real-time analytics:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch real-time analytics'
        });
    }
});

/**
 * GET /api/analytics/expert/:expertId/detailed
 * Get detailed analytics (traffic sources, devices, countries)
 */
router.get('/expert/:expertId/detailed', authenticateToken, async (req, res) => {
    try {
        const { expertId } = req.params;
        const { period = 'monthly', year = new Date().getFullYear(), startDate, endDate } = req.query;
        const currentUser = req.user;

        // Check authorization
        const isOwnProfile = currentUser._id.toString() === expertId;
        const isAdmin = currentUser.subscription?.isAdmin === true;

        if (!isOwnProfile && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'You can only view your own analytics'
            });
        }

        let dateStart, dateEnd;
        if (startDate && endDate) {
            dateStart = startDate;
            dateEnd = endDate;
        } else {
            const dateRange = getDateRange(period, parseInt(year));
            dateStart = dateRange.startDate || `${year}-01-01`;
            dateEnd = dateRange.endDate || `${year}-12-31`;
        }

        const pagePath = `/expert/${expertId}`;
        const detailedData = await getDetailedAnalytics(dateStart, dateEnd, pagePath);

        res.json({
            success: true,
            expertId,
            period,
            ...detailedData
        });

    } catch (error) {
        console.error('Error fetching detailed analytics:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch detailed analytics'
        });
    }
});

/**
 * GET /api/analytics/admin/all-experts
 * Get aggregated analytics for all experts in institution (admin only)
 */
router.get('/admin/all-experts', authenticateToken, async (req, res) => {
    try {
        const currentUser = req.user;
        const { period = 'monthly', year = new Date().getFullYear(), startDate, endDate } = req.query;

        // Check if user is admin
        if (!currentUser.subscription?.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Only institution admins can access this endpoint'
            });
        }

        // Get institution
        const institution = await Institution.findOne({ Admin: currentUser._id });
        if (!institution) {
            return res.status(404).json({
                success: false,
                error: 'Institution not found'
            });
        }

        // Get all expert IDs in the institution
        const expertIds = [];

        // Add admin's own ID
        expertIds.push(currentUser._id.toString());

        // Add sub-users
        if (institution.invitedUsers && institution.invitedUsers.length > 0) {
            institution.invitedUsers.forEach(invite => {
                if (invite.acceptedByUserId) {
                    expertIds.push(invite.acceptedByUserId.toString());
                }
            });
        }

        // Get date range
        let dateStart, dateEnd;
        if (startDate && endDate) {
            dateStart = startDate;
            dateEnd = endDate;
        } else {
            const dateRange = getDateRange(period, parseInt(year));
            dateStart = dateRange.startDate || `${year}-01-01`;
            dateEnd = dateRange.endDate || `${year}-12-31`;
        }

        // Get aggregated analytics
        const aggregatedData = await getAggregatedExpertAnalytics(expertIds, dateStart, dateEnd);

        // Enrich with expert names
        const enrichedExperts = await Promise.all(
            aggregatedData.experts.map(async (exp) => {
                const expert = await User.findById(exp.expertId).select('information.name information.surname');
                return {
                    ...exp,
                    name: expert ? `${expert.information?.name || ''} ${expert.information?.surname || ''}`.trim() : 'Unknown'
                };
            })
        );

        res.json({
            success: true,
            institutionId: institution._id,
            institutionName: institution.name,
            period,
            year,
            totalViews: aggregatedData.totalViews,
            totalSessions: aggregatedData.totalSessions,
            experts: enrichedExperts,
            startDate: dateStart,
            endDate: dateEnd
        });

    } catch (error) {
        console.error('Error fetching admin analytics:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch admin analytics'
        });
    }
});

/**
 * GET /api/analytics/admin/expert/:expertId
 * Get detailed analytics for a specific expert (admin only)
 */
router.get('/admin/expert/:expertId', authenticateToken, async (req, res) => {
    try {
        const { expertId } = req.params;
        const { period = 'monthly', year = new Date().getFullYear(), startDate, endDate } = req.query;
        const currentUser = req.user;

        // Check if user is admin
        if (!currentUser.subscription?.isAdmin) {
            return res.status(403).json({
                success: false,
                error: 'Only institution admins can access this endpoint'
            });
        }

        // Get institution
        const institution = await Institution.findOne({ Admin: currentUser._id });
        if (!institution) {
            return res.status(404).json({
                success: false,
                error: 'Institution not found'
            });
        }

        // Verify expert belongs to this institution
        const expertUser = await User.findById(expertId);
        if (!expertUser) {
            return res.status(404).json({
                success: false,
                error: 'Expert not found'
            });
        }

        const belongsToInstitution =
            expertUser._id.toString() === currentUser._id.toString() ||
            expertUser.subscription?.institutionId?.toString() === institution._id.toString();

        if (!belongsToInstitution) {
            return res.status(403).json({
                success: false,
                error: 'Expert does not belong to your institution'
            });
        }

        // Get date range
        let dateStart, dateEnd;
        if (startDate && endDate) {
            dateStart = startDate;
            dateEnd = endDate;
        } else {
            const dateRange = getDateRange(period, parseInt(year));
            dateStart = dateRange.startDate || `${year}-01-01`;
            dateEnd = dateRange.endDate || `${year}-12-31`;
        }

        // Get profile views
        const profileViews = await getExpertProfileViews(expertId, dateStart, dateEnd);

        // Get detailed analytics
        const pagePath = `/expert/${expertId}`;
        const detailedData = await getDetailedAnalytics(dateStart, dateEnd, pagePath);

        res.json({
            success: true,
            expertId,
            expertName: `${expertUser.information?.name || ''} ${expertUser.information?.surname || ''}`.trim(),
            period,
            year,
            profileViews,
            ...detailedData
        });

    } catch (error) {
        console.error('Error fetching admin expert analytics:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch admin expert analytics'
        });
    }
});

/**
 * GET /api/analytics/institution/:institutionId/profile-views
 * Get profile views for an institution page
 */
router.get('/institution/:institutionId/profile-views', authenticateToken, async (req, res) => {
    try {
        const { institutionId } = req.params;
        const { period = 'monthly', year = new Date().getFullYear(), startDate, endDate } = req.query;
        const currentUser = req.user;

        // Check if user is admin of this institution
        const institution = await Institution.findById(institutionId);
        if (!institution) {
            return res.status(404).json({
                success: false,
                error: 'Institution not found'
            });
        }

        if (institution.Admin.toString() !== currentUser._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'Only institution admin can view institution analytics'
            });
        }

        // Get date range
        let dateStart, dateEnd;
        if (startDate && endDate) {
            dateStart = startDate;
            dateEnd = endDate;
        } else {
            const dateRange = getDateRange(period, parseInt(year));
            dateStart = dateRange.startDate || `${year}-01-01`;
            dateEnd = dateRange.endDate || `${year}-12-31`;
        }

        const analyticsData = await getInstitutionProfileViews(institutionId, dateStart, dateEnd);

        res.json({
            success: true,
            institutionId,
            institutionName: institution.name,
            period,
            year,
            ...analyticsData
        });

    } catch (error) {
        console.error('Error fetching institution analytics:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch institution analytics'
        });
    }
});

export default router;
