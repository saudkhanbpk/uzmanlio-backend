import { BetaAnalyticsDataClient } from '@google-analytics/data';
import dotenv from 'dotenv';

dotenv.config();
import path from 'path';
import fs from 'fs';

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
        console.warn('⚠️ Google Analytics credentials not configured. Set GOOGLE_ANALYTICS_CREDENTIALS in .env');
        return null;
    }

    try {
        // Log the absolute path we're trying to use (for debugging)
        const absolutePath = path.isAbsolute(credentialsPath)
            ? credentialsPath
            : path.join(process.cwd(), credentialsPath);

        console.log(`🔍 Initializing GA4 client with: ${absolutePath}`);

        if (!fs.existsSync(absolutePath)) {
            console.error(`❌ GA4 Credentials file not found at: ${absolutePath}`);
            return null;
        }

        analyticsDataClient = new BetaAnalyticsDataClient({
            keyFilename: absolutePath
        });
        console.log('✅ Google Analytics client initialized successfully');
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

        // console.log("response from Google analytics", response);

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
 * @param {String} pagePath - Optional page path filter
 * @returns {Array} Aggregated page views
 */
export const getPageViewsByPeriod = async (period = 'monthly', year = new Date().getFullYear(), pagePath = null) => {
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

        const result = await getPageViews(startDate, endDate, pagePath);

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
    // Expert profiles are tracked at /expert/{expertId}
    const pagePath = `/expert/${expertId}`;
    return await getPageViews(startDate, endDate, pagePath);
};

/**
 * Get expert profile views by period
 * @param {String} expertId - Expert user ID
 * @param {String} period - 'daily', 'weekly', or 'monthly'
 * @param {Number} year - Year for monthly data
 * @returns {Array} Aggregated page views for expert
 */
export const getExpertProfileViewsByPeriod = async (expertId, period = 'monthly', year = new Date().getFullYear()) => {
    const pagePath = `/expert/${expertId}`;
    return await getPageViewsByPeriod(period, year, pagePath);
};

/**
 * Get institution profile page views
 * @param {String} institutionId - Institution ID
 * @param {String} startDate - Start date
 * @param {String} endDate - End date
 * @returns {Object} Page views for institution profile
 */
export const getInstitutionProfileViews = async (institutionId, startDate, endDate) => {
    const pagePath = `/institution/${institutionId}`;
    return await getPageViews(startDate, endDate, pagePath);
};

/**
 * Get institution profile views by period
 * @param {String} institutionId - Institution ID
 * @param {String} period - 'daily', 'weekly', or 'monthly'
 * @param {Number} year - Year for monthly data
 * @returns {Array} Aggregated page views for institution
 */
export const getInstitutionProfileViewsByPeriod = async (institutionId, period = 'monthly', year = new Date().getFullYear()) => {
    const pagePath = `/institution/${institutionId}`;
    return await getPageViewsByPeriod(period, year, pagePath);
};

/**
 * Get aggregated analytics for multiple experts (admin view) using a single GA4 request
 * @param {Array} expertIds - Array of expert IDs
 * @param {String} startDate - Start date
 * @param {String} endDate - End date
 * @returns {Object} Aggregated analytics for all experts
 */
export const getAggregatedExpertAnalytics = async (expertIds, startDate, endDate) => {
    try {
        const client = initializeClient();

        if (!client) {
            return {
                success: false,
                error: 'Google Analytics not configured',
                experts: []
            };
        }

        const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

        if (!propertyId) {
            return {
                success: false,
                error: 'Property ID not configured',
                experts: []
            };
        }

        // Fetch ALL data for the /expert/ paths in ONE request
        const [response] = await client.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [
                { name: 'pagePath' },
                { name: 'date' }
            ],
            metrics: [
                { name: 'screenPageViews' },
                { name: 'sessions' }
            ],
            dimensionFilter: {
                filter: {
                    fieldName: 'pagePath',
                    stringFilter: {
                        matchType: 'CONTAINS',
                        value: '/expert/'
                    }
                }
            }
        });

        // Map to store accumulated data for each expert we're interested in
        const expertMap = new Map();
        expertIds.forEach(id => {
            expertMap.set(id, {
                totalViews: 0,
                totalSessions: 0,
                dailyViewsMap: new Map() // date -> {views, sessions}
            });
        });

        // Process rows and distribute to specific experts
        if (response.rows) {
            response.rows.forEach(row => {
                const pagePath = row.dimensionValues[0].value;
                const date = row.dimensionValues[1].value;
                const views = parseInt(row.metricValues[0].value) || 0;
                const sessions = parseInt(row.metricValues[1].value) || 0;

                // Extract expertId from path (e.g. "/expert/676eb.../profile" or "/expert/676eb...")
                const parts = pagePath.split('/expert/');
                if (parts.length > 1) {
                    const expertId = parts[1].split('/')[0];

                    if (expertMap.has(expertId)) {
                        const stats = expertMap.get(expertId);
                        stats.totalViews += views;
                        stats.totalSessions += sessions;

                        // Daily detail
                        const dayStats = stats.dailyViewsMap.get(date) || { views: 0, sessions: 0 };
                        dayStats.views += views;
                        dayStats.sessions += sessions;
                        stats.dailyViewsMap.set(date, dayStats);
                    }
                }
            });
        }

        // Convert Map back to format expected by frontend
        let grandTotalViews = 0;
        let grandTotalSessions = 0;

        const expertsAnalytics = Array.from(expertMap.entries()).map(([expertId, stats]) => {
            grandTotalViews += stats.totalViews;
            grandTotalSessions += stats.totalSessions;

            // Convert dailyViewsMap to array
            const dailyViews = Array.from(stats.dailyViewsMap.entries()).map(([date, dStats]) => ({
                date,
                views: dStats.views,
                sessions: dStats.sessions
            }));

            return {
                expertId,
                totalViews: stats.totalViews,
                dailyViews,
                success: true
            };
        });

        return {
            success: true,
            totalViews: grandTotalViews,
            totalSessions: grandTotalSessions,
            experts: expertsAnalytics,
            startDate,
            endDate
        };

    } catch (error) {
        console.error('Error getting aggregated expert analytics:', error);
        return {
            success: false,
            error: error.message,
            experts: []
        };
    }
};

/**
 * Get detailed analytics with dimensions (traffic sources, devices, etc.)
 * @param {String} startDate - Start date
 * @param {String} endDate - End date
 * @param {String} pagePath - Optional page path filter
 * @returns {Object} Detailed analytics
 */
export const getDetailedAnalytics = async (startDate, endDate, pagePath = null) => {
    try {
        const client = initializeClient();

        if (!client) {
            return {
                success: false,
                error: 'Google Analytics not configured'
            };
        }

        const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

        if (!propertyId) {
            return {
                success: false,
                error: 'Property ID not configured'
            };
        }

        const dimensionFilter = pagePath ? {
            filter: {
                fieldName: 'pagePath',
                stringFilter: {
                    matchType: 'CONTAINS',
                    value: pagePath
                }
            }
        } : undefined;

        // Get traffic sources
        const [trafficResponse] = await client.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            metrics: [
                { name: 'sessions' },
                { name: 'screenPageViews' }
            ],
            dimensionFilter,
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 10
        });

        // Get device breakdown
        const [deviceResponse] = await client.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'deviceCategory' }],
            metrics: [
                { name: 'sessions' },
                { name: 'screenPageViews' }
            ],
            dimensionFilter
        });

        // Get country breakdown
        const [countryResponse] = await client.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'country' }],
            metrics: [
                { name: 'sessions' },
                { name: 'screenPageViews' }
            ],
            dimensionFilter,
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 10
        });

        // Process responses
        const trafficSources = trafficResponse.rows?.map(row => ({
            source: row.dimensionValues[0].value,
            sessions: parseInt(row.metricValues[0].value),
            pageViews: parseInt(row.metricValues[1].value)
        })) || [];

        const devices = deviceResponse.rows?.map(row => ({
            device: row.dimensionValues[0].value,
            sessions: parseInt(row.metricValues[0].value),
            pageViews: parseInt(row.metricValues[1].value)
        })) || [];

        const countries = countryResponse.rows?.map(row => ({
            country: row.dimensionValues[0].value,
            sessions: parseInt(row.metricValues[0].value),
            pageViews: parseInt(row.metricValues[1].value)
        })) || [];

        return {
            success: true,
            trafficSources,
            devices,
            countries,
            startDate,
            endDate
        };

    } catch (error) {
        console.error('Error getting detailed analytics:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get real-time visitor count (approximate)
 * Note: GA4 Data API has limited real-time support
 * This uses the last 30 minutes as an approximation
 * @param {String} pagePath - Optional page path filter
 * @returns {Object} Real-time visitor data
 */
export const getRealtimeVisitors = async (pagePath = null) => {
    try {
        const client = initializeClient();

        if (!client) {
            return {
                success: false,
                error: 'Google Analytics not configured',
                activeUsers: 0
            };
        }

        const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;

        if (!propertyId) {
            return {
                success: false,
                error: 'Property ID not configured',
                activeUsers: 0
            };
        }

        // Use last 30 minutes as approximation for real-time
        const dimensionFilter = pagePath ? {
            filter: {
                fieldName: 'unifiedScreenName',
                stringFilter: {
                    matchType: 'CONTAINS',
                    value: pagePath
                }
            }
        } : undefined;

        const [response] = await client.runRealtimeReport({
            property: `properties/${propertyId}`,
            dimensions: [{ name: 'unifiedScreenName' }],
            metrics: [{ name: 'activeUsers' }],
            dimensionFilter
        });

        let activeUsers = 0;
        if (response.rows) {
            activeUsers = response.rows.reduce((sum, row) => {
                return sum + parseInt(row.metricValues[0].value);
            }, 0);
        }

        return {
            success: true,
            activeUsers,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Error getting real-time visitors:', error);
        return {
            success: false,
            error: error.message,
            activeUsers: 0
        };
    }
};

/**
 * Get expert real-time visitors
 * @param {String} expertId - Expert user ID
 * @returns {Object} Real-time visitor data for expert
 */
export const getExpertRealtimeVisitors = async (expertId) => {
    const pagePath = `/expert/${expertId}`;
    return await getRealtimeVisitors(pagePath);
};

export default {
    getPageViews,
    getPageViewsByPeriod,
    getExpertProfileViews,
    getExpertProfileViewsByPeriod,
    getInstitutionProfileViews,
    getInstitutionProfileViewsByPeriod,
    getAggregatedExpertAnalytics,
    getDetailedAnalytics,
    getRealtimeVisitors,
    getExpertRealtimeVisitors
};
