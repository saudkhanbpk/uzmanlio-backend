import nodemailer from 'nodemailer';
import { getCustomerEmailTemplate, getExpertEmailTemplate } from "./emailTemplates.js";
import dotenv from "dotenv";
dotenv.config();

// Brevo SMTP Configuration from environment variables
const SMTP_HOST = process.env.BREVO_SMTP_HOST;
const SMTP_PORT = parseInt(process.env.BREVO_SMTP_PORT) || 587;
const SMTP_USER = process.env.BREVO_SMTP_USER;
const SMTP_PASS = process.env.BREVO_SMTP_PASSWORD;
const SENDER_NAME = process.env.SENDER_NAME || "Uzmanlio";
const SENDER_EMAIL = process.env.SENDER_EMAIL || "luqman.dagai@gmail.com"; // User's email as sender

// Validate configuration
if (!SMTP_USER || !SMTP_PASS) {
    console.warn("⚠️ BREVO_SMTP_USER or BREVO_SMTP_PASSWORD is not set in environment variables!");
    console.warn("⚠️ Email sending will fail until this is configured.");
}

// Create reusable transporter
let transporter = null;

/**
 * Initialize nodemailer transporter
 */
function getTransporter() {
    if (transporter) {
        return transporter;
    }

    if (!SMTP_USER || !SMTP_PASS) {
        throw new Error("Brevo SMTP configuration is missing. Please set BREVO_SMTP_USER and BREVO_SMTP_PASSWORD in .env");
    }

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

    console.log("✅ Brevo SMTP transporter initialized");
    return transporter;
}

/**
 * Send email using Brevo SMTP
 * @param {string} receiver - Email address of the receiver
 * @param {object} emailData - Email data containing subject and body
 */
async function sendEmail(receiver, emailData) {
    try {
        console.log("📧 Sending email via Brevo SMTP to:", receiver);

        const transport = getTransporter();

        const mailOptions = {
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: receiver,
            subject: emailData.subject,
            text: emailData.text || emailData.body || '',
            html: emailData.html || `<p>${emailData.body || emailData.text || ''}</p>`,
        };

        const info = await transport.sendMail(mailOptions);

        console.log("✅ Email sent successfully via Brevo:", info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            provider: "brevo-smtp",
            response: info.response
        };
    } catch (error) {
        console.error("❌ Brevo SMTP email error:", error.message);
        return {
            success: false,
            error: `Email sending failed: ${error.message}`
        };
    }
}

/**
 * Send bulk email using Brevo SMTP
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
        console.log(`📧 Sending bulk email to ${emails.length} recipients via Brevo SMTP`);
        const transport = getTransporter();

        const mailOptions = {
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: emails.join(', '), // Join multiple recipients for SMTP
            subject,
            text,
            html: html || `<p>${text}</p>`,
        };

        const info = await transport.sendMail(mailOptions);

        console.log("✅ Bulk email sent successfully via Brevo:", info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            provider: "brevo-smtp",
            recipientCount: emails.length
        };
    } catch (error) {
        console.error("❌ Brevo SMTP bulk email error:", error.message);
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
 * Verify Brevo SMTP configuration
 * @returns {Promise<boolean>} True if configuration is valid
 */
async function verifyEmailConfig() {
    try {
        const transport = getTransporter();
        await transport.verify();
        console.log("✅ Brevo SMTP server is ready to send messages");
        return true;
    } catch (error) {
        console.error("❌ Brevo SMTP configuration verification failed:", error.message);
        return false;
    }
}

export { sendEmail, sendBookingEmails, sendBulkEmail, verifyEmailConfig };
