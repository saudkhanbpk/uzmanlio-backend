import cron from 'node-cron';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/expertInformation.js';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

const scheduledJobs = new Map();

function stopEmailJob(userId, emailId) {
    const key = `${userId}_${emailId}`;
    if (scheduledJobs.has(key)) {
        const job = scheduledJobs.get(key);
        job.stop();
        scheduledJobs.delete(key);
    }
}

function scheduleEmailJob(userId, emailId, scheduledAt) {
    // compute cron expression from scheduledAt date
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime()) || date.getTime() < Date.now()) {
        console.warn(`Skipping schedule for past or invalid date: ${scheduledAt}`);
        return;
    }
    const minute = date.getUTCMinutes();
    const hour = date.getUTCHours();
    const day = date.getUTCDate();
    const month = date.getUTCMonth() + 1; // cron months are 1-12
    const cronExpr = `${minute} ${hour} ${day} ${month} *`;

    const key = `${userId}_${emailId}`;
    stopEmailJob(userId, emailId); // Stop existing job if any

    const job = cron.schedule(cronExpr, async () => {
        try {
            await sendEmailNow(userId, emailId);
        } catch (err) {
            console.error('Error sending scheduled email:', err.message);
            // Error handling is inside sendEmailNow
        } finally {
            // Stop and remove the job after it has run
            stopEmailJob(userId, emailId);
        }
    }, { scheduled: true, timezone: "UTC" });

    scheduledJobs.set(key, job);
    return job;
}

async function loadAndScheduleAll() {
    // find all users with pending emails
    const users = await User.find({ 'emails.status': 'pending' }).select('emails');
    for (const user of users) {
        for (const emailObj of user.emails) {
            if (emailObj.status === 'pending' && emailObj.scheduledAt) {
                scheduleEmailJob(user._id.toString(), emailObj._id.toString(), emailObj.scheduledAt);
            }
        }
    }
}

// Immediate send helper: send right away (not via cron) and update DB
async function sendEmailNow(userId, emailId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    const emailObj = user.emails.id(emailId);
    if (!emailObj) throw new Error('Email not found');

    // Prevent re-sending
    if (emailObj.status === 'sent') {
        console.log(`Email ${emailId} already sent.`);
        return emailObj;
    }

    const recipients = emailObj.recipientType === 'all' ? (user.customers?.map(c => c.email) || []) : emailObj.recipients;
    let sentCount = 0;
    let failedCount = 0;
    const failedRecipients = [];

    for (const r of recipients) {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: r,
            subject: emailObj.subject,
            text: emailObj.body
        };
        try {
            await transporter.sendMail(mailOptions);
            sentCount++;
        } catch (err) {
            failedCount++;
            failedRecipients.push(r);
            console.error('Immediate send error for', r, err.message);
        }
    }

    emailObj.sentCount = (emailObj.sentCount || 0) + sentCount;
    emailObj.failedCount = (emailObj.failedCount || 0) + failedCount;
    emailObj.failedRecipients = Array.from(new Set([...(emailObj.failedRecipients || []), ...failedRecipients]));

    if (failedCount === 0 && sentCount > 0) {
        emailObj.status = 'sent';
        emailObj.sentAt = new Date();
        emailObj.lastError = null;
    } else if (sentCount > 0 && failedCount > 0) {
        emailObj.status = 'failed'; // Partial failure
        emailObj.lastError = `${failedCount} of ${recipients.length} sends failed.`;
    } else if (failedCount > 0) {
        emailObj.status = 'failed';
        emailObj.lastError = `All ${failedCount} sends failed.`;
    } else { // sentCount = 0, failedCount = 0
        emailObj.status = 'failed';
        emailObj.lastError = 'No recipients to send to.';
    }

    await user.save();
    // stop any scheduled job for this email since it's been handled
    stopEmailJob(userId, emailId);

    return emailObj;
}

export { scheduleEmailJob, loadAndScheduleAll, sendEmailNow, stopEmailJob };
