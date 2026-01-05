import * as Brevo from '@getbrevo/brevo';
import { getCustomerEmailTemplate, getExpertEmailTemplate } from "./emailTemplates.js";
import dotenv from "dotenv";
dotenv.config();

// Brevo API Configuration from environment variables
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_NAME = process.env.SENDER_NAME || "Uzmanlio";
const SENDER_EMAIL = process.env.SENDER_EMAIL || "luqman.dagai@gmail.com";

// Validate configuration
if (!BREVO_API_KEY) {
    console.warn("⚠️ BREVO_API_KEY is not set in environment variables!");
    console.warn("⚠️ Email sending will fail until this is configured.");
}

// Create reusable Brevo API instance
let apiInstance = null;

/**
 * Initialize Brevo API client
 */
function getBrevoClient() {
    if (apiInstance) {
        return apiInstance;
    }

    if (!BREVO_API_KEY) {
        throw new Error("Brevo API Key is missing. Please set BREVO_API_KEY in .env");
    }

    apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

    console.log("✅ Brevo API client initialized");
    return apiInstance;
}

/**
 * Send email using Brevo API
 * @param {string} receiver - Email address of the receiver
 * @param {object} emailData - Email data containing subject and body
 */
async function sendEmail(receiver, emailData) {
    try {
        console.log("📧 Sending email via Brevo API to:", receiver);

        const api = getBrevoClient();
        const sendSmtpEmail = new Brevo.SendSmtpEmail();

        sendSmtpEmail.subject = emailData.subject;
        sendSmtpEmail.htmlContent = emailData.html || `<p>${emailData.body || emailData.text || ''}</p>`;
        sendSmtpEmail.sender = { name: SENDER_NAME, email: SENDER_EMAIL };
        sendSmtpEmail.to = [{ email: receiver }];

        if (emailData.text || emailData.body) {
            sendSmtpEmail.textContent = emailData.text || emailData.body;
        }

        const data = await api.sendTransacEmail(sendSmtpEmail);

        console.log("✅ Email sent successfully via Brevo API:", data.body.messageId);
        return {
            success: true,
            messageId: data.body.messageId,
            provider: "brevo-api"
        };
    } catch (error) {
        console.error("❌ Brevo API email error:", error.response?.body?.message || error.message || error);
        return {
            success: false,
            error: `Email sending failed: ${error.response?.body?.message || error.message || error}`
        };
    }
}

/**
 * Send bulk email using Brevo API
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
        console.log(`📧 Sending bulk email to ${emails.length} recipients via Brevo API`);
        const api = getBrevoClient();

        // Brevo allows sending to multiple recipients in one call
        const sendSmtpEmail = new Brevo.SendSmtpEmail();
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = html || `<p>${text}</p>`;
        sendSmtpEmail.textContent = text;
        sendSmtpEmail.sender = { name: SENDER_NAME, email: SENDER_EMAIL };
        sendSmtpEmail.to = emails.map(email => ({ email }));

        const data = await api.sendTransacEmail(sendSmtpEmail);

        console.log("✅ Bulk email sent successfully via Brevo API:", data.body.messageId);
        return {
            success: true,
            messageId: data.body.messageId,
            provider: "brevo-api",
            recipientCount: emails.length
        };
    } catch (error) {
        console.error("❌ Brevo API bulk email error:", error.response?.body?.message || error.message || error);
        throw new Error(`Bulk email sending failed: ${error.response?.body?.message || error.message || error}`);
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
 * Verify Brevo API configuration
 * @returns {Promise<boolean>} True if configuration is valid
 */
async function verifyEmailConfig() {
    try {
        const api = getBrevoClient();
        // Try to get account info to verify API key
        const accountApi = new Brevo.AccountApi();
        accountApi.setApiKey(Brevo.AccountApiApiKeys.apiKey, BREVO_API_KEY);
        await accountApi.getAccount();
        console.log("✅ Brevo API is ready and account is accessible");
        return true;
    } catch (error) {
        console.error("❌ Brevo API configuration verification failed:", error.response?.body?.message || error.message || error);
        return false;
    }
}

export { sendEmail, sendBookingEmails, sendBulkEmail, verifyEmailConfig };
