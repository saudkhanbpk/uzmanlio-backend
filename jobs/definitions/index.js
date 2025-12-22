import defineEventReminderJob from "./eventReminder.js";
import defineRepeatEventJob from "./repeatEvent.js";

/**
 * Register ALL job definitions with an Agenda instance
 * Called by the Worker to set up job processors
 * @param {Agenda} agenda - Agenda instance to register jobs on
 */
export const defineAllJobs = (agenda) => {
    defineEventReminderJob(agenda);
    defineRepeatEventJob(agenda);

    console.log("✅ All job definitions registered");
};

export default defineAllJobs;
