const Verification = require("../Models/VerificationModel");
const CatchAsyncError = require("./CatchAsyncError");
const { SendTemplate } = require("mailglide");
const crypto = require("crypto");

const CreateJwtToken = CatchAsyncError(async (user, status, res) => {
  const token = await user.genereteToken();

  res.cookie("irlhistory_user", token, {
    httpOnly: true,
    secure: false, // false for localhost, true for HTTPS in production
    sameSite: "lax", // "lax" works for Chrome dev; "none" requires secure:true
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
  });

  if (!user.verified) {
    const verifyToken = crypto.randomBytes(12).toString("hex");
    let verificationDate = new Date().setDate(new Date().getDate() + 2);
    await Verification.create({
      owner: user._id,
      token: verifyToken,
      expires: verificationDate,
    });

    await SendTemplate(
      "balardarshan40@gmail.com", // from
      "txjrltbdscjkaten", // password
      `${user.email}`, // to
      "IRLHistory - Verify Your Email Address", // subject
      "./Utils/Mails", // path of .hbs files directory
      "verify", // .hbs file name
      {
        name: `${user.name}`,
        link: `http://localhost:6000/v1/api/user-service/user/${user._id}/verify/${verifyToken}`,
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
  }

  res.status(201).json({ success: true, user });
});

module.exports = CreateJwtToken;
