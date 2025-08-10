const express = require("express");
const Auth = require("../Middlewares/Auth");
const { CreatePlace, GetPlaceById, UpdatePlace, DeletePlace, GetPlacesByFilter } = require("../Controllers/PlaceController");

const route = new express.Router();

route.post("/place/create",Auth, CreatePlace);
route.get("/place/:id",GetPlaceById);

route.patch("/place/update/:id", Auth, UpdatePlace);

route.delete("/place/delete/:id", Auth, DeletePlace);
route.get("/place/places/filter",GetPlacesByFilter);

module.exports = route;