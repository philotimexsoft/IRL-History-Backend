const Event = require("../Models/EventModel");
const Group = require("../Models/GroupModel");
const Place = require("../Models/PlaceModel");
const Person = require("../Models/PersonModel");
const Meme = require("../Models/MemeModel");
const CatchAsyncError = require("../Utils/CatchAsyncError");
const ErrorHandler = require("../Utils/ErrorHandler");
const redis = require("../redis");

const GlobalSearch = CatchAsyncError(async (req, res, next) => {
  const cacheKey = `globalsearch:${JSON.stringify(req.query)}`;
  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }
  const { search, currentPage = 1, limit = 10 } = req.query;

  if (!search || search.trim() === "") {
    return next(new ErrorHandler("Search query is required", 400));
  }

  const skip = (currentPage - 1) * limit;

  const [events, groups, places, persons, memes] = await Promise.all([
    await Event.find({ $text: { $search: search } }),
    await Group.find({ $text: { $search: search } }),
    await Place.find({ $text: { $search: search } }),
    await Person.find({ $text: { $search: search } }),
    await Meme.find({ $text: { $search: search } }),
  ]);

  // Merge all results
  let allResults = [
    ...events.map((d) => ({ ...d.toObject(), type: "event" })),
    ...groups.map((d) => ({ ...d.toObject(), type: "group" })),
    ...places.map((d) => ({ ...d.toObject(), type: "place" })),
    ...persons.map((d) => ({ ...d.toObject(), type: "person" })),
    ...memes.map((d) => ({ ...d.toObject(), type: "meme" })),
  ];

  // Sort by newest first
  allResults.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Pagination after merge
  const totalDocuments = allResults.length;
  const paginated = allResults.slice(skip, skip + Number(limit));

  let responseData = {
    success: true,
    search,
    currentPage: Number(currentPage),
    totalPages: Math.ceil(totalDocuments / limit),
    limit: Number(limit),
    totalDocuments,
    totalDocumentsInCurrentPage: paginated.length,
    data: paginated,
  };

  await redis.setex(cacheKey, 604800, JSON.stringify(responseData));

  res.status(200).json(responseData);
});

module.exports = { GlobalSearch };
