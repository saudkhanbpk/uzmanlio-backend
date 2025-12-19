import User from "../models/expertInformation.js";
import Institution from "../models/institution.js";

/*** Middleware to check permission for changing data (Institution or Shared resources).*/
export const checkInstitutionAdmin = async (req, res, next) => {
    try {
        const userId = req.userId; // Set by verifyAccessToken

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: No user ID found in request."
            });
        }

        // Fetch authenticated user info
        const user = await User.findById(userId).select('subscription refreshToken information.name');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // 1. Check Refresh Token (User session active check)
        if (!user.refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Session expired or invalid."
            });
        }

        // 2. Check Plan Type
        const planType = user.subscription?.plantype; // 'individual' or 'institutional'

        if (planType === 'individual') {
            // Individuals have full control over their own resources
            return next();
        }

        // 3. For Institutional Users, Enforce Admin via Institution Schema
        if (planType === 'institutional') {
            // Verify if the user is the Admin of an Institution
            const institution = await Institution.findOne({ Admin: userId });

            if (!institution) {
                return res.status(403).json({
                    success: false,
                    message: "Forbidden: You are not a registered Institution Admin."
                });
            }

            // User is confirmed as the Admin of this institution
            req.institution = institution;
            req.institutionId = institution._id;
            return next();
        }

        // Fallback for unknown plan types (e.g. if field is missing, strictly deny to be safe)
        return res.status(403).json({
            success: false,
            message: "Forbidden: Invalid or missing subscription type."
        });

    } catch (error) {
        console.error("Institution Auth Middleware Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error during authorization."
        });
    }
};
