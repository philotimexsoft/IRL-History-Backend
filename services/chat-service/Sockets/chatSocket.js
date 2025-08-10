const jwt = require("jsonwebtoken");
const Message = require("../Models/MessageModel");

function chatSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`📡 User connected: ${socket.userId}`);
    socket.join(socket.userId);

    socket.on("send_message", async ({ receiverId, content }) => {
      const newMessage = await Message.create({
        sender: socket.userId,
        receiver: receiverId,
        content
      });

      io.to(receiverId).emit("receive_message", newMessage);
    });

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
    });
  });
}

module.exports = chatSocket;