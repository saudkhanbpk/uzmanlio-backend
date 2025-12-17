import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import compression from "compression";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import profileRoutes from "./routes/expertRoutes/expertInformationRoutes.js";
import servicesRoutes from "./routes/expertRoutes/servicesRoutes.js";
import packagesRoutes from "./routes/expertRoutes/packagesRoutes.js";
import galleryRoutes from "./routes/expertRoutes/galleryRoutes.js";
import userEmailsRoutes from "./routes/expertRoutes/userEmails.js";
import formRoutes from "./routes/expertRoutes/formRoutes.js";
import blogRoutes from "./routes/expertRoutes/blogRoutes.js";
import eventRoutes from "./routes/expertRoutes/eventRoutes.js";
import { loadAndScheduleAll } from "./services/emailScheduler.js";
import userCouponsRoutes from "./routes/expertRoutes/userCoupons.js";
import bookingPage from "./routes/customerRoutes/bookingPage.js";
import calendarAuthRoutes from "./routes/calendarAuthRoutes.js";
import calendarSyncRoutes from "./routes/calendarSyncRoutes.js";
import calendarWebhookRoutes from "./routes/calendarWebhookRoutes.js";
import backgroundJobService from "./services/backgroundJobs.js";
import subscriptionRoutes from "./routes/expertRoutes/subscriptionRoutes.js";
import institutionRoutes from "./routes/expertRoutes/institutionRoutes.js";
import authRoutes from "./routes/expertRoutes/authRoutes.js";
import purchaseRoutes from "./routes/expertRoutes/purchaseRoutes.js";
import paymentRoutes from "./routes/expertRoutes/paymentRoutes.js";
import reportsRoutes from "./routes/expertRoutes/reportsRoutes.js";
import institutionDataRoutes from "./routes/expertRoutes/institutionDataRoutes.js";
import analyticsRoutes from "./routes/expertRoutes/analyticsRoutes.js";
import parasutRoute from "./routes/customerRoutes/parasut.routes.js";
import fs from "fs";
import axios from "axios";
import { parseStringPromise } from "xml2js";
import { Netgsm } from "@netgsm/sms";


// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();

// Performance middleware - must be early in stack
app.use(compression()); // Enable gzip compression for all responses
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(cors());

// Serve static files from uploads directory - MUST be early in middleware stack
const uploadsPath = path.join(__dirname, "uploads");
console.log("Serving static files from:", uploadsPath);

// Configure static file serving with proper options
app.use("/uploads", express.static(uploadsPath, {
  maxAge: '1d', // Cache files for 1 day
  etag: true,
  lastModified: true,
  index: false, // Don't serve index.html files
  setHeaders: (res, filePath) => {
    // Set proper content type headers
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Debug route to check file access
app.get('/debug/find-file', (req, res) => {
  const searchName = '1763142635630-80a4a857-12e9-4306-b642-a5193c0c8a3e-Gemini_Generated_Image_dvlaq6dvlaq6dvla.png';

  const locations = [
    path.join(__dirname, 'uploads', searchName),
    path.join(__dirname, 'uploads', 'Experts_Files', searchName),
    path.join(__dirname, 'uploads', 'Experts_Files', 'gallery', searchName),
  ];

  const results = locations.map(loc => ({
    path: loc,
    exists: fs.existsSync(loc)
  }));

  res.json({ searchName, results });
});

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

// Express route
app.get('/test', async (_req, res) => {
  console.log("Received request at /test endpoint");
});





// Expert information routes
app.use("/api/expert", authRoutes);
app.use("/api/expert", profileRoutes);
app.use("/api/expert", servicesRoutes);
app.use("/api/expert", packagesRoutes);
app.use("/api/expert", galleryRoutes);
app.use("/api/expert", formRoutes);
app.use("/api/expert", blogRoutes);
app.use("/api/expert", eventRoutes);
app.use("/api/expert", subscriptionRoutes);
app.use("/api/expert", institutionRoutes);
app.use("/api/expert", purchaseRoutes);
app.use("/api/expert", paymentRoutes);
app.use("/api/expert", reportsRoutes);
app.use("/api/expert", institutionDataRoutes); // Institution-wide data aggregation
app.use("/api/analytics", analyticsRoutes); // GA4 Analytics routes

// parasut route
app.use("/api/v1/parasut", parasutRoute);

// Calendar integration routes
app.use("/api/calendar/auth", calendarAuthRoutes);
app.use("/api/calendar/sync", calendarSyncRoutes);
app.use("/api/calendar/webhooks", calendarWebhookRoutes);
// Coupons per user
app.use("/api/expert/:userId/coupons", userCouponsRoutes);
// Emails per user
app.use("/api/expert/:userId/emails", userEmailsRoutes);





app.post("/send-sms", async (req, res) => {
  const netgsm = new Netgsm({
    username: "8503091122",
    password: "Uzmanlio_1807*",
    appname: "Uzmanlio" // optional
  });
  const { phone, message } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ success: false, error: "Phone and message are required." });
  }

  // Normalize phone number (keep last 10 digits)
  let target = phone.length > 10 ? phone.slice(-10) : phone;
  if (target.length !== 10) {
    return res.status(400).json({ success: false, error: "Invalid phone number format." });
  }

  try {
    const response = await netgsm.sendRestSms({
      msgheader: "8503091122", // Your SMS header
      encoding: "TR",          // Turkish characters support
      messages: [
        { msg: message, no: `5${target}` } // Add leading '5' for Turkish mobile numbers
      ]
    });

    res.json({
      success: true,
      sent_to: phone,
      netgsm_response: response
    });
  } catch (err) {
    console.error("NETGSM ERROR:", err);
    res.status(500).json({ success: false, error: err });
  }
});



//customer Routes

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


// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl
  });
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});
// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📅 Calendar webhooks available at:`);
  console.log(`   Google: ${process.env.BASE_URL || `http://localhost:${PORT}`}/api/calendar/webhooks/google`);
  console.log(`   Microsoft: ${process.env.BASE_URL || `http://localhost:${PORT}`}/api/calendar/webhooks/microsoft`);

  // Keep-alive: Self-ping every 14 minutes to prevent cold starts
  const KEEP_ALIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
  const serverUrl = process.env.BASE_URL || `http://localhost:${PORT}`;

  if (process.env.NODE_ENV === 'production') {
    setInterval(async () => {
      try {
        const response = await axios.get(`${serverUrl}/api/`);
        console.log(`🔄 Keep-alive ping successful at ${new Date().toISOString()}`);
      } catch (error) {
        console.error(`❌ Keep-alive ping failed:`, error.message);
      }
    }, KEEP_ALIVE_INTERVAL);
    console.log(`⏰ Keep-alive ping scheduled every 14 minutes`);
  }
});
