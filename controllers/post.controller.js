import sharp from "sharp";
import { Post } from "../models/post.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import cloudinary from "../utils/cloudinary.js";
import { getReciverId, io } from "../socket/socket.js";

export const addPost = async (req, res) => {
    try {
        const { caption } = req.body;
        const authorId = req.id;
        const image = req.file;

        if (!image) return res.status(400).json({ message: "Image is required", success: false });

        const buffer = await sharp(image.buffer).resize({ width: 800, height: 800, fit: 'inside' }).toFormat('jpeg', { quality: 80 }).toBuffer();
        const fileUri = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        const cloudResponse = await cloudinary.uploader.upload(fileUri, {
            folder: 'posts',
        });
        const post = await Post.create({ caption: caption, author: authorId, image: cloudResponse.secure_url });
        const user = await User.findById(authorId);
        if (user) {
            user.posts.push(post._id);
            await user.save();
        }
        await post.populate({ path: 'author', select: '-password' });
        return res.status(200).json({ message: "Post added successfully", post, success: true });


    }
    catch (error) {
        console.log(error);
    }
}

export const getAllPost = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 }).populate({ path: 'author', select: 'username profilepicture' }).populate({ path: 'comments', sort: { createdAt: -1 }, populate: { path: 'author', select: 'username profilepicture' } });

        return res.status(200).json({ posts, success: true });
    }
    catch (error) {
        console.log(error);
    }
}

export const getUserPost = async (req, res) => {
    try {
        const userId = req.id;
        const posts = await Post.find({ author: userId }).sort({ createdAt: -1 }).populate({ path: 'author', select: 'username profilepicture' }).populate({ path: 'comments', sort: { createdAt: -1 }, populate: { path: 'author', select: 'username profilepicture' } });

        return res.status(200).json({ posts, success: true });
    }
    catch (error) {
        console.log(error);
    }
}
export const likePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const likekarnewalekiId = req.id;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found", success: false });
        await post.updateOne({ $addToSet: { likes: likekarnewalekiId } });


        //socket io
        const user = await User.findById(likekarnewalekiId).select('username profilepicture');
        const postOwnerId = post.author.toString();
        if (postOwnerId !== likekarnewalekiId) {
            const notification = {
                type: 'like',
                userId: likekarnewalekiId,
                userDetails: user,
                postId: postId,
                message: `${user.username} liked your post`,
            }
            const postOwnerSocketId = getReciverId(postOwnerId);
            if (postOwnerSocketId) {
                io.to(postOwnerSocketId).emit("notification", notification);
            }
        }

        return res.status(200).json({ message: "Post liked successfully", success: true });
    }
    catch (error) {
        console.log(error);
    }
}

export const dislikePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const dislikekarnewalekiId = req.id;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found", success: false });
        await post.updateOne({ $pull: { likes: dislikekarnewalekiId } });

        //socket io for real time notification
        const user = await User.findById(dislikekarnewalekiId).select('username profilepicture');
        const postOwnerId = post.author.toString();
        if (postOwnerId !== dislikekarnewalekiId) {
            const notification = {
                type: 'dislike',
                userId: dislikekarnewalekiId,
                userDetails: user,
                postId: postId,
                message: `${user.username} disliked your post`,
            }
            const postOwnerSocketId = getReciverId(postOwnerId);
            if (postOwnerSocketId) {
                io.to(postOwnerSocketId).emit("notification", notification);
            }
        }
        return res.status(200).json({ message: "Post disliked successfully", success: true });
    }
    catch (error) {
        console.log(error);
    }
}

export const addComment = async (req, res) => {
    try {
        const postId = req.params.id;
        const msg = req.body.comment;
        const commentkarnewalekiId = req.id;
        const post = await Post.findById(postId);
        if (!msg) return res.status(400).json({ message: "Comment is required", success: false });
        if (!post) return res.status(404).json({ message: "Post not found", success: false });
        const comment = await Comment.create({ author: commentkarnewalekiId, post: postId, text: msg })
        await comment.populate({ path: 'author', select: 'username profilepicture' });
        post.comments.push(comment._id);
        await post.save();
        return res.status(200).json({ message: "Comment added successfully", comment, success: true });
    }
    catch (error) {
        console.log(error);
    }
}

export const getCommentsOfPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const comments = await Comment.find({ post: postId }).populate({ path: 'author', select: 'username profilepicture' });
        if (!comments) {
            return res.status(404).json({ message: "No comments found", success: false });
        }
        return res.status(200).json({ comments, success: true });
    }
    catch (error) {
        console.log(error);
    }
}

export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found", success: false });
        if (post.author.toString() !== authorId) return res.status(401).json({ message: "You are not authorized to delete this post", success: false });
        await Post.findByIdAndDelete(postId);
        const user = await User.findById(authorId);

        user.posts = user.posts.filter((id) => id.toString() !== postId);
        await user.save();
        await Comment.deleteMany({ post: postId });
        return res.status(200).json({ message: "Post deleted successfully", success: true });
    }
    catch (error) {
        console.log(error);
    }
}


export const bookmarkPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found", success: false });


        const user = await User.findById(authorId);
        if (!user) return res.status(404).json({ message: "User not found", success: false });
        if (user.bookmarks.includes(postId)) {
            await user.updateOne({ $pull: { bookmarks: postId } });
            const updatedUser = await User.findById(authorId);
            return res.status(200).json({
                message: "Post unbookmarked successfully",
                success: true,
                bookmarks: updatedUser.bookmarks, 
            });
        } else {
            await user.updateOne({ $addToSet: { bookmarks: postId } });
            const updatedUser = await User.findById(authorId);
            return res.status(200).json({
                message: "Post bookmarked successfully",
                success: true,
                bookmarks: updatedUser.bookmarks, 
            });
        }
    } catch (error) {
        console.log(error);
    }
}