const axios = require("axios");
const bcrypt = require("bcryptjs");
const User = require("../Models/UserModel");
const Verification = require("../Models/VerificationModel");
const CatchAsyncError = require("../Utils/CatchAsyncError");
const ErrorHandler = require("../Utils/ErrorHandler");
const CreateJwtToken = require("../Utils/CreateJwtToken");
const { SendTemplate } = require("mailglide");
const { sendOtpToEmail } = require("./OtpController");
const logActivity = require("../Utils/LogActivity");
const crypto = require("crypto");

/* ---------------- Create User with email & password (withou conitnue with google and discord etc..) ------------------*/
const CreateUser = CatchAsyncError(async (req, res, next) => {
  const data = req.body;
  if (Object.keys(data).length < 0) {
    return next(
      new ErrorHandler("Please enter some data to create the user", 401)
    );
  }
  const user = await User.create(data);
  await logActivity({ user, type: "register", req });
  CreateJwtToken(user, 201, res);
});

/* ---------------------------- SOCIAL_LOGIN & REGISTRATION ---------------------------------- */
const SocialLogin = CatchAsyncError(async (req, res, next) => {
  const { provider, profile, youtubeUrl } = req.body;

  // console.log("this is the social login");

  if (!provider || !profile?.id) {
    throw new ErrorHandler("Missing provider or profile ID", 400);
  }

  // Prepare search query based on provider ID
  let query = {};
  if (provider === "google") query = { "oauth.google.id": profile.id };
  else if (provider === "discord") query = { "oauth.discord.id": profile.id };
  else throw new ErrorHandler("Unsupported provider", 400);

  // Try to find user by oauth ID
  let user = await User.findOne(query);

  const email = profile.emails?.[0]?.value;
  if (!email) throw new ErrorHandler("Email is required from profile", 400);

  if (!user) {
    const existingEmailUser = await User.findOne({ email });

    if (existingEmailUser) {
      // Auto-link this provider to existing user
      if (provider === "google" && !existingEmailUser.oauth?.google) {
        existingEmailUser.oauth.google = {
          id: profile.id,
          profileUrl: profile._json?.picture || "",
        };

        // Add Google/Youtube social link
        existingEmailUser.socialLinks.youtube = `https://www.youtube.com/@${
          email.split("@")[0]
        }`;
      } else if (provider === "discord" && !existingEmailUser.oauth?.discord) {
        existingEmailUser.oauth.discord = {
          id: profile.id,
          username: profile.username,
          discriminator: profile.discriminator,
          profileUrl: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : "",
        };

        // Add Discord social link
        existingEmailUser.socialLinks.discord = `https://discord.com/users/${profile.id}`;
      }

      await existingEmailUser.save();
      user = existingEmailUser;
    } else {
      // Create new user if not found by ID or email
      const uname = await generateUniqueUname(email.split("@")[0]);

      const newUserData = {
        name: profile.displayName || profile.username,
        email,
        uname,
        avatar: profile.photos?.[0]?.value || "",
        verified: true,
        oauth: {
          google:
            provider === "google"
              ? {
                  id: profile.id,
                  profileUrl: profile._json?.picture || "",
                }
              : undefined,
          discord:
            provider === "discord"
              ? {
                  id: profile.id,
                  username: profile.username,
                  discriminator: profile.discriminator,
                  profileUrl: profile.avatar
                    ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
                    : "",
                }
              : undefined,
        },
        socialLinks: {
          discord:
            provider === "discord"
              ? `https://discord.com/users/${profile.id}`
              : "",
          youtube: provider === "google" ? youtubeUrl || "" : "",
        },
      };

      user = await User.create(newUserData);
    }
  }

  // Return token for auto-login
  CreateJwtToken(user, 200, res);
});

/* --------------------------- LOGIN WITH USERNAME & PASSWORD --------------------------------*/
const LoginUser = CatchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email) {
    return next(new ErrorHandler("Please Fill The Field!", 422));
  }

  const user = await User.findOne({ email });

  // Check if user exists
  if (!user) {
    return next(new ErrorHandler("Invalid Credentials", 401));
  }

  // Check if the user has password set (social login users won't have it)
  if (user.oauth.google.id || user.oauth.discord.id) {
    // Handle 2FA
    if (user.twoFactorEnabled) {
      req.body._forceEmail = user.email;
      return sendOtpToEmail(req, res);
    }

    await logActivity({ user, type: "login", req });
    return CreateJwtToken(user, 200, res);
  }

  if (!password) {
    return next(new ErrorHandler("Please Fill The Field!", 422));
  }

  // Check credentials
  const isValid = await User.CheckCredentials(email, password);
  if (!isValid) {
    return next(new ErrorHandler("Invalid Credentials", 401));
  }

  if (user.verified === false) {
    return next(
      new ErrorHandler("Please check your mail and verify your account", 401)
    );
  }

  // Handle 2FA
  if (user.twoFactorEnabled) {
    req.body._forceEmail = user.email;
    return sendOtpToEmail(req, res);
  }

  await logActivity({ user, type: "login", req });
  // All good — proceed
  CreateJwtToken(user, 200, res);
});

/* -------------------------------------- VERIFY BACKUP CODES ------------------------------ */
const verifyBackupCode = CatchAsyncError(async (req, res, next) => {
  const { code } = req.body;
  if (!code) {
    return res
      .status(400)
      .json({ success: false, message: "Backup code is required" });
  }

  const user = await User.findById(req.user._id);
  if (!user || !user.security?.backupCodes?.length) {
    return res
      .status(400)
      .json({ success: false, message: "No backup codes available" });
  }

  const matchIndex = await Promise.all(
    user.security.backupCodes.map(async (item, index) => {
      const isMatch = await bcrypt.compare(code, item.code);
      return isMatch && !item.used ? index : -1;
    })
  ).then((results) => results.find((i) => i !== -1));

  if (matchIndex === -1 || matchIndex === undefined) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or used backup code" });
  }

  user.security.backupCodes[matchIndex].used = true;
  await user.save();

 await logActivity({ user, type: "login", req });
  // All good — proceed
  CreateJwtToken(user, 200, res);
});

/* ------------------------------------ VERIFY_USER ----------------------------------------------- */
const VerifyUser = CatchAsyncError(async (req, res, next) => {
  const user = req.params.user;
  const token = req.params.token;

  const verifyToken = await Verification.findOne({ owner: user, token: token });

  if (!verifyToken) {
    return next(new ErrorHandler("invalid token", 404));
  }

  let currentTime = new Date().getTime();
  if (new Date(verifyToken.expires).getTime() <= currentTime) {
    return next(new ErrorHandler("Token is expired !"));
  }

  const user_ = await User.findOne({ _id: user });

  user_.verified = true;
  await user_.save();

  await Verification.findByIdAndDelete({ _id: verifyToken._id });

  /* Sending mail to the user with verify link */
  await SendTemplate(
    "balardarshan40@gmail.com", // from
    "txjrltbdscjkaten", // password
    `${user_.email}`, // to
    "IRLHistory - Thank You For Registration", // subject
    "./Utils/Mails", // path of .hbs files directory
    "registration", // .hbs file name
    {
      name: `${user_.name}`,
      link: `http://localhost:6000/v1/api/user-service/user/${user_._id}/verify/${verifyToken}`,
    }, // data that you want to send dynamically
    (err, success) => {
      // callback function
      if (err) {
        console.error("Error sending template email:", err);
      } else {
        console.log("Template email sent successfully");
      }
    }
  );
  await logActivity({ user: user_, type: "verify", req });
  res.status(200).json({
    success: true,
    verify: verifyToken,
  });
});

/* --------------------------- UPLOAD AVTAR ------------------------------------------------------- */
const uploadAvatar = CatchAsyncError(async (req, res, next) => {
  const userId = req.user._id;
  const { avatarUrl } = req.body;

  if (!avatarUrl) {
    return next(new ErrorHandler("Please add avatar ulr here", 401));
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { avatar: avatarUrl },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: "Avatar uploaded successfully",
    avatar: avatarUrl,
    user: updatedUser,
  });
});

/* --------------------------------- VIEW USER  ------------------------------------------------------ */
const ViewProfile = CatchAsyncError(async (req, res, next) => {
  const user = req.user;
  if (!user) {
    return next(new ErrorHandler("Please Login !", 401));
  }
  res.status(200).json({
    success: true,
    user,
  });
});

/* --------------------------------- ResetPassword (Update) ------------------------------------------------------ */
/* for update password, use should know the old password */
const UpdatePassword = CatchAsyncError(async (req, res, next) => {
  const { oldpassword, newpassword } = req.body;
  if (!oldpassword || !newpassword) {
    return next(new ErrorHandler("Please Fill The Fields !", 422));
  }
  const user = req.user;
  const isValidOldPassword = await user.isValidOldPassword(oldpassword);
  if (isValidOldPassword) {
    user.password = newpassword;
    await user.save();
    res
      .status(200)
      .json({ success: true, message: "Password was successfully updated" });
  }
});

/* This is for the forgetpassword, when user forget their passoword */
/* we are generating a token that is valid for 48h, and we are sending a mail to user with update password link that is valid for 48h*/
const ForgetPassword = CatchAsyncError(async (req, res, next) => {
  let { email } = req.body;

  if (!email) {
    return next(new ErrorHandler("Please Enter Email !", 422));
  }

  let user = await User.findOne({ email: email });

  if (!user) {
    return next(new ErrorHandler("User not found !"));
  }

  let token = crypto.randomBytes(16).toString("hex");
  let tokenExpireTime = new Date().setDate(new Date().getDate() + 2);

  user.reset_token = {
    token: token,
    expired: tokenExpireTime,
  };

  await user.save();

  await SendTemplate(
    "balardarshan40@gmail.com", // from
    "txjrltbdscjkaten", // password
    `${email}`, // to
    "IRLHistory - Reset Password", // subject
    "./Utils/Mails", // path of .hbs files directory
    "reset", // .hbs file name
    {
      name: `${user.name}`,
      link: `http://localhost:5000/user-service/user/${user._id}/reset/${token}`,
    }, // link of update password
    (err, success) => {
      // callback function
      if (err) {
        console.error("Error sending template email:", err);
      } else {
        console.log("Template email sent successfully");
      }
    }
  );

  res.status(200).send({
    success: true,
    message: "We have sended you mail with reset password link",
  });
});

/* this is the function after use click on the update password link , this functio will check the validity of time etc.. and update the password as new wrote */
const ResetPassword = CatchAsyncError(async (req, res, next) => {
  let id = req.params.id;
  let token = req.params.token;

  let user = await User.findById({ _id: id });

  if (user?.reset_token?.token != token) {
    return next(new ErrorHandler("Invalid Token", 404));
  }

  let currTime = new Date().getTime();
  let tokenTime = new Date(user?.reset_token?.expired).getTime();

  if (tokenTime < currTime) {
    return next(new ErrorHandler("Token Expired", 404));
  }

  let { newpassword } = req.body;

  if (!newpassword) {
    return next(new ErrorHandler("Please Fills The Fields !", 422));
  }

  user.password = newpassword;

  user.reset_token = {
    token: "",
    expired: new Date(),
  };

  await user.save();

  await logActivity({ user, type: "reset_password", req });

  res
    .status(200)
    .json({ success: true, message: "Password Reset Successfully !" });
});

/* ------------------------ FIND USER --------------------------------------------------- */
const FindUser = CatchAsyncError(async (req, res, next) => {
  let id = req.params.id;

  let user = await User.findById({ _id: id });

  res.status(200).send({
    success: true,
    user,
  });
});

/* -------------------------------------- LOGOUT USER ------------------------------------------------- */
const LogoutUser = CatchAsyncError(async (req, res, next) => {
  const user = req.user;
  // remove token from the database
  user.tokens = user.tokens.filter((t) => {
    return t.token !== req.token;
  });
  // destroy cookie
  res.clearCookie("irlhistory_user");
  await user.save();

  await logActivity({ user, type: "logout", req });

  res.status(200).json({
    success: true,
    message: "Logout Succesfully ",
    user: user.uname,
  });
});

//* ----------------------------------------- UTILS FUNCTIONS ------------------------------------------- *//

async function generateUniqueUname(base) {
  let uname = base.toLowerCase().replace(/[^a-z0-9]/g, "");
  let exists = await User.findOne({ uname });
  let counter = 1;
  while (exists) {
    uname = `${base}${counter}`;
    exists = await User.findOne({ uname });
    counter++;
  }
  return uname;
}

module.exports = {
  CreateUser,
  LoginUser,
  uploadAvatar,
  VerifyUser,
  LogoutUser,
  ViewProfile,
  SocialLogin,
  UpdatePassword,
  ForgetPassword,
  ResetPassword,
  FindUser,
  verifyBackupCode,
};
