const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ErrorHandler = require("../Utils/ErrorHandler");

const UserStructure = new mongoose.Schema(
  {
    uname: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, "Please Enter A Name"],
      minlength: [2, "please enter atleast two characters"],
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: (value) => {
        if (!validator.isEmail(value)) {
          throw new ErrorHandler("Email is not in proper formate !", 422);
        }
      },
    },
    password: {
      type: String,
      required: function () {
        return !this.oauth.google.id && !this.oauth.discord.id;
      },
      validate: (value) => {
        if (
          !validator.isStrongPassword(value, {
            minSymbols: 1,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minLength: 8,
          })
        ) {
          throw new ErrorHandler("Please enter a valid password", 422);
        }
      },
    },
    phno: {
      type: Number,
    },
    avatar: {
      type: String,
    },
    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },
    socialLinks: {
      youtube: { type: String, default: "" },
      twitter: { type: String, default: "" },
      discord: { type: String, default: "" },
      steam: { type: String, default: "" },
    },
    oauth: {
      google: {
        id: { type: String },
        profileUrl: { type: String },
      },
      discord: {
        id: { type: String },
        username: { type: String },
        discriminator: { type: String },
        profileUrl: { type: String },
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    totalViews: {
      type: Number,
      default: 0,
    },
    totalArticles: {
      type: Number,
      default: 0,
    },
    contributionScore: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ["user", "moderator", "admin"],
      default: "user",
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      expiresAt:Date
    },
    tokens: [
      {
        token: {
          type: String,
        },
      },
    ],
      reset_token:{
        token:{
            type:String
        },
        expired:{
            type:Date
        }
    }
  },
  { timestamps: true }
);

/* Indexing */
UserStructure.index({ "oauth.google.id": 1 });

UserStructure.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Mongoose Model Methods & Statics
UserStructure.methods.genereteToken = async function () {
  const user = this;
  const token = await jwt.sign(
    {
      _id: user._id,
    },
    process.env.SECRET_KEY
  );
  user.tokens = user.tokens.concat({ token: token });
  await user.save();

  return token;
};

// check login credentials
UserStructure.statics.CheckCredentials = async function (email, password) {
  const isValidEmail = await User.findOne({ email });
  if (!isValidEmail) {
    throw new ErrorHandler("Invalid Credentails", 401);
  }

  const isValidPassword = await bcrypt.compare(password, isValidEmail.password);
  if (!isValidPassword) {
    throw new ErrorHandler("Invalid Credentails", 401);
  }
  const user = isValidEmail;
  return user;
};

UserStructure.statics.isValidEmail = async function (email) {
  const isExistsEmail = await User.findOne({ email: email });
  if (isExistsEmail) {
    return false;
  }
  return true;
};

// check the old password is valid or not
UserStructure.methods.isValidOldPassword = async function (oldpassword) {
    const user = this;
    const isValid = await bcrypt.compare(oldpassword, user.password);
    if (! isValid) {
        throw new ErrorHandler("Old Password Is Not Currect !", 400);
    }

    return true;
}

const User = new mongoose.model("User", UserStructure);

module.exports = User;
