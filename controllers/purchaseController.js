import mongoose from "mongoose";
import User from "../models/expertInformation.js";
import Package from "../models/package.js";
import Customer from "../models/customer.js";
import Order from "../models/orders.js";

// Helper function to find user by ID
const findUserById = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid user ID");
    }
    const user = await User.findById(userId);
    if (!user) {
        throw new Error("User not found");
    }
    return user;
};

/**
 * Create a new purchase entry
 * POST /:userId/purchases
 */
export const createPurchase = async (req, res) => {
    try {
        console.log("Creating purchase entry for userId:", req.params.userId);
        console.log("Purchase data received:", req.body);

        const { customerData, packageId } = req.body;

        // Validate required fields
        if (!customerData || !packageId) {
            return res.status(400).json({
                error: "Missing required fields: customerData and packageId are required",
            });
        }

        // Get expert information
        const expert = await findUserById(req.params.userId);

        // Step 1: Determine if customer exists or needs to be created
        let customer;
        let isNewCustomer = false;

        if (
            mongoose.Types.ObjectId.isValid(customerData) &&
            typeof customerData === "string"
        ) {
            // Existing customer - fetch from database
            customer = await Customer.findById(customerData);
            if (!customer) {
                return res.status(404).json({ error: "Customer not found" });
            }
            console.log("Using existing customer:", customer._id);
        } else {
            // New customer - create in database
            const newCustomerData = {
                name: customerData.name,
                surname: customerData.surname,
                email: customerData.email,
                phone: customerData.phone,
                source: "bulk-import",
                status: "active",
            };

            customer = new Customer(newCustomerData);
            await customer.save();
            isNewCustomer = true;
            console.log("Created new customer:", customer._id);

            // Add customer reference to expert's customers array
            if (!expert.customers) {
                expert.customers = [];
            }
            expert.customers.push({
                customerId: customer._id,
                isArchived: false,
                addedAt: new Date(),
            });
        }

        // Step 2: Fetch package from Package collection (new separate model)
        let packageItem = await Package.findById(packageId);

        // If not found by _id, try finding by legacyId (for backward compatibility)
        if (!packageItem) {
            packageItem = await Package.findOne({ legacyId: packageId, expertId: expert._id });
        }

        if (!packageItem) {
            return res.status(404).json({ error: "Package not found" });
        }

        // Verify package belongs to this expert
        if (packageItem.expertId.toString() !== expert._id.toString()) {
            return res.status(403).json({ error: "Package does not belong to this expert" });
        }

        console.log("Found package:", packageItem.title);

        // Step 3: Create order
        const orderData = {
            orderDetails: {
                events: [
                    {
                        eventType: "package",
                        package: {
                            packageId: packageItem._id,
                            name: packageItem.title,
                            details: packageItem.description || "",
                            price: packageItem.price,
                            sessions:
                                packageItem.appointmentCount || packageItem.sessionsIncluded || 1,
                            duration: packageItem.duration,
                            meetingType: packageItem.meetingType || "",
                        },
                        quantity: 1,
                    },
                ],
                totalAmount: packageItem.price,
                orderDate: new Date(),
            },
            paymentInfo: {
                method: "manual-entry",
                status: "paid",
                transactionId: `MANUAL-${Date.now()}`,
            },
            userInfo: {
                userId: customer._id,
                name: `${customer.name} ${customer.surname}`,
                email: customer.email,
                phone: customer.phone || "",
            },
            customerId: customer._id,
            expertInfo: {
                expertId: expert._id,
                name: `${expert.information.name} ${expert.information.surname}`,
                accountNo: expert.expertInformation?.subMerchantID || "N/A",
                specialization: expert.title || "",
                email: expert.information.email,
            },
            status: "completed",
            couponUsage: false,
        };

        const order = new Order(orderData);
        await order.save();
        console.log("Created order:", order._id);

        // Step 4: Update customer's orders array
        if (!customer.orders) {
            customer.orders = [];
        }
        customer.orders.push(order._id);
        customer.totalSpent = (customer.totalSpent || 0) + packageItem.price;
        await customer.save();
        console.log("Updated customer orders array");

        // Step 5: Update package's purchasedBy array (now in Package collection)
        if (!packageItem.purchasedBy) {
            packageItem.purchasedBy = [];
        }
        packageItem.purchasedBy.push({
            userId: customer._id,
            orderId: order._id,
            purchaseDate: new Date(),
            expiryDate: packageItem.validUntil || null,
            sessionsUsed: 0,
        });
        packageItem.isPurchased = true;
        await packageItem.save();
        console.log("Updated package purchasedBy array");

        // Step 6: Add order reference to expert's orders array
        if (!expert.orders) {
            expert.orders = [];
        }
        expert.orders.push(order._id);
        await expert.save();
        console.log("Updated expert orders");

        res.status(201).json({
            success: true,
            message: "Purchase entry created successfully",
            order: {
                id: order._id,
                orderNumber: order.paymentInfo.transactionId,
                customer: {
                    id: customer._id,
                    name: `${customer.name} ${customer.surname}`,
                    email: customer.email,
                    phone: customer.phone,
                },
                package: {
                    id: packageItem._id,
                    title: packageItem.title,
                    price: packageItem.price,
                    sessions: packageItem.appointmentCount || packageItem.sessionsIncluded,
                },
                totalAmount: packageItem.price,
                orderDate: order.orderDetails.orderDate,
                isNewCustomer,
            },
        });
    } catch (error) {
        console.error("Error creating purchase entry:", error);
        res.status(500).json({
            error: error.message || "Failed to create purchase entry",
        });
    }
};

/**
 * Get package purchases with customer and order details
 * GET /:userId/packages/purchases/details
 */
export const getPurchaseDetails = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);

        // Get all packages for this expert from Package collection
        const packages = await Package.find({ expertId: user._id });

        // Filter to only packages with purchases
        const purchasedPackages = packages.filter(
            (pkg) => pkg.purchasedBy && pkg.purchasedBy.length > 0
        );

        // Fetch customer and order details for each purchase
        const purchaseDetails = [];

        for (const pkg of purchasedPackages) {
            for (const purchase of pkg.purchasedBy) {
                try {
                    // Fetch customer details
                    const customer = await Customer.findById(purchase.userId);

                    // Fetch order details
                    const order = await Order.findById(purchase.orderId);

                    if (customer && order) {
                        // Get completed sessions from order
                        const packageEvent = order.orderDetails.events.find(
                            (event) => event.eventType === "package"
                        );
                        const completedSessions = packageEvent?.package?.completedSessions || 0;

                        purchaseDetails.push({
                            packageId: pkg._id,
                            packageTitle: pkg.title,
                            packagePrice: pkg.price,
                            totalSessions: pkg.appointmentCount || pkg.sessionsIncluded,
                            customer: {
                                id: customer._id,
                                name: customer.name,
                                surname: customer.surname,
                                fullName: `${customer.name} ${customer.surname}`,
                                email: customer.email,
                                phone: customer.phone || "-",
                            },
                            order: {
                                id: order._id,
                                orderNumber: order.paymentInfo.transactionId,
                                totalAmount: order.orderDetails.totalAmount,
                                paymentStatus: order.paymentInfo.status,
                                orderStatus: order.status,
                                orderDate: order.orderDetails.orderDate,
                            },
                            purchaseDate: purchase.purchaseDate,
                            expiryDate: purchase.expiryDate,
                            sessionsUsed: purchase.sessionsUsed || 0,
                            completedSessions: completedSessions,
                            remainingSessions:
                                (pkg.appointmentCount || pkg.sessionsIncluded) -
                                (purchase.sessionsUsed || 0),
                        });
                    }
                } catch (err) {
                    console.error(`Error fetching details for purchase:`, err);
                }
            }
        }

        res.json({
            success: true,
            purchases: purchaseDetails,
            totalPurchases: purchaseDetails.length,
        });
    } catch (error) {
        console.error("Error fetching purchase details:", error);
        res.status(500).json({
            error: error.message || "Failed to fetch purchase details",
        });
    }
};
