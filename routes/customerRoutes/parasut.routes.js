import express from "express";
import parasutApiService from "../../services/parasutService/parasutApi.services.js";
import ApiResponse from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";

const router = express.Router();

// Get Parasut authentication status and URL
router.get("/auth/status", asyncHandler(async (req, res) => {
    const hasValidToken = parasutApiService.hasValidToken();

    if (hasValidToken) {
        return res.status(200).json(
            new ApiResponse(200, {
                authenticated: true,
                message: "Parasut is authenticated and ready"
            })
        );
    } else {
        const authUrl = parasutApiService.getAuthorizationUrl();
        return res.status(200).json(
            new ApiResponse(200, {
                authenticated: false,
                authUrl: authUrl,
                message: "Parasut authentication required",
                instructions: [
                    "1. Visit the authUrl in your browser",
                    "2. Log in to your Parasut account",
                    "3. Authorize the application",
                    "4. Copy the authorization code",
                    "5. Use POST /api/v1/parasut/auth/exchange with the code"
                ]
            })
        );
    }
}));

// Exchange authorization code for tokens
router.post("/auth/exchange", asyncHandler(async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json(
            new ApiResponse(400, null, "Authorization code is required")
        );
    }

    try {
        const tokenData = await parasutApiService.exchangeCodeForToken(code);

        return res.status(200).json(
            new ApiResponse(200, {
                success: true,
                message: "Parasut authentication successful",
                tokenPreview: tokenData.access_token.substring(0, 10) + "..."
            })
        );
    } catch (error) {
        return res.status(400).json(
            new ApiResponse(400, null, `Authentication failed: ${error.message}`)
        );
    }
}));

// Save tokens directly to database (for manual token updates)
router.post("/auth/save-tokens", asyncHandler(async (req, res) => {
    const { access_token, refresh_token, expires_in, created_at } = req.body;

    if (!access_token || !refresh_token || !expires_in) {
        return res.status(400).json(
            new ApiResponse(400, null, "access_token, refresh_token, and expires_in are required")
        );
    }

    try {
        // Calculate expiry timestamp
        const currentTime = created_at ? created_at * 1000 : Date.now();
        const expiryTimestamp = currentTime + (expires_in * 1000);

        // Store tokens in service memory
        parasutApiService.accessToken = access_token;
        parasutApiService.refreshToken = refresh_token;
        parasutApiService.tokenExpiry = expiryTimestamp;

        // Save to database
        await parasutApiService.saveTokensToDatabase();

        return res.status(200).json(
            new ApiResponse(200, {
                success: true,
                message: "Tokens saved to database successfully",
                tokenPreview: access_token.substring(0, 10) + "...",
                expiresAt: new Date(expiryTimestamp).toISOString(),
                expiresIn: `${Math.round((expiryTimestamp - Date.now()) / 1000)} seconds`
            })
        );
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, null, `Failed to save tokens: ${error.message}`)
        );
    }
}));

// Clear expired tokens
router.post("/auth/clear", asyncHandler(async (req, res) => {
    await parasutApiService.clearTokens();

    return res.status(200).json(
        new ApiResponse(200, {
            success: true,
            message: "All Parasut tokens cleared successfully"
        })
    );
}));

// Test Parasut connection
router.get("/test", asyncHandler(async (req, res) => {
    try {
        await parasutApiService.ensureValidToken();

        // Try a simple API call to test connection
        const response = await parasutApiService.makeRequest('GET', '/me');

        return res.status(200).json(
            new ApiResponse(200, {
                success: true,
                message: "Parasut connection test successful",
                companyInfo: response.data
            })
        );
    } catch (error) {
        return res.status(400).json(
            new ApiResponse(400, null, `Parasut connection test failed: ${error.message}`)
        );
    }
}));

export default router;
