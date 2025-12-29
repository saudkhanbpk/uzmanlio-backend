import nodemailer from 'nodemailer';
import { getCustomerEmailTemplate, getExpertEmailTemplate } from "./emailTemplates.js";
import dotenv from "dotenv";
dotenv.config();

// SMTP Configuration from environment variables
const EMAIL_USER = process.env.EMAIL_USER || "info@uzmanlio.com";
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD || "iryz qlpf jnrq ycxe";
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com'; // Default to Gmail
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true'; // false for TLS, true for SSL
const SENDER_NAME = process.env.SENDER_NAME || "Uzmanlio";

// Validate configuration
if (!EMAIL_USER || !EMAIL_APP_PASSWORD) {
    console.error("❌ EMAIL_USER or EMAIL_APP_PASSWORD is not set in environment variables!");
    console.error("⚠️  Please set these in your .env file:");
    console.error("   EMAIL_USER=your-email@gmail.com");
    console.error("   EMAIL_APP_PASSWORD=your-app-password");
    console.error("⚠️  For Gmail, create an App Password at: https://myaccount.google.com/apppasswords");
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

    if (!EMAIL_USER || !EMAIL_APP_PASSWORD) {
        throw new Error("Email configuration is missing. Please set EMAIL_USER and EMAIL_APP_PASSWORD in .env");
    }

    transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: EMAIL_PORT,
        secure: EMAIL_SECURE, // true for 465, false for other ports
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_APP_PASSWORD,
        },
    });

    console.log("✅ Email transporter initialized");
    return transporter;
}

/**
 * Send email using nodemailer SMTP
 * @param {string} receiver - Email address of the receiver
 * @param {object} emailData - Email data containing subject and body
 */
async function sendEmail(receiver, emailData) {
    try {
        console.log("📧 Sending email via SMTP to:", receiver);

        const transport = getTransporter();

        const mailOptions = {
            from: `${SENDER_NAME} <${EMAIL_USER}>`,
            to: receiver,
            subject: emailData.subject,
            text: emailData.text || emailData.body || '',
            html: emailData.html || `<p>${emailData.body || emailData.text || ''}</p>`,
        };

        const info = await transport.sendMail(mailOptions);

        console.log("✅ Email sent successfully:", info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            provider: "smtp",
            response: info.response
        };
    } catch (error) {
        console.error("❌ SMTP email error:", error.message);
        return {
            success: false,
            error: `Email sending failed: ${error.message}`
        };
    }
}

/**
 * Send bulk email using nodemailer SMTP
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
        const transport = getTransporter();

        const mailOptions = {
            from: `${SENDER_NAME} <${EMAIL_USER}>`,
            to: emails.join(', '), // Join multiple recipients
            subject,
            text,
            html: html || `<p>${text}</p>`,
        };

        const info = await transport.sendMail(mailOptions);

        console.log("✅ Bulk email sent successfully:", info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            provider: "smtp",
            recipientCount: emails.length
        };
    } catch (error) {
        console.error("❌ SMTP bulk email error:", error.message);
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
 * Verify email configuration
 * @returns {Promise<boolean>} True if configuration is valid
 */
async function verifyEmailConfig() {
    try {
        const transport = getTransporter();
        await transport.verify();
        console.log("✅ Email server is ready to send messages");
        return true;
    } catch (error) {
        console.error("❌ Email configuration verification failed:", error.message);
        return false;
    }
}

export { sendEmail, sendBookingEmails, sendBulkEmail, verifyEmailConfig };
