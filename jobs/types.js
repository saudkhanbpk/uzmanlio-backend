/**
 * Centralized job type constants
 * Use these everywhere to avoid typos in job names
 */
export const JOB_TYPES = {
    // Event reminder - sent 2 hours before event
    SEND_EVENT_REMINDER: "sendEventReminder",

    // Repeated event creation - creates next recurring event
    CREATE_REPEATED_EVENT: "create-repeated-event",
};

export default JOB_TYPES;
