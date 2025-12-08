import { BetaAnalyticsDataClient } from '@google-analytics/data';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Google Analytics Service
 * Provides integration with Google Analytics Data API (GA4)
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Cloud Project
 * 2. Enable Google Analytics Data API
 * 3. Create a service account and download JSON credentials
 * 4. Set environment variables in .env:
 *    - GOOGLE_ANALYTICS_PROPERTY_ID=your_property_id
 *    - GOOGLE_ANALYTICS_CREDENTIALS=path/to/credentials.json
 */

let analyticsDataClient = null;

/**
 * Initialize Google Analytics client
 */
const initializeClient = () => {
    if (analyticsDataClient) {
        return analyticsDataClient;
    }

    const credentialsPath = process.env.GOOGLE_ANALYTICS_CREDENTIALS;

    if (!credentialsPath) {
        console.warn('Google Analytics credentials not configured. Set GOOGLE_ANALYTICS_CREDENTIALS in .env');
        return null;
    }

    try {
        analyticsDataClient = new BetaAnalyticsDataClient({
            keyFilename: credentialsPath
        });
        console.log('✅ Google Analytics client initialized');
        return analyticsDataClient;
    } catch (error) {
        console.error('❌ Failed to initialize Google Analytics client:', error.message);
        return null;
    }
};

/**
 * Get page views for a specific date range
 * @param {String} startDate - Start date in YYYY-MM-DD format
 * @param {String} endDate - End date in YYYY-MM-DD format
 * @param {String} pagePath - Optional page path filter (e.g., '/expert/profile')
 * @returns {Object} Page views data
 */
export const getPageViews = async (startDate, endDate, pagePath = null) => {
    try {
        const client = initializeClient();

        if (!client) {
            return {
                success: false,
                error: 'Google Analytics not configured',
                totalViews: 0,
                dailyViews: []
            };
        }

        const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

        if (!propertyId) {
            console.warn('GOOGLE_ANALYTICS_PROPERTY_ID not set in .env');
            return {
                success: false,
                error: 'Property ID not configured',
                totalViews: 0,
                dailyViews: []
            };
        }

        // Build dimension filters if page path is specified
        const dimensionFilter = pagePath ? {
            filter: {
                fieldName: 'pagePath',
                stringFilter: {
                    matchType: 'CONTAINS',
                    value: pagePath
                }
            }
        } : undefined;

        // Run the report
        const [response] = await client.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [
                {
                    startDate,
                    endDate,
                },
            ],
            dimensions: [
                {
                    name: 'date',
                },
            ],
            metrics: [
                {
                    name: 'screenPageViews',
                },
                {
                    name: 'sessions',
                },
            ],
            dimensionFilter,
        });

        // Process the response
        let totalViews = 0;
        const dailyViews = [];

        if (response.rows) {
            response.rows.forEach(row => {
                const date = row.dimensionValues[0].value;
                const views = parseInt(row.metricValues[0].value);
                const sessions = parseInt(row.metricValues[1].value);

                totalViews += views;
                dailyViews.push({
                    date,
                    views,
                    sessions
                });
            });
        }

        return {
            success: true,
            totalViews,
            dailyViews,
            startDate,
            endDate
        };

    } catch (error) {
        console.error('Error fetching Google Analytics data:', error);
        return {
            success: false,
            error: error.message,
            totalViews: 0,
            dailyViews: []
        };
    }
};

/**
 * Get page views aggregated by period
 * @param {String} period - 'daily', 'weekly', or 'monthly'
 * @param {Number} year - Year for monthly data
 * @returns {Array} Aggregated page views
 */
export const getPageViewsByPeriod = async (period = 'monthly', year = new Date().getFullYear()) => {
    try {
        let startDate, endDate;
        const today = new Date();

        if (period === 'daily') {
            // Last 7 days
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 6);
            startDate = sevenDaysAgo.toISOString().split('T')[0];
            endDate = today.toISOString().split('T')[0];
        } else if (period === 'weekly') {
            // Last 6 weeks (42 days)
            const sixWeeksAgo = new Date(today);
            sixWeeksAgo.setDate(today.getDate() - 42);
            startDate = sixWeeksAgo.toISOString().split('T')[0];
            endDate = today.toISOString().split('T')[0];
        } else {
            // Monthly - full year
            startDate = `${year}-01-01`;
            endDate = `${year}-12-31`;
        }

        const result = await getPageViews(startDate, endDate);

        if (!result.success) {
            return [];
        }

        // Aggregate data based on period
        if (period === 'daily') {
            // Return last 7 days
            return result.dailyViews.slice(-7).map(day => day.views);
        } else if (period === 'weekly') {
            // Aggregate into 6 weeks
            const weeklyData = new Array(6).fill(0);
            result.dailyViews.forEach(day => {
                const dayDate = new Date(day.date);
                const daysDiff = Math.floor((today - dayDate) / (1000 * 60 * 60 * 24));
                const weekIndex = Math.min(Math.floor(daysDiff / 7), 5);
                weeklyData[5 - weekIndex] += day.views;
            });
            return weeklyData;
        } else {
            // Aggregate into 12 months
            const monthlyData = new Array(12).fill(0);
            result.dailyViews.forEach(day => {
                const monthIndex = parseInt(day.date.substring(4, 6)) - 1;
                monthlyData[monthIndex] += day.views;
            });
            return monthlyData;
        }

    } catch (error) {
        console.error('Error getting page views by period:', error);
        return [];
    }
};

/**
 * Get expert profile page views
 * @param {String} expertId - Expert user ID
 * @param {String} startDate - Start date
 * @param {String} endDate - End date
 * @returns {Object} Page views for expert profile
 */
export const getExpertProfileViews = async (expertId, startDate, endDate) => {
    // Assuming expert profiles are at /expert/{expertId} or similar
    const pagePath = `/expert/${expertId}`;
    return await getPageViews(startDate, endDate, pagePath);
};

export default {
    getPageViews,
    getPageViewsByPeriod,
    getExpertProfileViews
};
