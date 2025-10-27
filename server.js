import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import profileRoutes from "./routes/expertRoutes/expertInformationRoutes.js";
import servicesRoutes from "./routes/expertRoutes/servicesRoutes.js";
import packagesRoutes from "./routes/expertRoutes/packagesRoutes.js";
import galleryRoutes from "./routes/expertRoutes/galleryRoutes.js";
import userEmailsRoutes from "./routes/expertRoutes/userEmails.js";
import { loadAndScheduleAll } from "./services/emailScheduler.js";
import userCouponsRoutes from "./routes/expertRoutes/userCoupons.js";
import bookingPage from "./routes/customerRoutes/bookingPage.js";
import calendarAuthRoutes from "./routes/calendarAuthRoutes.js";
import calendarSyncRoutes from "./routes/calendarSyncRoutes.js";
import calendarWebhookRoutes from "./routes/calendarWebhookRoutes.js";
import backgroundJobService from "./services/backgroundJobs.js";
import subscriptionRoutes from "./routes/expertRoutes/subscriptionRoutes.js";


// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());


// Serve static files
const uploadsPath = path.join(__dirname, "uploads");
console.log("Serving static files from:", uploadsPath);
app.use("/uploads", express.static(uploadsPath));

// MongoDB connection
const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017";
const dbName = process.env.DB_NAME || "uzmanlio";

mongoose
  .connect(mongoUrl, { dbName })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// After successful connection, load scheduled emails
mongoose.connection.once('open', () => {
  console.log('MongoDB connection open, loading scheduled emails...');
  loadAndScheduleAll().catch(err => console.error('Failed to load scheduled emails:', err));
});

// Example StatusCheck schema
const statusCheckSchema = new mongoose.Schema({
  id: { type: String, default: uuidv4 },
  client_name: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});
const StatusCheck = mongoose.model("StatusCheck", statusCheckSchema);

// Routes
app.get("/api/", (req, res) => {
  res.json({ message: "Hello World" });
});

app.post("/api/status", async (req, res) => {
  try {
    const { client_name } = req.body;
    if (!client_name) {
      return res.status(400).json({ error: "client_name is required" });
    }
    const statusCheck = new StatusCheck({ client_name });
    await statusCheck.save();
    res.json(statusCheck);
  } catch (error) {
    console.error("Error creating status:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

app.get("/api/status", async (req, res) => {
  try {
    const statusChecks = await StatusCheck.find().limit(1000);
    res.json(statusChecks);
  } catch (error) {
    console.error("Error fetching status checks:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});



// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl
  });
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});
// Expert information routes
app.use("/api/expert", profileRoutes);
app.use("/api/expert", servicesRoutes);
app.use("/api/expert", packagesRoutes);
app.use("/api/expert", galleryRoutes);
app.use("/api/expert", subscriptionRoutes);

// Calendar integration routes
app.use("/api/calendar/auth", calendarAuthRoutes);
app.use("/api/calendar/sync", calendarSyncRoutes);
app.use("/api/calendar/webhooks", calendarWebhookRoutes);
// Coupons per user
app.use("/api/expert/:userId/coupons", userCouponsRoutes);
// Emails per user
app.use("/api/expert/:userId/emails", userEmailsRoutes);

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  backgroundJobService.stopAllJobs();
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  backgroundJobService.stopAllJobs();
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});

// Initialize background jobs
if (process.env.NODE_ENV !== 'test') {
  backgroundJobService.init();
}
// Customer Routes
// Booking Page Routes
app.use("/api/booking/customers", bookingPage);



// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📅 Calendar webhooks available at:`);
  console.log(`   Google: ${process.env.BASE_URL || `http://localhost:${PORT}`}/api/calendar/webhooks/google`);
  console.log(`   Microsoft: ${process.env.BASE_URL || `http://localhost:${PORT}`}/api/calendar/webhooks/microsoft`);
});
