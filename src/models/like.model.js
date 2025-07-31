import mongoose , {Schema} from "mongoose";

const likeSchema = new Schema({
    video: {
        type: Schema.Types.ObjectId, // The video that is liked
        ref: "Video",
    },
    comment: {
        type: Schema.Types.ObjectId, // The comment that is liked (optional)
        ref: "Comment"
    },
    tweet: {
        type: Schema.Types.ObjectId, // The tweet that is liked (optional)
        ref: "Tweet"
    },
    likedBy: {
        type: Schema.Types.ObjectId, // The user who liked the video/comment/tweet
        ref: "User",
    },
}, { timestamps: true });

export const Like = mongoose.model("Like", likeSchema);