const Event = require("../Models/EventModel");
const UserPopulate = require("../Populates/UserPopulates");
const CatchAsyncError = require("../Utils/CatchAsyncError");
const ErrorHandler = require("../Utils/ErrorHandler");
const axios = require("axios");
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const redis = require("../redis");

/* ---------------------------- CREATE PERSON ----------------------- */
const CreateEvent = CatchAsyncError(async (req, res, next) => {
  const data = req.body;

  if (Object.keys(data).length <= 0) {
    return next(new ErrorHandler("please fill the fileds", 401));
  }

  data.submitted_by = req.user._id;

  const newEvent = await Event.create(data);

  if (!newEvent) {
    return next(new ErrorHandler("Something went wrong !", 401));
  }

  res.status(201).json({
    success: true,
    event: newEvent,
  });
});

/* ------------------- GET PERSON BY ID -------------------------- */

const GetEventById = CatchAsyncError(async (req, res, next) => {
  let id = req.params.id;

  if (!id) {
    return next(new ErrorHandler("please provide the event id", 404));
  }

  // check in redis
  const cachedEvent = await redis.get(`events:${id}`);
  if (cachedEvent) {
    let event = JSON.parse(cachedEvent);
    return res.status(200).json({
      success: true,
      event,
      cached: true,
    });
  }

  const event = await Event.findByIdAndUpdate(
    id,
    { $inc: { views: 1 } },
    { new: true }
  ).populate([
    {
      path: "event_details.participants.group",
      select: { basic_info: true },
    },
    {
      path: "event_details.participants.person",
      select: { basic_info: true },
    },
  ]);

  if (!event) {
    return next(new ErrorHandler("Event not found ", 404));
  }

  const user = await axios.get(
    `http://user-service:6000/v1/api/user-service/user/find/${event.submitted_by}`
  );

  if (!user) {
    return next(new ErrorHandler("Something went wrong here !", 500));
  }

  const responseData = {
    success: true,
    event,
    user: user.data,
  };

  await redis.setex(`events:${id}`, 604800, JSON.stringify(responseData));

  return res.status(200).json(responseData);
});

/* --------------------------- UPDATE PERSON DETAILS ------------------------ */

const UpdateEvent = CatchAsyncError(async (req, res, next) => {
  const { id } = req.params; // group ID from URL
  const data = req.body;

  if (!id) {
    return next(new ErrorHandler("Please provide the event ID", 400));
  }

  if (!data || Object.keys(data).length === 0) {
    return next(new ErrorHandler("No update data provided", 400));
  }

  // Find and update group
  const updateEvent = await Event.findByIdAndUpdate(id, data, {
    new: true, // return updated document
    runValidators: false, // validate schema on update
  });

  if (!updateEvent) {
    return next(new ErrorHandler("Event not found", 404));
  }

  await deleteRedisKey();

  return res.status(200).json({
    success: true,
    message: "Event updated successfully",
    event: updateEvent,
  });
});

/* -------------------------- DELETE GROUIP --------------- */
const DeleteEvent = CatchAsyncError(async (req, res, next) => {
  const id = req.params.id;

  if (!id) {
    return next(
      new ErrorHandler("please provide the id of the event to be deleted", 404)
    );
  }

  const event = await Event.findByIdAndDelete({ _id: id });

  if (!event) {
    return next(new ErrorHandler("Something went wrong here!", 500));
  }

  await deleteRedisKey();

  res.status(200).json({
    success: true,
    message: "event deleted !",
    event,
  });
});

/* ---------------------------- GET GROUP BY NAME, TAGS, ETC.. SEARCH --------------- */
const GetEventsByFilter = CatchAsyncError(async (req, res, next) => {
  // first try to check in th redis
  const cacheKey = `events:${JSON.stringify(req.query)}`;
  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }

  let match = {};
  let aggregateQuery = [];

  let event_name = req.query.event_name;
  let user = req.query.user;
  let search = req.query.search;
  let participants = req.query.participants; // can be ID or comma-separated IDs
  let event_status = req.query.event_status;

  let currentPage = Number(req.query.currentPage) || 1;
  let limit = Number(req.query.limit) || 3;
  let skip = (currentPage - 1) * limit;

  if (event_name) {
    match["basic_info.name"] = { $regex: event_name, $options: "i" };
  }

  if (user) {
    match.submitted_by = ObjectId(user);
  }

  if (participants) {
    const ids = participants
      .split(",")
      .map((id) => id.trim()) // remove spaces
      .filter((id) => mongoose.Types.ObjectId.isValid(id)) // keep only valid IDs
      .map((id) => new mongoose.Types.ObjectId(id)); // convert

    if (ids.length) {
      match["event_details.participants"] = {
        $elemMatch: {
          $or: [{ group: { $in: ids } }, { person: { $in: ids } }],
        },
      };
    }
  }

  if (event_status) {
    match.status = event_status;
  }

  if (search) {
    match.$text = { $search: search };
  }

  aggregateQuery.push(
    Object.keys(match).length > 0 ? { $match: match } : { $match: {} }
  );

  aggregateQuery.push({
    $lookup: {
      from: "people",
      let: { personsIds: "$event_details.participants.person" }, // pass the array of IDs
      pipeline: [
        {
          $match: {
            $expr: { $in: ["$_id", "$$personsIds"] }, // match IDs
          },
        },
        {
          $project: {
            _id: 1,
            basic_info: 1,
          },
        },
      ],
      as: "person",
    },
  });
  // Populate group_name
  aggregateQuery.push({
    $lookup: {
      from: "groups",
      let: { groupIds: "$event_details.participants.group" }, // pass the array of IDs
      pipeline: [
        {
          $match: {
            $expr: { $in: ["$_id", "$$groupIds"] }, // match IDs
          },
        },
        {
          $project: {
            _id: 1,
            basic_info: 1,
          },
        },
      ],
      as: "group",
    },
  });

  // Pagination counting
  let totalEventData = await Event.aggregate(aggregateQuery);
  let totalEvents = totalEventData.length;
  let totalPages = Math.ceil(totalEvents / limit);

  // Pagination
  aggregateQuery.push({ $skip: skip });
  aggregateQuery.push({ $limit: limit });

  let events = await Event.aggregate(aggregateQuery);

  if (!events || events.length === 0) {
    return next(new ErrorHandler("No events Found !"));
  }

  events = await Promise.all(
    events.map(async (p) => {
      p.submitted_by = await UserPopulate(p.submitted_by);
      return p;
    })
  );

  // set in the redis
  await redis.setex(
    cacheKey,
    604800,
    JSON.stringify({
      success: true,
      totalEvents,
      totalPages,
      currentPage,
      limit,
      events,
    })
  );

  res.status(200).json({
    success: true,
    events,
    totalEvents,
    totalPages,
    currentPage,
    limit,
  });
});

const searchEvents = async (searchTerm) => {
  const regex = new RegExp(searchTerm, "i");
  return Event.aggregate([
    { $match: { title: { $regex: regex } } },
    { $addFields: { type: "event" } },
  ]);
};

/* REDIS KEY DELETION */
const deleteRedisKey = async () => {
  await redis.keys("events:*").then((keys) => {
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
  CreateEvent,
  GetEventById,
  UpdateEvent,
  DeleteEvent,
  GetEventsByFilter,
  searchEvents,
};
