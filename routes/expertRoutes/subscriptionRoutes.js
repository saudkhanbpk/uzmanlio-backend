import express from "express";
import { v4 as uuidv4 } from "uuid";
import User from "../../models/expertInformation.js";
import mongoose from "mongoose";

const router = express.Router();

const findUserById = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID');
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};


router.post("/:userId/new-subscription", async (req, res) => {
    try {
        console.log("Adding the Payment Information and Creating New Subscription");
        const { userId } = req.params;
        const { cardHolderName, cardNumber, cardCvv, cardExpiry, currentPlan, subscriptionDuration, price, billingPeriod, subscriptionType } = req.body;
        console.log("Data Received For Card", req.body)
        
        const user = await findUserById(userId); // Add await here
        
        // Initialize cards array if it doesn't exist
        if (!user.cards) {
            user.cards = [];
        }

        const existingCard = user.cards.find(
            (card) => card.cardNumber === cardNumber
        );
        
        if (!existingCard) {
            user.cards.push({
                id: uuidv4(),
                cardHolderName,
                cardNumber,
                cardCvv,
                cardExpiry
            });
            console.log("Card Added Successfully");
        } else {
            console.log("Card Already Exists, Skipping to Next Process");
        }

        const now = new Date();
        user.subscription = {
            id: uuidv4(),
            Plantype: currentPlan,
            Price: price,
            Duration: billingPeriod,
            startDate: Date.now(),
            endDate: billingPeriod === "monthly" 
                ? new Date(now.setMonth(now.getMonth() + 1))
                : new Date(now.setFullYear(now.getFullYear() + 1))
        };

        await user.save();
        const updatedUser = await findUserById(userId);
        console.log("New Subscription Added Successfully");
        
        res.status(200).json({
            message: "Subscription Added Successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Subscription Error:", error);
        res.status(500).json({
            message: "Error Adding New Subscription",
            error: error.message
        });
    }
});

export default router;