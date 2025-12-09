import User from "../models/expertInformation.js";
import Institution from "../models/institution.js";

/**
 * Middleware to check institution access and inject user context
 * Determines if user is admin, sub-user, or individual
 * Handles institution view vs individual view mode
 */
export const checkInstitutionAccess = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const clientContextRaw = req.headers['user-context'];
        let clientContext = {};

        if (clientContextRaw) {
            clientContext = JSON.parse(clientContextRaw);
        }

        console.log("Client Context from frontend:", clientContext);

        // Find the user
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        console.log("Request Context:", clientContext)

        // Determine access context
        clientContext = {
            userId: user._id,
            isAdmin: clientContext.isAdmin || false,
            isSubUser: !clientContext.isAdmin || false,
            // parentUserId: user.parentUserId,
            // institutionId: user.subscription?.institutionId,
            canAccessInstitutionView: clientContext.isAdmin || false,
            // subUsers: user.subUsers || []
        };

        // If requesting institution view but not admin, deny
        if (!clientContext.isAdmin) {
            return res.status(403).json({
                error: 'Only institution admins can access institution view'
            });
        }

        next();
    } catch (error) {
        console.error('Error in checkInstitutionAccess middleware:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Middleware to check if user can modify a specific resource
 * Admins can only modify their own resources, not sub-user resources
 */
export const checkResourceOwnership = (resourceType = 'resource') => {
    return async (req, res, next) => {
        try {
            const { userContext } = req;

            if (!userContext) {
                return res.status(500).json({
                    error: 'User context not found. Ensure checkInstitutionAccess middleware runs first.'
                });
            }

            // Resource ownership will be checked in the route handler
            // This middleware just ensures context exists
            req.canModifyResource = (resourceExpertId) => {
                // Own resource - always allow
                if (resourceExpertId.toString() === userContext.userId.toString()) {
                    return true;
                }

                // Admin accessing sub-user resource
                if (userContext.isAdmin && userContext.institutionId) {
                    // List of modules where admin has full control over sub-users
                    const fullControlModules = ['events', 'customers', 'payments', 'calendar'];

                    // If current resource type is in full control list, allow admin
                    if (fullControlModules.includes(resourceType)) {
                        return true;
                    }
                }

                return false;
            };

            next();
        } catch (error) {
            console.error('Error in checkResourceOwnership middleware:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
};

/**
 * Get all user IDs for institution view (admin + all sub-users)
 */
export const getInstitutionUserIds = async (userId) => {
    try {
        const user = await User.findById(userId);

        if (!user || !user.subscription?.isAdmin) {
            return [userId]; // Return only own ID if not admin
        }

        const institutionId = user.subscription.institutionId;

        if (!institutionId) {
            return [userId]; // No institution, return only own ID
        }

        const institution = await Institution.findById(institutionId);

        if (!institution) {
            return [userId];
        }

        // Return admin ID + all sub-user IDs
        return [user._id, ...(institution.users || [])];
    } catch (error) {
        console.error('Error getting institution user IDs:', error);
        return [userId]; // Fallback to own ID on error
    }
};

export default {
    checkInstitutionAccess,
    checkResourceOwnership,
    getInstitutionUserIds
};
