const express = require("express");
const { GlobalSearch } = require("../Controllers/GlobalController");

const route = new express.Router();

route.get("/search",GlobalSearch);

module.exports = route;