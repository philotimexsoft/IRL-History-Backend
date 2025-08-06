const ActivityLog = require("../Models/ActivityModel");

const logActivity = async ({ user, type, req }) => {
  try {
    await ActivityLog.create({
      user: user._id,
      type,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
  } catch (err) {
    console.error("Activity log error:", err.message);
  }
};

module.exports = logActivity;