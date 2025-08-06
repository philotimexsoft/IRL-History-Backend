// controllers/securityController.js
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../Models/UserModel");
const CatchAsyncError = require("./CatchAsyncError");

// Helper: generate 10 random codes
const generateCodes = (count = 10) => {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString("hex")
  );
};

// POST /api/user/security/backup-codes
const generateBackupCodes = CatchAsyncError(async (req, res, next) => {

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const plainCodes = generateCodes();
    const hashedCodes = await Promise.all(
      plainCodes.map(code => bcrypt.hash(code, 10))
    );

    user.security.backupCodes = hashedCodes.map(code => ({
      code,
      used: false,
    }));

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Backup codes generated",
      codes: plainCodes, // show only once!
    });
});

module.exports = generateBackupCodes;
