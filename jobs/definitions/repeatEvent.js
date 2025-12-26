import JOB_TYPES from "../types.js";
import User from "../../models/expertInformation.js";
import Order from "../../models/orders.js";
import Event from "../../models/event.js";
import Customer from "../../models/customer.js";
import EventRepetitionWarning from "../../models/eventRepetitionWarnings.js";
import { v4 as uuidv4 } from "uuid";
import { sendEmail } from "../../services/email.js";
import {
    getExpertEventCreatedTemplate,
    getClient11SessionTemplate,
    getClientGroupSessionTemplate,
    getClientPackageSessionTemplate,
    getGroupSessionConfirmationTemplate,
    getClientAppointmentCreatedTemplate
} from "../../services/eventEmailTemplates.js";
import calendarSyncService from "../../services/calendarSyncService.js";

/**
 * Define the create-repeated-event job processor
 * This job creates recurring events and reschedules itself for the next repetition
 * @param {Agenda} agenda - Agenda instance to define the job on
 */
export default function defineRepeatEventJob(agenda) {
    agenda.define(
        JOB_TYPES.CREATE_REPEATED_EVENT,
        { priority: "normal", concurrency: 2 },
        async (job) => {
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
                // Fetch user from database
                const user = await User.findById(userId);
                if (!user) {
                    console.error(`❌ User ${userId} not found for repetition`);
                    return;
                }

                // Fetch the ORIGINAL event from Event collection
                const originalEvent = await Event.findById(originalEventId);
                if (!originalEvent) {
                    console.error(`❌ Original event ${originalEventId} not found`);
                    return;
                }

                console.log(`✅ Found original event: ${originalEvent.title}`);

                // Create new event
                const newEventId = uuidv4();
                const newEventData = {
                    id: newEventId,
                    expertId: userId,
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

                const createdEvent = await Event.create(newEventData);
                console.log(`✅ Created repeated event ${createdEvent._id}`);

                // Sync to connected calendars in background
                const providers = user.calendarProviders?.filter(cp => cp.isActive) || [];
                if (providers.length > 0) {
                    // Note: We don't necessarily need setImmediate here since this is already in a background job,
                    // but it helps keep the job responsive if one sync fails or takes long.
                    for (const provider of providers) {
                        try {
                            await calendarSyncService.syncAppointmentToProvider(
                                userId,
                                createdEvent,
                                { providerId: provider.providerId }
                            );
                            console.log(`✅ Synced repetition to ${provider.provider}`);
                        } catch (syncError) {
                            console.error(`❌ Failed syncing repetition to ${provider.provider}:`, syncError);
                        }
                    }
                }

                // Arrays to track issues
                const insufficientSessionsCustomers = [];
                const noPackageCustomers = [];

                // Process package deductions
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
                                                    customerId,
                                                    customerName,
                                                    message: `Used all sessions (${completedSessions}/${totalSessions})`
                                                });
                                                console.warn(`⚠️ ${customerName} has no remaining sessions`);
                                            }
                                            break;
                                        }
                                    }

                                    if (!packageFound) {
                                        console.warn(`⚠️ Package ${payment.packageId} not found in order`);
                                    }
                                }
                            } catch (orderError) {
                                console.error(`❌ Error updating order ${payment.orderId}:`, orderError);
                            }
                        } else {
                            noPackageCustomers.push({
                                customerId,
                                customerName,
                                paymentMethod: payment.paymentMethod,
                                message: `Using ${payment.paymentMethod} payment`
                            });
                        }
                    }
                }

                // Create orders for customers without packages
                if (originalEvent.paymentType && Array.isArray(originalEvent.paymentType)) {
                    console.log("📦 Creating orders for customers without packages...");

                    for (const payment of originalEvent.paymentType) {
                        if (payment.paymentMethod !== 'paketten-tahsil' && !payment.orderId) {
                            const customerId = payment.customerId?.toString() || payment.customerId;
                            const customer = originalEvent.selectedClients.find(
                                c => c.id?.toString() === customerId
                            );

                            if (customer && originalEvent.price) {
                                try {
                                    const customerDoc = await Customer.findById(customerId);

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
                                            events: [{
                                                eventType: 'service',
                                                service: {
                                                    name: originalEvent.serviceName,
                                                    description: originalEvent.description || '',
                                                    price: parseFloat(originalEvent.price),
                                                    duration: parseInt(originalEvent.duration) || 0,
                                                    meetingType: originalEvent.meetingType || '1-1'
                                                }
                                            }],
                                            totalAmount: parseFloat(originalEvent.price)
                                        },
                                        paymentInfo: {
                                            method: payment.paymentMethod,
                                            status: 'pending'
                                        },
                                        status: 'pending',
                                        orderSource: 'expert-repetition-event'
                                    });

                                    console.log(`✅ Created order ${newOrder._id} for ${customer.name}`);

                                    if (customerDoc) {
                                        if (!customerDoc.orders) customerDoc.orders = [];
                                        if (!customerDoc.appointments) customerDoc.appointments = [];
                                        customerDoc.orders.push(newOrder._id);
                                        customerDoc.appointments.push(createdEvent._id);
                                        await customerDoc.save();
                                    }

                                    // Update event payment type with order ID
                                    const paymentIndex = createdEvent.paymentType.findIndex(
                                        p => p.customerId?.toString() === customerId
                                    );
                                    if (paymentIndex !== -1) {
                                        createdEvent.paymentType[paymentIndex].orderId = newOrder._id;
                                        await createdEvent.save();
                                    }
                                } catch (orderError) {
                                    console.error(`❌ Error creating order for ${customerId}:`, orderError);
                                }
                            }
                        }
                    }
                }

                // Send email notifications
                try {
                    const expertName = user.information?.name || 'Uzman';
                    const expertEmail = user.information?.email;
                    const selectedClients = originalEvent.selectedClients || [];
                    const meetingType = originalEvent.meetingType;
                    const serviceType = originalEvent.serviceType;

                    console.log(`📧 Sending emails - MeetingType: ${meetingType}, ServiceType: ${serviceType}`);

                    if (serviceType === 'service') {
                        if (meetingType === '1-1') {
                            for (const client of selectedClients) {
                                if (!client.email) continue;

                                const clientTemplate = getClient11SessionTemplate({
                                    participantName: client.name,
                                    expertName,
                                    sessionName: originalEvent.serviceName,
                                    sessionDate: eventData.date,
                                    sessionTime: eventData.time,
                                    sessionDuration: originalEvent.duration,
                                    videoLink: originalEvent.platform || ''
                                });

                                await sendEmail(client.email, {
                                    subject: clientTemplate.subject,
                                    html: clientTemplate.html
                                });
                                console.log(`✅ Bireysel email sent to: ${client.email}`);
                            }
                        } else {
                            for (const client of selectedClients) {
                                if (!client.email) continue;

                                const inviteTemplate = getClientGroupSessionTemplate({
                                    participantName: client.name,
                                    expertName,
                                    sessionName: originalEvent.serviceName,
                                    sessionDate: eventData.date,
                                    sessionTime: eventData.time,
                                    sessionDuration: originalEvent.duration,
                                    videoLink: originalEvent.platform || ''
                                });

                                await sendEmail(client.email, {
                                    subject: inviteTemplate.subject,
                                    html: inviteTemplate.html
                                });

                                const confirmationTemplate = getGroupSessionConfirmationTemplate({
                                    participantName: client.name,
                                    sessionName: originalEvent.serviceName,
                                    sessionDate: eventData.date,
                                    sessionTime: eventData.time,
                                    videoLink: originalEvent.platform || ''
                                });

                                await sendEmail(client.email, {
                                    subject: confirmationTemplate.subject,
                                    html: confirmationTemplate.html
                                });
                                console.log(`✅ Group emails sent to: ${client.email}`);
                            }
                        }
                    } else {
                        // Package type
                        for (const client of selectedClients) {
                            if (!client.email) continue;

                            const packageUsageTemplate = getClientPackageSessionTemplate({
                                participantName: client.name,
                                expertName,
                                packageName: originalEvent.serviceName,
                                sessionName: originalEvent.serviceName,
                                sessionDate: eventData.date,
                                sessionTime: eventData.time,
                                sessionDuration: originalEvent.duration,
                                videoLink: originalEvent.platform || ''
                            });

                            await sendEmail(client.email, {
                                subject: packageUsageTemplate.subject,
                                html: packageUsageTemplate.html
                            });

                            const appointmentTemplate = getClientAppointmentCreatedTemplate({
                                clientName: client.name,
                                expertName,
                                appointmentDate: eventData.date,
                                appointmentTime: eventData.time,
                                appointmentLocation: originalEvent.location || 'Online',
                                videoLink: originalEvent.platform || ''
                            });

                            await sendEmail(client.email, {
                                subject: appointmentTemplate.subject,
                                html: appointmentTemplate.html
                            });
                            console.log(`✅ Package emails sent to: ${client.email}`);
                        }
                    }

                    // Send email to Expert
                    if (expertEmail) {
                        const expertTemplate = getExpertEventCreatedTemplate({
                            expertName,
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
                        console.log(`✅ Expert email sent to: ${expertEmail}`);
                    }
                } catch (emailError) {
                    console.error(`❌ Error sending emails:`, emailError);
                }

                // Save warnings to database
                if (insufficientSessionsCustomers.length > 0 || noPackageCustomers.length > 0) {
                    try {
                        const warningDetails = [];

                        insufficientSessionsCustomers.forEach(c => {
                            warningDetails.push({
                                customerId: c.customerId,
                                warningType: "Insufficient Sessions",
                                warningMessage: c.message
                            });
                        });

                        noPackageCustomers.forEach(c => {
                            warningDetails.push({
                                customerId: c.customerId,
                                warningType: "No Package",
                                warningMessage: c.message
                            });
                        });

                        const warningDoc = await EventRepetitionWarning.create({
                            userId,
                            eventId: createdEvent._id,
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
                    } catch (warningError) {
                        console.error(`❌ Error saving warning:`, warningError);
                    }
                }

                // Update completedRepetitions on original event
                try {
                    await Event.findByIdAndUpdate(originalEventId, {
                        $inc: { completedRepetitions: 1 }
                    });
                    console.log(`✅ Updated original event completedRepetitions`);
                } catch (updateError) {
                    console.error(`❌ Error updating completedRepetitions:`, updateError);
                }

                // Schedule NEXT repetition if not done
                if (currentRepetition < totalRepetitions) {
                    const dateStr = eventData.date;
                    const timeStr = eventData.time;
                    const [year, month, day] = dateStr.split('-').map(Number);
                    const [hours, minutes] = timeStr.split(':').map(Number);

                    const currentDate = new Date(year, month - 1, day, hours, minutes);
                    let nextRepetitionDate = new Date(currentDate);

                    if (recurringType === "weekly") {
                        nextRepetitionDate.setDate(currentDate.getDate() + 7);
                    } else if (recurringType === "monthly") {
                        nextRepetitionDate.setMonth(currentDate.getMonth() + 1);
                    }

                    const nextJob = await agenda.schedule(nextRepetitionDate, JOB_TYPES.CREATE_REPEATED_EVENT, {
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
                } else {
                    console.log(`🎉 All ${totalRepetitions} repetitions completed!`);

                    try {
                        await Event.findByIdAndUpdate(originalEventId, {
                            completedRepetitions: totalRepetitions
                        });
                        console.log(`✅ Marked original event as fully completed`);
                    } catch (finalError) {
                        console.error(`❌ Error marking event as completed:`, finalError);
                    }
                }

                console.log(`✅ Repetition ${currentRepetition}/${totalRepetitions} completed`);

            } catch (error) {
                console.error(`❌ Error creating repetition ${currentRepetition}:`, error);
                throw error; // Rethrow to mark job as failed
            }
        }
    );

    console.log(`✅ Defined job: ${JOB_TYPES.CREATE_REPEATED_EVENT}`);
}
