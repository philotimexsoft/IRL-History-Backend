const Group = require("../Models/GroupModel");
const UserPopulate = require("../Populates/UserPopulates");
const CatchAsyncError = require("../Utils/CatchAsyncError");
const ErrorHandler = require("../Utils/ErrorHandler");
const axios = require("axios");
const { ObjectId } = require("mongodb");
const redis = require("../redis");

/* ---------------------------- CREATE GROUP ----------------------- */
const CreateGroup = CatchAsyncError(async (req, res, next) => {
  const data = req.body;

  if (Object.keys(data).length <= 0) {
    return next(new ErrorHandler("please fill the fileds", 401));
  }

  data.submitted_by = req.user._id;

  const newGroup = await Group.create(data);

  if (!newGroup) {
    return next(new ErrorHandler("Something went wrong !", 401));
  }

  res.status(201).json({
    success: true,
    group: newGroup,
  });
});

/* ------------------- GET GROUP BY ID -------------------------- */

const GetGroupById = CatchAsyncError(async (req, res, next) => {
  let id = req.params.id;

  if (!id) {
    return next(new ErrorHandler("please provide the group id", 404));
  }

  const cacheKey = `groups:${id}`;
  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }

  const group = await Group.findByIdAndUpdate(
    { _id: id },
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!group) {
    return next(new ErrorHandler("Group not found ", 404));
  }

  const user = await axios.get(
    `http://user-service:6000/v1/api/user-service/user/find/${group.submitted_by}`
  );

  if (!user) {
    return next(new ErrorHandler("Something went wrong here !", 500));
  }

  const responseData = {
    success: true,
    group,
    user: user.data,
  };

  await redis.setex(cacheKey, 604800, JSON.stringify(responseData));

  return res.status(200).json(responseData);
});

/* --------------------------- UPDATE GROUP DETAILS ------------------------ */

const UpdateGroup = CatchAsyncError(async (req, res, next) => {
  const { id } = req.params; // group ID from URL
  const data = req.body;

  if (!id) {
    return next(new ErrorHandler("Please provide the group ID", 400));
  }

  if (!data || Object.keys(data).length === 0) {
    return next(new ErrorHandler("No update data provided", 400));
  }

  // Find and update group
  const updatedGroup = await Group.findByIdAndUpdate(id, data, {
    new: true, // return updated document
    runValidators: false, // validate schema on update
  });

  if (!updatedGroup) {
    return next(new ErrorHandler("Group not found", 404));
  }

  await deleteRedisKey();

  return res.status(200).json({
    success: true,
    message: "Group updated successfully",
    group: updatedGroup,
  });
});

/* -------------------------- DELETE GROUIP --------------- */
const DeleteGroup = CatchAsyncError(async (req, res, next) => {
  const id = req.params.id;

  if (!id) {
    return next(
      new ErrorHandler("please provide the id of the group to be deleted", 404)
    );
  }

  const group = await Group.findByIdAndDelete({ _id: id });

  if (!group) {
    return next(new ErrorHandler("Something went wrong here!", 500));
  }

  await deleteRedisKey();

  res.status(200).json({
    success: true,
    message: "Group deleted !",
    group,
  });
});

/* ---------------------------- GET GROUP BY NAME, TAGS, ETC.. SEARCH --------------- */
const GetGroupsByFilter = CatchAsyncError(async (req, res, next) => {
  const cacheKey = `groups:${JSON.stringify(req.query)}`;
  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }
  let match = {};
  let aggregateQuery = [];

  let group_name = req.query.group_name;
  let user = req.query.user;
  let search = req.query.search;
  let member_count = Number(req.query.member_count);
  let member_count_type = req.query.member_count_type;
  let status = req.query.status;
  let group_status = req.query.group_status || "published";

  // pagination defaults
  let currentPage = Number(req.query.currentPage) || 1;
  let limit = Number(req.query.limit) || 3;
  let skip = (currentPage - 1) * limit;

  if (group_name) {
    match["basic_info.name"] = {
      $regex: group_name,
      $options: "i",
    };
  }

  if (user) {
    match.submitted_by = {
      $eq: ObjectId(user),
    };
  }

  if (member_count) {
    if (member_count_type == "lte") {
      match["group_details.member_count"] = { $lte: member_count };
    } else {
      match["group_details.member_count"] = { $gte: member_count };
    }
  }

  if (status) {
    match["group_details.status"] = { $eq: status };
  }

  if (group_status) {
    match.status = {
      $eq: group_status,
    };
  }

  aggregateQuery.push(
    Object.keys(match).length > 0
      ? { $match: { $and: [match] } }
      : { $match: {} }
  );

  // first get total count before applying skip/limit
  let totalGroupsData = await Group.aggregate(aggregateQuery);
  let totalGroups = totalGroupsData.length;
  let totalPages = Math.ceil(totalGroups / limit);

  // apply pagination
  aggregateQuery.push({ $skip: skip });
  aggregateQuery.push({ $limit: limit });

  let groups = await Group.aggregate(aggregateQuery);

  if (search) {
    groups = await Group.find({ $text: { $search: search } });
  }

  if (!groups || groups.length === 0) {
    return next(new ErrorHandler("No groups Found !"));
  }

  groups = await Promise.all(
    groups.map(async (p) => {
      p.submitted_by = await UserPopulate(p.submitted_by);
      return p;
    })
  );

  const responseData = {
    success: true,
    groups,
    totalGroups,
    totalPages,
    currentPage,
    limit,
  };

  // Cache for 7 days
  await redis.setex(cacheKey, 604800, JSON.stringify(responseData));

  res.status(200).json(responseData);
});

const deleteRedisKey = async () => {
  await redis.keys("groups:*").then((keys) => {
    if (keys.length > 0) {
      return redis.del(keys);
    }
  });
  await redis.keys("globalsearch*").then((keys) => {
    if (keys.length > 0) {
      return redis.del(...keys);
    }
  });
};

module.exports = {
  CreateGroup,
  GetGroupById,
  UpdateGroup,
  DeleteGroup,
  GetGroupsByFilter,
};
