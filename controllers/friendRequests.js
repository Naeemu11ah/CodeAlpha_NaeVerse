const FriendRequest = require("../models/friendRequest");
const User = require("../models/user");
const Notification = require("../models/notification");

module.exports.sendRequest = async (req, res) => {
  const toId = req.params.to;
  const fromId = req.user && req.user._id;
  if (!fromId) return res.status(401).json({ error: "Not authenticated" });
  if (String(fromId) === String(toId))
    return res.status(400).json({ error: "Cannot send request to yourself" });

  const existing = await FriendRequest.findOne({
    from: fromId,
    to: toId,
    status: "pending",
  });
  if (existing)
    return res.status(400).json({ error: "Friend request already sent" });

  const alreadyFriends = await User.findOne({ _id: fromId, friends: toId });
  if (alreadyFriends) return res.status(400).json({ error: "Already friends" });

  const fr = await FriendRequest.create({ from: fromId, to: toId });

  // create notification for recipient
  try {
    const notif = await Notification.create({
      recipient: toId,
      sender: fromId,
      type: "friend_request",
      request: fr._id,
    });
    const io = req.app.get("io");
    if (io) {
      io.to(String(toId)).emit("notification", {
        _id: notif._id,
        type: notif.type,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
        request: fr._id,
        sender: {
          _id: req.user._id,
          name: req.user.name || req.user.username,
          profilePic:
            (req.user.profilePic &&
              (typeof req.user.profilePic === "string"
                ? req.user.profilePic
                : req.user.profilePic.url)) ||
            "/assets/userProfilePic.png",
        },
      });
    }
  } catch (err) {
    console.error("Could not create friend request notification:", err);
  }

  res.json({ success: true, request: fr });
};

module.exports.acceptRequest = async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user && req.user._id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const fr = await FriendRequest.findById(requestId);
  if (!fr) return res.status(404).json({ error: "Request not found" });
  if (String(fr.to) !== String(userId))
    return res.status(403).json({ error: "Not authorized" });
  if (fr.status !== "pending")
    return res.status(400).json({ error: "Request already handled" });

  fr.status = "accepted";
  await fr.save();

  // add each user to other's friends array
  await User.findByIdAndUpdate(fr.from, { $addToSet: { friends: fr.to } });
  await User.findByIdAndUpdate(fr.to, { $addToSet: { friends: fr.from } });

  // create notification to requester that their request was accepted
  try {
    const notif = await Notification.create({
      recipient: fr.from,
      sender: fr.to,
      type: "friend_accept",
      request: fr._id,
    });
    const io = req.app.get("io");
    if (io) {
      // include sender name/profilePic so realtime clients can render immediately
      const acceptor = await User.findById(fr.to);
      io.to(String(fr.from)).emit("notification", {
        _id: notif._id,
        type: notif.type,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
        sender: {
          _id: fr.to,
          name: acceptor ? acceptor.name || acceptor.username : undefined,
          profilePic:
            (acceptor &&
              acceptor.profilePic &&
              (typeof acceptor.profilePic === "string"
                ? acceptor.profilePic
                : acceptor.profilePic.url)) ||
            "/assets/userProfilePic.png",
        },
      });
    }
  } catch (err) {
    console.error("Could not create friend accept notification:", err);
  }

  // remove the original friend_request notification for the recipient (cleanup)
  try {
    const old = await Notification.findOneAndDelete({
      request: fr._id,
      type: "friend_request",
    });
    const io = req.app.get("io");
    if (io) {
      io.to(String(fr.to)).emit("notification_remove", {
        request: fr._id,
        notif: old ? old._id : null,
      });
    }
  } catch (err) {
    console.error("Error removing original friend_request notification:", err);
  }

  res.json({ success: true });
};

module.exports.rejectRequest = async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user && req.user._id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const fr = await FriendRequest.findById(requestId);
  if (!fr) return res.status(404).json({ error: "Request not found" });
  if (String(fr.to) !== String(userId))
    return res.status(403).json({ error: "Not authorized" });
  if (fr.status !== "pending")
    return res.status(400).json({ error: "Request already handled" });

  fr.status = "rejected";
  await fr.save();
  // remove the original friend_request notification (cleanup)
  try {
    const old = await Notification.findOneAndDelete({ request: fr._id, type: "friend_request" });
    const io = req.app.get("io");
    if (io) {
      io.to(String(fr.to)).emit("notification_remove", {
        request: fr._id,
        notif: old ? old._id : null,
      });
    }
  } catch (err) {
    console.error("Error removing original friend_request notification on reject:", err);
  }
  res.json({ success: true });
};

module.exports.incoming = async (req, res) => {
  const userId = req.user && req.user._id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  const incoming = await FriendRequest.find({ to: userId, status: "pending" })
    .populate("from", "name profilePic")
    .lean();
  res.json({ incoming });
};

module.exports.cancelRequest = async (req, res) => {
  const requestId = req.params.id;
  const userId = req.user && req.user._id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const fr = await FriendRequest.findById(requestId);
  if (!fr) return res.status(404).json({ error: "Request not found" });
  if (String(fr.from) !== String(userId))
    return res.status(403).json({ error: "Not authorized" });
  if (fr.status !== "pending")
    return res.status(400).json({ error: "Request already handled" });

  // delete the friend request
  await FriendRequest.findByIdAndDelete(requestId);

  // remove related notification for recipient and inform them via socket
  try {
    const notif = await Notification.findOneAndDelete({
      request: requestId,
      type: "friend_request",
    });
    const io = req.app.get("io");
    if (io) {
      io.to(String(fr.to)).emit("notification_remove", {
        request: requestId,
        notif: notif ? notif._id : null,
      });
    }
  } catch (err) {
    console.error("Error removing friend request notification:", err);
  }

  res.json({ success: true });
};

module.exports.unfriend = async (req, res) => {
  const targetId = req.params.id;
  const userId = req.user && req.user._id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });
  if (String(userId) === String(targetId))
    return res.status(400).json({ error: "Cannot unfriend yourself" });

  await User.findByIdAndUpdate(userId, { $pull: { friends: targetId } });
  await User.findByIdAndUpdate(targetId, { $pull: { friends: userId } });

  // refresh session user data
  try {
    const updatedUser = await User.findById(userId);
    return req.login(updatedUser, function (err) {
      if (err) console.error("Login refresh error after unfriend:", err);
      if (req.session && typeof req.session.save === "function") {
        return req.session.save(function (saveErr) {
          if (saveErr)
            console.error("Session save error after unfriend:", saveErr);
          return res.json({ success: true });
        });
      }
      return res.json({ success: true });
    });
  } catch (err) {
    console.error("Error refreshing session user after unfriend:", err);
  }
  // fallback response if login/save did not run
  res.json({ success: true });
};
