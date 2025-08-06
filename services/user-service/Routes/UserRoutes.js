const express = require('express');
const { CreateUser, LoginUser, VerifyUser, ViewProfile, LogoutUser, SocialLogin, FindUser, ResetPassword, UpdatePassword, ForgetPassword } = require('../Controllers/UserController');
const Auth = require("../Middlewares/Auth");
const { verifyOtp, sendOtpToEmail } = require('../Controllers/OtpController');
const route = new express.Router();

/* POST */
route.post("/user/new",CreateUser);
route.post("/user/login",LoginUser);
route.post("/user/logout",Auth,LogoutUser);
route.post("/user/:user/verify/:token",VerifyUser);
route.post("/user/verify-otp", verifyOtp);
route.post("/social-login",SocialLogin);
route.post("/user/forget",ForgetPassword);

/* PATCH */
route.patch("/user/reset",Auth,UpdatePassword);
route.patch("/user/:id/reset/:token",ResetPassword);

/* GET */
route.get("/user/profile",Auth,ViewProfile);
route.get("/user/find/:id",FindUser);

module.exports = route;