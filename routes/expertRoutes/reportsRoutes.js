import express from 'express';
import {
    getExpertReportsSummary,
    getAnalyticsDataByPeriod,
    getTopServices
} from '../../services/reportsService.js';
import {
    getExpertProfileViewsByPeriod,
    getExpertProfileViews
} from '../../services/googleAnalyticsService.js';

const router = express.Router();

/**
 * GET /api/expert/:userId/reports/summary
 * Get overall reports summary for an expert
 */
router.get('/:userId/reports/summary', async (req, res) => {
    try {
        const { userId } = req.params;

        // Get basic summary
        const summary = await getExpertReportsSummary(userId);

        // Try to get page views from Google Analytics for this specific expert
        let pageViews = 0;
        try {
            const viewsData = await getExpertProfileViewsByPeriod(userId, 'monthly');
            pageViews = Array.isArray(viewsData)
                ? viewsData.reduce((sum, views) => sum + views, 0)
                : 0;
        } catch (error) {
            console.warn('Could not fetch Google Analytics data for expert:', userId, error.message);
        }

        res.json({
            success: true,
            data: {
                ...summary,
                numberOfVisits: pageViews
            }
        });
    } catch (error) {
        console.error('Error fetching reports summary:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch reports summary'
        });
    }
});

/**
 * GET /api/expert/:userId/reports/analytics
 * Get analytics data aggregated by time period
 * Query params: period (daily|weekly|monthly), year (optional)
 */
router.get('/:userId/reports/analytics', async (req, res) => {
    try {
        const { userId } = req.params;
        const period = req.query.period || 'monthly';
        const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

        // Get analytics data from database
        const analyticsData = await getAnalyticsDataByPeriod(userId, period, year);

        // Try to get page views from Google Analytics for this specific expert
        try {
            const pageViews = await getExpertProfileViewsByPeriod(userId, period, year);
            if (pageViews && pageViews.length > 0) {
                analyticsData.data.ziyaret_sayisi = pageViews;
            }
        } catch (error) {
            console.warn('Could not fetch Google Analytics data for expert:', userId, error.message);
        }

        res.json({
            success: true,
            data: analyticsData
        });
    } catch (error) {
        console.error('Error fetching analytics data:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch analytics data'
        });
    }
});

/**
 * GET /api/expert/:userId/reports/top-services
 * Get top performing services by appointment count
 * Query params: limit (optional, defaults to 5)
 */
router.get('/:userId/reports/top-services', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit) : 5;

        const topServices = await getTopServices(userId, limit);

        res.json({
            success: true,
            data: topServices
        });
    } catch (error) {
        console.error('Error fetching top services:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch top services'
        });
    }
});

/**
 * GET /api/expert/:userId/reports/profile-traffic
 * Get detailed profile traffic data for an expert
 * Query params: period (daily|weekly|monthly), year (optional), startDate, endDate
 */
router.get('/:userId/reports/profile-traffic', async (req, res) => {
    try {
        const { userId } = req.params;
        const { period = 'monthly', year = new Date().getFullYear(), startDate, endDate } = req.query;

        let profileData;

        if (startDate && endDate) {
            // Custom date range
            profileData = await getExpertProfileViews(userId, startDate, endDate);
        } else {
            // Period-based
            const periodData = await getExpertProfileViewsByPeriod(userId, period, parseInt(year));
            profileData = {
                success: true,
                data: periodData,
                period,
                year
            };
        }

        res.json({
            success: true,
            userId,
            ...profileData
        });
    } catch (error) {
        console.error('Error fetching profile traffic:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch profile traffic data'
        });
    }
});

export default router;
