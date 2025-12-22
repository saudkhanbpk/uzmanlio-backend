import JOB_TYPES from "../types.js";
import User from "../../models/expertInformation.js";
import Event from "../../models/event.js";
import Customer from "../../models/customer.js";
import { sendEmail } from "../../services/email.js";
import { sendSms } from "../../services/netgsmService.js";
import { getReminderEmailTemplate } from "../../services/eventEmailTemplates.js";

/**
 * Define the sendEventReminder job processor
 * @param {Agenda} agenda - Agenda instance to define the job on
 */
export default function defineEventReminderJob(agenda) {
    agenda.define(
        JOB_TYPES.SEND_EVENT_REMINDER,
        { priority: "high", concurrency: 3 },
        async (job) => {
            const data = job.attrs.data || {};
            const { userId, eventId } = data;

            try {
                if (!userId || !eventId) {
                    console.warn("sendEventReminder missing userId/eventId", data);
                    return;
                }

                const user = await User.findById(userId).lean();
                if (!user) {
                    console.warn("sendEventReminder: user not found", userId);
                    return;
                }

                // Fetch event from Event collection
                const event = await Event.findById(eventId).lean();

                if (!event) {
                    console.warn("sendEventReminder: event not found", eventId, "for user", userId);
                    return;
                }

                // Check if event is still scheduled (not cancelled)
                if (event.status === "cancelled") {
                    console.log(`⏭️  Event cancelled, skipping reminder: ${event.title || event.serviceName}`);
                    return;
                }

                const expertName = `${user.information?.name || ''} ${user.information?.surname || ''}`.trim();
                const expertEmail = user.information?.email;
                const expertPhone = user.information?.phone;

                // Collect all recipient emails
                const recipients = new Set();
                if (expertEmail) recipients.add(expertEmail);

                // Process selected clients
                const selectedClients = [];
                const clientIds = [];

                for (const clientRef of (event.selectedClients || [])) {
                    let clientData = null;

                    if (clientRef && typeof clientRef === 'object' && clientRef.email) {
                        clientData = clientRef;
                        if (clientRef.id || clientRef._id) {
                            clientIds.push(clientRef.id || clientRef._id);
                        }
                    } else if (clientRef && typeof clientRef === 'string') {
                        clientIds.push(clientRef);

                        const foundCustomer = (user.customers || []).find(c => {
                            const customer = c.customerId || c;
                            return String(customer._id || customer.id) === String(clientRef);
                        });
                        if (foundCustomer) {
                            const customer = foundCustomer.customerId || foundCustomer;
                            clientData = {
                                name: `${customer.name || ''} ${customer.surname || ''}`.trim(),
                                email: customer.email
                            };
                        }
                    }

                    if (clientData && clientData.email) {
                        recipients.add(clientData.email);
                        selectedClients.push(clientData);
                    }
                }

                // --- EMAIL SENDING ---

                // Send email to expert
                if (expertEmail) {
                    const clientNames = selectedClients.map(c => c.name).join(', ') || 'Danışanlar';
                    const expertReminderTemplate = getReminderEmailTemplate({
                        recipientName: expertName,
                        otherPerson: clientNames,
                        appointmentTime: event.time || data.eventTime || '',
                        appointmentLocation: event.location || 'Online',
                        videoLink: event.platform || ''
                    });

                    await sendEmail(expertEmail, {
                        subject: expertReminderTemplate.subject,
                        html: expertReminderTemplate.html
                    });
                    console.log(`✅ Reminder email sent to expert: ${expertEmail}`);
                }

                // Send email to each client
                for (const client of selectedClients) {
                    const clientReminderTemplate = getReminderEmailTemplate({
                        recipientName: client.name,
                        otherPerson: expertName,
                        appointmentTime: event.time || data.eventTime || '',
                        appointmentLocation: event.location || 'Online',
                        videoLink: event.platform || ''
                    });

                    await sendEmail(client.email, {
                        subject: clientReminderTemplate.subject,
                        html: clientReminderTemplate.html
                    });
                    console.log(`✅ Reminder email sent to client: ${client.email}`);
                }

                console.log(`✅ All reminder emails sent for event: ${event.title || event.serviceName}`);

                // --- SMS SENDING ---
                const joinLink = event.platform || "Link yakında paylaşılacak";

                // Send SMS to Expert
                if (expertPhone) {
                    const expertMsg = `Hatırlatma: ${event.serviceName} randevunuz ${event.date} ${event.time}'te. Katılım linki: ${joinLink}`;
                    try {
                        await sendSms(expertPhone, expertMsg);
                        console.log(`✅ Reminder SMS sent to expert: ${expertPhone}`);
                    } catch (smsErr) {
                        console.error(`❌ Failed to send SMS to expert ${expertPhone}:`, smsErr);
                    }
                }

                // Send SMS to Clients
                if (clientIds.length > 0) {
                    const customers = await Customer.find({ _id: { $in: clientIds } }).select("phone name");

                    for (const customer of customers) {
                        if (customer.phone) {
                            const clientMsg = `Hatırlatma: ${expertName} ile ${event.serviceName} randevun ${event.date} ${event.time}'te. Katılım linki: ${joinLink}`;
                            try {
                                await sendSms(customer.phone, clientMsg);
                                console.log(`✅ Reminder SMS sent to client: ${customer.name} (${customer.phone})`);
                            } catch (smsErr) {
                                console.error(`❌ Failed to send SMS to client ${customer.name}:`, smsErr);
                            }
                        } else {
                            console.log(`⚠️ Client ${customer.name} has no phone number, skipping SMS.`);
                        }
                    }
                }

            } catch (err) {
                console.error("sendEventReminder error:", err?.message || err);
                throw err; // Rethrow to mark job as failed
            }
        }
    );

    console.log(`✅ Defined job: ${JOB_TYPES.SEND_EVENT_REMINDER}`);
}
