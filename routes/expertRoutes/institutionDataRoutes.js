import express from "express";
import User from "../../models/expertInformation.js";
import Institution from "../../models/institution.js";
import Event from "../../models/event.js";
import Service from "../../models/service.js";
import Package from "../../models/package.js";
import Order from "../../models/orders.js";
import { checkInstitutionAccess, getInstitutionUserIds } from "../../middlewares/accessControl.js";

const router = express.Router();

/**
 * GET all institution users with full documents (for caching in frontend context)
 * This endpoint returns complete user documents for all members of the institution
 * Includes populated events, services, and packages from separate collections
 */
router.get("/:userId/institution/users", checkInstitutionAccess, async (req, res) => {
    try {
        const userId = req.params.userId;
        const userContextRaw = req.headers['user-context'];
        let clientContext = {};

        if (userContextRaw) {
            try {
                clientContext = JSON.parse(userContextRaw);
            } catch (e) {
                console.error('Error parsing user-context header:', e);
            }
        }

        // Get all user IDs in the institution
        const userIds = await getInstitutionUserIds(userId);

        // Fetch full user documents (excluding sensitive fields)
        const users = await User.find({ _id: { $in: userIds } })
            .select('-information.password -refreshToken -resetPasswordOTP -resetPasswordExpiry -emailVerificationToken -emailVerificationExpiry')
            .populate('customers.customerId');

        // Fetch events, services, and packages for all users in parallel
        const [allEvents, allServices, allPackages] = await Promise.all([
            Event.find({ expertId: { $in: userIds } }).lean(),
            Service.find({ expertId: { $in: userIds } }).lean(),
            Package.find({ expertId: { $in: userIds } }).lean()
        ]);

        // Create lookup maps by expertId for quick access
        const eventsByExpert = new Map();
        const servicesByExpert = new Map();
        const packagesByExpert = new Map();

        allEvents.forEach(event => {
            const expertIdStr = event.expertId?.toString();
            if (!eventsByExpert.has(expertIdStr)) {
                eventsByExpert.set(expertIdStr, []);
            }
            eventsByExpert.get(expertIdStr).push(event);
        });

        allServices.forEach(service => {
            const expertIdStr = service.expertId?.toString();
            if (!servicesByExpert.has(expertIdStr)) {
                servicesByExpert.set(expertIdStr, []);
            }
            servicesByExpert.get(expertIdStr).push(service);
        });

        allPackages.forEach(pkg => {
            const expertIdStr = pkg.expertId?.toString();
            if (!packagesByExpert.has(expertIdStr)) {
                packagesByExpert.set(expertIdStr, []);
            }
            packagesByExpert.get(expertIdStr).push(pkg);
        });

        // Add computed fields and populated data for each user
        const usersWithMeta = users.map(user => {
            const userObj = user.toObject();
            const userIdStr = user._id.toString();

            return {
                ...userObj,
                // Replace ObjectId arrays with populated documents
                events: eventsByExpert.get(userIdStr) || [],
                services: servicesByExpert.get(userIdStr) || [],
                packages: packagesByExpert.get(userIdStr) || [],
                // Computed fields
                fullName: `${user.information?.name || ''} ${user.information?.surname || ''}`.trim(),
                isAdmin: user.subscription?.isAdmin || false,
                isSubUser: user.isSubUser || false
            };
        });

        return res.json({
            users: usersWithMeta,
            totalUsers: usersWithMeta.length,
            viewMode: 'institution'
        });
    } catch (error) {
        console.error('Error fetching institution users:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET all events from institution (admin + all sub-users)
 * Updated to use separate Event collection with expertId reference
 */
router.get("/:userId/institution/events", checkInstitutionAccess, async (req, res) => {
    try {
        const userId = req.params.userId;
        const userContextRaw = req.headers['user-context'];
        let clientContext = {};

        if (userContextRaw) {
            try {
                clientContext = JSON.parse(userContextRaw);
            } catch (e) {
                console.error('Error parsing user-context header:', e);
            }
        }

        // Get all user IDs in the institution
        const userIds = await getInstitutionUserIds(userId);

        // Fetch user info for enriching events with expert details
        const users = await User.find({ _id: { $in: userIds } }).select('information').lean();
        const userMap = new Map();
        users.forEach(user => {
            userMap.set(user._id.toString(), {
                name: `${user.information?.name || ''} ${user.information?.surname || ''}`.trim(),
                email: user.information?.email || ''
            });
        });

        // Fetch all events from the Event collection where expertId is in userIds
        const allEvents = await Event.find({ expertId: { $in: userIds } }).lean();

        // Enrich events with expert info
        const enrichedEvents = allEvents.map(event => {
            const expertInfo = userMap.get(event.expertId?.toString()) || {};
            return {
                ...event,
                expertName: expertInfo.name || 'Unknown Expert',
                expertEmail: expertInfo.email || ''
            };
        });

        return res.json({
            events: enrichedEvents,
            viewMode: 'institution',
            totalExperts: users.length
        });
    } catch (error) {
        console.error('Error fetching institution events:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET all services from institution
 * Updated to use separate Service collection with expertId reference
 */
/**
 * GET all services from institution
 */
router.get("/:userId/institution/services", checkInstitutionAccess, async (req, res) => {
    try {
        const userId = req.params.userId;
        const userContextRaw = req.headers['user-context'];
        let clientContext = {};

        if (userContextRaw) {
            try {
                clientContext = JSON.parse(userContextRaw);
            } catch (e) {
                console.error('Error parsing user-context header:', e);
            }
        }

        // Get all user IDs in the institution
        const userIds = await getInstitutionUserIds(userId);

        // Fetch user info for enriching services with expert details
        const users = await User.find({ _id: { $in: userIds } }).select('information').lean();
        const userMap = new Map();
        users.forEach(user => {
            userMap.set(user._id.toString(), {
                name: `${user.information?.name || ''} ${user.information?.surname || ''}`.trim(),
                email: user.information?.email || ''
            });
        });

        // Fetch all services from the Service collection where expertId is in userIds
        const allServices = await Service.find({ expertId: { $in: userIds } }).lean();

        // Enrich services with expert info
        const enrichedServices = allServices.map(service => {
            const expertInfo = userMap.get(service.expertId?.toString()) || {};
            return {
                ...service,
                expertName: expertInfo.name || 'Unknown Expert',
                expertEmail: expertInfo.email || ''
            };
        });

        return res.json({
            services: enrichedServices,
            viewMode: 'institution',
            totalExperts: users.length
        });
    } catch (error) {
        console.error('Error fetching institution services:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET all packages from institution
 * Updated to use separate Package collection with expertId reference
 */
/**
 * GET all packages from institution
 */
router.get("/:userId/institution/packages", checkInstitutionAccess, async (req, res) => {
    try {
        const userId = req.params.userId;
        const userContextRaw = req.headers['user-context'];
        let clientContext = {};

        if (userContextRaw) {
            try {
                clientContext = JSON.parse(userContextRaw);
            } catch (e) {
                console.error('Error parsing user-context header:', e);
            }
        }

        // Get all user IDs in the institution
        const userIds = await getInstitutionUserIds(userId);

        // Fetch user info for enriching packages with expert details
        const users = await User.find({ _id: { $in: userIds } }).select('information').lean();
        const userMap = new Map();
        users.forEach(user => {
            userMap.set(user._id.toString(), {
                name: `${user.information?.name || ''} ${user.information?.surname || ''}`.trim(),
                email: user.information?.email || ''
            });
        });

        // Fetch all packages from the Package collection where expertId is in userIds
        const allPackages = await Package.find({ expertId: { $in: userIds } }).lean();

        // Enrich packages with expert info
        const enrichedPackages = allPackages.map(pkg => {
            const expertInfo = userMap.get(pkg.expertId?.toString()) || {};
            return {
                ...pkg,
                expertName: expertInfo.name || 'Unknown Expert',
                expertEmail: expertInfo.email || ''
            };
        });

        return res.json({
            packages: enrichedPackages,
            viewMode: 'institution',
            totalExperts: users.length
        });
    } catch (error) {
        console.error('Error fetching institution packages:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET all customers from institution
 */
router.get("/:userId/institution/customers", checkInstitutionAccess, async (req, res) => {
    try {
        const userId = req.params.userId;
        const userContextRaw = req.headers['user-context'];
        let clientContext = {};

        if (userContextRaw) {
            try {
                clientContext = JSON.parse(userContextRaw);
            } catch (e) {
                console.error('Error parsing user-context header:', e);
            }
        }

        const userIds = await getInstitutionUserIds(userId);
        const users = await User.find({ _id: { $in: userIds } })
            .select('customers information')
            .populate('customers.customerId');

        const allCustomers = [];
        const customerMap = new Map(); // To avoid duplicates

        users.forEach(user => {
            if (user.customers && user.customers.length > 0) {
                user.customers.forEach(customerRef => {
                    if (customerRef.customerId) {
                        const customerId = customerRef.customerId._id.toString();

                        if (!customerMap.has(customerId)) {
                            allCustomers.push({
                                ...customerRef.customerId.toObject(),
                                addedByExpertId: user._id,
                                addedByExpertName: `${user.information?.name || ''} ${user.information?.surname || ''}`.trim(),
                                addedAt: customerRef.addedAt
                            });
                            customerMap.set(customerId, true);
                        }
                    }
                });
            }
        });

        return res.json({
            customers: allCustomers,
            viewMode: 'institution',
            totalExperts: users.length,
            totalCustomers: allCustomers.length
        });
    } catch (error) {
        console.error('Error fetching institution customers:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET all orders/payments from institution
 * Updated to use Order collection with expertInfo.expertId reference
 */
router.get("/:userId/institution/orders", checkInstitutionAccess, async (req, res) => {
    try {
        const userId = req.params.userId;
        const userContextRaw = req.headers['user-context'];
        let clientContext = {};

        if (userContextRaw) {
            try {
                clientContext = JSON.parse(userContextRaw);
            } catch (e) {
                console.error('Error parsing user-context header:', e);
            }
        }

        const userIds = await getInstitutionUserIds(userId);

        // Fetch user info for enriching orders with expert details
        const users = await User.find({ _id: { $in: userIds } }).select('information').lean();
        const userMap = new Map();
        users.forEach(user => {
            userMap.set(user._id.toString(), {
                name: `${user.information?.name || ''} ${user.information?.surname || ''}`.trim(),
                email: user.information?.email || ''
            });
        });

        // Fetch all orders where expertInfo.expertId is in userIds
        const allOrders = await Order.find({ 'expertInfo.expertId': { $in: userIds } }).lean();

        // Enrich orders with expert info (use from order if available, otherwise from userMap)
        const enrichedOrders = allOrders.map(order => {
            const expertIdStr = order.expertInfo?.expertId?.toString();
            const expertInfo = userMap.get(expertIdStr) || {};
            return {
                ...order,
                expertId: order.expertInfo?.expertId,
                expertName: order.expertInfo?.name || expertInfo.name || 'Unknown Expert',
                expertEmail: order.expertInfo?.email || expertInfo.email || ''
            };
        });

        return res.json({
            orders: enrichedOrders,
            viewMode: 'institution',
            totalExperts: users.length,
            totalOrders: enrichedOrders.length
        });
    } catch (error) {
        console.error('Error fetching institution orders:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET institution statistics/summary
 * Updated to use separate collections for Events, Services, and Packages
 */
router.get("/:userId/institution/stats", checkInstitutionAccess, async (req, res) => {
    try {
        const userId = req.params.userId;
        const userContextRaw = req.headers['user-context'];
        let clientContext = {};

        if (userContextRaw) {
            try {
                clientContext = JSON.parse(userContextRaw);
            } catch (e) {
                console.error('Error parsing user-context header:', e);
            }
        }

        const userIds = await getInstitutionUserIds(userId);

        // Fetch users for customer counts and basic info
        const users = await User.find({ _id: { $in: userIds } })
            .select('customers information').lean();

        // Use aggregation to get counts from separate collections efficiently
        const [eventCounts, serviceCounts, packageCounts, orderCounts] = await Promise.all([
            Event.aggregate([
                { $match: { expertId: { $in: userIds.map(id => id) } } },
                { $group: { _id: '$expertId', count: { $sum: 1 } } }
            ]),
            Service.aggregate([
                { $match: { expertId: { $in: userIds.map(id => id) } } },
                { $group: { _id: '$expertId', count: { $sum: 1 } } }
            ]),
            Package.aggregate([
                { $match: { expertId: { $in: userIds.map(id => id) } } },
                { $group: { _id: '$expertId', count: { $sum: 1 } } }
            ]),
            Order.aggregate([
                { $match: { 'expertInfo.expertId': { $in: userIds.map(id => id) } } },
                { $group: { _id: '$expertInfo.expertId', count: { $sum: 1 } } }
            ])
        ]);

        // Create lookup maps for counts
        const eventCountMap = new Map(eventCounts.map(e => [e._id?.toString(), e.count]));
        const serviceCountMap = new Map(serviceCounts.map(s => [s._id?.toString(), s.count]));
        const packageCountMap = new Map(packageCounts.map(p => [p._id?.toString(), p.count]));
        const orderCountMap = new Map(orderCounts.map(o => [o._id?.toString(), o.count]));

        let totalEvents = 0;
        let totalServices = 0;
        let totalPackages = 0;
        let totalCustomers = 0;
        let totalOrders = 0;

        const expertStats = users.map(user => {
            const userIdStr = user._id.toString();
            const stats = {
                expertId: user._id,
                expertName: `${user.information?.name || ''} ${user.information?.surname || ''}`.trim(),
                events: eventCountMap.get(userIdStr) || 0,
                services: serviceCountMap.get(userIdStr) || 0,
                packages: packageCountMap.get(userIdStr) || 0,
                customers: user.customers?.length || 0,
                orders: orderCountMap.get(userIdStr) || 0
            };

            totalEvents += stats.events;
            totalServices += stats.services;
            totalPackages += stats.packages;
            totalCustomers += stats.customers;
            totalOrders += stats.orders;

            return stats;
        });

        return res.json({
            viewMode: 'institution',
            totalExperts: users.length,
            totals: {
                events: totalEvents,
                services: totalServices,
                packages: totalPackages,
                customers: totalCustomers,
                orders: totalOrders
            },
            expertStats
        });
    } catch (error) {
        console.error('Error fetching institution stats:', error);
        return res.status(500).json({ error: error.message });
    }
});

export default router;
