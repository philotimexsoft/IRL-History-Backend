const express = require("express");
const { CreateGroup, GetGroupById, UpdateGroup, DeleteGroup, GetGroupsByFilter } = require("../Controllers/GroupController");
const Auth = require("../Middlewares/Auth");

const route = new express.Router();

route.post("/group/create",Auth, CreateGroup);
route.get("/group/:id",GetGroupById);

route.patch("/group/update/:id", Auth, UpdateGroup);

route.delete("/group/delete/:id", Auth, DeleteGroup);
route.get("/group/groups/filter",GetGroupsByFilter);

module.exports = route;