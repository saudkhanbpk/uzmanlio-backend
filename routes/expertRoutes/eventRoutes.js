import express from "express";
import * as eventController from "../../controllers/eventController.js";
import { checkInstitutionAdmin } from "../../middlewares/institutionAuth.js";
import { validateRequest, validateBody, validateParams, validateQuery } from "../../middlewares/validateRequest.js";
import {
    createEventSchema,
    updateEventSchema,
    updateEventStatusSchema,
    eventIdParams,
    eventStatusParams,
    getEventsQuery,
} from "../../validations/event.schema.js";
import { userIdParams } from "../../validations/common.schema.js";

const router = express.Router();

// Base route: /api/expert/:userId/events
router.post(
    "/:userId/events",
    validateParams(userIdParams),
    validateBody(createEventSchema),
    checkInstitutionAdmin,
    eventController.createEvent
);

router.put(
    "/:userId/events/:eventId",
    validateParams(eventIdParams),
    validateBody(updateEventSchema),
    checkInstitutionAdmin,
    eventController.updateEvent
);

router.delete(
    "/:userId/events/:eventId",
    validateParams(eventIdParams),
    checkInstitutionAdmin,
    eventController.deleteEvent
);

router.get(
    "/:userId/events/stats",
    validateParams(userIdParams),
    eventController.getEventStatistics
);

router.get(
    "/:userId/events",
    validateParams(userIdParams),
    validateQuery(getEventsQuery),
    eventController.getEvents
);

router.get(
    "/:userId/events/status/:status",
    validateParams(eventStatusParams),
    eventController.getEventByStatus
);

router.patch(
    "/:userId/events/:eventId/status",
    validateParams(eventIdParams),
    validateBody(updateEventStatusSchema),
    checkInstitutionAdmin,
    eventController.updateEventStatus
);

export default router;

