import express from "express";
import * as eventController from "../../controllers/eventController.js";
import { checkInstitutionAdmin } from "../../middlewares/institutionAuth.js";

const router = express.Router();

// Base route: /api/expert/:userId/events
router.post("/:userId/events", checkInstitutionAdmin, eventController.createEvent);
router.put("/:userId/events/:eventId", checkInstitutionAdmin, eventController.updateEvent);
router.delete("/:userId/events/:eventId", checkInstitutionAdmin, eventController.deleteEvent);
router.get("/:userId/events/stats", eventController.getEventStatistics)
router.get("/:userId/events", eventController.getEvents);
router.get("/:userId/events/status/:status", eventController.getEventByStatus)
router.patch("/:userId/events/:eventId/status", checkInstitutionAdmin, eventController.updateEventStatus)

export default router;
