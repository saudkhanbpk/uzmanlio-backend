import nodemailer from "nodemailer";
import { getCustomerEmailTemplate, getExpertEmailTemplate } from "./emailTemplates.js";
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send email using nodemailer
 * @param {string} receiver - Email address of the receiver
 * @param {object} emailData - Email data containing subject and body
 */
async function sendEmail(receiver, emailData) {
    try {
        const transporter = nodemailer.createTransport({
            service: "SendGrid",
            auth: {
                user: process.env.FROM_EMAIL,
                pass: process.env.SENDGRID_API_KEY,
            },
        });

        const info = await transporter.sendMail({
            from: process.env.FROM_EMAIL,
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
 * Send bulk email using SendGrid
 * @param {string[]} emails - array of recipient emails
 * @param {string} subject - email subject
 * @param {string} text - plain text body
 * @param {string} html - html body (optional)
 */

async function sendBulkEmail(emails, subject, text, html = null) {
    if (!emails || emails.length === 0) {
        throw new Error("Email array is empty.");
    }

    const msg = {
        from: "your@email.com",
        bcc: emails,       // <-- SendGrid allows BCC for bulk sending
        subject,
        text,
        html: html || `<p>${text}</p>`,
    };

    try {
        await sgMail.send(msg);
        console.log("Bulk email sent successfully");
    } catch (err) {
        console.error("SendGrid error:", err);
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
        // Prepare data for templates
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

        // Get email templates
        const customerTemplate = getCustomerEmailTemplate(bookingType, templateData);
        const expertTemplate = getExpertEmailTemplate(bookingType, templateData);

        // Send emails
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
