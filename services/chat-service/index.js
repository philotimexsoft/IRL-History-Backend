require("dotenv").config({ path: "./Config/dev.env" });
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const chatSocket = require("./Sockets/chatSocket");

const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

chatSocket(io);

const PORT = process.env.PORT || 8000;
server.listen(PORT, "0.0.0.0", (err) => {
    if (err) {
        console.error("Server error:", err);
        process.exit(1);
    }
    console.log(`Chat-Service running on port ${PORT}`);
});
