import express from "express";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import User from "../../models/expertInformation.js";
import { createMulterUpload, handleMulterError } from '../../middlewares/upload.js';
import Coupon from "../../models/Coupon.js";

// ================== NEW IMPORTS ==================
// Import the models you'll be writing data to.
import Customer from '../../models/customer.js';
import Order from '../../models/orders.js';
import CustomerAppointments from '../../models/customerAppointment.js';
import CustomerNote from '../../models/customerNotes.js';

const router = express.Router({ mergeParams: true });

// Helper function to find user by ID (no changes needed)
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

// GET Expert Details Route (no changes needed)
router.get("/:userId/:expertID", async (req, res) => {
  if (!mongoose.connection.readyState) {
    return res.status(503).json({ error: "Service Unavailable" });
  }
  try {
    const { userId, expertID } = req.params;
    if (!mongoose.Types.ObjectId.isValid(expertID)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    const user = await User.findById(expertID)
      .select([
        "-password", "-token", "-tokenEmail", "-phoneVerifyCode",
        "-cardInfo", "-emails", "-customers", "-expertPaymentInfo",
      ])
      .populate("information.country", "name")
      .populate("information.city", "name")
      .populate("information.district", "name")
      .populate("expertInformation.category", "name");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Test Booking Page Route (no changes needed)
router.get("/test-booking", (req, res) => {
  res.json({ message: "Booking page route is working!" });
});


// ==================== MAIN BOOKING FORM SUBMISSION ROUTE (FULLY IMPLEMENTED) ====================

// Multer upload configuration (no changes needed)
const bookingUpload = createMulterUpload({
  uploadPath: "uploads/CustomerFiles/NotesFormsFiles",
  maxFiles: 5,
  maxFileSize: 10, // 10MB
  allowedExtensions: ["jpg", "jpeg", "png", "pdf", "doc", "docx", "txt", "mp4", "mp3"],
  fileNamePrefix: "booking",
});


// ✅ Utility function to safely parse dates
const safeDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// ✅ Booking form route
router.post(
  "/:customerId/form",
  bookingUpload.array("files"),
  handleMulterError,
  async (req, res) => {
    try {
      console.log("\n========== 🧾 NEW BOOKING FORM ==========");
      console.log("Timestamp:", new Date().toISOString());

      // --- Step 1: Parse and validate input ---
      if (!req.body.bookingData) {
        return res.status(400).json({ success: false, error: "Missing bookingData" });
      }

      const bookingData = JSON.parse(req.body.bookingData);
      console.log("📦 Parsed bookingData:", JSON.stringify(bookingData, null, 2));
      console.log("📎 Uploaded files:", req.files?.length || 0);

      const {
        clientInfo,
        selectedOffering,
        serviceType,
        packageType,
        providerId,
        providerName,
        date,
        time,
        total,
        subtotal,
        paymentInfo,
        orderNotes,
        termsAccepted,
      } = bookingData;

      // --- Step 2: Validate required fields ---
      if (!clientInfo?.email || !selectedOffering?.id) {
        return res.status(400).json({
          success: false,
          error: "Missing required booking fields (clientInfo or selectedOffering)",
        });
      }

      // Individual services must have date/time; others get assigned later by expert
      if (["bireysel", "hizmet"].includes(serviceType) && (!date || !time)) {
        return res.status(400).json({
          success: false,
          error: "Date and time are required for individual services",
        });
      }

      // --- Step 3: Normalize date/time for non-individual bookings ---
      const normalizedDate =
        ["grup", "paket"].includes(serviceType) ? null : safeDate(date);
      const normalizedTime =
        ["grup", "paket"].includes(serviceType) ? null : time || null;

      // --- Step 4: Map frontend serviceType → backend eventType ---

      console.log("🔄 Mapping serviceType/packageType to eventType...", serviceType);
      // ✅ Determine event type based on whichever field is active
      const mappedEventType = packageType
        ? "package"
        : serviceType
          ? "service"
          : "service"; // fallback (defaults to 'service')


      // --- Step 5: Find or create customer (upsert by email) ---
      const customer = await Customer.findOneAndUpdate(
        { email: clientInfo.email },
        {
          $setOnInsert: {
            name: clientInfo.firstName,
            surname: clientInfo.lastName,
            email: clientInfo.email,
            phone: clientInfo.phone,
            status: "active",
            source: bookingData.source || "website",
            firstAppointment: safeDate(date),
            consentGiven: {
              termsAcceptionStatus: !!termsAccepted,
              dataProcessingTerms: !!termsAccepted,
              marketingTerms: !!termsAccepted,
              dateGiven: new Date(),
            },
          },
        },
        { new: true, upsert: true }
      );

      // --- Step 6: Create appointment record ---
      const appointment = await CustomerAppointments.create({
        serviceId: mappedEventType === "service" ? selectedOffering.id : undefined,
        serviceName: mappedEventType === "service" ? selectedOffering.title : undefined,
        packageId: mappedEventType === "package" ? selectedOffering.id : undefined,
        packageName: mappedEventType === "package" ? selectedOffering.title : undefined,
        date: normalizedDate,
        time: normalizedTime,
        duration: selectedOffering.duration || 60,
        status: "scheduled",
        price: total,
        paymentStatus: "pending",
        notes: orderNotes,
        meetingType: selectedOffering.meetingType || "",
        eventType: selectedOffering.eventType || "online",
      });

      // --- Step 7: Create note if notes/files exist ---
      let note = null;
      if (orderNotes || (req.files && req.files.length > 0)) {
        note = await CustomerNote.create({
          content: orderNotes || "Booking submission with attachments.",
          author: "customer",
          authorName: `${customer.name} ${customer.surname}`,
          files:
            req.files?.map((f) => ({
              name: f.originalname,
              type: f.mimetype,
              size: f.size,
              url: f.path,
            })) || [],
        });
      }

      // --- Step 8: Update customer info ---
      customer.appointments.push(appointment._id);
      if (note) customer.notes.push(note._id);
      customer.totalAppointments = (customer.totalAppointments || 0) + 1;
      customer.lastAppointment = safeDate(date);
      customer.totalSpent = (customer.totalSpent || 0) + total;
      await customer.save();

      // --- Step 9: Create order record ---
      const order = await Order.create({
        orderDetails: {
          events: [
            {
              eventType: mappedEventType,
              service:
                mappedEventType === "service"
                  ? {
                    name: selectedOffering.title,
                    description: selectedOffering.description,
                    price: subtotal,
                    duration: selectedOffering.duration,
                    sessions: selectedOffering.sessions || 1,
                    meetingType: selectedOffering.meetingType,
                  }
                  : undefined,
              package:
                mappedEventType === "package"
                  ? {
                    name: selectedOffering.title,
                    details: selectedOffering.details,
                    price: subtotal,
                    meetingType: selectedOffering.meetingType,
                  }
                  : undefined,
            },
          ],
          totalAmount: total,
        },
        paymentInfo: {
          method: paymentInfo?.method || "card",
          status: "pending",
          transactionId: `TRX-${uuidv4()}`,
          cardInfo: {
            cardNumber: paymentInfo?.cardNumber || "****",
            cardHolderName: paymentInfo?.cardHolderName || "Unknown",
            cardExpiry: paymentInfo?.cardExpiry || "",
            cardCvv: paymentInfo?.cardCvv || "",
          },
        },
        userInfo: {
          userId: customer._id,
          name: `${customer.name} ${customer.surname}`,
          email: customer.email,
          phone: customer.phone,
        },
        expertInfo: {
          expertId: providerId,
          name: providerName,
          accountNo: "PENDING_FETCH",
          specialization: "PENDING_FETCH",
          email: "PENDING_FETCH",
        },
        status: "pending",
      });

      console.log("✅ Booking successfully created:", order._id);

      // --- Step 10: Send response ---
      return res.status(201).json({
        success: true,
        message: "Booking created successfully",
        data: { customer, appointment, order, note },
      });

    } catch (error) {
      console.error("❌ Error during booking submission:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to process booking",
        message: error.message,
      });
    }
  }
);




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