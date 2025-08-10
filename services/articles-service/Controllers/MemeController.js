const Meme = require("../Models/MemeModel");
const UserPopulate = require("../Populates/UserPopulates");
const CatchAsyncError = require("../Utils/CatchAsyncError");
const ErrorHandler = require("../Utils/ErrorHandler");
const axios = require("axios");
const { ObjectId } = require("mongodb");
const redis = require("../redis");

/* ---------------------------- CREATE GROUP ----------------------- */
const CreateMeme = CatchAsyncError(async (req, res, next) => {
  const data = req.body;

  if (Object.keys(data).length <= 0) {
    return next(new ErrorHandler("please fill the fileds", 401));
  }

  data.submitted_by = req.user._id;

  const newMeme = await Meme.create(data);

  if (!newMeme) {
    return next(new ErrorHandler("Something went wrong !", 401));
  }

  res.status(201).json({
    success: true,
    meme: newMeme,
  });
});

/* ------------------- GET GROUP BY ID -------------------------- */

const GetMemeById = CatchAsyncError(async (req, res, next) => {
  let id = req.params.id;

  if (!id) {
    return next(new ErrorHandler("please provide the meme id", 404));
  }

  const cacheKey = `memes:${id}`;
  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }

  const meme = await Meme.findByIdAndUpdate(
    { _id: id },
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!meme) {
    return next(new ErrorHandler("meme not found ", 404));
  }

  const user = await axios.get(
    `http://user-service:6000/v1/api/user-service/user/find/${meme.submitted_by}`
  );

  if (!user) {
    return next(new ErrorHandler("Something went wrong here !", 500));
  }

  const responseData = {
    success: true,
    meme,
    user: user.data,
  };
  await redis.setex(cacheKey, 604800, JSON.stringify(responseData));

  return res.status(200).json(responseData);
});

/* --------------------------- UPDATE GROUP DETAILS ------------------------ */

const UpdateMeme = CatchAsyncError(async (req, res, next) => {
  const { id } = req.params; // group ID from URL
  const data = req.body;

  if (!id) {
    return next(new ErrorHandler("Please provide the meme ID", 400));
  }

  if (!data || Object.keys(data).length === 0) {
    return next(new ErrorHandler("No update data provided", 400));
  }

  // Find and update group
  const updatedMeme = await Meme.findByIdAndUpdate(id, data, {
    new: true, // return updated document
    runValidators: false, // validate schema on update
  });

  if (!updatedMeme) {
    return next(new ErrorHandler("Meme not found", 404));
  }

  await deleteRedisKey();

  return res.status(200).json({
    success: true,
    message: "Meme updated successfully",
    meme: updatedMeme,
  });
});

/* -------------------------- DELETE GROUIP --------------- */
const DeleteMeme = CatchAsyncError(async (req, res, next) => {
  const id = req.params.id;

  if (!id) {
    return next(
      new ErrorHandler("please provide the id of the meme to be deleted", 404)
    );
  }

  const meme = await Meme.findByIdAndDelete({ _id: id });

  if (!meme) {
    return next(new ErrorHandler("Something went wrong here!", 500));
  }

  await deleteRedisKey();

  res.status(200).json({
    success: true,
    message: "meme deleted !",
    meme,
  });
});

/* ---------------------------- GET GROUP BY NAME, TAGS, ETC.. SEARCH --------------- */
const GetMemeByFilter = CatchAsyncError(async (req, res, next) => {
  const cacheKey = `memes:${JSON.stringify(req.query)}`;
  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }

  let match = {};
  let aggregateQuery = [];

  let meme_name = req.query.meme_name;
  let user = req.query.user;
  let search = req.query.search;
  let meme_status = req.query.meme_status;

  // pagination defaults
  let currentPage = Number(req.query.currentPage) || 1;
  let limit = Number(req.query.limit) || 3;
  let skip = (currentPage - 1) * limit;

  if (meme_name) {
    match["basic_info.name"] = {
      $regex: meme_name,
      $options: "i",
    };
  }

  if (user) {
    match.submitted_by = {
      $eq: ObjectId(user),
    };
  }

  if (meme_status) {
    match.status = {
      $eq: meme_status,
    };
  }

  aggregateQuery.push(
    Object.keys(match).length > 0
      ? { $match: { $and: [match] } }
      : { $match: {} }
  );

  // first get total count before applying skip/limit
  let totalMemesData = await Meme.aggregate(aggregateQuery);
  let totalMemes = totalMemesData.length;
  let totalPages = Math.ceil(totalMemes / limit);

  // apply pagination
  aggregateQuery.push({ $skip: skip });
  aggregateQuery.push({ $limit: limit });

  let memes = await Meme.aggregate(aggregateQuery);

  if (search) {
    memes = await Meme.find({ $text: { $search: search } });
  }

  if (!memes || memes.length === 0) {
    return next(new ErrorHandler("No memes Found !"));
  }

  memes = await Promise.all(
    memes.map(async (p) => {
      p.submitted_by = await UserPopulate(p.submitted_by);
      return p;
    })
  );

  const responseData = {
    success: true,
    memes,
    totalMemes,
    totalPages,
    currentPage,
    limit,
  };

  await redis.setex(cacheKey, 604800, JSON.stringify(responseData));

  res.status(200).json(responseData);
});

const deleteRedisKey = async () => {
  await redis.keys("memes:*").then((keys) => {
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
  CreateMeme,
  DeleteMeme,
  UpdateMeme,
  GetMemeByFilter,
  GetMemeById,
};
