const Person = require("../Models/PersonModel");
const UserPopulate = require("../Populates/UserPopulates");
const CatchAsyncError = require("../Utils/CatchAsyncError");
const ErrorHandler = require("../Utils/ErrorHandler");
const axios = require("axios");
const { ObjectId } = require("mongodb");
const redis = require("../redis");

/* ---------------------------- CREATE PERSON ----------------------- */
const CreatePerson = CatchAsyncError(async (req, res, next) => {
  const data = req.body;

  if (Object.keys(data).length <= 0) {
    return next(new ErrorHandler("please fill the fileds", 401));
  }

  data.submitted_by = req.user._id;

  const newPerson = await Person.create(data);

  if (!newPerson) {
    return next(new ErrorHandler("Something went wrong !", 401));
  }

  res.status(201).json({
    success: true,
    person: newPerson,
  });
});

/* ------------------- GET PERSON BY ID -------------------------- */

const GetPersonById = CatchAsyncError(async (req, res, next) => {
  let id = req.params.id;

  if (!id) {
    return next(new ErrorHandler("please provide the person id", 404));
  }
  const cacheKey = `persons:${id}`;
  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }
  const person = await Person.findByIdAndUpdate(
    { _id: id },
    { $inc: { views: 1 } },
    { new: true }
  ).populate({
    path: "associated_with.group_name",
    select: {
      basic_info: true,
    },
  });

  if (!person) {
    return next(new ErrorHandler("Person not found ", 404));
  }

  const user = await axios.get(
    `http://user-service:6000/v1/api/user-service/user/find/${person.submitted_by}`
  );

  if (!user) {
    return next(new ErrorHandler("Something went wrong here !", 500));
  }

  const responseData = {
    success: true,
    person,
    user: user.data,
  };

  await redis.setex(cacheKey, 604800, JSON.stringify(responseData));

  return res.status(200).json(responseData);
});

/* --------------------------- UPDATE PERSON DETAILS ------------------------ */

const UpdatePerson = CatchAsyncError(async (req, res, next) => {
  const { id } = req.params; // group ID from URL
  const data = req.body;

  if (!id) {
    return next(new ErrorHandler("Please provide the person ID", 400));
  }

  if (!data || Object.keys(data).length === 0) {
    return next(new ErrorHandler("No update data provided", 400));
  }

  // Find and update group
  const updatePerson = await Person.findByIdAndUpdate(id, data, {
    new: true, // return updated document
    runValidators: false, // validate schema on update
  });

  if (!updatePerson) {
    return next(new ErrorHandler("Person not found", 404));
  }

  await deleteRedisKey();

  return res.status(200).json({
    success: true,
    message: "Person updated successfully",
    person: updatePerson,
  });
});

/* -------------------------- DELETE GROUIP --------------- */
const DeletePerson = CatchAsyncError(async (req, res, next) => {
  const id = req.params.id;

  if (!id) {
    return next(
      new ErrorHandler("please provide the id of the person to be deleted", 404)
    );
  }

  const person = await Person.findByIdAndDelete({ _id: id });

  if (!person) {
    return next(new ErrorHandler("Something went wrong here!", 500));
  }

  await deleteRedisKey();

  res.status(200).json({
    success: true,
    message: "person deleted !",
    person,
  });
});

/* ---------------------------- GET GROUP BY NAME, TAGS, ETC.. SEARCH --------------- */
const GetPersonByFilter = CatchAsyncError(async (req, res, next) => {
  const cacheKey = `persons:${JSON.stringify(req.query)}`;
  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }
  let match = {};
  let aggregateQuery = [];

  let person_name = req.query.person_name;
  let user = req.query.user;
  let search = req.query.search;
  let associated_with = req.query.associated_with; // can be ID or comma-separated IDs
  let person_status = req.query.person_status || "published";

  let currentPage = Number(req.query.currentPage) || 1;
  let limit = Number(req.query.limit) || 3;
  let skip = (currentPage - 1) * limit;

  if (person_name) {
    match["basic_info.name"] = { $regex: person_name, $options: "i" };
  }

  if (user) {
    match.submitted_by = ObjectId(user);
  }

  if (associated_with) {
    // Support single ID or multiple IDs
    let ids = associated_with.split(",").map((id) => ObjectId(id.trim()));
    match.associated_with = { $in: ids };
  }

  if (person_status) {
    match.status = person_status;
  }

  if (search) {
    match.$text = { $search: search };
  }

  aggregateQuery.push(
    Object.keys(match).length > 0 ? { $match: match } : { $match: {} }
  );

  // Populate group_name
  aggregateQuery.push({
    $lookup: {
      from: "groups",
      let: { groupIds: "$associated_with.group_name" }, // pass the array of IDs
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
      as: "group_name",
    },
  });

  // Pagination counting
  let totalPersonsData = await Person.aggregate(aggregateQuery);
  let totalPersons = totalPersonsData.length;
  let totalPages = Math.ceil(totalPersons / limit);

  // Pagination
  aggregateQuery.push({ $skip: skip });
  aggregateQuery.push({ $limit: limit });

  let persons = await Person.aggregate(aggregateQuery);

  if (!persons || persons.length === 0) {
    return next(new ErrorHandler("No Persons Found !"));
  }

  persons = await Promise.all(
    persons.map(async (p) => {
      p.submitted_by = await UserPopulate(p.submitted_by);
      return p;
    })
  );

  const responseData = {
    success: true,
    persons,
    totalPersons,
    totalPages,
    currentPage,
    limit,
  };
  await redis.setex(cacheKey, 604800, JSON.stringify(responseData));

  res.status(200).json(responseData);
});

const deleteRedisKey = async () => {
  await redis.keys("persons:*").then((keys) => {
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
  CreatePerson,
  GetPersonById,
  UpdatePerson,
  DeletePerson,
  GetPersonByFilter,
};
