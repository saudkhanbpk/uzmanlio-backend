import express from "express";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import User from "../../models/expertInformation.js";
import { createMulterUpload, handleMulterError } from '../../middlewares/upload.js';
import Coupon from "../../models/Coupon.js";
import Institution from "../../models/institution.js";
import { sendBookingEmails } from '../../services/email.js';

// ================== NEW IMPORTS ==================
// Import the models you'll be writing data to.
import Customer from '../../models/customer.js';
import Order from '../../models/orders.js';
import CustomerAppointments from '../../models/customerAppointment.js';
import CustomerNote from '../../models/customerNotes.js';
// import Client from "../../../../../../AppData/Local/Microsoft/TypeScript/5.9/node_modules/undici-types/client.js";

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

router.get("/:institutionID/blogs-forms", async (req, res) => {
  try {
    const { institutionID } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(institutionID)) {
      return res.status(400).json({ error: "Invalid institution ID" });
    }

    // Find the institution and get its users
    const institution = await Institution.findById(institutionID).populate({
      path: "users", // populate the user references
      select: "information blogs forms", // select only needed fields
    });

    if (!institution) {
      return res.status(404).json({ error: "Institution not found" });
    }

    // Map over users to structure the data
    const usersWithBlogsAndForms = institution.users.map(user => ({
      userId: user._id,
      name: user.information?.name,
      blogs: user.blogs || [],
      forms: user.forms || [],
    }));

    res.json({
      institutionId: institution._id,
      institutionName: institution.name,
      users: usersWithBlogsAndForms,
    });
  } catch (err) {
    console.error("Fetch error", err);
    res.status(500).json({ error: err.message });
  }
});





router.get("/experts-institutions", async (req, res) => {
  try {
    const now = new Date();

    // Get all experts with active subscriptions
    const experts = await User.find({
      "subscription.isAdmin": true,
      "subscription.endDate": { $gt: now }
    });

    // Get institutions and populate admin
    const institutions = await Institution.find()
      .populate("Admin")
      .exec();

    // Filter only those institutions whose admin has an active subscription
    const activeInstitutions = institutions.filter(
      inst => inst.Admin && inst.Admin.subscription && inst.Admin.subscription.endDate > now
    );

    // ✅ Populate the users inside each institution (only with "information" and "titles")
    const institutionsWithUsers = await Promise.all(
      activeInstitutions.map(async (inst) => {
        const users = await User.find(
          { _id: { $in: inst.users } },
          { information: 1, titles: 1 } // <-- only these fields
        );

        // return the institution with the users info
        return {
          ...inst.toObject(),
          users
        };
      })
    );

    res.json({ experts, institutions: institutionsWithUsers });
  } catch (error) {
    console.error("Error fetching experts/institutions:", error);
    res.status(500).json({ error: error.message });
  }
});



// GET Expert Details Route (no changes needed)
router.get("/:expertID", async (req, res) => {
  if (!mongoose.connection.readyState) {
    return res.status(503).json({ error: "Service Unavailable" });
  }
  try {
    const { expertID } = req.params;
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
  "/:finalCustomerId/form",
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
        selectedPackage,
        selectedService,
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
      console.log("Selected Offering:", selectedOffering)


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
      // const mappedEventType = packageType
      //   ? "package"
      //   : serviceType
      //     ? "service"
      //     : "service"; // fallback (defaults to 'service')
      const mappedEventType = selectedPackage.packageId !== "" ? "package" : "service";


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

      //Create the Event in Expert 
      const Expert = await User.findById(providerId);
      const newEvent = {
        id: appointment._id,
        title: selectedOffering.title,
        description: "",
        serviceId: mappedEventType === "service" ? selectedOffering.id : undefined,
        serviceName: mappedEventType === "service" ? selectedOffering.title : undefined,
        packageId: mappedEventType === "package" ? selectedOffering.id : undefined,
        packageName: mappedEventType === "package" ? selectedOffering.title : undefined,
        serviceType: mappedEventType === "service" ? "service" : "package",
        date: selectedOffering.date || null,
        time: selectedOffering.time || null,
        duration: selectedOffering.duration || 60,
        eventType: selectedOffering.eventType || "online",
        customers: customer._id,
        meetingType: selectedOffering.meetingType || "",
        price: total,
        status: "pending",
        paymentType: 'online',
        isRecurring: false,
        appointmentNotes: orderNotes,
        files: req.files?.map((f) => ({
          name: f.originalname,
          type: f.mimetype,
          size: f.size,
          url: f.path,
        })) || [],
        selectedClients: [{ id: customer._id, name: customer.name, email: customer.email }],
        Client: customer._id,
        category: selectedOffering.category,
        subCategory: selectedOffering.subCategory,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      Expert.events.push(newEvent);
      // const currentOffering = mappedEventType === "service" ? service : package;
      let CurrentService;
      //Add the Client To the ServiceOR package, To Trace the Number Of Sales
      // if (mappedEventType === "service") {
      //   CurrrentService = await Expert.services.findById(selectedOffering.id);
      // } else {
      //   CurrrentService = await Expert.packages.findById(selectedOffering.id);
      // }
      if (mappedEventType === "service") {
        CurrentService = Expert.services.find(
          s => s.id === selectedOffering.id
        );
      } else {
        CurrentService = Expert.packages.find(
          p => p.id === selectedOffering.id
        );
      }
      CurrentService.selectedClients.push({ id: customer._id, name: customer.name, email: customer.email });
      // await CurrentService.save();
      await Expert.save();





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



      console.log("Selected Offerings:", selectedOffering)

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
                    duration: selectedOffering.duration,
                    sessions: selectedOffering.sessions || 1,
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

      await Expert.orders.push(order._id);
      await Expert.appointments.push(appointment._id);
      await Expert.save();

      console.log("✅ Booking successfully created:", order._id);


      try {
        // Determine email type based on mappedEventType and meetingType
        let emailType;
        const expert = await findUserById(providerId);

        if (mappedEventType === "package") {
          emailType = "paket";
        } else if (mappedEventType === "service") {
          // Check meetingType to differentiate between individual and group
          if (selectedOffering.meetingType === "1-1" || selectedOffering.meetingType === "bireysel") {
            emailType = "bireysel";
          } else if (selectedOffering.meetingType === "grup") {
            emailType = "grup";
          } else {
            // Fallback: if meetingType is not set, default to bireysel
            emailType = "bireysel";
          }
        }

        console.log("📧 Sending emails with type:", emailType);

        await sendBookingEmails(
          emailType,
          {
            name: `${customer.name} ${customer.surname}`,
            email: customer.email,
            phone: customer.phone,
          },
          {
            name: providerName,
            email: expert.information?.email,
          },
          {
            serviceName: selectedOffering.title,
            price: total,
            date: normalizedDate,
            time: normalizedTime,
          }
        );

        console.log("✅ Email notifications sent successfully");
      } catch (emailError) {
        console.error("⚠️ Failed to send email notifications:", emailError.message);
        // Don't fail the booking if email fails
      }

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