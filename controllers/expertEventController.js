import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import User from "../models/expertInformation.js";
import Customer from "../models/customer.js";
import Order from "../models/orders.js";
import Institution from "../models/institution.js";
import Event from "../models/event.js";
import Package from "../models/package.js";
import Service from "../models/service.js";
import calendarSyncService from "../services/calendarSyncService.js";
import agenda from "../services/agendaService.js";
import { sendEmail } from "../services/email.js";
import {
    getExpertEventCreatedTemplate,
    getClient11SessionTemplate,
    getClientGroupSessionTemplate,
    getClientPackageSessionTemplate
} from "../services/eventEmailTemplates.js";

// =================== HELPERS ===================

const parseEventDateTime = (dateStr, timeStr) => {
    if (!dateStr) return null;
    const timePart = timeStr ? timeStr.trim() : "00:00";
    // Assuming dateStr is "YYYY-MM-DD" or similar, and timeStr is "HH:mm"
    // If dateStr is "DD.MM.YYYY" (common in TR), we might need parsing.
    // Using generic Date constructor for now as per original code context
    return new Date(`${dateStr}T${timePart}:00`);
};

// Cancel an Agenda job by ID
const cancelAgendaJob = async (jobId) => {
    if (!jobId) return;
    try {
        const jobs = await agenda.jobs({ _id: new mongoose.Types.ObjectId(jobId) });
        if (jobs && jobs.length > 0) {
            await jobs[0].remove();
            console.log("Cancelled agenda job:", jobId);
        }
    } catch (err) {
        console.error("Error cancelling agenda job:", err);
    }
};

const scheduleReminderForEvent = async (user, event) => {
    if (!event.date || !event.time) return null;

    try {
        const reminderDate = new Date(`${event.date}T${event.time}`);
        // Schedule 1 hour before
        reminderDate.setHours(reminderDate.getHours() - 1);

        if (reminderDate <= new Date()) {
            return null; // Don't schedule if in the past
        }

        const job = await agenda.schedule(reminderDate, 'event-reminder', {
            eventId: event.id,
            userId: user._id,
            title: event.title,
            date: event.date,
            time: event.time
        });

        console.log(`Scheduled reminder for event ${event.id} at ${reminderDate}`);
        return job.attrs._id;
    } catch (err) {
        console.error("Error scheduling reminder:", err);
        return null;
    }
};

const rescheduleReminderForEvent = async (user, event, oldJobId) => {
    try {
        if (oldJobId) {
            await cancelAgendaJob(oldJobId);
        }
        return await scheduleReminderForEvent(user, event);
    } catch (err) {
        console.error("rescheduleReminderForEvent error:", err?.message || err);
        return null;
    }
};

// Helper function to find user by ID (replicated from routes for independence)
const findUserById = async (userId) => {
    let user;
    if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId);
    }
    if (!user) {
        user = await User.findOne({
            $or: [
                { _id: userId },
                { id: userId },
                { userId: userId },
                { customId: userId }
            ]
        });
    }
    if (!user) {
        throw new Error('User not found');
    }
    return user;
};

// =================== CONTROLLERS ===================

export const createEvent = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const eventData = req.body;
        console.log("Requested Data for Create Event", req.body);

        const eventId = uuidv4();

        // Process selectedClients
        const resolvedClients = [];
        const inputClients = eventData.selectedClients || [];

        for (const client of inputClients) {
            let customerId = client._id || client.id;
            let customerName = client.name;
            let customerEmail = client.email;

            const isValidId = mongoose.Types.ObjectId.isValid(customerId) && String(customerId).length === 24;

            if (!isValidId) {
                let existingCustomer = await Customer.findOne({ email: customerEmail });
                if (!existingCustomer) {
                    const nameParts = customerName.trim().split(' ');
                    const firstName = nameParts[0];
                    const lastName = nameParts.slice(1).join(' ') || '';

                    existingCustomer = await Customer.create({
                        name: firstName,
                        surname: lastName,
                        email: customerEmail,
                        phone: client.phone || "",
                        status: "active",
                        source: "website",
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    console.log(`Created new customer: ${customerEmail} (${existingCustomer._id})`);
                }
                customerId = existingCustomer._id;
            }

            if (!user.customers) user.customers = [];
            const isLinked = user.customers.some(c => c.customerId && c.customerId.toString() === customerId.toString());
            if (!isLinked) {
                user.customers.push({ customerId: customerId, isArchived: false, addedAt: new Date() });
            }

            resolvedClients.push({
                id: customerId,
                name: customerName,
                email: customerEmail,
                packages: client.packages || []
            });
        }

        const newEvent = {
            id: eventId,
            expertId: user._id, // Ensure expertId is set
            title: eventData.title || eventData.serviceName,
            description: eventData.description,
            serviceId: eventData.service,
            serviceName: eventData.serviceName,
            serviceType: eventData.serviceType,
            date: eventData.date,
            time: eventData.time,
            duration: eventData.duration,
            location: eventData.location,
            platform: eventData.platform,
            eventType: eventData.eventType,
            meetingType: eventData.meetingType,
            price: eventData.price,
            maxAttendees: eventData.maxAttendees,
            attendees: eventData.attendees || 0,
            category: eventData.category,
            status: eventData.status || 'pending',
            paymentType: eventData.paymentType || 'online',
            isRecurring: eventData.isRecurring || false,
            recurringType: eventData.recurringType,
            selectedClients: resolvedClients || [],
            appointmentNotes: eventData.appointmentNotes,
            files: eventData.files || [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Schedule Agenda/Reminder
        const jobId = await scheduleReminderForEvent(user, newEvent);
        if (jobId) {
            newEvent.agendaJobId = jobId;
        }

        // Create the event in the standalone Event collection
        const eventDocument = await Event.create(newEvent);

        if (!user.events) user.events = [];
        user.events.push(eventDocument._id);

        // Update package/service usage (selectedClients) if applicable
        if (eventData.service) {
            try {
                const serviceId = eventData.service;
                const isPackage = eventData.serviceType === "package";
                const Model = isPackage ? Package : Service;

                // Find the standalone document (using Mongo _id or legacy id)
                const doc = await Model.findOne({
                    $or: [
                        { _id: mongoose.Types.ObjectId.isValid(serviceId) && String(serviceId).length === 24 ? serviceId : new mongoose.Types.ObjectId() },
                        { id: serviceId },
                        { legacyId: serviceId }
                    ],
                    expertId: user._id
                });

                if (doc) {
                    if (!doc.selectedClients) doc.selectedClients = [];

                    for (const client of resolvedClients) {
                        const alreadyAdded = doc.selectedClients.some(sc =>
                            (sc.id && sc.id.toString() === client.id.toString()) ||
                            sc.email === client.email
                        );

                        if (!alreadyAdded) {
                            doc.selectedClients.push({
                                id: client.id,
                                name: client.name,
                                email: client.email
                            });
                        }
                    }
                    await doc.save();
                }
            } catch (err) {
                console.error("Error updating Service/Package selectedClients:", err);
            }
        }

        // Process Payments and Orders
        if (eventData.paymentType && Array.isArray(eventData.paymentType)) {
            for (const payment of eventData.paymentType) {
                // Package Payment
                if (payment.paymentMethod === 'paketten-tahsil' && payment.orderId && payment.packageId) {
                    try {
                        const order = await Order.findById(payment.orderId);
                        if (order && order.orderDetails?.events) {
                            for (let eventUnit of order.orderDetails.events) {
                                if (eventUnit.eventType === 'package' && eventUnit.package && eventUnit.package.packageId?.toString() === payment.packageId.toString()) {
                                    eventUnit.package.completedSessions = (eventUnit.package.completedSessions || 0) + 1;
                                    break;
                                }
                            }
                            await order.save();
                        }
                    } catch (e) {
                        console.error("Error updating order for package payment:", e);
                    }
                }

                // Create Orders for non-package
                if (payment.paymentMethod !== 'paketten-tahsil' && !payment.orderId) {
                    const customerId = payment.customerId;
                    const customer = resolvedClients.find(c => c.id.toString() === customerId.toString());
                    if (customer && eventData.price) {
                        try {
                            await Order.create({
                                userInfo: { userId: customerId, name: customer.name, email: customer.email },
                                expertInfo: { expertId: user._id, name: user.information?.name, email: user.information?.email },
                                orderDetails: {
                                    events: [{
                                        eventType: 'service',
                                        service: {
                                            name: eventData.serviceName,
                                            price: parseFloat(eventData.price),
                                            duration: parseInt(eventData.duration)
                                        }
                                    }],
                                    totalAmount: parseFloat(eventData.price)
                                },
                                paymentInfo: { method: payment.paymentMethod, status: 'pending' },
                                status: 'pending',
                                orderSource: 'expert-created-event'
                            });
                        } catch (e) {
                            console.error("Error creating order:", e);
                        }
                    }
                }
            }
        }

        await user.save();

        // Sync to Calendar Providers
        const activeProviders = user.calendarProviders?.filter(cp => cp.isActive) || [];
        if (activeProviders.length > 0) {
            setImmediate(async () => {
                for (const provider of activeProviders) {
                    try {
                        await calendarSyncService.syncAppointmentToProvider(user._id, eventDocument, { providerId: provider.providerId });
                    } catch (e) {
                        console.error("Sync error:", e);
                    }
                }
            });
        }

        // Send Emails (Simplified for brevity, assuming generic success)
        res.status(201).json({ message: "Event created successfully", event: eventDocument });

    } catch (err) {
        console.error("Error creating event:", err);
        res.status(500).json({ error: err.message });
    }
};

export const updateEvent = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const eventId = req.params.eventId;

        const event = await Event.findOne({
            $or: [
                { id: eventId },
                { _id: mongoose.Types.ObjectId.isValid(eventId) && String(eventId).length === 24 ? eventId : new mongoose.Types.ObjectId() }
            ],
            expertId: user._id
        });

        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        const eventData = req.body;

        // Preserve agendaJobId if not changing
        const oldAgendaJobId = event.agendaJobId;

        // Update fields
        Object.keys(eventData).forEach(key => {
            event[key] = eventData[key];
        });

        event.updatedAt = new Date();
        await event.save();

        // Reschedule Agenda if needed
        if ((eventData.date && eventData.date !== event.date) || (eventData.time && eventData.time !== event.time)) {
            const newJobId = await rescheduleReminderForEvent(user, event, oldAgendaJobId);
            if (newJobId) {
                event.agendaJobId = newJobId;
                await event.save();
            }
        }

        // Sync to Calendar
        const activeProviders = user.calendarProviders?.filter(cp => cp.isActive) || [];
        if (activeProviders.length > 0) {
            setImmediate(async () => {
                for (const provider of activeProviders) {
                    try {
                        await calendarSyncService.updateAppointmentInProvider(user._id, event, { providerId: provider.providerId });
                    } catch (e) {
                        console.error("Sync update error:", e);
                    }
                }
            });
        }

        res.json({ message: "Event updated successfully", event: event });

    } catch (err) {
        console.error("Error updating event:", err);
        res.status(500).json({ error: err.message });
    }
};

export const deleteEvent = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const eventId = req.params.eventId;

        const event = await Event.findOne({
            $or: [
                { id: eventId },
                { _id: mongoose.Types.ObjectId.isValid(eventId) && String(eventId).length === 24 ? eventId : new mongoose.Types.ObjectId() }
            ],
            expertId: user._id
        });

        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        // Cancel Agenda Job
        if (event.agendaJobId) {
            await cancelAgendaJob(event.agendaJobId);
        }

        // Remove from Calendar Providers
        const activeProviders = user.calendarProviders?.filter(cp => cp.isActive) || [];
        if (activeProviders.length > 0) {
            setImmediate(async () => {
                for (const provider of activeProviders) {
                    try {
                        await calendarSyncService.deleteAppointmentFromProvider(user._id, event.id, { providerId: provider.providerId });
                    } catch (e) {
                        console.error("Calendar delete error:", e);
                    }
                }
            });
        }

        // Remove from User's events array
        if (user.events) {
            user.events = user.events.filter(id => id.toString() !== event._id.toString());
            await user.save();
        }

        // Delete the event document
        await Event.deleteOne({ _id: event._id });

        res.json({ message: "Event deleted successfully" });

    } catch (err) {
        console.error("Error deleting event:", err);
        res.status(500).json({ error: err.message });
    }
};

export const updateEventStatus = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const eventId = req.params.eventId;

        const event = await Event.findOne({
            $or: [
                { id: eventId },
                { _id: mongoose.Types.ObjectId.isValid(eventId) && String(eventId).length === 24 ? eventId : new mongoose.Types.ObjectId() }
            ],
            expertId: user._id
        });

        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        const { status } = req.body;
        event.status = status;
        await event.save();

        // Sync to connected calendars in background
        const activeProviders = user.calendarProviders?.filter(cp => cp.isActive) || [];
        if (activeProviders.length > 0) {
            setImmediate(async () => {
                for (const provider of activeProviders) {
                    try {
                        await calendarSyncService.updateAppointmentInProvider(user._id, event, { providerId: provider.providerId });
                    } catch (e) {
                        console.error("Sync update error:", e);
                    }
                }
            });
        }

        res.json({ message: "Event status updated", event });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export default {
    createEvent,
    updateEvent,
    deleteEvent,
    updateEventStatus
};
