require("./Config/connect");
const express = require("express");
const CookieParser = require("cookie-parser");
const app = new express();

const MessaegeRoutes = require("./Routes/MessageRoutes");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(CookieParser());

app.use("/messages", MessaegeRoutes);

module.exports = app;