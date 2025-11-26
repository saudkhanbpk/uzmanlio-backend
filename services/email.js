import { getCustomerEmailTemplate, getExpertEmailTemplate } from "./emailTemplates.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Resend SMTP Configuration
// SMTP works for both local development and production
const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_bF3Xmwbo_CWB7TFiKLj7CSfEKY9to31qd";
const SENDER_EMAIL = process.env.SENDER_EMAIL || "Uzmanlio@resend.dev";
const SENDER_NAME = process.env.SENDER_NAME || "Uzmanlio";

// Create SMTP transporter using Resend
const transporter = nodemailer.createTransport({
    host: "smtp.resend.com",
    port: 465,
    secure: true, // Use SSL/TLS
    auth: {
        user: "resend",
        pass: RESEND_API_KEY,
    },
});

// Validate configuration
if (!RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY is not set in environment variables!");
    console.error("⚠️  Get your API key from: https://resend.com/api-keys");
    console.error("⚠️  Sign up at: https://resend.com/signup");
} else {
    console.log("✅ Email service configured with Resend SMTP");
    console.log("📧 Sender:", `${SENDER_NAME} <${SENDER_EMAIL}>`);
}

/**
 * Send email using Resend SMTP
 * @param {string} receiver - Email address of the receiver
 * @param {object} emailData - Email data containing subject and body
 */
async function sendEmail(receiver, emailData) {
    try {
        console.log("📧 Sending email via Resend SMTP to:", receiver);

        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not configured");
        }

        const mailOptions = {
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
            to: receiver,
            subject: emailData.subject,
            text: emailData.text || emailData.body || '',
            html: emailData.html || `<p>${emailData.body || emailData.text || ''}</p>`,
        };

        const info = await transporter.sendMail(mailOptions);

        console.log("✅ Email sent via Resend SMTP:", info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            provider: "resend-smtp",
            response: info.response
        };
    } catch (error) {
        console.error("❌ Resend SMTP email error:", error.message);
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
        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not configured");
        }

        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
                to: emails,
                subject,
                html: html || `<p>${text}</p>`,
                text,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Resend API error: ${data.message || response.statusText}`);
        }

        console.log("✅ Bulk email sent via Resend:", data.id);
        return { success: true, messageId: data.id, provider: "resend" };
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

export { sendEmail, sendBookingEmails, sendBulkEmail };
