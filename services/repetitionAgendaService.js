import Agenda from "agenda";
import User from "../models/expertInformation.js";
import Order from "../models/orders.js";
import { v4 as uuidv4 } from "uuid";

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
        const user = await User.findById(userId);
        if (!user) {
            console.error(`❌ User ${userId} not found for repetition`);
            return;
        }

        const newEventId = uuidv4();
        const newEvent = {
            ...eventData,
            id: newEventId,
            originalEventId, // Store the MongoDB ObjectId
            repetitionNumber: currentRepetition,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        user.events.push(newEvent);

        // Process package deductions
        if (Array.isArray(repetitionData)) {
            for (const repData of repetitionData) {
                if (repData.orderId && repData.packageId) {
                    try {
                        const order = await Order.findById(repData.orderId);

                        if (order?.orderDetails?.events) {
                            for (let e of order.orderDetails.events) {
                                if (
                                    e.eventType === "package" &&
                                    e.package?.packageId?.toString() === repData.packageId.toString()
                                ) {
                                    e.package.completedSessions = (e.package.completedSessions || 0) + 1;
                                    console.log(`✅ Incremented package session for repetition ${currentRepetition}`);
                                }
                            }
                            await order.save();
                        }
                    } catch (orderError) {
                        console.error(`❌ Error updating order ${repData.orderId}:`, orderError);
                    }
                }
            }
        }

        await user.save();
        console.log(`✅ Repetition ${currentRepetition}/${totalRepetitions} created successfully`);

        // Schedule the NEXT repetition if not done
        if (currentRepetition < totalRepetitions) {
            // Parse current date and time
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

            // Schedule next repetition
            await agenda.schedule(nextRepetitionDate, "create-repeated-event", {
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
