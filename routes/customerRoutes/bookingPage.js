import express from "express";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import User from "../../models/expertInformation.js";
import { createMulterUpload, handleMulterError } from '../../middlewares/upload.js';
import Coupon from "../../models/Coupon.js";

const router = express.Router({ mergeParams: true });

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


router.get("/:userId/:expertID", async (req, res) => {
  // Check if DB is connected
  if (!mongoose.connection.readyState) {
    return res.status(503).json({ error: "Service Unavailable" });
  }

  try {
    const { userId, expertID } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(expertID)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // ✅ Fetch user and exclude confidential fields
    const user = await User.findById(expertID)
      .select([
        "-password",
        "-token",
        "-tokenEmail",
        "-phoneVerifyCode",
        "-cardInfo",
        "-emails",
        "-customers",
        "-expertPaymentInfo",
      ])
      .populate("information.country", "name")
      .populate("information.city", "name")
      .populate("information.district", "name")
      .populate("expertInformation.category", "name")

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log("Fetched user:", user);
    res.json(user);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});


// ==================== PACKAGES ROUTES ====================

// Test Booking Page Route
router.get("/test-booking", (req, res) => {
  res.json({ message: "Booking page route is working!" });
});


// Create custom upload configuration for booking
const bookingUpload = createMulterUpload({
  uploadPath: "uploads/CustomerFiles/NotesFormsFiles",
  maxFiles: 5,
  maxFileSize: 10,
  allowedExtensions: ["jpg", "jpeg", "png", "pdf", "doc", "docx"],
  fileNamePrefix: "booking",
});

// Use in route
router.post("/:customerId/form",
  bookingUpload.array(), // Uses default field name 'files'
  handleMulterError,
  async (req, res) => {
    try {
      console.log('\n========== NEW BOOKING FORM SUBMISSION ==========');
      console.log('Timestamp:', new Date().toISOString());
      console.log('Customer ID from URL:', req.params.customerId);

      // Log request headers
      console.log('\n--- REQUEST HEADERS ---');
      console.log('Content-Type:', req.headers['content-type']);
      console.log('User-Agent:', req.headers['user-agent']);
      console.log('Origin:', req.headers.origin);
      console.log('IP Address:', req.ip || req.connection.remoteAddress);

      // Log raw body data (if any)
      console.log('\n--- RAW BODY DATA ---');
      console.log('Body:', req.body);

      // Parse booking data if it exists
      let bookingData = null;
      if (req.body.bookingData) {
        try {
          bookingData = JSON.parse(req.body.bookingData);
          console.log('\n--- PARSED BOOKING DATA ---');
          console.log(JSON.stringify(bookingData, null, 2));

          // Log specific sections for clarity
          console.log('\n--- SERVICE DETAILS ---');
          console.log('Service Type:', bookingData.serviceType);
          console.log('Service ID:', bookingData.serviceId);
          console.log('Service Details:', JSON.stringify(bookingData.serviceDetails, null, 2));

          console.log('\n--- CLIENT INFORMATION ---');
          console.log('Name:', bookingData.clientInfo?.firstName, bookingData.clientInfo?.lastName);
          console.log('Email:', bookingData.clientInfo?.email);
          console.log('Phone:', bookingData.clientInfo?.phone);

          console.log('\n--- BOOKING DETAILS ---');
          console.log('Date:', bookingData.date);
          console.log('Time:', bookingData.time);
          console.log('Order Notes:', bookingData.orderNotes);

          console.log('\n--- PAYMENT INFORMATION ---');
          console.log('Card Last Four:', bookingData.paymentInfo?.cardLastFour);
          console.log('Name on Card:', bookingData.paymentInfo?.nameOnCard);

          console.log('\n--- PRICING ---');
          console.log('Subtotal:', bookingData.subtotal);
          console.log('Discount:', bookingData.discount);
          console.log('Total:', bookingData.total);
          console.log('Coupon:', bookingData.coupon);

          console.log('\n--- PROVIDER INFORMATION ---');
          console.log('Provider ID:', bookingData.providerId);
          console.log('Provider Name:', bookingData.providerName);

          console.log('\n--- ADDITIONAL INFO ---');
          console.log('Terms Accepted:', bookingData.termsAccepted);
          console.log('Timestamp:', bookingData.timestamp);
          console.log('Source:', bookingData.source);
          console.log('IP Address:', bookingData.ipAddress);
          console.log('User Agent:', bookingData.userAgent);

        } catch (parseError) {
          console.error('Error parsing booking data:', parseError);
        }
      }

      // Log uploaded files
      console.log('\n--- UPLOADED FILES ---');
      if (req.files && req.files.length > 0) {
        console.log('Number of files:', req.files.length);
        req.files.forEach((file, index) => {
          console.log(`\nFile ${index + 1}:`);
          console.log('  Original Name:', file.originalname);
          console.log('  Filename:', file.filename);
          console.log('  Mimetype:', file.mimetype);
          console.log('  Size:', file.size, 'bytes');
          console.log('  Path:', file.path);
        });
      } else {
        console.log('No files uploaded');
      }

      console.log('\n========== END OF BOOKING SUBMISSION ==========\n');

      // Here you would typically:
      // 1. Validate the data
      // 2. Save to database
      // 3. Send confirmation email
      // 4. Process payment

      // For now, just send a success response
      res.status(201).json({
        success: true,
        message: "Booking received successfully!",
        bookingId: bookingData?.customerId || req.params.customerId,
        customerId: bookingData?.customerId || req.params.customerId,
        timestamp: new Date().toISOString(),
        filesReceived: req.files ? req.files.length : 0,
        data: {
          booking: bookingData,
          files: req.files ? req.files.map(f => ({
            originalName: f.originalname,
            filename: f.filename,
            size: f.size
          })) : []
        }
      });

    } catch (error) {
      console.error('\n========== ERROR IN BOOKING SUBMISSION ==========');
      console.error('Error:', error);
      console.error('Stack:', error.stack);
      console.log('========== END ERROR ==========\n');

      res.status(500).json({
        success: false,
        error: "Failed to process booking",
        message: error.message
      });
    }
  });

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('Multer error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'File size should not exceed 5MB'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'File upload error',
      message: error.message
    });
  } else if (error) {
    console.error('General error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: error.message
    });
  }
  next();
});

// Get all packages
router.get("/:userId/packages", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    res.json({ packages: user.packages || [] });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Get active packages (with status active)
router.get("/:userId/packages/active", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const activePackages = (user.packages || []).filter(pkg => pkg.status === 'active');
    res.json({ packages: activePackages });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Get available packages (for booking page)
router.get("/:userId/packages/available", async (req, res) => {
  try {
    const user = await findUserById(req.params.userId);
    const availablePackages = (user.packages || []).filter(
      pkg => pkg.isAvailable && pkg.status === 'active'
    );
    res.json({ packages: availablePackages });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.post("/:customerId/validate-coupon", async (req, res) => {
  const { customerId, couponCode, expertId } = req.body;

  if (!customerId || !couponCode || !expertId) {
    return res.status(400).json({ error: "customerId, couponCode, and expertId are required" });
  }

  try {
    // 1️⃣ Find coupon by code and owner
    const coupon = await Coupon.findOne({
      owner: expertId,
      code: couponCode,        // matches "JANO"
      status: "active",        // ensure it's active
    });

    if (!coupon) {
      return res.status(404).json({ error: "Coupon not found or inactive" });
    }

    // 2️⃣ Check expiry date
    const now = new Date();
    if (coupon.expiryDate && coupon.expiryDate < now) {
      return res.status(400).json({ error: "Coupon has expired" });
    }

    // 3️⃣ Check usage limits
    if (coupon.usageCount >= coupon.maxUsage) {
      return res.status(400).json({ error: "Coupon usage limit reached" });
    }

    // 4️⃣ Return coupon details
    res.json({
      type: coupon.type,
      value: coupon.value,
    });
  } catch (err) {
    console.error("Error validating coupon:", err);
    res.status(500).json({ error: "Error validating coupon", details: err.message });
  }
});

export default router;