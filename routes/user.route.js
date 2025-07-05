import express from "express";
import {getProfile, editProfile, logout, register, login, getSuggestedUsers,followOrUnfollow, googleLogin } from "../controllers/user.controller.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import upload from "../middlewares/multer.js";
const router = express.Router();

router.route('/register').post(register);
router.route('/login').post(login);
router.route('/google-login').post(googleLogin);
router.route('/logout').get(isAuthenticated, logout);
router.route('/:id/profile').get(isAuthenticated, getProfile);
router.route('/profile/edit').post(isAuthenticated, upload.single("profilephoto"),editProfile);
router.route('/suggested').get(isAuthenticated, getSuggestedUsers);
router.route('/followorunfollow/:id').post(isAuthenticated, followOrUnfollow);

export default router;