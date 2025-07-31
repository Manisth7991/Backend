import mongoose , {Schema} from "mongoose";

import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema({
    content:{
        type: String,
        required: [true, "Content is required"],
    },
    video: {
        type: Schema.Types.ObjectId, // The video on which the comment is made
        ref: "Video",
    },
    owner: {
        type: Schema.Types.ObjectId, // The user who made the comment
        ref: "User",
    }
}, { timestamps: true });

commentSchema.plugin(mongooseAggregatePaginate);
export const Comment = mongoose.model("Comment", commentSchema);