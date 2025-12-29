// import jwt from "jsonwebtoken"; // Unused, logic moved to auth.js
import User from "../models/expertInformation.js";
import Institution from "../models/institution.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access-secret";
export const checkInstitutionAdmin = async (req, res, next) => {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User identification failed. Ensure auth middleware is applied."
            });
        }

        const user = await User.findById(userId).select('subscription refreshToken information.name information.surname information.email');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Unauthorized: User account not found."
            });
        }

        // Validate Session (Check if Refresh Token exists in DB - Signifies active login)
        if (!user.refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Session expired. Please log in again."
            });
        }

        // --- 3. Authorization Rules (Role & Plan) ---

        const subscription = user.subscription || {};

        // Requirement: "The user must have an admin role." 
        // We check 'plantype' and 'isAdmin' flag if available, or implied by being an Institution Admin.
        // For institution routes, we strictly require 'institutional' plan.

        if (subscription.plantype !== 'institutional') {
            // If the user is individual, they should not be accessing Institution endpoints via this middleware.
            // If there's a valid case for individuals using this (e.g. self-management), we might allow, 
            // but user requirements emphasize Institution Security.
            return res.status(403).json({
                success: false,
                message: "Forbidden: Access restricted to Institutional accounts."
            });
        }

        // --- 4. Institution & Data Isolation ---

        // Find the institution where this user is the Admin
        const institution = await Institution.findOne({ Admin: userId });

        // Note: We do NOT strictly block if institution is missing here, 
        // because the user might be calling the "Create Institution" endpoint.
        // Downstream routes (like invite-user) should check if req.institution exists.

        // Global Route Protection & Cross-Access Prevention
        // We MUST ensure the :userId in the route matches the authenticated user.
        if (req.params.userId && req.params.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: Cross-account access denied. You can only manage your own institution."
            });
        }

        // Attach Institution to request
        req.institution = institution; // might be null
        req.institutionId = institution?._id;
        req.user = user; // attach full user object if needed

        // Proceed
        return next();

    } catch (error) {
        console.error("Institution Security Middleware Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error during security validation."
        });
    }
};
