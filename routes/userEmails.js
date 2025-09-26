import express from 'express';
import mongoose from 'mongoose';
import User from '../models/expertInformation.js';
import { scheduleEmailJob, sendEmailNow, stopEmailJob } from '../services/emailScheduler.js';

const router = express.Router({ mergeParams: true });

router.use(async (req, res, next) => {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'Invalid userId' });
    const user = await User.findById(userId).select('_id');
    if (!user) return res.status(404).json({ error: 'User not found' });
    next();
});

// GET all emails
router.get('/', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select('emails');
        res.json(user.emails || []);
    } catch (err) {
        console.error('Fetch emails error:', err);
        res.status(500).json({ error: 'Failed to fetch emails' });
    }
});

// POST create email
router.post('/', async (req, res) => {
    try {
        const { userId } = req.params;
        const { subject, body, recipients, recipientType, scheduledAt } = req.body;
        if (!subject || !body || !scheduledAt) return res.status(400).json({ error: 'subject, body and scheduledAt required' });

        // server-side validation: scheduledAt must be a valid date in the future (allow small skew)
        const schedDate = new Date(scheduledAt);
        if (isNaN(schedDate.getTime())) return res.status(400).json({ error: 'scheduledAt must be a valid date' });
        const now = new Date();
        if (schedDate.getTime() + 1000 < now.getTime()) return res.status(400).json({ error: 'You cannot schedule an email in the past.' });

        const user = await User.findById(userId);
    user.emails.push({ subject, body, recipients: recipients || [], recipientType: recipientType || 'all', scheduledAt: schedDate });
        await user.save();

        const newEmail = user.emails[user.emails.length - 1];
        scheduleEmailJob(userId, newEmail._id.toString(), newEmail.scheduledAt);
        res.status(201).json({ message: 'Email scheduled', email: newEmail });
    } catch (err) {
        console.error('Create email error:', err);
        res.status(500).json({ error: 'Failed to create email' });
    }
});

// PUT update email
router.put('/:emailId', async (req, res) => {
    try {
        const { userId, emailId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(emailId)) return res.status(400).json({ error: 'Invalid emailId' });

        const { subject, body, recipients, recipientType, scheduledAt, status } = req.body;
        const user = await User.findById(userId);
        const emailObj = user.emails.id(emailId);
        if (!emailObj) return res.status(404).json({ error: 'Email not found' });

        if (subject !== undefined) emailObj.subject = subject;
        if (body !== undefined) emailObj.body = body;
        if (recipients !== undefined) emailObj.recipients = recipients;
        if (recipientType !== undefined) emailObj.recipientType = recipientType;
        if (scheduledAt !== undefined) {
            const schedDate = new Date(scheduledAt);
            if (isNaN(schedDate.getTime())) return res.status(400).json({ error: 'scheduledAt must be a valid date' });
            const now = new Date();
            if (schedDate.getTime() + 1000 < now.getTime()) return res.status(400).json({ error: 'You cannot schedule an email in the past.' });
            emailObj.scheduledAt = schedDate;
        }
        if (status !== undefined) emailObj.status = status;

        await user.save();

        // reschedule if scheduledAt changed and status is pending
        if (scheduledAt && emailObj.status === 'pending') {
            scheduleEmailJob(userId, emailObj._id.toString(), emailObj.scheduledAt);
        }

        res.json({ message: 'Email updated', email: emailObj });
    } catch (err) {
        console.error('Update email error:', err);
        res.status(500).json({ error: 'Failed to update email' });
    }
});

// DELETE email
router.delete('/:emailId', async (req, res) => {
    try {
        const { userId, emailId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(emailId)) return res.status(400).json({ error: 'Invalid emailId' });

        const user = await User.findById(userId);
        const emailObj = user.emails.id(emailId);
        if (!emailObj) return res.status(404).json({ error: 'Email not found' });

        // Stop any scheduled job for this email
        stopEmailJob(userId, emailId);

        // Use deleteOne() which is the modern way to remove a subdocument
        emailObj.deleteOne();

        await user.save();
        res.json({ message: 'Email deleted' });
    } catch (err) {
        console.error('Delete email error:', err);
        res.status(500).json({ error: 'Failed to delete email' });
    }
});

// POST send-now for an email
router.post('/:emailId/send-now', async (req, res) => {
    try {
        const { userId, emailId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(emailId)) return res.status(400).json({ error: 'Invalid emailId' });
        const emailObj = await sendEmailNow(userId, emailId);
        res.json({ message: 'Email sent', email: emailObj });
    } catch (err) {
        console.error('Send now error:', err);
        res.status(500).json({ error: 'Failed to send email now' });
    }
});

// POST resend failed recipients for an email
router.post('/:emailId/resend-failed', async (req, res) => {
    try {
        const { userId, emailId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(emailId)) return res.status(400).json({ error: 'Invalid emailId' });
        // find the email
        const user = await User.findById(userId);
        const emailObj = user.emails.id(emailId);
        if (!emailObj) return res.status(404).json({ error: 'Email not found' });

        const failedRecipients = emailObj.failedRecipients || [];
        if (failedRecipients.length === 0) return res.status(400).json({ error: 'No failed recipients to resend' });

        // try resending only to failed recipients
        let sentCount = 0;
        let failedCount = 0;
        const stillFailed = [];
        for (const r of failedRecipients) {
            try {
                // use scheduler's transporter by calling sendEmailNow with a temporary patch: create a temp email object
                // Simpler approach: push recipients to emailObj.recipients and call sendEmailNow
                // We'll set recipientType to 'selected' and recipients to failedRecipients
            } catch (e) {
                console.error('Resend iteration error', e);
            }
        }

        // For simplicity, update emailObj to attempt resend for failed recipients by reusing sendEmailNow
        emailObj.recipients = failedRecipients;
        emailObj.recipientType = 'selected';
        await user.save();
        const sentEmail = await sendEmailNow(userId, emailId);

        res.json({ message: 'Resend attempted', email: sentEmail });
    } catch (err) {
        console.error('Resend failed error:', err);
        res.status(500).json({ error: 'Failed to resend' });
    }
});

export default router;
