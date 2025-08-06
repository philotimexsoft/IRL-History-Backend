require("./Config/connect");
const express = require("express");
const UserRoutes = require("./Routes/UserRoutes");
const CookieParser = require("cookie-parser");
const Err = require("./Middlewares/Err");

const app = new express();
app.set("trust proxy", true)

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(CookieParser());

/* Routes */
app.use("/v1/api/user-service",UserRoutes);

app.get('/check-cookie', (req, res) => {
  console.log(req.cookies); // logs all cookies sent from client
  res.send(req.cookies);
});

app.get("/health", (req, res) => res.send("OK"));

app.use(Err);

module.exports = app;