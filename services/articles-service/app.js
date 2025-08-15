require("dotenv").config({path:"./Config/dev.env"});
require("./Config/connect");
const express = require("express");
const GroupRoutes = require("./Routes/GroupRoutes");
const PersonRoutes = require("./Routes/PersonRoutes");
const EventsRouts = require("./Routes/EventRoutes");
const PlacesRoutes = require("./Routes/PlaceRoutes");
const MemesRoutes = require("./Routes/MemeRoutes");
const GlobalRoutes = require("./Routes/GlobalRoutes");
const FeedRoutes = require('./Routes/FeedRoutes');

const Err = require("./Middlewares/Err");
const CookieParser = require("cookie-parser");
const app = new express();

app.use(cors({ origin: "*" }));
app.use(cors({
  origin: "http://localhost:3000", // your frontend
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true
}));

app.use(CookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get("/",(req,res,next) => {
    return res.status(200).json({
        message:"hello this is the home page"
    })
});

app.use("/v1/api/articles-service", GroupRoutes);
app.use("/v1/api/articles-service", PersonRoutes)
app.use("/v1/api/articles-service",EventsRouts);
app.use("/v1/api/articles-service",PlacesRoutes)
app.use("/v1/api/articles-service",MemesRoutes);
app.use("/v1/api/feed", FeedRoutes);
app.use("/v1/api/global", GlobalRoutes);
app.use(Err);

module.exports = app;