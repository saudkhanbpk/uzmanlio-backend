import mongoose from "mongoose";

const Schema = mongoose.Schema;

const institutionSchema = new Schema({
    Admin: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    logo: { type: String },
    officialAxe: { type: String },
    about: { type: String },
    bio: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    users: [{ type: Schema.Types.ObjectId, ref: "User" }],
    invitedUsers: [{
        name: { type: String },
        email: { type: String },
        status: { type: String, enum: ['Invitations Sent', 'On Hold'], default: 'pending' },
        invitedAt: { type: Date, default: Date.now },
    }],
})
const Institution = mongoose.model("Institution", institutionSchema);
export default Institution;