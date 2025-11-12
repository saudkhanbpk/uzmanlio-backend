import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import User from "../../models/expertInformation.js";

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
    const refreshToken =  user.generateRefreshToken(userId);

    return { accessToken, refreshToken };
};




////////////////////////   Sign Up New User    //////////////////////////
router.post("/signup", async (req, res) => {
    console.log("Signing Up User",req.body)
    const userData = req.body
      if (!userData.information.email || !userData.password) {
      throw new ApiError(400, "Please provide email and password");
  }
    try {
        const existingUser = await User.findOne({ email: userData.information.email });

        if (existingUser) {
            return res.status(200).json({ message: "user Already available", })
        }

        //Here , Process the payment, and then Save the user
        const now = new Date();


        const newuser = await User.create({
                information : {
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
            cards : {
                cardNumber: userData.subscription.cardNumber,
                cardHolderName: userData.subscription.cardHolderName,
                cardExpiry: userData.subscription.expiry,
                cardCvv: userData.subscription.cvv,
            },
            subscription : {
                seats: userData.subscription.seats,
                isAdmin: true,
                plantype: userData.subscription.plantype,
                price:userData.price,
                duration: userData.subscription.duration,
                startDate: Date.now(),
                endDate: userData.subscription.duration === "monthly"
                    ? new Date(now.setMonth(now.getMonth() + 1))
                    : new Date(now.setFullYear(now.getFullYear() + 1))
            },
            username:userData.information.email.split("@")[0],
        })

await newuser.save({ validateBeforeSave: false });
//Create the institution Here as well.
        return res.status(200).json({
            message: "User Created Successfully"
        })

    } catch (error) {
        return res.status(500).json({ message: `Server Error : ${error}` })
    }
});


router.post("/login", async (req, res) => {
    try {
        const useremail = req.body.email;
        const userPassword = req.body.password;
        if (!useremail || !userPassword) throw new ApiError(400, "Please provide email and password");


        const existingUser = await User.findOne({ "information.email": useremail });
        if (!existingUser) {
            return res.status(400).json({
                message: "User Email is incorrect"
            })
        }
        const isPasswordCorrect = await existingUser.ComparePassword(userPassword);

        if (!isPasswordCorrect) {
            return res.status(400).json({
                message: "Password is Incorrect"
            })
        }

        const { accessToken, refreshToken } = await generateTokens(existingUser._id);
        existingUser.refreshToken = refreshToken;
        await existingUser.save({ validateBeforeSave: false });

        const userWithoutPassword = await User.findById(existingUser._id).select("-password");

          return res
           .status(200).json({ 
            user: userWithoutPassword,
            accessToken,
            refreshToken
            }, "User logged in successfully");

    } catch (error) {
        return res.status(500).json({
            message: `Login Failed : ${error}`,
        })
    }
})

export default router;
