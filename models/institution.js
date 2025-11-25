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
        teamName: { type: String },
        permissions: [{
            type: String,
            enum: ['appointments', 'customers', 'reports', 'services', 'packages', 'calendar', 'emails']
        }],
        invitationToken: { type: String },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined', 'expired', 'Invitations Sent', 'On Hold'],
            default: 'pending'
        },
        expiresAt: { type: Date },
        invitedAt: { type: Date, default: Date.now },
        acceptedAt: { type: Date },
        declinedAt: { type: Date },
        acceptedByUserId: { type: Schema.Types.ObjectId, ref: "User" }
    }],
})
const Institution = mongoose.model("Institution", institutionSchema);
export default Institution;