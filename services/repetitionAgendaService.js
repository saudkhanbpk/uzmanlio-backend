import Agenda from "agenda";
import User from "../models/expertInformation.js";
import Order from "../models/orders.js";
import Event from "../models/event.js"; // Import Event model
import Package from "../models/package.js"; // Import Package model
import Service from "../models/service.js"; // Import Service model
import { v4 as uuidv4 } from "uuid";
import Customer from "../models/customer.js";
import EventRepetitionWarning from "../models/eventRepetitionWarnings.js";
import { sendEmail } from "./email.js";
import {
    getExpertEventCreatedTemplate,
    getClient11SessionTemplate,
    getClientGroupSessionTemplate,
    getClientPackageSessionTemplate,
    getGroupSessionConfirmationTemplate,
    getClientAppointmentCreatedTemplate
} from "./eventEmailTemplates.js";

// Read Mongo connection from env (same logic as first Agenda)
let mongoAddress = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGO;

if (typeof mongoAddress === "string") {
    mongoAddress = mongoAddress.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim();
}

const dbName = (process.env.DB_NAME || "")
    .replace(/^"(.*)"$/, "$1")
    .replace(/^'(.*)'$/, "$1")
    .trim();

if (!mongoAddress) {
    console.error(
        "❌ FATAL: MONGO_URL / MONGO_URI is not defined. Set it in backend/.env or environment variables."
    );
    throw new Error("MONGO_URL / MONGO_URI missing");
}

// Append DB name if needed
if (dbName && !/\/[^/]+\?/.test(mongoAddress) && !/\/[^/]+$/.test(mongoAddress)) {
    if (mongoAddress.endsWith("/")) {
        mongoAddress = `${mongoAddress}${dbName}`;
    } else {
        mongoAddress = `${mongoAddress}/${dbName}`;
    }
}

console.log(
    "RepetitionAgenda connecting to Mongo address:",
    mongoAddress.replace(/\/\/([^:]+):([^@]+)@/, "//$1:*****@")
);

// Create Agenda instance
const agenda = new Agenda({
    db: { address: mongoAddress, collection: "repetitionJobs" },
});

// Define repeated event job - this job reschedules itself for the next repetition
agenda.define("create-repeated-event", async (job) => {
    const {
        userId,
        originalEventId,
        eventData,
        repetitionData,
        recurringType,
        currentRepetition,
        totalRepetitions,
    } = job.attrs.data;

    console.log(`🔄 Creating repetition ${currentRepetition}/${totalRepetitions} for event ${originalEventId}`);

    try {
        // Fetch user from database (still needed for expert info)
        const user = await User.findById(userId);
        if (!user) {
            console.error(`❌ User ${userId} not found for repetition`);
            return;
        }

        // Fetch the ORIGINAL event from EVENT COLLECTION
        const originalEvent = await Event.findById(originalEventId);

        if (!originalEvent) {
            console.error(`❌ Original event ${originalEventId} not found in database`);
            return;
        }

        console.log(`✅ Found original event: ${originalEvent.title}`);

        // Create new event based on ORIGINAL event data
        // Use separate Event model
        const newEventId = uuidv4();

        const newEventData = {
            id: newEventId,
            expertId: userId, // Ensure expertId is set
            title: originalEvent.title,
            description: originalEvent.description,
            serviceId: originalEvent.serviceId,
            serviceName: originalEvent.serviceName,
            serviceType: originalEvent.serviceType,
            date: eventData.date,
            time: eventData.time,
            duration: originalEvent.duration,
            location: originalEvent.location,
            platform: originalEvent.platform,
            eventType: originalEvent.eventType,
            meetingType: originalEvent.meetingType,
            price: originalEvent.price,
            maxAttendees: originalEvent.maxAttendees,
            attendees: originalEvent.attendees || 0,
            category: originalEvent.category,
            status: originalEvent.status,
            paymentType: originalEvent.paymentType,
            isRecurring: false,
            recurringType: null,
            selectedClients: originalEvent.selectedClients,
            appointmentNotes: originalEvent.appointmentNotes,
            files: originalEvent.files || [],
            originalEventId: originalEventId,
            repetitionNumber: currentRepetition,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Save new event to Event collection
        const createdEvent = await Event.create(newEventData);
        console.log(`✅ Created repeated event ${createdEvent._id}`);

        // We DO NOT push to user.events anymore!

        // Arrays to track issues
        const insufficientSessionsCustomers = [];
        const noPackageCustomers = [];

        // Process package deductions based on paymentType from ORIGINAL event
        if (originalEvent.paymentType && Array.isArray(originalEvent.paymentType)) {
            console.log(`📦 Processing ${originalEvent.paymentType.length} payment types`);

            for (const payment of originalEvent.paymentType) {
                const customerId = payment.customerId?.toString() || payment.customerId;
                const customerName = originalEvent.selectedClients.find(
                    c => c.id?.toString() === customerId
                )?.name || 'Unknown Customer';

                if (payment.paymentMethod === 'paketten-tahsil' && payment.orderId && payment.packageId) {
                    try {
                        const order = await Order.findById(payment.orderId);

                        if (order?.orderDetails?.events) {
                            let packageFound = false;

                            for (let e of order.orderDetails.events) {
                                if (
                                    e.eventType === "package" &&
                                    e.package?.packageId?.toString() === payment.packageId.toString()
                                ) {
                                    packageFound = true;
                                    const completedSessions = e.package.completedSessions || 0;
                                    const totalSessions = e.package.sessions || 0;

                                    if (completedSessions < totalSessions) {
                                        e.package.completedSessions = completedSessions + 1;
                                        await order.save();
                                        console.log(`✅ Incremented session for ${customerName}: ${completedSessions + 1}/${totalSessions}`);
                                    } else {
                                        insufficientSessionsCustomers.push({
                                            customerId: customerId,
                                            customerName: customerName,
                                            orderId: payment.orderId.toString(),
                                            packageId: payment.packageId.toString(),
                                            message: `Customer has used all sessions (${completedSessions}/${totalSessions})`
                                        });
                                        console.warn(`⚠️ ${customerName} has no remaining sessions (${completedSessions}/${totalSessions})`);
                                    }
                                    break;
                                }
                            }

                            if (!packageFound) {
                                console.warn(`⚠️ Package ${payment.packageId} not found in order ${payment.orderId}`);
                            }
                        }
                    } catch (orderError) {
                        console.error(`❌ Error updating order ${payment.orderId}:`, orderError);
                    }
                } else {
                    noPackageCustomers.push({
                        customerId: customerId,
                        customerName: customerName,
                        paymentMethod: payment.paymentMethod,
                        message: `Customer is using ${payment.paymentMethod} payment (no package deduction)`
                    });
                    console.log(`ℹ️ ${customerName} is using ${payment.paymentMethod} payment (no package)`);
                }
            }
        }

        // Removed await user.save() since we are not updating user.events

        // === Create orders for customers without packages ===
        if (originalEvent.paymentType && Array.isArray(originalEvent.paymentType)) {
            console.log("📦 Creating orders for customers without packages in repetition...");

            for (const payment of originalEvent.paymentType) {
                // Only process customers who are NOT using package payment
                if (payment.paymentMethod !== 'paketten-tahsil' && !payment.orderId) {
                    const customerId = payment.customerId?.toString() || payment.customerId;
                    const customer = originalEvent.selectedClients.find(
                        c => c.id?.toString() === customerId
                    );

                    if (customer && originalEvent.price) {
                        try {
                            console.log(`💰 Creating order for ${customer.name} - Price: ${originalEvent.price}`);

                            // Fetch customer details
                            const customerDoc = await Customer.findById(customerId);

                            // Create new order for this customer
                            const newOrder = await Order.create({
                                userInfo: {
                                    userId: customerId,
                                    name: customer.name,
                                    email: customer.email,
                                    phone: customerDoc?.phone || ''
                                },
                                expertInfo: {
                                    expertId: userId,
                                    name: user.information?.name || 'Expert',
                                    accountNo: user.information?.accountNo || 'N/A',
                                    email: user.information?.email || ''
                                },
                                orderDetails: {
                                    events: [
                                        {
                                            eventType: 'service',
                                            service: {
                                                name: originalEvent.serviceName,
                                                description: originalEvent.description || '',
                                                price: parseFloat(originalEvent.price),
                                                duration: parseInt(originalEvent.duration) || 0,
                                                meetingType: originalEvent.meetingType || '1-1'
                                            }
                                        }
                                    ],
                                    totalAmount: parseFloat(originalEvent.price)
                                },
                                paymentInfo: {
                                    method: payment.paymentMethod,
                                    status: 'pending'
                                },
                                status: 'pending',
                                orderSource: 'expert-repetition-event'
                            });

                            console.log(`✅ Created order ${newOrder._id} for customer ${customer.name} in repetition`);


                            if (customerDoc) {
                                if (!customerDoc.orders) {
                                    customerDoc.orders = [];
                                }
                                if (!customerDoc.appointments) {
                                    customerDoc.appointments = [];
                                }

                                // Add order ID to customer's orders
                                customerDoc.orders.push(newOrder._id);

                                // Add event ID to customer's appointments
                                customerDoc.appointments.push(createdEvent._id);

                                await customerDoc.save();
                                console.log(`✅ Updated customer ${customer.name} - Added order and appointment for repetition`);
                            }

                            // Update the newly created event's payment type with the order ID
                            // DIRECTLY UPDATE EVENT DOCUMENT
                            const paymentIndex = createdEvent.paymentType.findIndex(
                                p => p.customerId?.toString() === customerId
                            );

                            if (paymentIndex !== -1) {
                                createdEvent.paymentType[paymentIndex].orderId = newOrder._id;
                                await createdEvent.save();
                                console.log(`✅ Updated repetition event payment type with order ID ${newOrder._id}`);
                            }

                        } catch (orderError) {
                            console.error(`❌ Error creating order for customer ${customerId}:`, orderError);
                        }
                    } else {
                        if (!originalEvent.price) {
                            console.warn(`⚠️ No price set for event, skipping order creation for customer ${customerId}`);
                        }
                    }
                }
            }
        }

        console.log(`✅ Repetition ${currentRepetition}/${totalRepetitions} created successfully`);

        // === SEND EMAIL NOTIFICATIONS FOR REPEATED EVENT ===
        try {
            const expertName = user.information?.name || 'Uzman';
            const expertEmail = user.information?.email;
            const selectedClients = originalEvent.selectedClients || [];
            const meetingType = originalEvent.meetingType;
            const serviceType = originalEvent.serviceType;

            console.log(`📧 Sending emails for repetition - MeetingType: ${meetingType}, ServiceType: ${serviceType}`);

            // Send emails to customers based on event type
            if (serviceType === 'service') {
                if (meetingType === '1-1') {
                    // Bireysel: Send appointment created email to each customer
                    for (const client of selectedClients) {
                        const clientEmail = client.email;
                        if (!clientEmail) continue;

                        const clientTemplate = getClient11SessionTemplate({
                            participantName: client.name,
                            expertName: expertName,
                            sessionName: originalEvent.serviceName,
                            sessionDate: eventData.date,
                            sessionTime: eventData.time,
                            sessionDuration: originalEvent.duration,
                            videoLink: originalEvent.platform || ''
                        });

                        await sendEmail(clientEmail, {
                            subject: clientTemplate.subject,
                            html: clientTemplate.html
                        });
                        console.log(`✅ Bireysel repetition email sent to: ${clientEmail}`);
                    }
                } else {
                    // Grup: Send BOTH invite AND confirmation emails
                    for (const client of selectedClients) {
                        const clientEmail = client.email;
                        if (!clientEmail) continue;

                        // Email 1: Group Session Invite
                        const inviteTemplate = getClientGroupSessionTemplate({
                            participantName: client.name,
                            expertName: expertName,
                            sessionName: originalEvent.serviceName,
                            sessionDate: eventData.date,
                            sessionTime: eventData.time,
                            sessionDuration: originalEvent.duration,
                            videoLink: originalEvent.platform || ''
                        });

                        await sendEmail(clientEmail, {
                            subject: inviteTemplate.subject,
                            html: inviteTemplate.html
                        });
                        console.log(`✅ Group invite email sent to: ${clientEmail}`);

                        // Email 2: Group Session Confirmation
                        const confirmationTemplate = getGroupSessionConfirmationTemplate({
                            participantName: client.name,
                            sessionName: originalEvent.serviceName,
                            sessionDate: eventData.date,
                            sessionTime: eventData.time,
                            videoLink: originalEvent.platform || ''
                        });

                        await sendEmail(clientEmail, {
                            subject: confirmationTemplate.subject,
                            html: confirmationTemplate.html
                        });
                        console.log(`✅ Group confirmation email sent to: ${clientEmail}`);
                    }
                }
            } else {
                // Package: Send BOTH usage AND appointment emails
                for (const client of selectedClients) {
                    const clientEmail = client.email;
                    if (!clientEmail) continue;

                    // Email 1: Package Session Usage
                    const packageUsageTemplate = getClientPackageSessionTemplate({
                        participantName: client.name,
                        expertName: expertName,
                        packageName: originalEvent.serviceName,
                        sessionName: originalEvent.serviceName,
                        sessionDate: eventData.date,
                        sessionTime: eventData.time,
                        sessionDuration: originalEvent.duration,
                        videoLink: originalEvent.platform || ''
                    });

                    await sendEmail(clientEmail, {
                        subject: packageUsageTemplate.subject,
                        html: packageUsageTemplate.html
                    });
                    console.log(`✅ Package usage email sent to: ${clientEmail}`);

                    // Email 2: Appointment Created
                    const appointmentTemplate = getClientAppointmentCreatedTemplate({
                        clientName: client.name,
                        expertName: expertName,
                        appointmentDate: eventData.date,
                        appointmentTime: eventData.time,
                        appointmentLocation: originalEvent.location || 'Online',
                        videoLink: originalEvent.platform || ''
                    });

                    await sendEmail(clientEmail, {
                        subject: appointmentTemplate.subject,
                        html: appointmentTemplate.html
                    });
                    console.log(`✅ Package appointment email sent to: ${clientEmail}`);
                }
            }

            // Send email to Expert
            if (expertEmail) {
                const expertTemplate = getExpertEventCreatedTemplate({
                    expertName: expertName,
                    clientName: selectedClients.map(c => c.name).join(', ') || 'Danışan',
                    eventDate: eventData.date,
                    eventTime: eventData.time,
                    eventLocation: originalEvent.location,
                    serviceName: originalEvent.serviceName,
                    videoLink: originalEvent.platform || ''
                });

                await sendEmail(expertEmail, {
                    subject: expertTemplate.subject,
                    html: expertTemplate.html
                });
                console.log(`✅ Expert repetition email sent to: ${expertEmail}`);
            }
        } catch (emailError) {
            console.error(`❌ Error sending repetition emails:`, emailError);
            // Don't fail the repetition process if emails fail
        }

        // Log summary of issues
        if (insufficientSessionsCustomers.length > 0) {
            console.log(`\n⚠️ CUSTOMERS WITH INSUFFICIENT SESSIONS:`);
            console.table(insufficientSessionsCustomers);
        }

        if (noPackageCustomers.length > 0) {
            console.log(`\nℹ️ CUSTOMERS WITHOUT PACKAGE PAYMENT:`);
            console.table(noPackageCustomers);
        }

        // -------------------------------------------------------------------
        // 🚨 ADDED FUNCTIONALITY: Save warnings to database
        // -------------------------------------------------------------------
        if (insufficientSessionsCustomers.length > 0 || noPackageCustomers.length > 0) {
            try {
                const warningDetails = [];

                insufficientSessionsCustomers.forEach(customer => {
                    warningDetails.push({
                        customerId: customer.customerId,
                        warningType: "Insufficient Sessions",
                        warningMessage: customer.message
                    });
                });

                noPackageCustomers.forEach(customer => {
                    warningDetails.push({
                        customerId: customer.customerId,
                        warningType: "No Package",
                        warningMessage: customer.message
                    });
                });

                const warningDoc = await EventRepetitionWarning.create({
                    userId: userId,
                    eventId: createdEvent._id, // Use new created event ID
                    Details: warningDetails,
                    warningDate: new Date(),
                    warningStatus: "Pending"
                });

                console.log(`💾 Created warning document: ${warningDoc._id}`);

                const userToUpdate = await User.findById(userId);
                if (!userToUpdate.eventRepetitionWarnings) {
                    userToUpdate.eventRepetitionWarnings = [];
                }
                userToUpdate.eventRepetitionWarnings.push(warningDoc._id);
                await userToUpdate.save();

                console.log(`✅ Added warning ${warningDoc._id} to user's eventRepetitionWarnings`);
            } catch (warningError) {
                console.error(`❌ Error saving warning to database:`, warningError);
            }
        }

        // Update completedRepetitions on the ORIGINAL event document directly
        try {
            await Event.findByIdAndUpdate(originalEventId, {
                $inc: { completedRepetitions: 1 }
            });
            console.log(`✅ Updated original event completedRepetitions`);
        } catch (updateError) {
            console.error(`❌ Error updating completedRepetitions:`, updateError);
        }

        // Schedule the NEXT repetition if not done
        if (currentRepetition < totalRepetitions) {
            const dateStr = eventData.date;
            const timeStr = eventData.time;
            const [year, month, day] = dateStr.split('-').map(Number);
            const [hours, minutes] = timeStr.split(':').map(Number);

            // Note: Months are 0-indexed in JS Date
            const currentDate = new Date(year, month - 1, day, hours, minutes);
            let nextRepetitionDate = new Date(currentDate);

            if (recurringType === "weekly") {
                nextRepetitionDate.setDate(currentDate.getDate() + 7);
            } else if (recurringType === "monthly") {
                nextRepetitionDate.setMonth(currentDate.getMonth() + 1);
            }

            const nextJob = await agenda.schedule(nextRepetitionDate, "create-repeated-event", {
                userId,
                originalEventId,
                eventData: {
                    ...eventData,
                    date: nextRepetitionDate.toISOString().split("T")[0],
                    time: `${String(nextRepetitionDate.getHours()).padStart(2, '0')}:${String(nextRepetitionDate.getMinutes()).padStart(2, '0')}`
                },
                repetitionData,
                recurringType,
                currentRepetition: currentRepetition + 1,
                totalRepetitions,
            });

            console.log(`📅 Scheduled next repetition ${currentRepetition + 1}/${totalRepetitions} for ${nextRepetitionDate.toISOString()}`);
            console.log(`📅 Next job ID: ${nextJob.attrs._id}, nextRunAt: ${nextJob.attrs.nextRunAt}`);
        } else {
            console.log(`🎉 All ${totalRepetitions} repetitions completed!`);

            try {
                // Ensure final state is correct (redundant if increment worked, but good for safety)
                await Event.findByIdAndUpdate(originalEventId, {
                    completedRepetitions: totalRepetitions
                });
                console.log(`✅ Marked original event as fully completed (${totalRepetitions}/${totalRepetitions})`);
            } catch (finalError) {
                console.error(`❌ Error marking event as completed:`, finalError);
            }
        }

    } catch (error) {
        console.error(`❌ Error creating repetition ${currentRepetition}:`, error);
    }
});


// Start Agenda
(async function () {
    try {
        await agenda.start();
        console.log("📅 Repetition Agenda started successfully");
    } catch (err) {
        console.error("❌ Repetition Agenda failed to start:", err.message);
    }
})();


// Schedule repeated events - creates ONE job with all repetition data
export async function scheduleRepeatedEvents(
    userId,
    originalEventId,
    eventData,
    repetitionSettings
) {
    const { isRecurring, recurringType, repetitions } = repetitionSettings;

    if (!isRecurring || !repetitions?.length) return null;

    const numberOfRepetitions = repetitions[0].numberOfRepetitions;

    console.log(
        `📅 Creating single repetition job for ${numberOfRepetitions} ${recurringType} repetitions for event ${originalEventId}`
    );

    // Parse the date and time correctly
    const dateStr = eventData.date; // e.g., '2025-12-06'
    const timeStr = eventData.time; // e.g., '15:31'

    // Combine date and time into a proper Date object
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    const eventDate = new Date(year, month - 1, day, hours, minutes);

    console.log(`📅 Original event date: ${eventDate.toISOString()}`);

    // Calculate the first repetition date
    let firstRepetitionDate = new Date(eventDate);

    if (recurringType === "weekly") {
        firstRepetitionDate.setDate(eventDate.getDate() + 7); // First repetition is 1 week after
    } else if (recurringType === "monthly") {
        firstRepetitionDate.setMonth(eventDate.getMonth() + 1); // First repetition is 1 month after
    } else {
        console.error("❌ Invalid recurring type:", recurringType);
        return null;
    }

    console.log(`📅 First repetition date: ${firstRepetitionDate.toISOString()}`);

    // Create ONE job that will handle all repetitions
    const job = await agenda.schedule(firstRepetitionDate, "create-repeated-event", {
        userId,
        originalEventId, // This is now the MongoDB ObjectId
        eventData: {
            ...eventData,
            date: firstRepetitionDate.toISOString().split("T")[0], // Format: YYYY-MM-DD
            time: `${String(firstRepetitionDate.getHours()).padStart(2, '0')}:${String(firstRepetitionDate.getMinutes()).padStart(2, '0')}` // Format: HH:MM
        },
        repetitionData: repetitions,
        recurringType, // Store the type so the job knows how to schedule next
        currentRepetition: 1,
        totalRepetitions: numberOfRepetitions,
    });

    const jobId = job.attrs._id.toString();
    console.log(`✅ Created single repetition job ${jobId} for ${numberOfRepetitions} ${recurringType} repetitions`);
    console.log(`   First repetition scheduled for: ${firstRepetitionDate.toISOString()}`);

    return jobId; // Return single job ID (not comma-separated)
}

// Cancel repeated event job
export async function cancelRepeatedEvents(jobId) {
    if (!jobId) return;

    try {
        await agenda.cancel({ _id: jobId });
        console.log(`🛑 Cancelled repetition job ${jobId}`);
    } catch (err) {
        console.error(`❌ Error cancelling job ${jobId}:`, err);
    }
}

export default agenda;
