import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../../models/expertInformation.js";
import Order from "../../models/orders.js";
import Event from "../../models/event.js";
import { sendEmail } from "../../services/email.js";
import { getWelcomeEmailTemplate, getForgotPasswordOTPTemplate, getPasswordResetSuccessTemplate, getEmailVerificationTemplate } from "../../services/emailTemplates.js";
import { validateBody, validateParams } from "../../middlewares/validateRequest.js";
import {
    signupSchema,
    loginSchema,
    forgotPasswordSchema,
    verifyOtpSchema,
    resetPasswordSchema,
    verifyEmailSchema,
    resendVerificationSchema,
    refreshTokenSchema,
    logoutSchema,
    userIdParamsSchema,
} from "../../validations/auth.schema.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'uzmanlio-default-access-secret-123';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'uzmanlio-default-refresh-secret-123';

const router = express.Router();

// Helper function to find user by ID
const findUserById = async (userId) => {
    let user;

    // Try to find by MongoDB ObjectId first
    if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId);
    }

    // If not found or invalid ObjectId, try to find by custom ID field
    if (!user) {
        user = await User.findOne({
            $or: [
                { _id: userId },
                { id: userId },
                { userId: userId },
                { customId: userId }
            ]
        });
    }

    if (!user) {
        throw new Error('User not found');
    }
    return user;
};

export const generateTokens = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const accessToken = user.generateAccessToken(userId);
    const refreshToken = user.generateRefreshToken(userId);

    return { accessToken, refreshToken };
};

// Helper function to generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};



////////////////////////   Sign Up New User    //////////////////////////
router.post("/signup", validateBody(signupSchema), async (req, res) => {
    console.log("Signing Up User", req.body)
    const userData = req.body
    try {
        const existingUser = await User.findOne({ "information.email": userData.information.email });

        if (existingUser) {
            return res.status(200).json({ message: "user Already available", })
        }

        //Here , Process the payment, and then Save the user
        const now = new Date();


        const newuser = await User.create({
            information: {
                name: userData.information.name,
                surname: userData.information.surname,
                birthday: userData.information.birthday,
                country: userData.information.country,
                city: userData.information.city, // Added
                district: userData.information.city,
                address: userData.information.city,
                email: userData.information.email,
                //Save the Hashed Password Here
                password: userData.password,
                phone: userData.information.phone,
                about: userData.information.about,
                phoneCode: userData.information.phoneCode,
                gender: userData.information.gender,
            },
            subscription: {
                seats: userData.subscription.seats,
                isAdmin: true,
                plantype: userData.subscription.plantype,
                price: userData.price,
                duration: userData.subscription.duration,
                startDate: Date.now(),
                endDate: userData.subscription.duration === "monthly"
                    ? new Date(now.setMonth(now.getMonth() + 1))
                    : new Date(now.setFullYear(now.getFullYear() + 1))
            },
            username: userData.information.email.split("@")[0],
        })

        await newuser.save({ validateBeforeSave: false });

        // Send welcome email
        try {
            const welcomeEmailTemplate = getWelcomeEmailTemplate({
                name: userData.information.name,
                email: userData.information.email
            });

            await sendEmail(userData.information.email, welcomeEmailTemplate);
            console.log("✅ Welcome email sent to:", userData.information.email);
        } catch (emailError) {
            console.error("❌ Failed to send welcome email:", emailError);
            // Don't fail signup if email fails
        }

        //Create the institution Here as well.
        return res.status(200).json({
            message: "User Created Successfully"
        })

    } catch (error) {
        return res.status(500).json({ message: `Server Error : ${error}` })
    }
});


router.post("/login", validateBody(loginSchema), async (req, res) => {
    try {
        const useremail = req.body.email;
        const userPassword = req.body.password;

        // Note: Input validation is now handled by Joi middleware

        // Optimized: Only fetch essential fields for password check first
        const existingUser = await User.findOne({ "information.email": useremail });
        if (!existingUser) {
            return res.status(400).json({
                message: "User Email is incorrect"
            })
        }

        // Check if user has a password set
        if (!existingUser.information.password) {
            console.error("❌ User has no password set:", {
                email: useremail,
                userId: existingUser._id
            });
            return res.status(400).json({
                message: "Account setup incomplete. Please contact support or reset your password."
            });
        }

        const isPasswordCorrect = await existingUser.ComparePassword(userPassword);

        if (!isPasswordCorrect) {
            return res.status(400).json({
                message: "Password is Incorrect"
            })
        }

        // Check subscription status
        const now = new Date();
        let subscriptionExpired = false;
        let subscriptionEndDate = null;

        if (existingUser.subscription && existingUser.subscription.endDate) {
            subscriptionEndDate = existingUser.subscription.endDate;
            subscriptionExpired = new Date(subscriptionEndDate) < now;
        } else {
            // If no subscription data exists, consider it expired
            subscriptionExpired = true;
        }

        const { accessToken, refreshToken } = await generateTokens(existingUser._id);

        // Optimized: Update refresh token
        await User.findByIdAndUpdate(
            existingUser._id,
            { refreshToken },
            { new: true }
        );

        // Fetch complete user profile with populated fields
        const user = await User.findById(existingUser._id)
            .populate([
                {
                    path: "customers.customerId",
                    model: "Customer"
                },
                {
                    path: "services",
                    model: "Service"
                },
                {
                    path: "packages",
                    model: "Package"
                }
            ])
            .select("-information.password"); // Exclude password

        if (!user) {
            return res.status(404).json({ error: "User not found after login" });
        }

        // Get all customer IDs from the user's customers array
        const customerIds = user.customers
            .map(c => c.customerId?._id || c.customerId)
            .filter(id => id);

        // Find all orders for these customers
        const orders = await Order.find({
            customerId: { $in: customerIds }
        }).lean();
        console.log("Customer IDS for package details:", customerIds);

        // Filter orders to get only active package orders
        const customersPackageDetails = [];

        for (const order of orders) {
            // Check each event in the order
            if (order.orderDetails?.events) {
                for (const event of order.orderDetails.events) {
                    // Check if it's a package event with remaining sessions
                    if (
                        event.eventType === 'package' &&
                        event.package &&
                        event.package.sessions > (event.package.completedSessions || 0)
                    ) {
                        customersPackageDetails.push(order);
                    }
                }
            }
        }

        // Return user object with customersPackageDetails
        const userObject = user.toObject();
        userObject.customersPackageDetails = customersPackageDetails;

        // Fetch events from the Event collection (since events are now a separate model)
        const userEvents = await Event.find({ expertId: existingUser._id }).lean();
        userObject.events = userEvents;

        return res.status(200).json({
            user: userObject,
            accessToken,
            refreshToken,
            subscriptionExpired,
            subscriptionEndDate,
            subscriptionValid: !subscriptionExpired
        });

    } catch (error) {
        return res.status(500).json({
            message: `Login Failed : ${error}`,
        })
    }
})


////////////////////////   Forgot Password - Send OTP    //////////////////////////
router.post("/forgot-password", validateBody(forgotPasswordSchema), async (req, res) => {
    try {
        const { email } = req.body;
        // Note: Validation handled by Joi middleware

        // Find user by email
        const user = await User.findOne({ "information.email": email });

        if (!user) {
            // Don't reveal if user exists or not for security
            return res.status(200).json({
                success: true,
                message: "If an account exists with this email, you will receive a password reset code."
            });
        }

        // Generate 6-digit OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Hash OTP before storing
        const hashedOTP = await bcrypt.hash(otp, 10);

        // Save OTP and expiry to user
        user.resetPasswordOTP = hashedOTP;
        user.resetPasswordExpiry = otpExpiry;
        await user.save({ validateBeforeSave: false });

        // Send OTP email
        try {
            const otpEmailTemplate = getForgotPasswordOTPTemplate({
                name: user.information.name,
                otp: otp,
                expiryMinutes: 15
            });

            await sendEmail(email, otpEmailTemplate);
            console.log("✅ OTP email sent to:", email);
        } catch (emailError) {
            console.error("❌ Failed to send OTP email:", emailError);
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP email. Please try again."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Password reset code sent to your email"
        });

    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    }
});


////////////////////////   Verify OTP    //////////////////////////
router.post("/verify-otp", validateBody(verifyOtpSchema), async (req, res) => {
    try {
        const { email, otp } = req.body;
        // Note: Validation handled by Joi middleware

        // Find user
        const user = await User.findOne({ "information.email": email });

        if (!user || !user.resetPasswordOTP || !user.resetPasswordExpiry) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }

        // Check if OTP is expired
        if (new Date() > user.resetPasswordExpiry) {
            // Clear expired OTP
            user.resetPasswordOTP = undefined;
            user.resetPasswordExpiry = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one."
            });
        }

        // Verify OTP
        const isOTPValid = await bcrypt.compare(otp, user.resetPasswordOTP);

        if (!isOTPValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        return res.status(200).json({
            success: true,
            message: "OTP verified successfully"
        });

    } catch (error) {
        console.error("Verify OTP error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    }
});


////////////////////////   Reset Password    //////////////////////////
router.post("/reset-password", validateBody(resetPasswordSchema), async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        // Note: Validation handled by Joi middleware

        // Find user
        const user = await User.findOne({ "information.email": email });

        if (!user || !user.resetPasswordOTP || !user.resetPasswordExpiry) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }

        // Check if OTP is expired
        if (new Date() > user.resetPasswordExpiry) {
            user.resetPasswordOTP = undefined;
            user.resetPasswordExpiry = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one."
            });
        }

        // Verify OTP one more time
        const isOTPValid = await bcrypt.compare(otp, user.resetPasswordOTP);

        if (!isOTPValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        // Update password (will be hashed by pre-save hook)
        user.information.password = newPassword;
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpiry = undefined;
        await user.save();

        // Send success email
        try {
            const successEmailTemplate = getPasswordResetSuccessTemplate({
                name: user.information.name,
                email: email,
                resetTime: new Date().toLocaleString('tr-TR')
            });

            await sendEmail(email, successEmailTemplate);
            console.log("✅ Password reset success email sent to:", email);
        } catch (emailError) {
            console.error("❌ Failed to send success email:", emailError);
            // Don't fail the password reset if email fails
        }

        return res.status(200).json({
            success: true,
            message: "Password reset successful. You can now login with your new password."
        });

    } catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    }
});


////////////////////////   Verify Email    //////////////////////////
router.post("/verify-email", validateBody(verifyEmailSchema), async (req, res) => {
    try {
        const { token } = req.body;
        // Note: Validation handled by Joi middleware

        // Find user with this token
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired verification token"
            });
        }

        // Verify user
        user.is_mail_valid = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpiry = undefined;
        await user.save({ validateBeforeSave: false });

        // Populate user for consistency with login/profile responses
        const populatedUser = await User.findById(user._id)
            .populate([
                {
                    path: "customers.customerId",
                    model: "Customer"
                },
                {
                    path: "services",
                    model: "Service"
                },
                {
                    path: "packages",
                    model: "Package"
                }
            ])
            .select("-information.password");

        return res.status(200).json({
            user: populatedUser,
            success: true,
            message: "Email verified successfully"
        });

    } catch (error) {
        console.error("Verify email error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    }
});

////////////////////////   Resend Verification Email    //////////////////////////
router.post("/resend-verification", validateBody(resendVerificationSchema), async (req, res) => {
    try {
        const { email } = req.body;
        // Note: Validation handled by Joi middleware

        const user = await User.findOne({ "information.email": email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.is_mail_valid) {
            return res.status(400).json({
                success: false,
                message: "Email is already verified"
            });
        }

        // Generate new token
        user.emailVerificationToken = uuidv4();
        user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await user.save({ validateBeforeSave: false });

        // Send verification email
        try {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const verificationUrl = `${frontendUrl}/verify-email?token=${user.emailVerificationToken}`;

            const verificationEmailTemplate = getEmailVerificationTemplate({
                name: user.information.name,
                email: user.information.email,
                verificationUrl: verificationUrl
            });

            await sendEmail(user.information.email, verificationEmailTemplate);
            console.log("✅ Verification email resent to:", user.information.email);

            return res.status(200).json({
                success: true,
                message: "Verification email sent successfully"
            });
        } catch (emailError) {
            console.error("❌ Failed to resend verification email:", emailError);
            return res.status(500).json({
                success: false,
                message: "Failed to send verification email"
            });
        }

    } catch (error) {
        console.error("Resend verification error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    }
});


////////////////////////   Delete User/Expert    //////////////////////////
router.delete("/:userId", validateParams(userIdParamsSchema), async (req, res) => {
    try {
        const { userId } = req.params;
        // Note: Validation handled by Joi middleware

        // Find and delete the user
        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        console.log("✅ User deleted successfully:", userId);

        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
            deletedUser: {
                id: deletedUser._id,
                name: deletedUser.information.name,
                email: deletedUser.information.email
            }
        });

    } catch (error) {
        console.error("Delete user error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error. Please try again later."
        });
    }
});


////////////////////////   Refresh Token    //////////////////////////
////////////////////////   Refresh Token    //////////////////////////
router.post("/refresh-token", validateBody(refreshTokenSchema), async (req, res) => {
    try {
        const { refreshToken } = req.body;

        // DEBUG LOGS
        console.log("🔄 Refresh Token Request Initiated");
        console.log("  - Secret exists:", !!REFRESH_TOKEN_SECRET);
        console.log("  - Secret length:", REFRESH_TOKEN_SECRET ? REFRESH_TOKEN_SECRET.length : 0);
        // Note: Validation handled by Joi middleware

        // Verify refresh token
        let decoded;
        try {
            console.log("  - Attempting verification with secret length:", REFRESH_TOKEN_SECRET.length);
            decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
            console.log("  ✅ Token signature verified. User ID:", decoded.id);
        } catch (error) {
            console.log("  ❌ Token verification failed:", error.message);
            // Optional: try to decode without verification to see what's inside
            const unverified = jwt.decode(refreshToken);
            console.log("  - Unverified payload:", unverified);

            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token",
                code: "INVALID_REFRESH_TOKEN",
                debug: error.message,
                tokenType: error.name
            });
        }

        // Find user and verify stored refresh token matches
        const user = await User.findById(decoded.id);

        if (!user) {
            console.log("  ❌ User not found in DB:", decoded.id);
            return res.status(401).json({
                success: false,
                message: "User not found",
                code: "USER_NOT_FOUND"
            });
        }

        // Compare with stored token
        if (user.refreshToken !== refreshToken) {
            console.log("  ❌ Token mismatch!");
            console.log("  - Incoming:", refreshToken.substring(0, 15) + "...");
            console.log("  - Stored:  ", user.refreshToken ? user.refreshToken.substring(0, 15) + "..." : "NULL");

            return res.status(401).json({
                success: false,
                message: "Refresh token has been revoked",
                code: "TOKEN_REVOKED"
            });
        }

        console.log("  ✅ Token matches DB. Generating new pair...");

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user._id);

        // Update stored refresh token
        user.refreshToken = newRefreshToken;
        await user.save({ validateBeforeSave: false });

        console.log("  ✅ Tokens refreshed for user:", user._id);

        return res.status(200).json({
            success: true,
            accessToken,
            refreshToken: newRefreshToken,
            user: {
                _id: user._id,
                name: user.information.name,
                email: user.information.email
            }
        });

    } catch (error) {
        console.error("Refresh token error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during token refresh"
        });
    }
});


////////////////////////   Logout    //////////////////////////
router.post("/logout", validateBody(logoutSchema), async (req, res) => {
    try {
        const { userId } = req.body;

        if (userId) {
            // Clear the stored refresh token to invalidate it
            await User.findByIdAndUpdate(userId, { refreshToken: null });
            console.log("✅ User logged out:", userId);
        }

        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during logout"
        });
    }
});


export default router;

