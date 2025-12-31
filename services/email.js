import { Resend } from 'resend';
import { getCustomerEmailTemplate, getExpertEmailTemplate } from "./emailTemplates.js";
import dotenv from "dotenv";
dotenv.config();

// Resend Configuration from environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_NAME = process.env.SENDER_NAME || "Uzmanlio";
const SENDER_EMAIL = process.env.SENDER_EMAIL || "onboarding@resend.dev"; // Default Resend test email

// Validate configuration
if (!RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY is not set in environment variables!");
    console.warn("⚠️ Email sending will fail until this is configured.");
}

// Create reusable resend instance
let resendClient = null;

/**
 * Initialize Resend client
 */
function getResendClient() {
    if (resendClient) {
        return resendClient;
    }

    if (!RESEND_API_KEY) {
        throw new Error("Resend API Key is missing. Please set RESEND_API_KEY in .env");
    }

    resendClient = new Resend(RESEND_API_KEY);
    console.log("✅ Resend client initialized");
    return resendClient;
}

/**
 * Send email using Resend API
 * @param {string} receiver - Email address of the receiver
 * @param {object} emailData - Email data containing subject and body
 */
async function sendEmail(receiver, emailData) {
    try {
        console.log("📧 Sending email via Resend to:", receiver);

        const resend = getResendClient();

        const { data, error } = await resend.emails.send({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: [receiver],
            subject: emailData.subject,
            text: emailData.text || emailData.body || '',
            html: emailData.html || `<p>${emailData.body || emailData.text || ''}</p>`,
        });

        if (error) {
            console.error("❌ Resend API error:", error);
            return {
                success: false,
                error: `Resend API error: ${error.message}`
            };
        }

        console.log("✅ Email sent successfully via Resend:", data.id);
        return {
            success: true,
            messageId: data.id,
            provider: "resend"
        };
    } catch (error) {
        console.error("❌ Resend general error:", error.message);
        return {
            success: false,
            error: `Email sending failed: ${error.message}`
        };
    }
}

/**
 * Send bulk email using Resend API
 * @param {string[]} emails - array of recipient emails
 * @param {string} subject - email subject
 * @param {string} text - plain text body
 * @param {string} html - html body (optional)
 */
async function sendBulkEmail(emails, subject, text, html = null) {
    if (!emails || emails.length === 0) {
        throw new Error("Email array is empty.");
    }

    try {
        console.log(`📧 Sending bulk email to ${emails.length} recipients via Resend`);
        const resend = getResendClient();

        // Resend recommends using the batch send for bulk
        // However, for simplicity if target is small, we can batch them in one call if privacy isn't an issue
        // or loop if they need to be individualized. Here we follow previous pattern of "to: join(', ')" equivalent.
        // Actually Resend 'to' can be an array.

        const { data, error } = await resend.emails.send({
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: emails,
            subject,
            text,
            html: html || `<p>${text}</p>`,
        });

        if (error) {
            console.error("❌ Resend Bulk API error:", error);
            throw new Error(`Bulk email sending failed: ${error.message}`);
        }

        console.log("✅ Bulk email sent successfully via Resend:", data.id);
        return {
            success: true,
            messageId: data.id,
            provider: "resend",
            recipientCount: emails.length
        };
    } catch (error) {
        console.error("❌ Resend bulk email error:", error.message);
        throw new Error(`Bulk email sending failed: ${error.message}`);
    }
}

/**
 * Send booking confirmation emails to customer and expert
 * @param {string} bookingType - Type of booking: 'bireysel', 'grup', or 'paket'
 * @param {object} customerData - Customer information
 * @param {object} expertData - Expert information
 * @param {object} bookingDetails - Booking details
 */
async function sendBookingEmails(bookingType, customerData, expertData, bookingDetails) {
    try {
        const templateData = {
            customerName: customerData.name,
            customerEmail: customerData.email,
            customerPhone: customerData.phone,
            expertName: expertData.name,
            serviceName: bookingDetails.serviceName,
            price: bookingDetails.price,
            date: bookingDetails.date ? new Date(bookingDetails.date).toLocaleDateString('tr-TR') : null,
            time: bookingDetails.time,
        };

        const customerTemplate = getCustomerEmailTemplate(bookingType, templateData);
        const expertTemplate = getExpertEmailTemplate(bookingType, templateData);

        const customerEmailResult = await sendEmail(customerData.email, {
            subject: customerTemplate.subject,
            html: customerTemplate.html,
        });

        const expertEmailResult = await sendEmail(expertData.email, {
            subject: expertTemplate.subject,
            html: expertTemplate.html,
        });

        console.log("📧 Booking emails sent:", {
            customer: customerEmailResult.success,
            expert: expertEmailResult.success,
        });

        return {
            success: customerEmailResult.success && expertEmailResult.success,
            customerEmail: customerEmailResult,
            expertEmail: expertEmailResult,
        };
    } catch (error) {
        console.error("❌ Error sending booking emails:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Verify Resend configuration
 * @returns {Promise<boolean>} True if configuration is valid
 */
async function verifyEmailConfig() {
    try {
        if (!RESEND_API_KEY) return false;
        const resend = getResendClient();
        // There isn't a direct .verify() like nodemailer, but we can try to list domains or similar
        // if we just want to check connectivity/key validity. 
        // For now, let's just check if the client can be initialized.
        return !!resend;
    } catch (error) {
        console.error("❌ Resend configuration verification failed:", error.message);
        return false;
    }
}

export { sendEmail, sendBookingEmails, sendBulkEmail, verifyEmailConfig };
