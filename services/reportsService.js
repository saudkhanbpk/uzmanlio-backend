import Order from '../models/orders.js';
import User from '../models/expertInformation.js';
import mongoose from 'mongoose';

/**
 * Get comprehensive reports summary for an expert
 * @param {String} expertId - The expert's user ID
 * @returns {Object} Summary including income, appointments, customers
 */
export const getExpertReportsSummary = async (expertId) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(expertId)) {
            throw new Error('Invalid expert ID');
        }

        // Fetch expert data
        const expert = await User.findById(expertId);
        if (!expert) {
            throw new Error('Expert not found');
        }

        // Calculate total income from all completed orders
        const orders = await Order.find({
            'expertInfo.expertId': expertId,
            'paymentInfo.status': { $in: ['completed', 'paid'] }
        });

        let totalIncome = 0;
        orders.forEach(order => {
            totalIncome += order.orderDetails.totalAmount || 0;
        });

        // Count appointments (events)
        const numberOfAppointments = expert.events ? expert.events.length : 0;

        // Count customers
        const numberOfCustomers = expert.customers ? expert.customers.length : 0;

        return {
            totalIncome,
            numberOfAppointments,
            numberOfCustomers,
            totalOrders: orders.length
        };
    } catch (error) {
        console.error('Error getting expert reports summary:', error);
        throw error;
    }
};

/**
 * Get analytics data aggregated by time period
 * @param {String} expertId - The expert's user ID
 * @param {String} period - Time period: 'daily', 'weekly', or 'monthly'
 * @param {Number} year - Year for the data (defaults to current year)
 * @returns {Object} Analytics data with income, appointments, customers, visits
 */
export const getAnalyticsDataByPeriod = async (expertId, period = 'monthly', year = new Date().getFullYear()) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(expertId)) {
            throw new Error('Invalid expert ID');
        }

        const expert = await User.findById(expertId);
        if (!expert) {
            throw new Error('Expert not found');
        }

        let labels = [];
        let incomeData = [];
        let appointmentsData = [];
        let customersData = [];

        if (period === 'daily') {
            // Last 7 days
            labels = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
            const today = new Date();
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 6);

            // Get orders for last 7 days
            const orders = await Order.find({
                'expertInfo.expertId': expertId,
                'paymentInfo.status': { $in: ['completed', 'paid'] },
                'orderDetails.orderDate': {
                    $gte: sevenDaysAgo,
                    $lte: today
                }
            });

            // Initialize data arrays
            incomeData = new Array(7).fill(0);
            appointmentsData = new Array(7).fill(0);
            customersData = new Array(7).fill(0);

            // Aggregate by day
            orders.forEach(order => {
                const orderDate = new Date(order.orderDetails.orderDate);
                const dayIndex = (orderDate.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
                incomeData[dayIndex] += order.orderDetails.totalAmount || 0;
            });

            // Count appointments by day
            if (expert.events) {
                expert.events.forEach(event => {
                    const eventDate = new Date(event.date);
                    if (eventDate >= sevenDaysAgo && eventDate <= today) {
                        const dayIndex = (eventDate.getDay() + 6) % 7;
                        appointmentsData[dayIndex]++;
                    }
                });
            }

        } else if (period === 'weekly') {
            // Last 6 weeks
            labels = ['1. Hafta', '2. Hafta', '3. Hafta', '4. Hafta', '5. Hafta', '6. Hafta'];
            const today = new Date();
            const sixWeeksAgo = new Date(today);
            sixWeeksAgo.setDate(today.getDate() - 42);

            const orders = await Order.find({
                'expertInfo.expertId': expertId,
                'paymentInfo.status': { $in: ['completed', 'paid'] },
                'orderDetails.orderDate': {
                    $gte: sixWeeksAgo,
                    $lte: today
                }
            });

            incomeData = new Array(6).fill(0);
            appointmentsData = new Array(6).fill(0);
            customersData = new Array(6).fill(0);

            // Aggregate by week
            orders.forEach(order => {
                const orderDate = new Date(order.orderDetails.orderDate);
                const daysDiff = Math.floor((today - orderDate) / (1000 * 60 * 60 * 24));
                const weekIndex = Math.min(Math.floor(daysDiff / 7), 5);
                incomeData[5 - weekIndex] += order.orderDetails.totalAmount || 0;
            });

            // Count appointments by week
            if (expert.events) {
                expert.events.forEach(event => {
                    const eventDate = new Date(event.date);
                    if (eventDate >= sixWeeksAgo && eventDate <= today) {
                        const daysDiff = Math.floor((today - eventDate) / (1000 * 60 * 60 * 24));
                        const weekIndex = Math.min(Math.floor(daysDiff / 7), 5);
                        appointmentsData[5 - weekIndex]++;
                    }
                });
            }

        } else if (period === 'monthly') {
            // Last 6 months
            labels = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31, 23, 59, 59);

            const orders = await Order.find({
                'expertInfo.expertId': expertId,
                'paymentInfo.status': { $in: ['completed', 'paid'] },
                'orderDetails.orderDate': {
                    $gte: startDate,
                    $lte: endDate
                }
            });

            incomeData = new Array(12).fill(0);
            appointmentsData = new Array(12).fill(0);
            customersData = new Array(12).fill(0);

            // Aggregate by month
            orders.forEach(order => {
                const orderDate = new Date(order.orderDetails.orderDate);
                const monthIndex = orderDate.getMonth();
                incomeData[monthIndex] += order.orderDetails.totalAmount || 0;
            });

            // Count appointments by month
            if (expert.events) {
                expert.events.forEach(event => {
                    const eventDate = new Date(event.date);
                    if (eventDate >= startDate && eventDate <= endDate) {
                        const monthIndex = eventDate.getMonth();
                        appointmentsData[monthIndex]++;
                    }
                });
            }

            // Count new customers by month
            if (expert.customers) {
                expert.customers.forEach(customer => {
                    if (customer.addedAt) {
                        const addedDate = new Date(customer.addedAt);
                        if (addedDate >= startDate && addedDate <= endDate) {
                            const monthIndex = addedDate.getMonth();
                            customersData[monthIndex]++;
                        }
                    }
                });
            }
        }

        return {
            period,
            labels,
            data: {
                gelir: incomeData,
                randevu_sayisi: appointmentsData,
                musteri_sayisi: customersData,
                ziyaret_sayisi: new Array(labels.length).fill(0) // Placeholder for Google Analytics
            }
        };
    } catch (error) {
        console.error('Error getting analytics data by period:', error);
        throw error;
    }
};

/**
 * Get top performing services/packages by appointment count
 * @param {String} expertId - The expert's user ID
 * @param {Number} limit - Number of top services to return
 * @returns {Array} Top services with appointment counts
 */
export const getTopServices = async (expertId, limit = 5) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(expertId)) {
            throw new Error('Invalid expert ID');
        }

        const expert = await User.findById(expertId);
        if (!expert) {
            throw new Error('Expert not found');
        }

        // Count appointments by service/package
        const serviceCounts = {};

        if (expert.events) {
            expert.events.forEach(event => {
                let serviceName = 'Unknown Service';

                // Try to get service name from the event
                if (event.service && event.service.name) {
                    serviceName = event.service.name;
                } else if (event.package && event.package.name) {
                    serviceName = event.package.name;
                } else if (event.title) {
                    serviceName = event.title;
                }

                if (!serviceCounts[serviceName]) {
                    serviceCounts[serviceName] = 0;
                }
                serviceCounts[serviceName]++;
            });
        }

        // Convert to array and sort by count
        const topServices = Object.entries(serviceCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);

        return topServices;
    } catch (error) {
        console.error('Error getting top services:', error);
        throw error;
    }
};

export default {
    getExpertReportsSummary,
    getAnalyticsDataByPeriod,
    getTopServices
};
