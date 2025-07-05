import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    caption: {
        type: String,
        default: "",
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        
    }],
    image: {
        type: String,
        required: true,
    },
    likes:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }]

}, {
    timestamps: true,
});

export const Post = mongoose.model("Post", postSchema);