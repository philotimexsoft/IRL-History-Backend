const express = require("express");
const { getFeed, getMyPosts } = require("../Controllers/FeedController");
const Auth = require("../Middlewares/Auth");

const route = new express.Router();

route.get("/feed",getFeed);
route.get('/mypost',Auth, getMyPosts)

module.exports = route;