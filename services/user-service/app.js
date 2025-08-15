// app.js
require("./Config/connect");
const express = require("express");
const cookieParser = require("cookie-parser");
const Err = require("./Middlewares/Err");
const UserRoutes = require("./Routes/UserRoutes");
const cors = require("cors");

const app = express();
app.set("trust proxy", true);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/v1/api/user-service", UserRoutes);

app.get("/check-cookie", (req, res) => {
  console.log(req.cookies);
  res.send(req.cookies);
});

app.get("/health", (req, res) => res.send("OK"));

// Error handler
app.use(Err);

module.exports = app;
