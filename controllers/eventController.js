import Event from "../models/event.js";
import User from "../models/expertInformation.js";
import mongoose from "mongoose";
import Customer from "../models/customer.js";
import Order from "../models/orders.js";
import Package from "../models/package.js";
import { scheduleEventReminder as scheduleReminderForEvent, updateEventReminder as rescheduleReminderForEvent, cancelEventReminder } from "../services/agendaService.js";
import { scheduleRepeatedEvents, cancelRepeatedEvents } from "../services/repetitionAgendaService.js";
import { sendEmail } from "../services/email.js";
import {
    getExpertEventCreatedTemplate,
    getClient11SessionTemplate,
    getClientGroupSessionTemplate,
    getClientPackageSessionTemplate,
    getGroupSessionConfirmationTemplate,
    getClientAppointmentCreatedTemplate
} from "../services/eventEmailTemplates.js";
import {
    getAppointmentApprovedBireyselTemplate,
    getGroupSessionApprovedTemplate,
    getCancellationEmailTemplate,
    getEventUpdatedTemplate
} from "../services/emailTemplates.js";
import { sendSms } from "../services/netgsmService.js";
import calendarSyncService from "../services/calendarSyncService.js";
import zoomService from "../services/zoomService.js";

// Helper function to find user by ID
const findUserById = async (userId) => {
    let user;

    // Try to find by MongoDB ObjectId first
    if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId);
    }

    // If not found or invalid ObjectId, try to find by custom ID field
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

//==============Create New Event================//
export const createEvent = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const eventData = req.body;
        console.log("Requested Data", req.body);
        // Process selectedClients: Find/Create Customer and Link to Expert
        const resolvedClients = [];
        const inputClients = eventData.selectedClients || [];

        for (const client of inputClients) {
            let customerId = client._id || client.id;
            let customerName = client.name;
            let customerSurname = client.surname;
            let customerEmail = client.email;

            // Check if ID is a valid ObjectId
            const isValidId =
                mongoose.Types.ObjectId.isValid(customerId) &&
                String(customerId).length === 24;

            if (!isValidId) {
                // Try to find by email
                let existingCustomer = await Customer.findOne({ email: customerEmail });

                if (!existingCustomer) {
                    existingCustomer = await Customer.create({
                        name: customerName,
                        surname: customerSurname,
                        email: customerEmail,
                        phone: client.phone || "",
                        status: "active",
                        source: "website",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                    console.log(
                        `Created new customer: ${customerEmail} (${existingCustomer._id})`
                    );

                } else {
                    console.log(
                        `Found existing customer by email: ${customerEmail} (${existingCustomer._id})`
                    );
                }
                customerId = existingCustomer._id;
            }

            // Ensure customer is linked to Expert
            if (!user.customers) {
                user.customers = [];
            }

            const isLinked = user.customers.some(
                (c) =>
                    c.customerId && c.customerId.toString() === customerId.toString()
            );

            if (!isLinked) {
                user.customers.push({
                    customerId: customerId,
                    isArchived: false,
                    addedAt: new Date(),
                });
                console.log(`Linked customer ${customerId} to expert`);
            }

            resolvedClients.push({
                id: customerId,
                name: customerName,
                email: customerEmail,
                packages: client.packages || [],
            });
        }

        const formattedClients = resolvedClients;

        // ===========================================================
        // 🚀 FIX: CLEAN paymentType CUSTOMER IDs BEFORE SAVING
        // ===========================================================
        if (eventData.paymentType && Array.isArray(eventData.paymentType)) {
            for (const p of eventData.paymentType) {
                const resolved = resolvedClients.find(
                    (c) => c.email === p.email // match only by email
                );

                if (resolved) {
                    // Replace invalid ID with real MongoId
                    p.customerId = resolved.id.toString();
                } else {
                    // If still invalid or missing → remove ID fully to avoid Cast Error
                    if (
                        !mongoose.Types.ObjectId.isValid(p.customerId) ||
                        String(p.customerId).length !== 24
                    ) {
                        p.customerId = undefined;
                    }
                }
            }
        }
        // ===========================================================

        // --- ZOOM MEETING INTEGRATION ---
        let zoomMeeting = null;
        let zoomErrorInfo = null;
        console.log('🔍 Platform Check:', eventData.platform);

        if (eventData.platform?.toLowerCase() === 'zoom') {
            try {
                zoomMeeting = await zoomService.createMeeting({
                    title: eventData.title || eventData.serviceName,
                    date: eventData.date,
                    time: eventData.time,
                    duration: eventData.duration
                });
                console.log('✅ Zoom Meeting Result:', !!zoomMeeting);
            } catch (zoomError) {
                console.error("❌ Zoom integration failed:", zoomError);
                zoomErrorInfo = zoomError.message;
            }
        }

        const event = await Event.create({
            expertId: user._id,
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
            zoomMeetingId: zoomMeeting?.id,
            zoomJoinUrl: zoomMeeting?.join_url,
            zoomStartUrl: zoomMeeting?.start_url,
            eventType: eventData.eventType,
            meetingType: eventData.meetingType,
            price: eventData.price,
            maxAttendees: eventData.maxAttendees,
            attendees: eventData.attendees || 0,
            category: eventData.category,
            status: eventData.status || "pending",
            paymentType: eventData.paymentType || [],
            isRecurring: eventData.isRecurring || false,
            recurringType: eventData.recurringType,
            selectedClients: formattedClients || [],
            appointmentNotes: eventData.appointmentNotes,
            files: eventData.files || [],
            createdAt: new Date(),
            updatedAt: new Date(),
        });


        if (!user.events) {
            user.events = [];
        }
        user.events.push(event._id);
        await user.save();
        // --- REST OF YOUR CODE (UNCHANGED) ---

        // Update package selectedClients with resolved customers
        if (eventData.serviceType === "package") {
            try {
                const pkg = await Package.findById(eventData.service);
                if (pkg && pkg.expertId.toString() === user._id.toString()) {
                    for (const client of resolvedClients) {
                        const alreadyAdded = pkg.selectedClients?.some(
                            (sc) =>
                                sc.id?.toString() === client.id?.toString() ||
                                sc.email === client.email
                        );
                        if (!alreadyAdded) {
                            if (!pkg.selectedClients) pkg.selectedClients = [];
                            pkg.selectedClients.push({
                                id: client.id,
                                name: client.name,
                                email: client.email,
                            });
                        }
                    }
                    await pkg.save();
                }
            } catch (pkgError) {
                console.error("Error updating package in createEvent:", pkgError);
            }
        }

        // === Process package-based payments ===
        if (eventData.paymentType && Array.isArray(eventData.paymentType)) {
            console.log("Processing payment types:", eventData.paymentType);

            for (const payment of eventData.paymentType) {
                if (
                    payment.paymentMethod === "paketten-tahsil" &&
                    payment.orderId &&
                    payment.packageId
                ) {
                    console.log(
                        `Incrementing session for order: ${payment.orderId}, package: ${payment.packageId}`
                    );

                    try {
                        const order = await Order.findById(payment.orderId);

                        if (order && order.orderDetails?.events) {
                            for (let event of order.orderDetails.events) {
                                if (
                                    event.eventType === "package" &&
                                    event.package &&
                                    event.package.packageId?.toString() ===
                                    payment.packageId.toString()
                                ) {
                                    event.package.completedSessions =
                                        (event.package.completedSessions || 0) + 1;
                                    console.log(
                                        `Incremented completedSessions to ${event.package.completedSessions} for package ${payment.packageId}`
                                    );
                                    break;
                                }
                            }

                            await order.save();
                            console.log(`Order ${payment.orderId} updated successfully`);
                        } else {
                            console.warn(
                                `Order ${payment.orderId} not found or has no events`
                            );
                        }
                    } catch (orderError) {
                        console.error(
                            `Error updating order ${payment.orderId}:`,
                            orderError
                        );
                    }
                }
            }
        }

        await user.save();

        const savedUser = await User.findById(req.params.userId);
        // Fetch the saved event from the Event collection directly instead of from user.events
        // (user.events only contains ObjectId references, not full Event documents)
        const savedEvent = await Event.findById(event._id);

        // === Create orders for customers without packages ===
        if (eventData.paymentType && Array.isArray(eventData.paymentType)) {
            console.log("Creating orders for customers without packages...");

            for (const payment of eventData.paymentType) {
                if (payment.paymentMethod !== "paketten-tahsil" && !payment.orderId) {
                    const customerId = payment.customerId;
                    if (!customerId) continue; // skip invalid entries

                    const customer = formattedClients.find(
                        (c) => c.id.toString() === customerId.toString()
                    );

                    if (customer && eventData.price) {
                        try {
                            console.log(
                                `Creating order for ${customer.name} - Price: ${eventData.price}`
                            );

                            const customerDoc = await Customer.findById(customerId);

                            const newOrder = await Order.create({
                                userInfo: {
                                    userId: customerId,
                                    name: customer.name,
                                    email: customer.email,
                                    phone: customerDoc?.phone || "",
                                },
                                expertInfo: {
                                    expertId: req.params.userId,
                                    name: user.information?.name || "Expert",
                                    accountNo: user.information?.accountNo || "N/A",
                                    email: user.information?.email || "",
                                },
                                orderDetails: {
                                    events: [
                                        {
                                            eventType: "service",
                                            service: {
                                                name: eventData.serviceName,
                                                description: eventData.description || "",
                                                price: parseFloat(eventData.price),
                                                duration: parseInt(eventData.duration) || 0,
                                                meetingType: eventData.meetingType || "1-1",
                                            },
                                        },
                                    ],
                                    totalAmount: parseFloat(eventData.price),
                                },
                                paymentInfo: {
                                    method: payment.paymentMethod,
                                    status: "pending",
                                },
                                status: "pending",
                                orderSource: "expert-created-event",
                            });

                            console.log(
                                `Created order ${newOrder._id} for customer ${customer.name}`
                            );

                            if (customerDoc) {
                                if (!customerDoc.orders) customerDoc.orders = [];
                                if (!customerDoc.appointments) customerDoc.appointments = [];

                                customerDoc.orders.push(newOrder._id);
                                customerDoc.appointments.push(savedEvent._id);

                                await customerDoc.save();
                            }

                            const paymentIndex = eventData.paymentType.findIndex(
                                (p) => p.customerId.toString() === customerId.toString()
                            );
                            if (paymentIndex !== -1) {
                                savedEvent.paymentType[paymentIndex].orderId = newOrder._id;
                                await savedUser.save();
                            }
                        } catch (orderError) {
                            console.error(
                                `Error creating order for customer ${customerId}:`,
                                orderError
                            );
                        }
                    }
                }
            }
        }

        //Create the Agenda instance
        try {
            if (savedEvent) {
                // Note: scheduleEventReminder expects (event, userId)
                const jobId = await scheduleReminderForEvent(savedEvent, savedUser._id);
                if (jobId) {
                    savedEvent.agendaJobId = jobId;
                    await savedUser.save();
                }
            }
        } catch (schedErr) {
            console.error("Error scheduling agenda job after event create:", schedErr);
        }

        // === Schedule repetitions ===
        let repetitionJobIds = null;
        if (
            eventData.isRecurring &&
            eventData.repetitions &&
            eventData.repetitions.length > 0
        ) {
            try {
                repetitionJobIds = await scheduleRepeatedEvents(
                    savedUser._id,
                    savedEvent._id,
                    {
                        ...eventData,
                        isRecurring: false,
                        repetitions: [],
                    },
                    {
                        isRecurring: eventData.isRecurring,
                        recurringType: eventData.recurringType,
                        repetitions: eventData.repetitions,
                    }
                );

                if (repetitionJobIds) {
                    if (savedEvent) {
                        savedEvent.repetitionJobIds = repetitionJobIds;
                        await savedUser.save();
                    }
                }
            } catch (repError) {
                console.error("Error scheduling repetitions:", repError);
            }
        }

        const clientEmails = (formattedClients || []).map((c) => c.email);

        // === EMAIL SENDING (UNCHANGED) ===
        // === EMAIL SENDING (ASYNCHRONOUS) ===
        const sendEmailsAsync = async () => {
            try {
                const emailPromises = [];

                if (eventData.serviceType === "service") {
                    if (eventData.meetingType === "1-1") {
                        // Individual 1-1 emails
                        for (const client of formattedClients) {
                            const clientTemplate = getClient11SessionTemplate({
                                participantName: client.name,
                                expertName: user.information.name,
                                sessionName: eventData.serviceName,
                                sessionDate: eventData.date,
                                sessionTime: eventData.time,
                                sessionDuration: eventData.duration,
                                videoLink: event.zoomJoinUrl || eventData.platform || "",
                            });

                            emailPromises.push(
                                sendEmail(client.email, {
                                    subject: clientTemplate.subject,
                                    html: clientTemplate.html,
                                })
                            );
                        }


                    } else {
                        // Group session emails - Send only ONE consolidated email
                        for (const client of formattedClients) {
                            const inviteTemplate = getClientGroupSessionTemplate({
                                participantName: client.name,
                                expertName: user.information.name,
                                sessionName: eventData.serviceName,
                                sessionDate: eventData.date,
                                sessionTime: eventData.time,
                                sessionDuration: eventData.duration,
                                videoLink: event.zoomJoinUrl || eventData.platform || "",
                            });

                            emailPromises.push(
                                sendEmail(client.email, {
                                    subject: inviteTemplate.subject,
                                    html: inviteTemplate.html,
                                })
                            );
                        }


                    }
                } else {
                    // Package emails - Send only ONE consolidated email
                    for (const client of formattedClients) {
                        const appointmentTemplate = getClientAppointmentCreatedTemplate({
                            clientName: client.name,
                            expertName: user.information.name,
                            appointmentDate: eventData.date,
                            appointmentTime: eventData.time,
                            appointmentLocation: eventData.location || "Online",
                            videoLink: event.zoomJoinUrl || eventData.platform || "",
                        });

                        emailPromises.push(
                            sendEmail(client.email, {
                                subject: appointmentTemplate.subject,
                                html: appointmentTemplate.html,
                            })
                        );
                    }

                    const expertTemplate = getExpertEventCreatedTemplate({
                        expertName: user.information.name,
                        clientName: formattedClients[0]?.name || "Danışan",
                        eventDate: eventData.date,
                        eventTime: eventData.time,
                        eventLocation: eventData.location,
                        serviceName: eventData.serviceName,
                        videoLink: event.zoomStartUrl || event.zoomJoinUrl || eventData.platform || "",
                    });

                    emailPromises.push(
                        sendEmail(user.information.email, {
                            subject: expertTemplate.subject,
                            html: expertTemplate.html,
                        })
                    );
                }

                // Fire emails asynchronously, don't block main flow
                Promise.allSettled(emailPromises)
                    .then((results) => {
                        results.forEach((r, i) => {
                            if (r.status === "fulfilled") {
                                console.log(`✅ Email ${i + 1} sent successfully`);
                            } else {
                                console.error(`❌ Email ${i + 1} failed:`, r.reason);
                            }
                        });
                    })
                    .catch((err) => console.error("Error in sending emails:", err));
            } catch (err) {
                console.error("Error preparing emails:", err);
            }
        };

        // Fire email sending in background
        sendEmailsAsync();

        // === SMS SENDING (ASYNCHRONOUS) ===
        setImmediate(async () => {
            try {
                const expertName = `${user.information.name} ${user.information.surname}`;
                const serviceName = eventData.serviceName;
                const date = eventData.date;
                const time = eventData.time;
                const joinLink = event.zoomJoinUrl || eventData.platform || "Link yakında paylaşılacak";

                for (const client of formattedClients) {
                    // Fetch full customer data for phone number
                    const customerDoc = await Customer.findOne({ email: client.email }).select("phone name");

                    if (customerDoc && customerDoc.phone) {
                        const smsMessage = `Merhaba ${client.name}, ${expertName} senin için ${serviceName} randevusu oluşturdu. Tarih: ${date} ${time}. Katılım linki: ${joinLink}`;

                        try {
                            const result = await sendSms(customerDoc.phone, smsMessage);
                            if (result.success) {
                                console.log(`✅ Event creation SMS sent to customer: ${customerDoc.phone}`);
                            } else {
                                console.error(`❌ Failed to send event creation SMS: ${result.error}`);
                            }
                        } catch (smsErr) {
                            console.error("Error sending event creation SMS:", smsErr);
                        }
                    }
                }
            } catch (err) {
                console.error("Error in SMS sending block:", err);
            }
        });

        if (user.calendarProviders && user.calendarProviders.length > 0) {
            const activeProviders = user.calendarProviders.filter(
                (cp) => cp.isActive
            );

            if (activeProviders.length > 0) {
                for (const provider of activeProviders) {
                    try {
                        const response =
                            await calendarSyncService.syncAppointmentToProvider(
                                req.params.userId,
                                event,
                                { providerId: provider.providerId }
                            );
                        if (response.success) {
                            console.log("synced Event To Calendar Successfully");
                        } else {
                            console.log("Sync Failed to Calendar", error);
                        }
                    } catch (error) {
                        console.error(
                            `Failed to sync event to ${provider.provider}:`,
                            error
                        );
                    }
                }
            }
        }

        res.status(201).json({
            event: event,
            message: "Event created successfully",
            zoomError: zoomErrorInfo,
            repetitionsScheduled: repetitionJobIds ? true : false,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Update event controller
export const updateEvent = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const eventId = req.params.eventId;

        const existingEvent = await Event.findOne({
            _id: eventId,
            expertId: user._id
        });

        if (!existingEvent) {
            return res.status(404).json({ error: "Event not found" });
        }

        const eventData = req.body;

        // ===== Detect date/time change BEFORE update =====
        const dateChanged =
            eventData.date && eventData.date !== String(existingEvent.date || "");
        const timeChanged =
            eventData.time && eventData.time !== String(existingEvent.time || "");

        const oldAgendaJobId = existingEvent.agendaJobId;

        // ===== Update fields safely on document =====
        existingEvent.title = eventData.title || eventData.serviceName;
        existingEvent.description = eventData.description;
        existingEvent.serviceId = eventData.serviceId;
        existingEvent.serviceName = eventData.serviceName;
        existingEvent.serviceType = eventData.serviceType;
        existingEvent.date = eventData.date;
        existingEvent.time = eventData.time;
        existingEvent.duration = eventData.duration;
        existingEvent.location = eventData.location;
        existingEvent.platform = eventData.platform;
        existingEvent.eventType = eventData.eventType;
        existingEvent.meetingType = eventData.meetingType;
        existingEvent.price = eventData.price;
        existingEvent.maxAttendees = eventData.maxAttendees;
        existingEvent.attendees = eventData.attendees;
        existingEvent.category = eventData.category;
        existingEvent.status = eventData.status;
        existingEvent.paymentType = eventData.paymentType;
        existingEvent.isRecurring = eventData.isRecurring;
        existingEvent.recurringType = eventData.recurringType;
        existingEvent.selectedClients = eventData.selectedClients;
        existingEvent.appointmentNotes = eventData.appointmentNotes;
        existingEvent.files = eventData.files;
        existingEvent.updatedAt = new Date();

        await existingEvent.save(); // ✅ CORRECT SAVE

        // ===== Reschedule agenda job if date/time changed =====
        if (dateChanged || timeChanged) {
            try {
                // Note: updateEventReminder expects (event, userId) and handles old job cancellation internally
                const newJobId = await rescheduleReminderForEvent(
                    existingEvent,
                    user._id
                );

                existingEvent.agendaJobId = newJobId || undefined;
                await existingEvent.save();

                console.log(
                    "Rescheduled agenda job for event",
                    eventId,
                    "newJobId:",
                    newJobId
                );
            } catch (err) {
                console.error(
                    "Error rescheduling agenda job on event update:",
                    err
                );
            }
        }

        // ===== Sync to connected calendars (background) =====
        const providers =
            user.calendarProviders?.filter(cp => cp.isActive) || [];

        if (providers.length > 0) {
            setImmediate(async () => {
                for (const provider of providers) {
                    try {
                        await calendarSyncService.updateAppointmentInProvider(
                            req.params.userId,
                            existingEvent,
                            { providerId: provider.providerId }
                        );
                        console.log(
                            `Synced event ${existingEvent.title} to ${provider.provider}`
                        );
                    } catch (error) {
                        console.error(
                            `Failed syncing ${existingEvent.title} to ${provider.provider}:`,
                            error
                        );
                    }
                }
            });
        }

        // ===== Notify customers if date/time changed =====
        if (dateChanged || timeChanged) {
            setImmediate(async () => {
                try {
                    const event = existingEvent;
                    const customerIds = event.customers || [];
                    const selectedClients = event.selectedClients || [];

                    const expertName = `${user.information.name} ${user.information.surname}`;
                    const date = event.date;
                    const time = event.time;
                    const joinLink = event.platform || "Link yakında paylaşılacak";

                    let recipients = [];

                    if (selectedClients.length > 0) {
                        recipients = selectedClients.map(client => ({
                            name: client.name,
                            email: client.email
                        }));
                    } else if (customerIds.length > 0) {
                        const customers = await Customer.find({
                            _id: { $in: customerIds }
                        }).select("email name");

                        recipients = customers.map(c => ({
                            name: c.name,
                            email: c.email
                        }));
                    }

                    for (const recipient of recipients) {
                        const updateTemplate =
                            getEventUpdatedTemplate({
                                clientName: recipient.name,
                                expertName: expertName,
                                newDate: date,
                                newTime: time,
                                appointmentLocation:
                                    event.location || "Online",
                                videoLink: joinLink
                            });

                        await sendEmail(recipient.email, {
                            subject: updateTemplate.subject,
                            html: updateTemplate.html
                        });

                        console.log(
                            `✅ Event update email sent to ${recipient.email}`
                        );

                        // === SMS SENDING (ASYNCHRONOUS) ===
                        try {
                            const customerDoc = await Customer.findOne({ email: recipient.email }).select("phone name");
                            if (customerDoc && customerDoc.phone) {
                                const smsMessage = `Merhaba ${customerDoc.name}, ${expertName} ile ${event.serviceName} randevunun zamanı güncellendi. Yeni tarih: ${date} ${time}. Katılım linki: ${joinLink}`;
                                try {
                                    const result = await sendSms(customerDoc.phone, smsMessage);
                                    if (result.success) {
                                        console.log(`✅ Event update SMS sent to customer: ${customerDoc.phone}`);
                                    }
                                } catch (smsErr) {
                                    console.error("Error sending event update SMS:", smsErr);
                                }
                            }
                        } catch (docErr) {
                            console.error("Error fetching customer for SMS update:", docErr);
                        }
                    }
                } catch (emailError) {
                    console.error(
                        "Error sending date/time update emails:",
                        emailError
                    );
                }
            });
        }

        return res.json({
            event: existingEvent,
            message: "Event updated successfully"
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};


// Delete event
export const deleteEvent = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        console.log("user is found");
        // Find and delete event from Event schema
        const event = await Event.findOneAndDelete({
            _id: req.params.eventId,
            expertId: user._id
        });

        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        // Remove from user's events array
        if (user.events) {
            user.events = user.events.filter(id => id.toString() !== event._id.toString());
            await user.save();
        }

        const agendaJobId = event.agendaJobId;
        console.log("agendaJobId is found:", agendaJobId);

        // === NEW: Remove order IDs and event ID from customers ===
        if (event.paymentType && Array.isArray(event.paymentType)) {
            console.log("🗑️ Removing event and order references from customers...");

            for (const payment of event.paymentType) {
                try {
                    const customerId = payment.customerId;
                    const customer = await Customer.findById(customerId);

                    if (customer) {
                        // Remove order ID from customer's orders array if it exists
                        if (payment.orderId && customer.orders) {
                            const orderIndex = customer.orders.findIndex(
                                orderId => orderId.toString() === payment.orderId.toString()
                            );
                            if (orderIndex !== -1) {
                                customer.orders.splice(orderIndex, 1);
                                console.log(`✅ Removed order ${payment.orderId} from customer ${customer.name}`);
                            }
                        }

                        // Remove event ID from customer's appointments array
                        if (customer.appointments) {
                            const appointmentIndex = customer.appointments.findIndex(
                                apptId => apptId.toString() === event._id.toString()
                            );
                            if (appointmentIndex !== -1) {
                                customer.appointments.splice(appointmentIndex, 1);
                                console.log(`✅ Removed appointment ${event._id} from customer ${customer.name}`);
                            }
                        }

                        await customer.save();
                        console.log(`✅ Updated customer ${customer.name} after event deletion`);
                    }
                } catch (customerError) {
                    console.error(`❌ Error updating customer ${payment.customerId}:`, customerError);
                }
            }
        }

        // Cancel scheduled agenda job if existed               
        if (agendaJobId) {
            try {
                await cancelAgendaJob(agendaJobId);
                console.log("Canceled agenda job for deleted event:", agendaJobId);
            } catch (err) {
                console.error("Failed to cancel agenda job when deleting event:", err);
            }
        }

        // Sync to connected calendars in background
        const providers = user.calendarProviders?.filter(cp => cp.isActive) || [];

        if (providers.length > 0) {
            setImmediate(async () => {
                for (const provider of providers) {
                    try {
                        await calendarSyncService.deleteAppointmentFromProvider(req.params.userId, event.id, { providerId: provider.providerId });
                        console.log(`Deleted event ${event.title} from ${provider.provider}`);
                    } catch (error) {
                        console.error(`Failed Deleting ${event.title} from ${provider.provider}:`, error);
                    }
                }
            });
        } else {
            console.log("No active calendar providers found for user", req.params.userId);
        }

        console.log("event is deleted SUCCESSFULLY");
        res.json({ message: "Event deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Get event statistics
export const getEventStatistics = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const events = user.events || [];

        const stats = {
            total: events.length,
            pending: events.filter(e => e.status === 'pending').length,
            approved: events.filter(e => e.status === 'approved').length,
            completed: events.filter(e => e.status === 'completed').length,
            cancelled: events.filter(e => e.status === 'cancelled').length,
            totalRevenue: events
                .filter(e => e.status === 'completed')
                .reduce((sum, e) => sum + (e.price || 0), 0),
            totalAttendees: events
                .filter(e => e.status === 'completed')
                .reduce((sum, e) => sum + (e.attendees || 0), 0)
        };

        res.json({ stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Get all events for a user
export const getEvents = async (req, res) => {
    try {
        const events = await Event.find({ expertId: req.params.userId })
            .populate({
                path: "customers",
                model: "Customer"
            });

        res.json({ events });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Get events by status
export const getEventByStatus = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const { status } = req.params;

        const filteredEvents = user.events?.filter(event => event.status === status) || [];
        res.json({ events: filteredEvents });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// Update event status (approve, reject, complete, cancel)
export const updateEventStatus = async (req, res) => {
    try {
        const user = await findUserById(req.params.userId);
        const eventId = req.params.eventId;
        const existingEvent = await Event.findOne({
            _id: eventId,
            expertId: user._id
        });

        if (!existingEvent) {
            return res.status(404).json({ error: "Event not found" });
        }

        const { status } = req.body;
        if (!['pending', 'approved', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        existingEvent.status = status;
        existingEvent.updatedAt = new Date();

        await existingEvent.save();

        // Get the updated event reference
        const updatedEvent = existingEvent;

        // === Update Order status based on event status ===
        // Find order IDs from paymentType array in the event
        const orderIdsToUpdate = [];
        if (updatedEvent.paymentType && Array.isArray(updatedEvent.paymentType)) {
            for (const payment of updatedEvent.paymentType) {
                if (payment.orderId) {
                    orderIdsToUpdate.push(payment.orderId);
                }
            }
        }

        // Map event status to order status
        let orderStatus = null;
        if (status === 'approved') {
            orderStatus = 'confirmed';
        } else if (status === 'completed') {
            orderStatus = 'completed';
        } else if (status === 'cancelled') {
            orderStatus = 'cancelled';
        }

        // Update orders asynchronously
        if (orderIdsToUpdate.length > 0 && orderStatus) {
            setImmediate(async () => {
                try {
                    const Order = mongoose.model('Order');
                    for (const orderId of orderIdsToUpdate) {
                        await Order.findByIdAndUpdate(orderId, {
                            status: orderStatus,
                            'paymentInfo.status': orderStatus === 'completed' ? 'completed' :
                                orderStatus === 'cancelled' ? 'refunded' : 'pending',
                            updatedAt: new Date()
                        });
                        console.log(`✅ Updated order ${orderId} status to ${orderStatus}`);
                    }
                } catch (orderError) {
                    console.error("Error updating order status:", orderError);
                }
            });
        }

        await user.save();

        // Sync to connected calendars in background
        const providers = user.calendarProviders?.filter(cp => cp.isActive) || [];

        if (providers.length > 0) {
            setImmediate(async () => {
                for (const provider of providers) {
                    try {
                        await calendarSyncService.updateAppointmentInProvider(req.params.userId, updatedEvent, { providerId: provider.providerId });
                        console.log(`Synced event ${updatedEvent.title} to ${provider.provider}`);
                    } catch (error) {
                        console.error(`Failed syncing ${updatedEvent.title} to ${provider.provider}:`, error);
                    }
                }
            });
        } else {
            console.log("No active calendar providers found for user", req.params.userId);
        }

        // Send Email to the customers and expert when booking is approved
        const customerIds = updatedEvent.customers || [];
        const selectedClients = updatedEvent.selectedClients || [];

        // Send emails when status is approved (ALL email/SMS in background)
        if (status === 'approved') {
            setImmediate(async () => {
                try {
                    // Prepare expert information
                    const expertName = `${user.information.name} ${user.information.surname}`;

                    // Prepare event details
                    const serviceName = updatedEvent.serviceName || updatedEvent.title;
                    const date = updatedEvent.date;
                    const time = updatedEvent.time;
                    const joinLink = updatedEvent.platform || 'Link yakında paylaşılacak';

                    // Get customer information from selectedClients
                    let recipients = [];

                    if (selectedClients && selectedClients.length > 0) {
                        recipients = selectedClients.map(client => ({
                            name: client.name,
                            email: client.email
                        }));
                    } else if (customerIds.length > 0) {
                        const customers = await Customer.find({ _id: { $in: customerIds } }).select('email name');
                        recipients = customers.map(c => ({
                            name: c.name,
                            email: c.email
                        }));
                    }

                    console.log("Sending approval emails to:", recipients.length, "recipients");

                    // Determine event/meeting type
                    const meetingType = updatedEvent.meetingType;

                    // Send email to each customer based on meeting type
                    for (const recipient of recipients) {
                        const clientName = recipient.name;
                        let emailTemplate;

                        if (meetingType === 'grup') {
                            // Group session approval email
                            emailTemplate = getGroupSessionApprovedTemplate({
                                participantName: clientName,
                                sessionName: serviceName,
                                sessionDate: date,
                                sessionTime: time,
                                videoLink: joinLink !== 'Link will be shared soon' ? joinLink : ''
                            });
                        } else {
                            // 1-1 bireysel appointment approval email
                            emailTemplate = getAppointmentApprovedBireyselTemplate({
                                customerName: clientName,
                                expertName: expertName,
                                appointmentDate: date,
                                appointmentTime: time,
                                appointmentLocation: updatedEvent.location || 'Online',
                                videoLink: joinLink !== 'Link will be shared soon' ? joinLink : ''
                            });
                        }

                        await sendEmail(recipient.email, {
                            subject: emailTemplate.subject,
                            html: emailTemplate.html
                        });

                        console.log(`✅ Approval email sent to customer: ${recipient.email} (type: ${meetingType})`);
                    }


                    // Send SMS notifications to customers
                    console.log('📱 Sending SMS notifications to customers...');

                    // Fetch full customer data to get phone numbers
                    let customersWithPhones = [];

                    if (selectedClients && selectedClients.length > 0) {
                        // If selectedClients exist, we need to fetch their phone numbers from the Customer model
                        const customerEmails = selectedClients.map(c => c.email);
                        customersWithPhones = await Customer.find({ email: { $in: customerEmails } }).select('name email phone');
                    } else if (customerIds.length > 0) {
                        // Fetch customers by IDs
                        customersWithPhones = await Customer.find({ _id: { $in: customerIds } }).select('name email phone');
                    }

                    console.log(`📱 Found ${customersWithPhones.length} customers with potential phone numbers`);

                    // Send SMS to each customer with a valid phone number
                    for (const customer of customersWithPhones) {
                        if (customer.phone && customer.phone.trim() !== '') {
                            const clientSmsMessage = `Merhaba ${customer.name}, ${expertName} ile ${serviceName} randevu talebin onaylandı. Tarih: ${date} ${time}. Katılım linki: ${joinLink}`;
                            const expertSmsMessage = `${customer.name} ile ${serviceName} randevu talebin onaylandı. Tarih: ${date} ${time}. Katılım linki: ${joinLink}`;

                            try {
                                // SMS to Customer
                                const clientResult = await sendSms(customer.phone, clientSmsMessage);
                                if (clientResult.success) {
                                    console.log(`✅ Approval SMS sent to customer: ${customer.name} (${customer.phone})`);
                                }

                                // SMS to Expert
                                const expertPhone = user.information?.phone;
                                if (expertPhone) {
                                    const expertResult = await sendSms(expertPhone, expertSmsMessage);
                                    if (expertResult.success) {
                                        console.log(`✅ Approval SMS notification sent to expert: ${expertPhone}`);
                                    }
                                }
                            } catch (smsError) {
                                console.error(`❌ Error sending status update SMS:`, smsError);
                            }
                        } else {
                            console.log(`⚠️ Customer ${customer.name} (${customer.email}) has no phone number, skipping SMS`);
                        }
                    }


                    // Send email to expert for each customer
                    for (const recipient of recipients) {
                        const expertEmailBody = `${recipient.name} ile ${serviceName} randevu talebin onaylandı. Tarih: ${date} ${time}. Katılım linki: ${joinLink}`;

                        // Enhanced HTML template for expert
                        const expertEmailHTML = `
                 <!DOCTYPE html>
                 <html lang="tr">
                 <head>
                     <meta charset="UTF-8">
                     <meta name="viewport" content="width=device-width, initial-scale=1.0">
                     <style>
                         body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; }
                         .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
                         .header { background: #4CAF50; padding: 40px 30px; text-align: center; color: white; }
                         .header h1 { font-size: 28px; font-weight: 600; margin-bottom: 8px; }
                         .content { padding: 40px 30px; }
                         .appointment-card { background: #F3F7F6; border-radius: 12px; padding: 25px; margin: 25px 0; border-left: 4px solid #4CAF50; }
                         .detail-item { margin: 12px 0; font-size: 15px; }
                         .detail-label { font-weight: 500; color: #374151; }
                         .detail-value { color: #1f2937; }
                         .join-link { background: #4CAF50; color: white; padding: 15px 25px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 500; margin: 20px 0; }
                         .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
                     </style>
                 </head>
                 <body>
                     <div class="container">
                         <div class="header">
                             <h1>✅ Randevu Onaylandı</h1>
                             <p>Randevu talebi onaylandı</p>
                         </div>
                         <div class="content">
                             <p>Merhaba <strong>${expertName}</strong>,</p>
                             <p><strong>${recipient.name}</strong> ile <strong>${serviceName}</strong> randevu talebiniz onaylandı.</p>
                             <div class="appointment-card">
                                 <div class="detail-item">
                                     <span class="detail-label">Danışan:</span>
                                     <span class="detail-value">${recipient.name}</span>
                                 </div>
                                 <div class="detail-item">
                                     <span class="detail-label">Tarih:</span>
                                     <span class="detail-value">${date}</span>
                                 </div>
                                 <div class="detail-item">
                                     <span class="detail-label">Saat:</span>
                                     <span class="detail-value">${time}</span>
                                 </div>
                                 <div class="detail-item">
                                     <span class="detail-label">Katılım Linki:</span>
                                     <span class="detail-value">${joinLink}</span>
                                 </div>
                             </div>
                         </div>
                         <div class="footer">
                             <p>Bu otomatik bir mesajdır, lütfen yanıtlamayınız.</p>
                         </div>
                     </div>
                 </body>
                 </html>
               `;



                        await sendEmail(user.information.email, {
                            subject: 'Randevu Onaylandı',
                            body: expertEmailBody,
                            html: expertEmailHTML
                        });
                    }

                    console.log(`✅ Approval email sent to expert: ${user.information.email}`);

                } catch (emailError) {
                    console.error("Error sending approval emails:", emailError);
                    // Don't fail the request if email fails
                }
            });
        }

        // Send emails when status is cancelled/rejected (ALL in background)
        else if (status === 'cancelled') {
            setImmediate(async () => {
                try {
                    // Prepare expert information
                    const expertName = `${user.information.name} ${user.information.surname}`;

                    // Prepare event details
                    const serviceName = event.serviceName || event.title;
                    const meetingType = event.meetingType;
                    const originalDate = event.date ? new Date(event.date).toLocaleDateString('tr-TR') : 'Belirtilmedi';
                    const serviceType = meetingType === 'grup' ? 'Grup Seansı' : 'Bireysel Randevu';
                    const refundAmount = event.price ? `${event.price} TL` : '0 TL';

                    // Get customer information from selectedClients
                    let recipients = [];

                    if (selectedClients && selectedClients.length > 0) {
                        recipients = selectedClients.map(client => ({
                            name: client.name,
                            email: client.email
                        }));
                    } else if (customerIds.length > 0) {
                        const customers = await Customer.find({ _id: { $in: customerIds } }).select('email name');
                        recipients = customers.map(c => ({
                            name: c.name,
                            email: c.email
                        }));
                    }

                    console.log("Sending cancellation emails to:", recipients.length, "recipients");

                    // Send cancellation email to each customer using the new template
                    for (const recipient of recipients) {
                        const cancellationTemplate = getCancellationEmailTemplate({
                            customerName: recipient.name,
                            expertName: expertName,
                            serviceName: serviceName,
                            originalDate: originalDate,
                            serviceType: serviceType,
                            refundAmount: refundAmount,
                            refundProcessDays: '3-5'
                        });

                        await sendEmail(recipient.email, {
                            subject: cancellationTemplate.subject,
                            html: cancellationTemplate.html
                        });

                        console.log(`✅ Cancellation email sent to customer: ${recipient.email}`);
                    }

                    // Send SMS notification to customers
                    console.log('📱 Sending cancellation SMS notifications to customers...');
                    let customersWithPhones = [];
                    if (selectedClients && selectedClients.length > 0) {
                        const customerEmails = selectedClients.map(c => c.email);
                        customersWithPhones = await Customer.find({ email: { $in: customerEmails } }).select('name email phone');
                    } else if (customerIds.length > 0) {
                        customersWithPhones = await Customer.find({ _id: { $in: customerIds } }).select('name email phone');
                    }

                    for (const customer of customersWithPhones) {
                        if (customer.phone) {
                            const smsMessage = `Merhaba ${customer.name}, ${serviceName} randevu talebin ${expertName} tarafından reddedildi. Detaylar için Uzmanlio hesabını kontrol edebilirsin.`;
                            try {
                                await sendSms(customer.phone, smsMessage);
                                console.log(`✅ Cancellation SMS sent to customer: ${customer.name}`);
                            } catch (smsErr) {
                                console.error("Error sending cancellation SMS:", smsErr);
                            }
                        }
                    }

                } catch (emailError) {
                    console.error("Error sending cancellation emails:", emailError);
                    // Don't fail the request if email fails
                }
            });
        }

        // Send other status emails (ALL in background)
        else if (customerIds.length > 0 || (selectedClients && selectedClients.length > 0)) {
            setImmediate(async () => {
                try {
                    let customerEmails = [];

                    if (selectedClients && selectedClients.length > 0) {
                        customerEmails = selectedClients.map(c => c.email).filter(Boolean);
                    } else {
                        const customers = await Customer.find({ _id: { $in: customerIds } }).select('email');
                        customerEmails = customers.map(c => c.email).filter(Boolean);
                    }

                    const meetingType = event.meetingType;

                    if (customerEmails.length > 0) {
                        if (meetingType === '1-1' && ['completed', 'pending'].includes(status)) {
                            await sendBulkEmail(customerEmails, "Event Status Updated", "Your event status has been updated to " + status);
                        } else if (meetingType === 'grup' && ['completed', 'pending'].includes(status)) {
                            await sendBulkEmail(customerEmails, "Event Status Updated", "Your group event status has been updated to " + status);
                        }
                        // Note: 'cancelled' status is now handled in the dedicated block above
                    }
                } catch (emailError) {
                    console.error("Error sending customer emails:", emailError);
                }
            });
        }



        res.json({
            event: updatedEvent,
            message: `Event status updated to ${status}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}