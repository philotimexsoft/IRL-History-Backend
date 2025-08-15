const mongoose = require("mongoose");

async function connectDB() {
  try {
    const data = await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Successfully connected with " + data.connection.host);
  } catch (err) {
    console.error("Error connecting to MongoDB:", err.message || err);
  }
}

connectDB();