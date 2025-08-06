const redis = require("../redis");
const CatchAsyncError = require("../Utils/CatchAsyncError");
const User = require("../Models/UserModel");
const generateOtp = require("../Utils/generateOtp");
const { SendTemplate } = require("mailglide");
const ErrorHandler = require("../Utils/ErrorHandler"); // ✅ IMPORTANT
const CreateJwtToken = require("../Utils/CreateJwtToken"); // ✅ Needed to login user

// Send OTP to Email
const sendOtpToEmail = CatchAsyncError(async (req, res, next) => {
  const email = req.body._forceEmail || req.body.email;
  if (!email) return res.status(400).json({ success: false, message: "Email is required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const otp = generateOtp();
  await redis.set(`otp:${email}`, otp, "EX", 300); // expires in 5 min

  await SendTemplate(
    process.env.MAIL_FROM,
    process.env.MAIL_PASS,
    user.email,
    'IRLHistory - Login OTP',
    './Utils/Mails',
    'otp',
    {
      name: user.name,
      otp: otp,
    },
    (err, success) => {
      if (err) {
        console.error("Error sending template email:", err);
        return res.status(500).json({ success: false, message: "Failed to send OTP email" });
      } else {
        return res.status(200).json({ success: true, message: "OTP sent to email" });
      }
    }
  );
});

// Verify OTP
const verifyOtp = CatchAsyncError(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(new ErrorHandler("Email and OTP are required", 400));
  }

  const storedOtp = await redis.get(`otp:${email}`);
  console.log(storedOtp);
  if (!storedOtp || storedOtp !== otp) {
    return next(new ErrorHandler("Invalid or expired OTP", 401));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  await redis.del(`otp:${email}`);

  // ✅ Login user now
  CreateJwtToken(user, 200, res);
});

module.exports = {
  sendOtpToEmail,
  verifyOtp
};
