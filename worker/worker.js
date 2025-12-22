/**
 * Dedicated Agenda Worker
 * 
 * This is a standalone Node.js process that handles job execution.
 * It does NOT serve HTTP requests - that's the API server's job.
 * 
 * Start with: npm run start:worker
 */

import "dotenv/config";
import mongoose from "mongoose";
import { createAgenda, getMongoAddress } from "../config/agenda.js";
import { defineAllJobs } from "../jobs/definitions/index.js";

// Worker identifier
const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}`;

// MongoDB connection
const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "uzmanlio";

async function startWorker() {
    console.log(`🔧 Starting Worker: ${WORKER_ID}`);
    console.log(`📡 Connecting to MongoDB...`);
    console.log(`   Address: ${getMongoAddress()}`);

    try {
        // Connect to MongoDB
        await mongoose.connect(mongoUrl, { dbName });
        console.log("✅ MongoDB connected");

        // Create Agenda instance for this worker
        const agenda = createAgenda({
            name: WORKER_ID,
        });

        // Register all job processors
        defineAllJobs(agenda);

        // Graceful shutdown handlers
        const gracefulShutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

            try {
                await agenda.stop();
                console.log("✅ Agenda stopped");

                await mongoose.connection.close();
                console.log("✅ MongoDB connection closed");

                process.exit(0);
            } catch (error) {
                console.error("❌ Error during shutdown:", error);
                process.exit(1);
            }
        };

        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));

        // Handle uncaught errors
        process.on("uncaughtException", (error) => {
            console.error("❌ Uncaught Exception:", error);
        });

        process.on("unhandledRejection", (reason, promise) => {
            console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
        });

        // Agenda event listeners for debugging
        agenda.on("ready", () => {
            console.log("📋 Agenda is ready");
        });

        agenda.on("start", (job) => {
            console.log(`▶️  Job ${job.attrs.name} starting...`);
        });

        agenda.on("complete", (job) => {
            console.log(`✅ Job ${job.attrs.name} completed`);
        });

        agenda.on("fail", (err, job) => {
            console.error(`❌ Job ${job.attrs.name} failed:`, err.message);
        });

        agenda.on("success", (job) => {
            console.log(`🎉 Job ${job.attrs.name} succeeded`);
        });

        // START PROCESSING JOBS
        await agenda.start();

        console.log(`\n${"=".repeat(50)}`);
        console.log(`🚀 Worker ${WORKER_ID} is now processing jobs`);
        console.log(`   Polling every: 30 seconds`);
        console.log(`   Max concurrency: 20 jobs`);
        console.log(`${"=".repeat(50)}\n`);

        // Keep-alive log every 5 minutes
        setInterval(() => {
            console.log(`💓 Worker ${WORKER_ID} heartbeat at ${new Date().toISOString()}`);
        }, 5 * 60 * 1000);

    } catch (error) {
        console.error("❌ Failed to start worker:", error);
        process.exit(1);
    }
}

// Start the worker
startWorker();
