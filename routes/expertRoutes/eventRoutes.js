import express from "express";
import * as eventController from "../../controllers/eventController.js";

const router = express.Router();

// Base route: /api/expert/:userId/events
router.post("/:userId/events", eventController.createEvent);
router.put("/:userId/events/:eventId", eventController.updateEvent);
router.delete("/:userId/events/:eventId", eventController.deleteEvent);
router.get("/:userId/events/stats", eventController.getEventStatistics)
router.get("/:userId/events", eventController.getEvents);
router.get("/:userId/events/status/:status", eventController.getEventByStatus)
router.patch("/:userId/events/:eventId/status", eventController.updateEventStatus)

export default router;
