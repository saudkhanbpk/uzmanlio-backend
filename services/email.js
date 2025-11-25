import nodemailer from "nodemailer";
import { getCustomerEmailTemplate, getExpertEmailTemplate } from "./emailTemplates.js";
import dotenv from "dotenv";
dotenv.config();

/**
 * Send email using nodemailer (SMTP)
 * @param {string} receiver - Email address of the receiver
 * @param {object} emailData - Email data containing subject and body
 */
async function sendEmail(receiver, emailData) {
    try {
        // Configure SMTP transporter
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === "true" || false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD,
            },
        });

        const fromEmail = process.env.SMTP_FROM || process.env.EMAIL_USER;

        const info = await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME || 'Uzmanlio'}" <${fromEmail}>`,
            to: receiver,
            subject: emailData.subject,
            text: emailData.body || emailData.text,
            html: emailData.html || emailData.body,
        });

        console.log("✅ Email sent successfully:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("❌ Error sending email:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Send bulk email using SMTP (nodemailer)
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
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === "true" || false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD,
            },
        });

        const fromEmail = process.env.SMTP_FROM || process.env.EMAIL_USER;

        const info = await transporter.sendMail({
            from: `"${process.env.SMTP_FROM_NAME || 'Uzmanlio'}" <${fromEmail}>`,
            bcc: emails, // Send to all recipients via BCC
            subject,
            text,
            html: html || `<p>${text}</p>`,
        });

        console.log("✅ Bulk email sent successfully:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error("❌ Error sending bulk email:", err);
        throw err;
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
