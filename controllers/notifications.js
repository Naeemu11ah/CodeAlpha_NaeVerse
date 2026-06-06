const Notification = require("../models/notification");
const User = require("../models/user");
const cloudConfig = require("../cloudConfig");
const { extractPublicIdFromUrl } = require("../utils/media");

module.exports.getNotifications = async (req, res) => {
  const userId = req.user && req.user._id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const notifications = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate("sender", "name username profilePic")
    .populate("post", "media")
    .lean();

  // Ensure each notification has a usable thumbnail for the client.
  try {
    notifications.forEach((n) => {
      try {
        if (!n.post || !n.post.media || !n.post.media.length) return;
        const media = n.post.media[0];
        if (!media) return;
        if (media.mediaType === "video") {
          const publicId = media.filename || extractPublicIdFromUrl(media.url);
          if (publicId && cloudConfig && cloudConfig.cloudinary) {
            try {
              // generate a small jpg thumbnail from the video using Cloudinary
              n.post.thumbnail = cloudConfig.cloudinary.url(publicId, {
                resource_type: "video",
                format: "jpg",
                transformation: [{ width: 48, height: 48, crop: "fill" }],
              });
            } catch (err) {
              n.post.thumbnail = media.url || null;
            }
          } else {
            n.post.thumbnail = media.url || null;
          }
        } else {
          n.post.thumbnail = media.url || null;
        }
      } catch (err) {
        // ignore per-notification errors
      }
    });
  } catch (err) {
    // ignore thumbnail generation errors
  }

  // If request expects JSON, return JSON; otherwise render a small partial or JSON
  const wantsJson = req.xhr || (req.get("Accept") || "").includes("application/json");
  if (wantsJson) return res.json({ notifications });

  res.render("users/userActivity.ejs", { notifications, title: "Activity – NaeVerse" });
};

module.exports.markAsRead = async (req, res) => {
  const notifId = req.params.id;
  const userId = req.user && req.user._id;
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const notif = await Notification.findById(notifId);
  if (!notif) return res.status(404).json({ error: "Notification not found" });
  if (String(notif.recipient) !== String(userId)) return res.status(403).json({ error: "Not authorized" });

  notif.isRead = true;
  await notif.save();
  res.json({ success: true });
};

module.exports.markAllRead = async (req, res) => {
  const userId = req.user && req.user._id;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    await Notification.updateMany({ recipient: userId, isRead: { $ne: true } }, { $set: { isRead: true } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Could not mark notifications as read' });
  }
};
