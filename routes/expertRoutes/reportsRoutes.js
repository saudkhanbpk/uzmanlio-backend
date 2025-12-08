import express from 'express';
import {
    getExpertReportsSummary,
    getAnalyticsDataByPeriod,
    getTopServices
} from '../../services/reportsService.js';
import { getPageViewsByPeriod } from '../../services/googleAnalyticsService.js';

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

        // Try to get page views from Google Analytics
        let pageViews = 0;
        try {
            const viewsData = await getPageViewsByPeriod('monthly');
            pageViews = viewsData.reduce((sum, views) => sum + views, 0);
        } catch (error) {
            console.warn('Could not fetch Google Analytics data:', error.message);
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

        // Try to get page views from Google Analytics
        try {
            const pageViews = await getPageViewsByPeriod(period, year);
            if (pageViews && pageViews.length > 0) {
                analyticsData.data.ziyaret_sayisi = pageViews;
            }
        } catch (error) {
            console.warn('Could not fetch Google Analytics data:', error.message);
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

export default router;
