const Event = require("../Models/EventModel");
const Person = require("../Models/PersonModel");
const Group = require("../Models/GroupModel");
const Meme = require("../Models/MemeModel");
const Place = require("../Models/PlaceModel");
const CatchAsyncError = require("../Utils/CatchAsyncError");

const getFeed = async (req, res, next) => {
  try {
    const type = req.query.type || "latest"; // latest or trending

    let sortQuery = {};
    if (type === "latest") {
      sortQuery = { createdAt: -1 };
    } else if (type === "trending") {
      sortQuery = { views: -1 }; // or likes, or combined score
    }

    const [events, people, groups, memes, places] = await Promise.all([
      Event.find().sort(sortQuery).limit(20),
      Person.find().sort(sortQuery).limit(20),
      Group.find().sort(sortQuery).limit(20),
      Meme.find().sort(sortQuery).limit(20),
      Place.find().sort(sortQuery).limit(20),
    ]);

    // Add a `type` field so frontend knows what it is
    const merged = [
      ...events.map((e) => ({ ...e.toObject(), category: "event" })),
      ...people.map((p) => ({ ...p.toObject(), category: "person" })),
      ...groups.map((g) => ({ ...g.toObject(), category: "group" })),
      ...memes.map((m) => ({ ...m.toObject(), category: "meme" })),
      ...places.map((m) => ({ ...m.toObject(), category: "place" })),
    ];

    // Shuffle + sort again to mix categories but keep sorting logic
    merged.sort((a, b) => {
      if (type === "latest") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else {
        return b.views - a.views;
      }
    });

    res.json({ success: true, feed: merged });
  } catch (err) {
    next(err);
  }
};

const getMyPosts = CatchAsyncError(async (req, res, next) => {
  const userId = req.user._id;
  const currentPage = parseInt(req.query.currentPage) || 1;
  const limit = 3;
  const skip = (currentPage - 1) * limit;

  // Get data from all collections for the user
  const [events, people, groups, memes, places] = await Promise.all([
    Event.find({ submitted_by: userId }).sort({ createdAt: -1 }),
    Person.find({ submitted_by: userId }).sort({ createdAt: -1 }),
    Group.find({ submitted_by: userId }).sort({ createdAt: -1 }),
    Meme.find({ submitted_by: userId }).sort({ createdAt: -1 }),
    Place.find({ submitted_by: userId }).sort({ createdAt: -1 }),
  ]);

  // Add category tags
  let merged = [
    ...events.map((e) => ({ ...e.toObject(), category: "event" })),
    ...people.map((p) => ({ ...p.toObject(), category: "person" })),
    ...groups.map((g) => ({ ...g.toObject(), category: "group" })),
    ...memes.map((m) => ({ ...m.toObject(), category: "meme" })),
    ...places.map((pl) => ({ ...pl.toObject(), category: "place" })),
  ];

  // Sort all documents by createdAt
  merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalDocuments = merged.length;
  const totalPages = Math.ceil(totalDocuments / limit);

  // Paginate
  const paginatedData = merged.slice(skip, skip + limit);

  res.json({
    success: true,
    currentPage,
    totalPages,
    limit,
    totalDocuments,
    posts: paginatedData,
  });
});


module.exports = { getFeed, getMyPosts };
