import Order from '../models/orders.js';
import mongoose from 'mongoose';

/**
 * Get earnings statistics for a specific expert
 * @param {String} expertId - The expert's user ID
 * @returns {Object} Statistics including total revenue, completed, pending, and refunded counts
 */
export const getExpertEarningsStats = async (expertId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(expertId)) {
            throw new Error('Invalid expert ID');
        }

        // Fetch all orders for this expert
        const orders = await Order.find({
            'expertInfo.expertId': expertId
        });

        // Calculate statistics
        const stats = {
            totalRevenue: 0,
            completedCount: 0,
            pendingCount: 0,
            refundedCount: 0,
            completedRevenue: 0,
            pendingRevenue: 0,
            totalOrders: orders.length
        };

        orders.forEach(order => {
            const amount = order.orderDetails.totalAmount || 0;
            const status = order.paymentInfo.status;

            if (status === 'completed' || status === 'paid') {
                stats.completedCount++;
                stats.completedRevenue += amount;
                stats.totalRevenue += amount;
            } else if (status === 'pending') {
                stats.pendingCount++;
                stats.pendingRevenue += amount;
            } else if (status === 'returned' || status === 'refunded') {
                stats.refundedCount++;
            }
        });

        return stats;
    } catch (error) {
        console.error('Error getting expert earnings stats:', error);
        throw error;
    }
};

/**
 * Get monthly revenue data for a specific expert
 * @param {String} expertId - The expert's user ID
 * @param {Number} year - The year to get data for (defaults to current year)
 * @returns {Array} Monthly revenue breakdown
 */
export const getMonthlyRevenue = async (expertId, year = new Date().getFullYear()) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(expertId)) {
            throw new Error('Invalid expert ID');
        }

        // Initialize monthly data
        const monthNames = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];

        const monthlyData = monthNames.map((month, index) => ({
            month,
            monthNumber: index + 1,
            earnings: 0,
            orderCount: 0
        }));

        // Fetch orders for the specified year
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);

        const orders = await Order.find({
            'expertInfo.expertId': expertId,
            'orderDetails.orderDate': {
                $gte: startDate,
                $lte: endDate
            },
            'paymentInfo.status': { $in: ['completed', 'paid'] }
        });

        // Aggregate by month
        orders.forEach(order => {
            const orderDate = new Date(order.orderDetails.orderDate);
            const monthIndex = orderDate.getMonth();

            monthlyData[monthIndex].earnings += order.orderDetails.totalAmount || 0;
            monthlyData[monthIndex].orderCount++;
        });

        return monthlyData;
    } catch (error) {
        console.error('Error getting monthly revenue:', error);
        throw error;
    }
};

/**
 * Get all payment orders for a specific expert with optional filtering
 * @param {String} expertId - The expert's user ID
 * @param {Object} filters - Optional filters (status, orderSource, startDate, endDate)
 * @returns {Array} List of orders with customer and payment details
 */
export const getExpertPaymentOrders = async (expertId, filters = {}) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(expertId)) {
            throw new Error('Invalid expert ID');
        }

        // Build query
        const query = {
            'expertInfo.expertId': expertId
        };

        // Apply filters
        if (filters.status) {
            query['paymentInfo.status'] = filters.status;
        }

        if (filters.orderSource !== undefined) {
            if (filters.orderSource === 'manual') {
                query.$or = [
                    { orderSource: null },
                    { orderSource: '' },
                    { orderSource: { $exists: false } }
                ];
            } else if (filters.orderSource === 'BookingPage') {
                query.orderSource = 'BookingPage';
            }
        }

        if (filters.startDate) {
            query['orderDetails.orderDate'] = {
                ...query['orderDetails.orderDate'],
                $gte: new Date(filters.startDate)
            };
        }

        if (filters.endDate) {
            query['orderDetails.orderDate'] = {
                ...query['orderDetails.orderDate'],
                $lte: new Date(filters.endDate)
            };
        }

        // Fetch orders and populate customer data
        const orders = await Order.find(query)
            .populate('customerId', 'name surname email phone')
            .sort({ 'orderDetails.orderDate': -1 });

        // Format response
        const formattedOrders = orders.map(order => {
            // Extract service/package name
            let serviceName = 'N/A';
            if (order.orderDetails.events && order.orderDetails.events.length > 0) {
                const event = order.orderDetails.events[0];
                if (event.eventType === 'service' && event.service) {
                    serviceName = event.service.name;
                } else if (event.eventType === 'package' && event.package) {
                    serviceName = event.package.name;
                }
            }

            return {
                id: order._id,
                customerName: order.userInfo.name,
                customerId: order.customerId,
                amount: order.orderDetails.totalAmount,
                service: serviceName,
                date: order.orderDetails.orderDate,
                paymentDate: order.createdAt || order.orderDetails.orderDate,
                status: order.paymentInfo.status,
                method: order.paymentInfo.method,
                transactionId: order.paymentInfo.transactionId,
                orderSource: order.orderSource || 'manual',
                orderStatus: order.status
            };
        });

        return formattedOrders;
    } catch (error) {
        console.error('Error getting expert payment orders:', error);
        throw error;
    }
};

export default {
    getExpertEarningsStats,
    getMonthlyRevenue,
    getExpertPaymentOrders
};
