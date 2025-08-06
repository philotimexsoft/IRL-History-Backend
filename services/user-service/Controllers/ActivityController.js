const ActivityLog = require('../Models/ActivityModel');
const CatchAsyncError = require('../Utils/CatchAsyncError');

const getActivityLogsByUser = CatchAsyncError(async (req, res, next) => {
    const { id } = req.params;

    const logs = await ActivityLog.find({ user: id })
      .sort({ createdAt: -1 }); // Latest first

    res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
});

module.exports = { getActivityLogsByUser };
