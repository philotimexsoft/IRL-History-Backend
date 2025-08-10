const Place = require("../Models/PlaceModel");
const UserPopulate = require("../Populates/UserPopulates");
const CatchAsyncError = require("../Utils/CatchAsyncError");
const ErrorHandler = require("../Utils/ErrorHandler");
const axios = require("axios");
const { ObjectId } = require("mongodb");
const redis = require("../redis");

/* ---------------------------- CREATE GROUP ----------------------- */
const CreatePlace = CatchAsyncError(async (req, res, next) => {
  const data = req.body;

  if (Object.keys(data).length <= 0) {
    return next(new ErrorHandler("please fill the fileds", 401));
  }

  data.submitted_by = req.user._id;

  const newPlace = await Place.create(data);

  if (!newPlace) {
    return next(new ErrorHandler("Something went wrong !", 401));
  }

  res.status(201).json({
    success: true,
    place: newPlace,
  });
});

/* ------------------- GET GROUP BY ID -------------------------- */

const GetPlaceById = CatchAsyncError(async (req, res, next) => {
  let id = req.params.id;

  if (!id) {
    return next(new ErrorHandler("please provide the place id", 404));
  }

  const cacheKey = `places:${id}`;
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }

  const place = await Place.findByIdAndUpdate(
    { _id: id },
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!place) {
    return next(new ErrorHandler("place not found ", 404));
  }

  const user = await axios.get(
    `http://user-service:6000/v1/api/user-service/user/find/${place.submitted_by}`
  );

  if (!user) {
    return next(new ErrorHandler("Something went wrong here !", 500));
  }

  const responseData = {
    success: true,
    place,
    user: user.data,
  };
  await redis.setex(cacheKey, 604800, JSON.stringify(responseData));

  return res.status(200).json(responseData);
});

/* --------------------------- UPDATE GROUP DETAILS ------------------------ */

const UpdatePlace = CatchAsyncError(async (req, res, next) => {
  const { id } = req.params; // group ID from URL
  const data = req.body;

  if (!id) {
    return next(new ErrorHandler("Please provide the place ID", 400));
  }

  if (!data || Object.keys(data).length === 0) {
    return next(new ErrorHandler("No update data provided", 400));
  }

  // Find and update group
  const updatedPlace = await Place.findByIdAndUpdate(id, data, {
    new: true, // return updated document
    runValidators: false, // validate schema on update
  });

  if (!updatedPlace) {
    return next(new ErrorHandler("Place not found", 404));
  }

  await deleteRedisKey();

  return res.status(200).json({
    success: true,
    message: "Place updated successfully",
    place: updatedPlace,
  });
});

/* -------------------------- DELETE GROUIP --------------- */
const DeletePlace = CatchAsyncError(async (req, res, next) => {
  const id = req.params.id;

  if (!id) {
    return next(
      new ErrorHandler("please provide the id of the place to be deleted", 404)
    );
  }

  const place = await Place.findByIdAndDelete({ _id: id });

  if (!place) {
    return next(new ErrorHandler("Something went wrong here!", 500));
  }

  await deleteRedisKey();

  res.status(200).json({
    success: true,
    message: "Place deleted !",
    place,
  });
});

/* ---------------------------- GET GROUP BY NAME, TAGS, ETC.. SEARCH --------------- */
const GetPlacesByFilter = CatchAsyncError(async (req, res, next) => {
  const cacheKey = `places:${JSON.stringify(req.query)}`;
  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }
  let match = {};
  let aggregateQuery = [];

  let place_name = req.query.place_name;
  let user = req.query.user;
  let search = req.query.search;
  let place_status = req.query.place_status;

  // pagination defaults
  let currentPage = Number(req.query.currentPage) || 1;
  let limit = Number(req.query.limit) || 3;
  let skip = (currentPage - 1) * limit;

  if (place_name) {
    match["basic_info.name"] = {
      $regex: place_name,
      $options: "i",
    };
  }

  if (user) {
    match.submitted_by = {
      $eq: ObjectId(user),
    };
  }

  if (place_status) {
    match.status = {
      $eq: place_status,
    };
  }

  aggregateQuery.push(
    Object.keys(match).length > 0
      ? { $match: { $and: [match] } }
      : { $match: {} }
  );

  // first get total count before applying skip/limit
  let totalPlacesData = await Place.aggregate(aggregateQuery);
  let totalPlaces = totalPlacesData.length;
  let totalPages = Math.ceil(totalPlaces / limit);

  // apply pagination
  aggregateQuery.push({ $skip: skip });
  aggregateQuery.push({ $limit: limit });

  let places = await Place.aggregate(aggregateQuery);

  if (search) {
    places = await Place.find({ $text: { $search: search } });
  }

  if (!places || places.length === 0) {
    return next(new ErrorHandler("No places Found !"));
  }

  places = await Promise.all(
    places.map(async (p) => {
      p.submitted_by = await UserPopulate(p.submitted_by);
      return p;
    })
  );

  const responseData = {
    success: true,
    places,
    totalPlaces,
    totalPages,
    currentPage,
    limit,
  };

  await redis.setex(cacheKey, 604800, JSON.stringify(responseData));

  res.status(200).json(responseData);
});

const deleteRedisKey = async () => {
  await redis.keys("places:*").then((keys) => {
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
  CreatePlace,
  GetPlaceById,
  UpdatePlace,
  DeletePlace,
  GetPlacesByFilter,
};
