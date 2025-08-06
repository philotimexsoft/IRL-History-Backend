const express = require("express");
// dotenv config loaded
require("dotenv").config({path:"./Config/dev.env"});
const passport = require('passport');
const cors = require('cors');
const AuthRoutes = require("./Routes/AuthRoutes");
// Passport config loaded
require('./Config/passport');

const app = new express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use('/v1/api/auth-service', AuthRoutes);

app.get("/",(req,res) => {
    res.json("hello");
})

module.exports = app;


