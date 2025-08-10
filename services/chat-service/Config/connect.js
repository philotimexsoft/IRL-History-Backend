const mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_URL).then((data) => {
    console.log("Successfully connected With " + data.connections[0].host);
});

