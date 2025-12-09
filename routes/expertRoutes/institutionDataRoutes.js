import express from "express";
import User from "../../models/expertInformation.js";
import Institution from "../../models/institution.js";
import { checkInstitutionAccess, getInstitutionUserIds } from "../../middlewares/accessControl.js";

const router = express.Router();

/**
 * GET all institution users with full documents (for caching in frontend context)
 * This endpoint returns complete user documents for all members of the institution
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

        // Add computed fields for each user
        const usersWithMeta = users.map(user => {
            const userObj = user.toObject();
            return {
                ...userObj,
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
 */
router.get("/:userId/institution/events", checkInstitutionAccess, async (req, res) => {
    try {
        const { userContext } = req.headers['user-context'];
        const userId = req.params.userId;
        let clientContext = {};

        if (userContext) {
            clientContext = JSON.parse(userContext);
        }

        // if (!clientContext.isAdmin) {
        //     return res.status(403).json({ error: 'Only admins can access institution data' });
        // }

        // Get all user IDs in the institution
        const userIds = await getInstitutionUserIds(userId);

        // Fetch all users and their events
        const users = await User.find({ _id: { $in: userIds } }).select('events information');

        // Flatten all events and add expert info
        const allEvents = [];
        users.forEach(user => {
            if (user.events && user.events.length > 0) {
                user.events.forEach(event => {
                    allEvents.push({
                        ...event.toObject(),
                        expertId: event.expertId || user._id, // Use expertId if exists, fallback to user._id
                        expertName: `${user.information.name} ${user.information.surname}`,
                        expertEmail: user.information.email
                    });
                });
            }
        });

        return res.json({
            events: allEvents,
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
 */
router.get("/:userId/institution/services", checkInstitutionAccess, async (req, res) => {
    try {
        const { userContext } = req;

        if (!userContext.isAdmin) {
            return res.status(403).json({ error: 'Only admins can access institution data' });
        }

        const userIds = await getInstitutionUserIds(userContext.userId);
        const users = await User.find({ _id: { $in: userIds } }).select('services information');

        const allServices = [];
        users.forEach(user => {
            if (user.services && user.services.length > 0) {
                user.services.forEach(service => {
                    allServices.push({
                        ...service.toObject(),
                        expertId: service.expertId || user._id,
                        expertName: `${user.information.name} ${user.information.surname}`,
                        expertEmail: user.information.email
                    });
                });
            }
        });

        return res.json({
            services: allServices,
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
 */
router.get("/:userId/institution/packages", checkInstitutionAccess, async (req, res) => {
    try {
        const { userContext } = req;

        if (!userContext.isAdmin) {
            return res.status(403).json({ error: 'Only admins can access institution data' });
        }

        const userIds = await getInstitutionUserIds(userContext.userId);
        const users = await User.find({ _id: { $in: userIds } }).select('packages information');

        const allPackages = [];
        users.forEach(user => {
            if (user.packages && user.packages.length > 0) {
                user.packages.forEach(pkg => {
                    allPackages.push({
                        ...pkg.toObject(),
                        expertId: pkg.expertId || user._id,
                        expertName: `${user.information.name} ${user.information.surname}`,
                        expertEmail: user.information.email
                    });
                });
            }
        });

        return res.json({
            packages: allPackages,
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
        const { userContext } = req;

        if (!userContext.isAdmin) {
            return res.status(403).json({ error: 'Only admins can access institution data' });
        }

        const userIds = await getInstitutionUserIds(userContext.userId);
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
                                addedByExpertName: `${user.information.name} ${user.information.surname}`,
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
 */
router.get("/:userId/institution/orders", checkInstitutionAccess, async (req, res) => {
    try {
        const { userContext } = req;

        if (!userContext.isAdmin) {
            return res.status(403).json({ error: 'Only admins can access institution data' });
        }

        const userIds = await getInstitutionUserIds(userContext.userId);
        const users = await User.find({ _id: { $in: userIds } })
            .select('orders information')
            .populate('orders');

        const allOrders = [];
        users.forEach(user => {
            if (user.orders && user.orders.length > 0) {
                user.orders.forEach(order => {
                    if (order) {
                        allOrders.push({
                            ...order.toObject(),
                            expertId: user._id,
                            expertName: `${user.information.name} ${user.information.surname}`,
                            expertEmail: user.information.email
                        });
                    }
                });
            }
        });

        return res.json({
            orders: allOrders,
            viewMode: 'institution',
            totalExperts: users.length,
            totalOrders: allOrders.length
        });
    } catch (error) {
        console.error('Error fetching institution orders:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * GET institution statistics/summary
 */
router.get("/:userId/institution/stats", checkInstitutionAccess, async (req, res) => {
    try {
        const { userContext } = req;

        if (!userContext.isAdmin) {
            return res.status(403).json({ error: 'Only admins can access institution data' });
        }

        const userIds = await getInstitutionUserIds(userContext.userId);
        const users = await User.find({ _id: { $in: userIds } })
            .select('events services packages customers orders information');

        let totalEvents = 0;
        let totalServices = 0;
        let totalPackages = 0;
        let totalCustomers = 0;
        let totalOrders = 0;

        const expertStats = users.map(user => {
            const stats = {
                expertId: user._id,
                expertName: `${user.information.name} ${user.information.surname}`,
                events: user.events?.length || 0,
                services: user.services?.length || 0,
                packages: user.packages?.length || 0,
                customers: user.customers?.length || 0,
                orders: user.orders?.length || 0
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
