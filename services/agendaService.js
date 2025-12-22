/**
 * Agenda Scheduler Service (API Side)
 * 
 * This file handles SCHEDULING jobs only - it does NOT process them.
 * Job processing is handled by the dedicated worker (worker/worker.js).
 * 
 * Functions:
 * - scheduleEventReminder: Schedule a reminder for an event
 * - updateEventReminder: Reschedule a reminder when event time changes
 * - cancelEventReminder: Cancel a scheduled reminder
 */

import { createAgenda, getMongoAddress } from "../config/agenda.js";
import JOB_TYPES from "../jobs/types.js";

console.log("Agenda Scheduler connecting to:", getMongoAddress());

// Create Agenda instance for scheduling (NOT processing)
const agenda = createAgenda({ name: "api-scheduler" });

// DO NOT call agenda.start() - only the worker should process jobs!

/**
 * Parse event date + time with fixed Turkey timezone (UTC+3)
 */
const parseEventDateTime = (dateStr, timeStr) => {
  try {
    if (!dateStr || !timeStr) return null;

    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = timeStr.split(":").map(Number);

    // Force Turkey timezone: UTC+3
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+03:00`;

    const dt = new Date(iso);

    if (isNaN(dt.getTime())) return null;

    return dt;
  } catch (e) {
    console.error("parseEventDateTime error:", e);
    return null;
  }
};

/**
 * Schedule a reminder job for an event
 * @param {Object} event - Event object from database
 * @param {String} userId - User ID who owns the event
 * @returns {Promise<String>} - Job ID of the scheduled job
 */
export const scheduleEventReminder = async (event, userId) => {
  try {
    const eventDateTime = parseEventDateTime(event.date, event.time);

    if (!eventDateTime) {
      console.warn(`❌ Invalid event date/time →`, event.date, event.time);
      return null;
    }

    console.log("📅 Parsed Event:", eventDateTime.toISOString());

    // Reminder 2 hours before event
    const reminderTime = new Date(eventDateTime.getTime() - 2 * 60 * 60 * 1000);
    const now = new Date();

    console.log("⏰ Reminder At:", reminderTime.toISOString());
    console.log("⏱️ Now:", now.toISOString());

    const jobData = {
      eventId: event.id || event._id,
      userId: userId,
      eventDate: event.date,
      eventTime: event.time
    };

    // If reminder time passed → schedule immediate
    if (reminderTime <= now) {
      console.log(`⚡ Reminder time passed → scheduling immediate job`);

      const job = await agenda.schedule(
        new Date(Date.now() + 10000),
        JOB_TYPES.SEND_EVENT_REMINDER,
        jobData
      );

      return job?.attrs?._id?.toString?.() || null;
    }

    // Normal case
    const job = await agenda.schedule(reminderTime, JOB_TYPES.SEND_EVENT_REMINDER, jobData);
    console.log(`✅ Scheduled reminder job: ${job?.attrs?._id}`);
    return job?.attrs?._id?.toString?.() || null;

  } catch (error) {
    console.error(`❌ Error scheduling reminder:`, error);
    return null;
  }
};

/**
 * Update/reschedule a reminder job when event time changes
 * @param {Object} event - Updated event object
 * @param {String} userId - User ID who owns the event
 * @returns {Promise<String>} - New job ID
 */
export const updateEventReminder = async (event, userId) => {
  try {
    // Cancel old job if exists
    if (event.agendaJobId) {
      await cancelEventReminder(event.agendaJobId);
    }

    // Schedule new job
    const newJobId = await scheduleEventReminder(event, userId);
    return newJobId;
  } catch (error) {
    console.error(`❌ Error updating reminder for event ${event.id}:`, error);
    return null;
  }
};

/**
 * Cancel a scheduled reminder job
 * @param {String} jobId - Agenda job ID
 * @returns {Promise<Boolean>} - Success status
 */
export const cancelEventReminder = async (jobId) => {
  try {
    if (!jobId) {
      return false;
    }

    const numRemoved = await agenda.cancel({ _id: jobId });

    if (numRemoved > 0) {
      console.log(`✅ Cancelled reminder job: ${jobId}`);
      return true;
    } else {
      console.warn(`⚠️  Job not found or already executed: ${jobId}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error cancelling job ${jobId}:`, error);
    return false;
  }
};

/**
 * Graceful shutdown - stop Agenda when app closes
 */
export const gracefulShutdown = async () => {
  console.log("🛑 Stopping Agenda scheduler gracefully...");
  await agenda.stop();
  console.log("✅ Agenda scheduler stopped");
};

export default agenda;