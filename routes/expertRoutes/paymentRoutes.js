import express from 'express';
import {
    getExpertEarningsStats,
    getMonthlyRevenue,
    getExpertPaymentOrders
} from '../../services/paymentService.js';

const router = express.Router();

/**
 * GET /api/expert/:userId/payments/stats
 * Get earnings statistics for an expert
 */
router.get('/:userId/payments/stats', async (req, res) => {
    try {
        const { userId } = req.params;
        const stats = await getExpertEarningsStats(userId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching payment stats:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch payment statistics'
        });
    }
});

/**
 * GET /api/expert/:userId/payments/monthly-revenue
 * Get monthly revenue data for an expert
 * Query params: year (optional, defaults to current year)
 */
router.get('/:userId/payments/monthly-revenue', async (req, res) => {
    try {
        const { userId } = req.params;
        const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

        const monthlyData = await getMonthlyRevenue(userId, year);

        res.json({
            success: true,
            data: monthlyData,
            year
        });
    } catch (error) {
        console.error('Error fetching monthly revenue:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch monthly revenue'
        });
    }
});

/**
 * GET /api/expert/:userId/payments/orders
 * Get all payment orders for an expert
 * Query params: status, orderSource, startDate, endDate
 */
router.get('/:userId/payments/orders', async (req, res) => {
    try {
        const { userId } = req.params;
        const filters = {
            status: req.query.status,
            orderSource: req.query.orderSource,
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };

        // Remove undefined filters
        Object.keys(filters).forEach(key => {
            if (filters[key] === undefined) {
                delete filters[key];
            }
        });

        const orders = await getExpertPaymentOrders(userId, filters);

        res.json({
            success: true,
            data: orders,
            count: orders.length
        });
    } catch (error) {
        console.error('Error fetching payment orders:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch payment orders'
        });
    }
});

export default router;
