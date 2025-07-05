import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { getReciverId, io } from "../socket/socket.js";

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;
    const { message } = req.body;

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId]
      });
    }

    let newMessage = await Message.create({ senderId, receiverId, message });

    if (newMessage) {
      conversation.messages.push(newMessage._id);
    }

    await conversation.save();

    // ✅ Now both sender and receiver are populated
    newMessage = await newMessage.populate([
      { path: "senderId", select: "username profilepicture" },
      { path: "receiverId", select: "username profilepicture" }
    ]);

    // Real-time socket.io
    const receiverSocketId = getReciverId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message", newMessage);
    }

    return res.status(200).json({
      message: "Message sent successfully",
      success: true,
      newMessage
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};


export const getMessages = async (req, res) => {
  try {
    const senderId = req.id;
    const receiverId = req.params.id;

    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    }).populate({
      path: "messages",
      populate: [
        { path: "senderId", select: "username profilepicture" },
        { path: "receiverId", select: "username profilepicture" }
      ],
      options: { sort: { createdAt: 1 } }
    });

    if (!conversation) {
      return res.status(200).json({ messages: [], success: true });
    }

    return res.status(200).json({
      messages: conversation?.messages,
      success: true
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
