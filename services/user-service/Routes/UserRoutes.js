const express = require("express");
const {
  CreateUser,
  LoginUser,
  VerifyUser,
  ViewProfile,
  LogoutUser,
  SocialLogin,
  FindUser,
  ResetPassword,
  UpdatePassword,
  ForgetPassword,
  uploadAvatar,
  verifyBackupCode,
} = require("../Controllers/UserController");
const Auth = require("../Middlewares/Auth");
const { verifyOtp } = require("../Controllers/OtpController");
const { loginLimiter } = require("../Middlewares/loginLimiter");
const upload = require("../Middlewares/multer");
const { getActivityLogsByUser } = require("../Controllers/ActivityController");
const generateBackupCodes = require("../Utils/generateBackupCodes");
const route = new express.Router();

/* POST */
route.post("/user/new", CreateUser);
route.post("/user/login", LoginUser);
route.post("/user/logout", Auth, LogoutUser);
route.post("/user/:user/verify/:token", VerifyUser);
route.post("/user/verify-otp", verifyOtp);
route.post("/social-login", SocialLogin);
route.post("/user/forget", ForgetPassword);
route.post("/user/security/backup-codes", Auth, generateBackupCodes);
route.post("/security/verify-backup", Auth, verifyBackupCode);

route.post("/user/upload-avatar", Auth, uploadAvatar);

/* PATCH */
route.patch("/user/reset", Auth, UpdatePassword);
route.patch("/user/:id/reset/:token", ResetPassword);

/* GET */
route.get("/user/profile", Auth, ViewProfile);
route.get("/user/find/:id", FindUser);
route.get("/user/activity/:id", getActivityLogsByUser);

module.exports = route;
