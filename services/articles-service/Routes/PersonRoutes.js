const express = require("express");
const Auth = require("../Middlewares/Auth");
const { CreatePerson, GetPersonByFilter, DeletePerson, UpdatePerson, GetPersonById } = require("../Controllers/PersonController");

const route = new express.Router();

route.post("/person/create",Auth, CreatePerson);
route.get("/person/:id",GetPersonById);

route.patch("/person/update/:id", Auth, UpdatePerson);

route.delete("/person/delete/:id", Auth, DeletePerson);
route.get("/person/persons/filter",GetPersonByFilter);

module.exports = route;