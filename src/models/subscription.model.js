import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    subscriber:{
        type: mongoose.Schema.Types.ObjectId, // One who is subscribing
        ref: "User",
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId, // The channel being subscribed to
        ref: "User",
    },
}, { timestamps: true });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);