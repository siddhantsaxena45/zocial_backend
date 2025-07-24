
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required", success: false })

        }
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists", success: false })
        }
        let user2 = await User.findOne({ username });
        if (user2) {
            return res.status(400).json({ message: "Username already exists", success: false })
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = await User.create({
            username,
            email,
            password: hashedPassword,
        });
        return res.status(200).json({ message: "User created successfully", success: true })
    }
    catch (error) {
        console.log(error);
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required", success: false })
        }
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User does not exist", success: false })
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials", success: false })
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
        const populatedPost = await Promise.all(user.posts.map(async (postId) => {
            const post = await Post.findById(postId);
            if (post.author.equals(user._id)) {
                return post
            }
            return null;

        }));
        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilepicture: user.profilepicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: populatedPost,
            bookmarks: user.bookmarks
        }
        return res.cookie("token", token, { httpOnly: true, sameSite: "none", secure: true, maxAge:  30 * 24 * 60* 60 * 1000 }).status(200).json({ message: `${user.username} logged in successfully`, success: true, user });


    }
    catch (error) {
        console.log(error);
    }

}

export const logout = async (req, res) => {
    try {
        return res.cookie("token", "", { maxAge: 0 }).json({ message: "User logged out successfully", success: true });
    }
    catch (error) {
        console.log(error);
    }
}

export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        let user = await User.findById(userId).populate({ path: "posts", sort: { createdAt: -1 } }).populate({ path: "bookmarks", sort: { createdAt: -1 } });
        return res.status(200).json({ user, success: true });
    }
    catch (error) {
        console.log(error);
    }
}

export const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { bio, gender } = req.body;
        const profilePicture = req.file;

        let cloudResponse;
        if (profilePicture) {
            const fileuri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileuri, {
                folder: 'profile_pictures',
            });
        }
        const user = await User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }
        if (bio) user.bio = bio;
        if (gender) user.gender = gender;
        if (profilePicture) user.profilepicture = cloudResponse.secure_url;
        await user.save();
        return res.status(200).json({ message: "Profile updated successfully", success: true, user });
    }
    catch (error) {
        console.log(error);
    }
}

export const getSuggestedUsers = async (req, res) => {
    try {
        const suggestedUsers = await User.find({ _id: { $ne: req.id } }).select("-password");
        if (!suggestedUsers) {
            return res.status(404).json({ message: "No users found", success: false });
        }
        return res.status(200).json({ users: suggestedUsers, success: true });
    }
    catch (error) {
        console.log(error);
    }
}
export const followOrUnfollow = async (req, res) => {
    try {
        const followkarnewala = req.id;
        const jiskofollowkarrhe = req.params.id;

        if (followkarnewala == jiskofollowkarrhe) {
            return res.status(400).json({ message: "You cannot follow yourself", success: false });
        }
        let user = await User.findById(followkarnewala);
        let targetUser = await User.findById(jiskofollowkarrhe);
        if (!user || !targetUser) {
            return res.status(404).json({ message: "User not found", success: false });
        }
        let isFollowing = user.following.includes(jiskofollowkarrhe);
        if (isFollowing) {
            //unfollow
            await Promise.all([
                User.updateOne({ _id: followkarnewala }, { $pull: { following: jiskofollowkarrhe } }),
                User.updateOne({ _id: jiskofollowkarrhe }, { $pull: { followers: followkarnewala } })
            ])
            return res.status(200).json({ message: "User unfollowed successfully", success: true });
        }
        else {
            //follow
            await Promise.all([
                User.updateOne({ _id: followkarnewala }, { $push: { following: jiskofollowkarrhe } }),
                User.updateOne({ _id: jiskofollowkarrhe }, { $push: { followers: followkarnewala } })
            ])
            return res.status(200).json({ message: "User followed successfully", success: true });
        }


    }
    catch (error) {
        console.log(error);
    }
}

import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
    try {
        const { token } = req.body;

        // 1. Verify token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const { email, name, picture } = ticket.getPayload();

        // 2. Find or create user
        let user = await User.findOne({ email });
        if (!user) {
            user = await User.create({
                username: name,
                email,
                profilepicture: picture,
                password: "GOOGLE_AUTH",
            });
        }
        const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
            expiresIn: "1d",
        });

        const populatedPost = await Promise.all(user.posts.map(async (postId) => {
            const post = await Post.findById(postId);
            return post?.author.equals(user._id) ? post : null;
        }));

        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilepicture: user.profilepicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: populatedPost,
            bookmarks: user.bookmarks,
        };

        // 4. Send cookie
        res.cookie("token", jwtToken, {
            httpOnly: true,
            sameSite: "none",  // Required for cross-site cookie sharing
            secure: true,      // Required for HTTPS
            maxAge: 30 * 24 * 60* 60 * 1000, // 30 days
        })
            .status(200)
            .json({
                message: `${user.username} logged in with Google`,
                success: true,
                user,
            });
    } catch (error) {
        console.error("Google login error:", error);
        res.status(401).json({ message: "Google login failed", success: false });
    }
};
