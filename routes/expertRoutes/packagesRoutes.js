import express from "express";
import mongoose from "mongoose";
import User from "../../models/expertInformation.js";
import Package from "../../models/package.js";
import Customer from "../../models/customer.js";
import Order from "../../models/orders.js";

const router = express.Router();

// Helper function to find user by ID
const findUserById = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

// Helper function to find user with populated packages
const findUserWithPackages = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }
  const user = await User.findById(userId).populate('packages');
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

// ==================== PACKAGES ROUTES ====================

// Get all packages - Uses populate
router.get("/:userId/packages", async (req, res) => {
  try {
    const user = await findUserWithPackages(req.params.userId);
    res.json({ packages: user.packages || [] });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Get active packages (with status active)
router.get("/:userId/packages/active", async (req, res) => {
  try {
    const user = await findUserWithPackages(req.params.userId);
    const activePackages = (user.packages || []).filter(pkg => pkg.status === 'active');
    res.json({ packages: activePackages });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Get available packages (for booking page)
router.get("/:userId/packages/available", async (req, res) => {
  try {
    const user = await findUserWithPackages(req.params.userId);
    const availablePackages = (user.packages || []).filter(
      pkg => pkg.isAvailable && pkg.status === 'active'
    );
    res.json({ packages: availablePackages });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Add package - Creates in Package collection and adds reference to User
router.post("/:userId/packages", async (req, res) => {
  try {
    console.log("Creating package for userId:", req.params.userId);
    console.log("Package data received:", req.body);

    const {
      title,
      description,
      price,
      originalPrice,
      duration,
      discount,
      appointmentCount,
      category,
      eventType,
      meetingType,
      platform,
      location,
      date,
      time,
      maxAttendees,
      icon,
      iconBg,
      status,
      isOfflineEvent,
      selectedClients,
      features,
      validUntil
    } = req.body;

    // Validate required fields
    if (!title || !category || !eventType) {
      return res.status(400).json({
        error: "Missing required fields: title, category, and eventType are required"
      });
    }

    const user = await findUserById(req.params.userId);

    // Create new Package document in Package collection
    const newPackage = new Package({
      expertId: user._id,
      title,
      description: description || '',
      price: parseFloat(price) || 0,
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      duration: parseInt(duration) || 0,
      appointmentCount: parseInt(appointmentCount) || 1,
      sessionsIncluded: parseInt(appointmentCount) || 1,
      category,
      eventType,
      meetingType: meetingType || '',
      platform: platform || '',
      location: location || '',
      date: date || null,
      time: time || null,
      discount: discount || 0,
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
      icon: icon || '📦',
      iconBg: iconBg || 'bg-primary-100',
      status: status || 'active',
      isAvailable: true,
      isPurchased: false,
      isOfflineEvent: isOfflineEvent || false,
      selectedClients: selectedClients || [],
      features: features || [],
      validUntil: validUntil || null,
      purchasedBy: []
    });

    await newPackage.save();

    // Add package ObjectId reference to user's packages array
    if (!user.packages) {
      user.packages = [];
    }
    user.packages.push(newPackage._id);
    await user.save();

    console.log("Package created successfully:", newPackage._id);

    // ========== Handle selectedClients ==========
    const createdOrders = [];
    if (selectedClients && selectedClients.length > 0) {
      console.log(`Creating orders for ${selectedClients.length} selected clients`);

      for (const client of selectedClients) {
        try {
          const clientId = client.id || client._id || client;
          const customer = await Customer.findById(clientId);
          if (!customer) {
            console.warn(`Customer not found: ${clientId}`);
            continue;
          }

          console.log(`Creating order for customer: ${customer.name} ${customer.surname}`);

          const orderData = {
            orderDetails: {
              events: [{
                eventType: 'package',
                package: {
                  packageId: newPackage._id,
                  name: newPackage.title,
                  details: newPackage.description || '',
                  price: newPackage.price,
                  sessions: newPackage.appointmentCount || newPackage.sessionsIncluded || 1,
                  duration: newPackage.duration,
                  meetingType: newPackage.meetingType || ''
                },
                quantity: 1
              }],
              totalAmount: newPackage.price,
              orderDate: new Date()
            },
            paymentInfo: {
              method: "manual-entry",
              status: "paid",
              transactionId: `MANUAL-${Date.now()}-${clientId}`
            },
            userInfo: {
              userId: customer._id,
              name: `${customer.name} ${customer.surname}`,
              email: customer.email,
              phone: customer.phone || ''
            },
            customerId: customer._id,
            expertInfo: {
              expertId: user._id,
              name: `${user.information.name} ${user.information.surname}`,
              accountNo: user.expertInformation?.subMerchantID || 'N/A',
              specialization: user.title || '',
              email: user.information.email
            },
            status: 'completed',
            couponUsage: false
          };

          const order = new Order(orderData);
          await order.save();
          console.log(`Order created: ${order._id}`);

          createdOrders.push({
            orderId: order._id,
            customerId: customer._id,
            customerName: `${customer.name} ${customer.surname}`
          });

          // Update customer's orders array
          if (!customer.orders) {
            customer.orders = [];
          }
          customer.orders.push(order._id);
          customer.totalSpent = (customer.totalSpent || 0) + newPackage.price;
          await customer.save();

          // Update package's purchasedBy array
          newPackage.purchasedBy.push({
            userId: customer._id,
            orderId: order._id,
            purchaseDate: new Date(),
            expiryDate: newPackage.validUntil || null,
            sessionsUsed: 0
          });
          newPackage.isPurchased = true;

          // Add order reference to expert's orders array
          if (!user.orders) {
            user.orders = [];
          }
          user.orders.push(order._id);

        } catch (orderError) {
          console.error(`Error creating order for client ${client.id || client}:`, orderError);
        }
      }

      // Save updated package and user
      await newPackage.save();
      await user.save();
      console.log(`Updated package purchasedBy array with ${createdOrders.length} orders`);
    }

    res.json({
      package: newPackage,
      message: "Package added successfully",
      ordersCreated: createdOrders.length,
      orders: createdOrders
    });
  } catch (error) {
    console.error("Error creating package:", error);
    res.status(500).json({
      error: error.message || "Failed to create package",
      details: error.stack
    });
  }
});

// Update package - Updates directly in Package collection
router.put("/:userId/packages/:packageId", async (req, res) => {
  try {
    console.log("Updating package:", req.params.packageId);
    console.log("Update data received:", req.body);

    const user = await findUserById(req.params.userId);

    // Find package by ObjectId or legacy id
    let pkg = await Package.findById(req.params.packageId);

    if (!pkg) {
      pkg = await Package.findOne({ legacyId: req.params.packageId, expertId: user._id });
    }

    if (!pkg) {
      return res.status(404).json({ error: "Package not found" });
    }

    // Verify ownership
    if (pkg.expertId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to update this package" });
    }

    // Update package fields
    Object.assign(pkg, {
      title: req.body.title || pkg.title,
      description: req.body.description ?? pkg.description,
      price: req.body.price !== undefined ? parseFloat(req.body.price) : pkg.price,
      originalPrice: req.body.originalPrice ? parseFloat(req.body.originalPrice) : pkg.originalPrice,
      duration: req.body.duration !== undefined ? parseInt(req.body.duration) : pkg.duration,
      appointmentCount: req.body.appointmentCount !== undefined ? parseInt(req.body.appointmentCount) : pkg.appointmentCount,
      sessionsIncluded: req.body.appointmentCount !== undefined ? parseInt(req.body.appointmentCount) : pkg.sessionsIncluded,
      category: req.body.category || pkg.category,
      eventType: req.body.eventType || pkg.eventType,
      meetingType: req.body.meetingType ?? pkg.meetingType,
      platform: req.body.platform ?? pkg.platform,
      location: req.body.location ?? pkg.location,
      date: req.body.date ?? pkg.date,
      time: req.body.time ?? pkg.time,
      discount: req.body.discount ?? pkg.discount,
      maxAttendees: req.body.maxAttendees ? parseInt(req.body.maxAttendees) : pkg.maxAttendees,
      icon: req.body.icon ?? pkg.icon,
      iconBg: req.body.iconBg ?? pkg.iconBg,
      status: req.body.status ?? pkg.status,
      isAvailable: req.body.isAvailable !== undefined ? req.body.isAvailable : pkg.isAvailable,
      isOfflineEvent: req.body.isOfflineEvent ?? pkg.isOfflineEvent,
      selectedClients: req.body.selectedClients ?? pkg.selectedClients,
      features: req.body.features ?? pkg.features,
      validUntil: req.body.validUntil ?? pkg.validUntil,
      updatedAt: new Date()
    });

    await pkg.save();

    console.log("Package updated successfully");
    res.json({
      package: pkg,
      message: "Package updated successfully"
    });
  } catch (error) {
    console.error("Error updating package:", error);
    res.status(500).json({
      error: error.message || "Failed to update package",
      details: error.stack
    });
  }
});

// Delete package - Removes from Package collection and User reference
router.delete("/:userId/packages/:packageId", async (req, res) => {
  try {
    console.log("Deleting package:", req.params.packageId);

    const user = await findUserById(req.params.userId);

    // Find package by ObjectId or legacy id
    let pkg = await Package.findById(req.params.packageId);

    if (!pkg) {
      pkg = await Package.findOne({ legacyId: req.params.packageId, expertId: user._id });
    }

    if (!pkg) {
      return res.status(404).json({ error: "Package not found" });
    }

    // Verify ownership
    if (pkg.expertId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this package" });
    }

    // Remove from Package collection
    await Package.findByIdAndDelete(pkg._id);

    // Remove reference from user's packages array
    user.packages = user.packages.filter(
      packageId => packageId.toString() !== pkg._id.toString()
    );
    await user.save();

    console.log("Package deleted successfully");
    res.json({ message: "Package deleted successfully" });
  } catch (error) {
    console.error("Error deleting package:", error);
    res.status(500).json({
      error: error.message || "Failed to delete package"
    });
  }
});

// Toggle package available status
router.patch("/:userId/packages/:packageId/toggle-available", async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const user = await findUserById(req.params.userId);

    let pkg = await Package.findById(req.params.packageId);

    if (!pkg) {
      pkg = await Package.findOne({ legacyId: req.params.packageId, expertId: user._id });
    }

    if (!pkg) {
      return res.status(404).json({ error: "Package not found" });
    }

    pkg.isAvailable = isAvailable;
    pkg.updatedAt = new Date();
    await pkg.save();

    res.json({
      package: pkg,
      message: `Package ${isAvailable ? 'made available' : 'made unavailable'} successfully`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get package purchase history
router.get("/:userId/packages/:packageId/purchases", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);

    let pkg = await Package.findById(req.params.packageId);

    if (!pkg) {
      pkg = await Package.findOne({ legacyId: req.params.packageId, expertId: user._id });
    }

    if (!pkg) {
      return res.status(404).json({ error: "Package not found" });
    }

    res.json({
      packageTitle: pkg.title,
      purchases: pkg.purchasedBy || [],
      totalPurchases: (pkg.purchasedBy || []).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;