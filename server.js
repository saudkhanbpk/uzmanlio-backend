// app.js
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import profileRoutes from "./routes/expertInformationRoutes.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connection
const mongoUrl = process.env.MONGO_URL;
const dbName = process.env.DB_NAME;

mongoose
  .connect(mongoUrl, { dbName })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Example StatusCheck schema (keep if still needed)
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
    const statusCheck = new StatusCheck({ client_name });
    await statusCheck.save();
    res.json(statusCheck);
  } catch (error) {
    console.error("Error creating status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/status", async (req, res) => {
  try {
    const statusChecks = await StatusCheck.find().limit(1000);
    res.json(statusChecks);
  } catch (error) {
    console.error("Error fetching status checks:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Profile routes (education, certificates, experience, etc.)
app.use("/api/profile", profileRoutes);

// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed");
  process.exit(0);
});

// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
