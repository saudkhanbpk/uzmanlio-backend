import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import User from "../../models/expertInformation.js";
import Customer from "../../models/customer.js";
import Order from "../../models/orders.js";
import Event from "../../models/event.js";
import Service from "../../models/service.js";
import Package from "../../models/package.js";
import CustomerNote from "../../models/customerNotes.js";
import Coupon from "../../models/Coupon.js";
import Institution from "../../models/institution.js";
import { sendBookingEmails } from "../../services/email.js";
import { sendSms } from "../../services/netgsmService.js";
import { bookingDataSchema, validateCouponSchema } from "../../utils/bookingValidation.js";
import mongoSanitize from "express-mongo-sanitize";

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

// ✅ Utility function to safely parse dates
const safeDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
};

/**
 * GET Expert/Institution Blogs and Forms
 */
export const getBlogsAndForms = async (req, res) => {
    try {
        const { institutionID } = req.params;

        if (!mongoose.Types.ObjectId.isValid(institutionID)) {
            return res.status(400).json({ error: "Invalid institution ID" });
        }

        const institution = await Institution.findById(institutionID).populate({
            path: "users",
            select: "information blogs forms",
            populate: [
                { path: "blogs", model: "Blog" },
                { path: "forms", model: "Form" }
            ]
        });

        if (!institution) {
            return res.status(404).json({ error: "Institution not found" });
        }

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
        console.error("Fetch blogs/forms error", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET Active Experts and Institutions
 */
export const getExpertsAndInstitutions = async (req, res) => {
    try {
        const now = new Date();

        const experts = await User.find({
            "subscription.isAdmin": true,
            "subscription.endDate": { $gt: now }
        }).select("information titles expertInformation subscription");

        const activeInstitutions = await Institution.find()
            .populate({
                path: "Admin",
                match: {
                    "subscription.endDate": { $gt: now },
                    "subscription.plantype": "institutional"
                }
            })
            .populate({
                path: "users",
                select: "information titles subscription"
            });

        // Filter out institutions where Admin doesn't meet criteria (match fails -> inst.Admin is null)
        const institutions = activeInstitutions.filter(inst => inst.Admin);
        console.log("institutions:", institutions)
        console.log("Experts:", experts)
        res.json({ experts, institutions });
    } catch (error) {
        console.error("Error fetching experts/institutions:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET Expert Details
 */
export const getExpertDetails = async (req, res) => {
    try {
        const { expertID } = req.params;
        if (!mongoose.Types.ObjectId.isValid(expertID)) {
            return res.status(400).json({ error: "Invalid user ID" });
        }

        const user = await User.findById(expertID)
            .select([
                "-password", "-token", "-tokenEmail", "-phoneVerifyCode",
                "-cardInfo", "-emails", "-customers", "-expertPaymentInfo",
                "-orders", "-appointments", "-events"
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
        console.error("Fetch expert error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST Submit Booking Form
 */
export const submitBooking = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        if (!req.body.bookingData) {
            throw new Error("Missing bookingData");
        }

        const rawBookingData = JSON.parse(req.body.bookingData);
        mongoSanitize.sanitize(rawBookingData); // Security: Prevent NoSQL injection in parsed data

        // Joi Validation
        const { error, value: bookingData } = bookingDataSchema.validate(rawBookingData);
        if (error) {
            console.log("The Error message is From JOI : validation Error")
            throw new Error(error.details[0].message);
        }

        const {
            clientInfo,
            selectedOffering,
            selectedPackage,
            serviceType,
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

        // Validation for individual services
        if (["bireysel", "hizmet"].includes(serviceType) && (!date || !time)) {
            throw new Error("Date and time are required for individual services");
        }

        const normalizedDate = ["grup", "paket"].includes(serviceType) ? null : safeDate(date);
        const normalizedTime = ["grup", "paket"].includes(serviceType) ? null : time || null;
        const mappedEventType = selectedPackage?.packageId ? "package" : "service";

        // Find expert
        const expert = await User.findById(providerId).session(session);
        if (!expert) throw new Error("Expert not found");

        // Find or create customer
        let customer = await Customer.findOne({ email: clientInfo.email }).session(session);
        if (!customer) {
            customer = new Customer({
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
            });
            await customer.save({ session });
        }

        // Link Customer to Expert
        const isCustomerLinked = expert.customers.some(
            c => c.customerId && c.customerId.toString() === customer._id.toString()
        );
        if (!isCustomerLinked) {
            expert.customers.push({
                customerId: customer._id,
                isArchived: false,
                addedAt: new Date()
            });
        }

        let event = null;

        // Create appointment and event for services
        if (mappedEventType === "service") {
            customer.totalAppointments = (customer.totalAppointments || 0) + 1;
            customer.lastAppointment = safeDate(date);
            customer.totalSpent = (customer.totalSpent || 0) + total;

            // Create Event Document
            event = await Event.create([{
                expertId: expert._id,
                title: selectedOffering.title,
                description: selectedOffering.description || "",
                serviceId: selectedOffering.id,
                serviceName: selectedOffering.title,
                serviceType: "service",
                date: selectedOffering.date || date,
                time: selectedOffering.time || time,
                duration: selectedOffering.duration || 60,
                eventType: (selectedOffering.eventType || "online").toLowerCase(),
                customers: [customer._id],
                meetingType: selectedOffering.meetingType || "",
                price: total,
                status: "pending",
                paymentType: [{
                    customerId: customer._id,
                    paymentMethod: paymentInfo?.method || 'online',
                    orderId: null // updated after order creation
                }],
                isRecurring: false,
                appointmentNotes: orderNotes,
                files: req.files?.map((f) => ({
                    name: f.originalname,
                    type: f.mimetype,
                    size: f.size.toString(),
                    uploadDate: new Date().toISOString(),
                    url: `/uploads/CustomerFiles/NotesFormsFiles/${f.filename}`,
                })) || [],
                selectedClients: [{
                    id: customer._id,
                    name: `${customer.name} ${customer.surname}`,
                    email: customer.email
                }],
                category: selectedOffering.category,
            }], { session }).then(res => res[0]);

            expert.events.push(event._id);
        }

        // Create Note if needed
        let note = null;
        if (orderNotes || (req.files && req.files.length > 0)) {
            note = await CustomerNote.create([{
                content: orderNotes || "Booking submission with attachments.",
                author: "customer",
                authorName: `${customer.name} ${customer.surname}`,
                files: req.files?.map((f) => ({
                    name: f.originalname,
                    type: f.mimetype,
                    size: f.size.toString(),
                    url: `/uploads/CustomerFiles/NotesFormsFiles/${f.filename}`,
                })) || [],
            }], { session }).then(res => res[0]);
            customer.notes.push(note._id);
        }

        // Fetch Service or Package to update
        let offeringDoc;
        if (mappedEventType === "service") {
            offeringDoc = await Service.findById(selectedOffering.id).session(session);
        } else {
            offeringDoc = await Package.findById(selectedOffering.id).session(session);
        }

        // Create Order
        const order = await Order.create([{
            orderDetails: {
                events: [{
                    eventType: mappedEventType,
                    service: mappedEventType === "service" ? {
                        serviceId: offeringDoc?._id,
                        name: selectedOffering.title,
                        description: selectedOffering.description,
                        price: subtotal,
                        duration: selectedOffering.duration,
                        sessions: selectedOffering.sessionsIncluded || 1,
                        meetingType: selectedOffering.meetingType,
                    } : undefined,
                    package: mappedEventType === "package" ? {
                        packageId: offeringDoc?._id,
                        name: selectedOffering.title,
                        details: selectedOffering.description,
                        price: subtotal,
                        meetingType: selectedOffering.meetingType,
                        duration: selectedOffering.duration,
                        sessions: selectedOffering.sessionsIncluded,
                    } : undefined,
                }],
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
                accountNo: expert.expertInformation?.subMerchantID || "N/A",
                specialization: expert.title || "",
                email: expert.information.email,
            },
            customerId: customer._id,
            status: "pending",
            orderSource: "BookingPage"
        }], { session }).then(res => res[0]);

        customer.orders.push(order._id);
        expert.orders.push(order._id);

        if (event) {
            event.paymentType[0].orderId = order._id;
            await event.save({ session });
        }

        // Update Offering (Service/Package)
        if (offeringDoc) {
            if (!offeringDoc.selectedClients) offeringDoc.selectedClients = [];
            offeringDoc.selectedClients.push({
                id: customer._id,
                name: `${customer.name} ${customer.surname}`,
                email: customer.email
            });

            if (mappedEventType === "package") {
                if (!offeringDoc.purchasedBy) offeringDoc.purchasedBy = [];
                offeringDoc.purchasedBy.push({
                    userId: customer._id,
                    orderId: order._id,
                    purchaseDate: new Date(),
                    sessionsUsed: 0,
                });
            }
            await offeringDoc.save({ session });
        }

        await customer.save({ session });
        await expert.save({ session });

        await session.commitTransaction();

        // Send Emails (Non-blocking)
        setImmediate(async () => {
            try {
                let emailType = mappedEventType === "package" ? "paket" :
                    (selectedOffering.meetingType === "grup" ? "grup" : "bireysel");

                await sendBookingEmails(
                    emailType,
                    { name: `${customer.name} ${customer.surname}`, email: customer.email, phone: customer.phone },
                    { name: providerName, email: expert.information?.email },
                    {
                        serviceName: selectedOffering.title,
                        price: total,
                        date: normalizedDate,
                        time: normalizedTime,
                        sessionsIncluded: selectedOffering.sessionsIncluded || selectedOffering.sessions
                    }
                );
                // Send SMS notification to expert (Non-blocking)
                const expertPhone = expert.information?.phone;
                if (expertPhone) {
                    const clientName = `${customer.name} ${customer.surname}`;
                    const expertName = expert.information?.name || "Expert";
                    const serviceName = selectedOffering.title;
                    const bDate = normalizedDate || selectedOffering.date || date || "";
                    const bTime = normalizedTime || selectedOffering.time || time || "";

                    const smsMessage = `Merhaba ${expertName}, ${clientName} senden ${serviceName} randevusu aldı. Tarih: ${bDate} ${bTime}. Onaylamak için paneli ziyaret edin.`;

                    try {
                        const smsResult = await sendSms(expertPhone, smsMessage);
                        if (smsResult.success) {
                            console.log(`✅ Booking SMS sent to expert: ${expertPhone}`);
                        } else {
                            console.error(`❌ Failed to send booking SMS to expert: ${smsResult.error}`);
                        }
                    } catch (smsErr) {
                        console.error("Error sending booking SMS to expert:", smsErr);
                    }
                }
            } catch (e) {
                console.error("Booking notifications failed:", e.message);
            }
        });

        res.status(201).json({
            success: true,
            message: "Booking created successfully",
            data: { customer, appointment, order, note }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error("Booking Error:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        session.endSession();
    }
};

/**
 * GET Packages for Expert
 */
export const getPackages = async (req, res) => {
    try {
        const { userId } = req.params;
        const packages = await Package.find({ expertId: userId });
        res.json({ packages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET Active Packages for Expert
 */
export const getActivePackages = async (req, res) => {
    try {
        const { userId } = req.params;
        const packages = await Package.find({ expertId: userId, status: 'active' });
        res.json({ packages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET Available Packages (for booking page)
 */
export const getAvailablePackages = async (req, res) => {
    try {
        const { userId } = req.params;
        const packages = await Package.find({ expertId: userId, status: 'active', isAvailable: true });
        res.json({ packages });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST Validate Coupon
 */
export const validateCoupon = async (req, res) => {
    try {
        // Joi Validation
        const { error, value } = validateCouponSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { customerId, couponCode, expertId } = value;

        const coupon = await Coupon.findOne({
            owner: expertId,
            code: couponCode,
            status: "active",
        });

        if (!coupon) return res.status(404).json({ error: "Coupon not found or inactive" });

        const now = new Date();
        if (coupon.expiryDate && coupon.expiryDate < now) {
            return res.status(400).json({ error: "Coupon has expired" });
        }

        if (coupon.usageCount >= coupon.maxUsage) {
            return res.status(400).json({ error: "Coupon usage limit reached" });
        }

        res.json({ type: coupon.type, value: coupon.value });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
