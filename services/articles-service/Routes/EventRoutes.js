const express = require("express");
const Auth = require("../Middlewares/Auth");
const { CreateEvent, GetEventById, UpdateEvent, DeleteEvent, GetEventsByFilter } = require("../Controllers/EventController");

const route = new express.Router();

route.post("/event/create",Auth, CreateEvent);
route.get("/event/:id",GetEventById);

route.patch("/event/update/:id", Auth, UpdateEvent);

route.delete("/event/delete/:id", Auth, DeleteEvent);
route.get("/event/events/filter",GetEventsByFilter);

module.exports = route;