import Agenda from "agenda";

/**
 * Shared Agenda configuration for both API and Worker
 * Uses unified agendaJobs collection for all job types
 */

// Read Mongo connection from env (support both MONGO_URL and MONGO_URI)
let mongoAddress = process.env.MONGO_URL || process.env.MONGO_URI || process.env.MONGO;
if (typeof mongoAddress === "string") {
    mongoAddress = mongoAddress.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim();
}

const dbName = (process.env.DB_NAME || "").replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim();

if (!mongoAddress) {
    console.error("FATAL: MONGO_URL / MONGO_URI is not defined. Set MONGO_URL in backend/.env");
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

/**
 * Create a configured Agenda instance
 * @param {Object} options - Additional options
 * @param {string} options.name - Unique name for this instance (for debugging)
 * @param {boolean} options.isWorker - If true, applies worker-specific settings
 * @returns {Agenda} Configured Agenda instance
 */
export const createAgenda = (options = {}) => {
    const agenda = new Agenda({
        db: {
            address: mongoAddress,
            collection: "agendaJobs", // Unified collection for all jobs
        },

        // Polling interval - how often to check for new jobs
        processEvery: "30 seconds",

        // Concurrency settings
        maxConcurrency: 20,          // Max jobs running at once per worker
        defaultConcurrency: 5,       // Default per job type

        // Lock settings to prevent duplicate execution
        lockLimit: 0,                // No limit on locked jobs per worker
        defaultLockLimit: 0,
        defaultLockLifetime: 10 * 60 * 1000, // 10 minutes - job timeout

        // Optional instance name for debugging
        name: options.name || `agenda-${process.pid}`,
    });

    return agenda;
};

/**
 * Get the MongoDB connection string (sanitized for logging)
 */
export const getMongoAddress = () => {
    return mongoAddress.replace(/\/\/([^:]+):([^@]+)@/, "//$1:*****@");
};

export default createAgenda;
