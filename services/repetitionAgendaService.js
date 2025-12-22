/**
 * Repetition Agenda Scheduler Service (API Side)
 * 
 * This file handles SCHEDULING repeated event jobs only - it does NOT process them.
 * Job processing is handled by the dedicated worker (worker/worker.js).
 * 
 * Functions:
 * - scheduleRepeatedEvents: Schedule recurring event creation
 * - cancelRepeatedEvents: Cancel a scheduled repetition job
 */

import { createAgenda, getMongoAddress } from "../config/agenda.js";
import JOB_TYPES from "../jobs/types.js";

console.log("Repetition Scheduler connecting to:", getMongoAddress());

// Create Agenda instance for scheduling (NOT processing)
const agenda = createAgenda({ name: "api-repetition-scheduler" });

// DO NOT call agenda.start() - only the worker should process jobs!

/**
 * Schedule repeated events - creates ONE job with all repetition data
 * The job will reschedule itself for subsequent repetitions
 * 
 * @param {String} userId - User ID
 * @param {String} originalEventId - Original event MongoDB ID
 * @param {Object} eventData - Event data for the repetition
 * @param {Object} repetitionSettings - Repetition configuration
 * @returns {Promise<String|null>} - Job ID or null if not scheduled
 */
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
        `📅 Creating repetition job for ${numberOfRepetitions} ${recurringType} repetitions for event ${originalEventId}`
    );

    // Parse the date and time correctly
    const dateStr = eventData.date; // e.g., '2025-12-06'
    const timeStr = eventData.time; // e.g., '15:31'

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    const eventDate = new Date(year, month - 1, day, hours, minutes);

    console.log(`📅 Original event date: ${eventDate.toISOString()}`);

    // Calculate the first repetition date
    let firstRepetitionDate = new Date(eventDate);

    if (recurringType === "weekly") {
        firstRepetitionDate.setDate(eventDate.getDate() + 7);
    } else if (recurringType === "monthly") {
        firstRepetitionDate.setMonth(eventDate.getMonth() + 1);
    } else {
        console.error("❌ Invalid recurring type:", recurringType);
        return null;
    }

    console.log(`📅 First repetition date: ${firstRepetitionDate.toISOString()}`);

    // Schedule the first repetition job
    const job = await agenda.schedule(firstRepetitionDate, JOB_TYPES.CREATE_REPEATED_EVENT, {
        userId,
        originalEventId,
        eventData: {
            ...eventData,
            date: firstRepetitionDate.toISOString().split("T")[0],
            time: `${String(firstRepetitionDate.getHours()).padStart(2, '0')}:${String(firstRepetitionDate.getMinutes()).padStart(2, '0')}`
        },
        repetitionData: repetitions,
        recurringType,
        currentRepetition: 1,
        totalRepetitions: numberOfRepetitions,
    });

    const jobId = job.attrs._id.toString();
    console.log(`✅ Created repetition job ${jobId} for ${numberOfRepetitions} ${recurringType} repetitions`);
    console.log(`   First repetition scheduled for: ${firstRepetitionDate.toISOString()}`);

    return jobId;
}

/**
 * Cancel a repeated event job
 * @param {String} jobId - Agenda job ID
 * @returns {Promise<void>}
 */
export async function cancelRepeatedEvents(jobId) {
    if (!jobId) return;

    try {
        const numRemoved = await agenda.cancel({ _id: jobId });

        if (numRemoved > 0) {
            console.log(`🛑 Cancelled repetition job ${jobId}`);
        } else {
            console.warn(`⚠️ Repetition job not found: ${jobId}`);
        }
    } catch (err) {
        console.error(`❌ Error cancelling job ${jobId}:`, err);
    }
}

export default agenda;
