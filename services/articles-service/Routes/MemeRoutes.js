const express = require("express");
const Auth = require("../Middlewares/Auth");
const { CreateMeme, GetMemeById, UpdateMeme, DeleteMeme, GetMemeByFilter } = require("../Controllers/MemeController");

const route = new express.Router();

route.post("/meme/create",Auth, CreateMeme);
route.get("/meme/:id",GetMemeById);

route.patch("/meme/update/:id", Auth, UpdateMeme);

route.delete("/meme/delete/:id", Auth, DeleteMeme);
route.get("/meme/memes/filter",GetMemeByFilter);

module.exports = route;