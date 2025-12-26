import express from "express";
import { v4 as uuidv4 } from "uuid";
import User from "../../models/expertInformation.js";
import Institution from "../../models/institution.js";
import mongoose from "mongoose";
import ParasutApiService from "../../services/parasutService/parasutApi.services.js";
import { sendEmail } from "../../services/email.js";
import { getSubscriptionInvoiceEmailTemplate } from "../../services/emailTemplates.js";
import { validateParams, validateBody } from "../../middlewares/validateRequest.js";
import { newSubscriptionSchema } from "../../validations/subscription.schema.js";
import { userIdParams } from "../../validations/common.schema.js";

const router = express.Router();

const findUserById = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
    }
    const user = await User.findById(userId);
    if (!user) {
        throw new Error("User not found");
    }
    return user;
};

/**
 * Async function to create subscription invoice with Parasut
 * This runs in the background without blocking the main response
 */
const createSubscriptionInvoiceAsync = async (userId, subscriptionData, billingInfo) => {
    try {
        console.log("🧾 Starting async invoice creation for subscription...");

        const user = await findUserById(userId);

        // Get institution name if available
        let companyName = billingInfo.companyName || "Bireysel Müşteri";
        if (user.subscription?.institutionId) {
            try {
                const institution = await Institution.findById(user.subscription.institutionId);
                if (institution && institution.name) {
                    companyName = institution.name;
                }
            } catch (err) {
                console.log("⚠️ Could not fetch institution name:", err.message);
            }
        }

        // Prepare customer info for Parasut
        const customerInfo = {
            name: companyName,
            companyName: companyName,
            email: user.information.email,
            phone: billingInfo.phoneNumber || user.information.phone,
            address: billingInfo.address || user.information.address || "",
            city: billingInfo.city || user.information.city || "İstanbul",
            district: billingInfo.district || user.information.district || "",
            taxNumber: billingInfo.taxNumber || "",
            taxOffice: billingInfo.taxOffice || "",
            contactType: billingInfo.taxNumber ? "company" : "person",
        };

        // Prepare subscription as order data
        const subscriptionOrder = {
            _id: subscriptionData.id,
            totalPriceForExpert: subscriptionData.price,
            noOfUsers: subscriptionData.seats, // Subscription is a single item
        };

        // Prepare payment info
        const paymentInfo = {
            isSuccessful: true,
            amount: subscriptionData.price,
            currency: 'TRY',
            date: new Date().toISOString().split('T')[0],
            description: `Subscription - ${subscriptionData.plantype} (${subscriptionData.duration})`
        };

        // Description for invoice
        const planTypeDisplay = subscriptionData.plantype === 'institutional' ? 'Kurumsal' : 'Bireysel';
        const durationDisplay = subscriptionData.duration === 'monthly' ? 'Aylık' : 'Yıllık';
        const description = `Uzmanlio ${planTypeDisplay} Abonelik - ${durationDisplay}`;

        console.log("📋 Customer info:", JSON.stringify(customerInfo, null, 2));
        console.log("📋 Subscription order:", JSON.stringify(subscriptionOrder, null, 2));

        // Create invoice using Parasut API
        const invoice = await ParasutApiService.createCompleteInvoiceWorkflow(
            customerInfo,
            subscriptionOrder,
            paymentInfo,
            description,
            user.information.email
        );

        if (invoice.status === 'disabled') {
            console.log("⚠️ Parasut integration is disabled");
            return { success: false, status: 'disabled' };
        }

        if (invoice.status === 'access_denied') {
            console.log("⚠️ Parasut access denied - tokens may need refresh");
            return { success: false, status: 'access_denied' };
        }

        console.log("✅ Invoice created successfully:", invoice.invoiceId);

        // Update user subscription with invoice info
        const invoiceInfo = {
            invoiceId: invoice.invoiceNumber || invoice.invoiceId,
            parasutInvoiceId: invoice.invoiceId,
            invoiceNumber: invoice.invoiceNumber || `INV-${invoice.invoiceId}`,
            totalAmount: subscriptionData.price,
            sharingUrl: invoice.invoiceDetails?.attributes?.sharing_preview_url || "",
            status: 'completed',
            createdAt: new Date()
        };

        // Save invoice info to user's subscription
        await User.findByIdAndUpdate(userId, {
            $set: {
                'subscription.invoiceInfo': invoiceInfo
            }
        });

        console.log("✅ Invoice info saved to user subscription");

        // Send invoice email notification
        try {
            const emailTemplate = getSubscriptionInvoiceEmailTemplate({
                userName: `${user.information.name} ${user.information.surname}`,
                email: user.information.email,
                planType: planTypeDisplay,
                duration: durationDisplay,
                price: subscriptionData.price,
                seats: subscriptionData.seats || 0,
                invoiceNumber: invoiceInfo.invoiceNumber,
                invoiceUrl: invoiceInfo.sharingUrl,
                subscriptionStartDate: new Date(subscriptionData.startDate).toLocaleDateString('tr-TR'),
                subscriptionEndDate: new Date(subscriptionData.endDate).toLocaleDateString('tr-TR'),
            });

            await sendEmail(user.information.email, {
                subject: emailTemplate.subject,
                html: emailTemplate.html,
            });

            console.log("📧 Invoice email sent to:", user.information.email);
        } catch (emailError) {
            console.error("❌ Failed to send invoice email:", emailError.message);
        }

        return { success: true, invoice: invoiceInfo };
    } catch (error) {
        console.error("❌ Async invoice creation failed:", error.message);

        // Update user with error status
        try {
            await User.findByIdAndUpdate(userId, {
                $set: {
                    'subscription.invoiceInfo': {
                        status: 'failed',
                        error: error.message,
                        createdAt: new Date()
                    }
                }
            });
        } catch (updateError) {
            console.error("❌ Failed to save invoice error status:", updateError.message);
        }

        return { success: false, error: error.message };
    }
};

router.post("/:userId/new-subscription", validateParams(userIdParams), validateBody(newSubscriptionSchema), async (req, res) => {
    try {
        console.log("Adding the Payment Information and Creating New Subscription");
        const { userId } = req.params;
        const {
            cardHolderName,
            cardNumber,
            cardCvv,
            cardExpiry,
            currentPlan,
            selectedSeats,
            subscriptionDuration,
            price,
            duration,
            plantype,
            // Billing info fields
            companyName,
            taxNumber,
            taxOffice,
            address,
            city,
            district,
            phoneNumber
        } = req.body;

        console.log("Subscription request received for userId:", userId);

        const user = await findUserById(userId);
        const existingInstitutionId = user.subscription?.institutionId || null;

        // Initialize cards array if it doesn't exist
        if (!user.cards) {
            user.cards = [];
        }

        // Only store/update billing info. We keep the cards array structure for compatibility 
        // but only store the billingInfo.
        const billingData = {
            companyName: companyName || "",
            taxNumber: taxNumber || "",
            taxOffice: taxOffice || "",
            address: address || "",
            city: city || "",
            district: district || "",
            phoneNumber: phoneNumber || ""
        };

        if (user.cards.length === 0) {
            user.cards.push({ billingInfo: billingData });
            console.log("Billing Info Added Successfully");
        } else {
            // Update the existing entry's billing info
            user.cards[0].billingInfo = billingData;
            console.log("Billing Info Updated Successfully");
        }

        const now = new Date();
        const subscriptionId = uuidv4();
        const startDate = Date.now();
        const endDate = duration === "monthly"
            ? new Date(now.setMonth(now.getMonth() + 1))
            : new Date(now.setFullYear(now.getFullYear() + 1));

        user.subscription = {
            id: subscriptionId,
            plantype: plantype,
            isAdmin: true,
            seats: plantype === "institutional" ? selectedSeats : 0,
            price: price,
            duration: duration,
            startDate: startDate,
            endDate: endDate,
            institutionId: existingInstitutionId,
        };

        await user.save();
        const updatedUser = await findUserById(userId);
        console.log("New Subscription Added Successfully");

        // Prepare billing info for invoice
        const billingInfo = {
            companyName: companyName || "",
            taxNumber: taxNumber || "",
            taxOffice: taxOffice || "",
            address: address || "",
            city: city || "",
            district: district || "",
            phoneNumber: phoneNumber || ""
        };

        // 🚀 Create invoice ASYNCHRONOUSLY - does not block response
        createSubscriptionInvoiceAsync(userId, {
            id: subscriptionId,
            plantype: plantype,
            price: price,
            duration: duration,
            seats: plantype === "institutional" ? selectedSeats : 1,
            startDate: startDate,
            endDate: endDate
        }, billingInfo).then(result => {
            console.log("🧾 Async invoice creation completed:", result.success ? "SUCCESS" : result);
        }).catch(err => {
            console.error("🧾 Async invoice creation error:", err.message);
        });

        res.status(200).json({
            message: "Subscription Added Successfully",
            user: updatedUser,
            invoiceStatus: "processing" // Invoice is being created in background
        });
    } catch (error) {
        console.error("Subscription Error:", error);
        res.status(500).json({
            message: "Error Adding New Subscription",
            error: error.message
        });
    }
});

export default router;