const express = require("express");
const router = express.Router();
const Post = require("../models/post");
const Comment = require("../models/comments");
const Notification = require("../models/notification");
const { isUserLoggedIn, isOwner } = require("../utils/middlewares");
const {
  validateNewPost,
  validatePostUpdate,
  validateComment,
} = require("../utils/validation");
const asyncWrap = require("../utils/asyncWrap");
const multer = require("multer");
const { storage } = require("../cloudConfig");
const cloudConfig = require("../cloudConfig");
const upload = multer({ storage });
const { deleteCloudinaryMedia } = require("../utils/media");
const { extractPublicIdFromUrl } = require("../utils/media");
const User = require("../models/user");

module.exports.gettingAllPosts = async (req, res) => {
  // Load current viewer (if any) so we can check friendship
  const viewerId = req.user && req.user._id ? String(req.user._id) : null;
  let viewer = null;
  if (viewerId) {
    try {
      viewer = await User.findById(viewerId).lean();
    } catch (err) {
      viewer = null;
    }
  }

  // Fetch posts and populate owners/comments
  const posts = await Post.find()
    .sort({ createdAt: -1 })
    .populate("user")
    .populate({ path: "comments", populate: { path: "user" } })
    .lean();

  // Filter out posts from private accounts unless the viewer is the owner
  // or is a friend of the post owner
  const filtered = posts.filter((p) => {
    const owner = p.user;
    if (!owner) return false;
    // If account is public, show
    if (!owner.privacy || owner.privacy !== "private") return true;
    // If no viewer (guest), hide private posts
    if (!viewer) return false;
    // Owner always sees their own posts
    if (String(owner._id) === String(viewerId)) return true;
    // Friends can see private posts
    if (viewer.friends && Array.isArray(viewer.friends)) {
      return viewer.friends.some((f) => String(f) === String(owner._id));
    }
    return false;
  });

  res.render("posts/allPosts", {
    posts: filtered,
    title: "Posts – NaeVerse",
    metaDescription: "Browse all posts on NaeVerse.",
  });
};

module.exports.renderNewPostForm = async (req, res) => {
  const { userId } = req.params;
  res.render("posts/newPost", {
    userId,
    title: "Add Post – NaeVerse ",
    metaDescription: "Create a new post for the selected user.",
  });
};

module.exports.createNewPost = async (req, res) => {
  const files = req.files || [];
  const caption = req.body.caption || "";
  const userId = (req.user && req.user._id) || req.params.userId;

  if (!files.length) {
    req.flash && req.flash("error", "Please upload at least one media file.");
    return res.redirect("back");
  }

  const media = files.map((f) => {
    const url = f.path || f.secure_url || f.url;
    const filename = f.filename || f.originalname;
    const mediaType =
      f.mimetype && f.mimetype.startsWith("image") ? "image" : "video";
    return { url, filename, mediaType };
  });

  const post = new Post({
    user: userId,
    caption,
    media,
  });
  await post.save();
  req.flash("success", "Post uploaded successfully!");
  res.redirect("/");
};

module.exports.gettingSinglePost = async (req, res) => {
  const { postId } = req.params;
  const { list, listOwner } = req.query;
  const post = await Post.findById(postId)
    .populate("user")
    .populate({ path: "comments", populate: { path: "user" } });
  if (!post) {
    req.flash && req.flash("error", "Post not found");
    return res.redirect("back");
  }

  // Enforce privacy: if the post owner's account is private, only allow
  // the owner or their friends to view this post.
  try {
    const owner = post.user;
    if (owner && owner.privacy === "private") {
      const viewerId = req.user && req.user._id ? String(req.user._id) : null;
      let viewer = null;
      if (viewerId) {
        try {
          viewer = await User.findById(viewerId).lean();
        } catch (e) {
          viewer = null;
        }
      }
      const isOwner = viewerId && String(owner._id) === String(viewerId);
      const isFriend = viewer && viewer.friends && Array.isArray(viewer.friends) && viewer.friends.some((f) => String(f) === String(owner._id));
      if (!isOwner && !isFriend) {
        req.flash && req.flash("error", "This account is private. Only friends can view posts.");
        return res.redirect("/post");
      }
    }
  } catch (err) {
    console.error("Privacy check error:", err);
  }

  // Default to only the clicked post. If `list` and `listOwner` are provided,
  // load that set so the client can scroll through the list.
  let postsList = [post];
  if (list && listOwner) {
    try {
      if (list === "posts") {
        postsList = await Post.find({ user: listOwner })
          .populate("user")
          .populate({ path: "comments", populate: { path: "user" } })
          .sort({ _id: -1 });
      } else if (list === "liked") {
        postsList = await Post.find({ likes: listOwner })
          .populate("user")
          .populate({ path: "comments", populate: { path: "user" } })
          .sort({ _id: -1 });
      }
      // Apply the same privacy filtering to the list (For profile/list views)
      try {
        const viewerId = req.user && req.user._id ? String(req.user._id) : null;
        let viewer = null;
        if (viewerId) {
          try {
            viewer = await User.findById(viewerId).lean();
          } catch (e) {
            viewer = null;
          }
        }
        postsList = (postsList || []).filter((p) => {
          const owner = p && p.user;
          if (!owner) return false;
          if (!owner.privacy || owner.privacy !== "private") return true;
          if (!viewer) return false;
          if (String(owner._id) === String(viewerId)) return true;
          if (viewer.friends && Array.isArray(viewer.friends)) {
            return viewer.friends.some((f) => String(f) === String(owner._id));
          }
          return false;
        });
      } catch (err) {
        // ignore filtering errors and fall back to unfiltered list
      }
    } catch (err) {
      postsList = [post];
    }
  }

  res.render("posts/allPosts", {
    posts: postsList,
    post: post,
    title: "Post – NaeVerse",
    metaDescription: "View the details of this post.",
  });
};

module.exports.renderEditForm = async (req, res) => {
  const { postId } = req.params;
  const post = await Post.findById(postId);
  res.render("posts/editPost", {
    post,
    title: "Edit Post – NaeVerse",
    metaDescription: "Modify your existing post.",
  });
};

module.exports.updatePost = async (req, res) => {
  const { postId } = req.params;
  const post = await Post.findById(postId);
  const caption = req.body.caption;
  post.caption = caption;
  await post.save();
  req.flash("success", "Post updated successfully!");
  res.redirect("/");
};

module.exports.deletePost = async (req, res) => {
  const { postId } = req.params;
  const post = await Post.findById(postId);
  if (!post) {
    req.flash("error", "Post not found");
    return res.redirect("back");
  }
  if (post.media && post.media.length) {
    for (const m of post.media) {
      await deleteCloudinaryMedia(m);
    }
  }
  await Post.findByIdAndDelete(postId);
  req.flash("success", "Post deleted successfully!");
  res.redirect("/");
};

module.exports.toggleLike = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user && req.user._id;
  const post = await Post.findById(postId);
  if (!post) return res.redirect("back");

  const existingIndex = post.likes.findIndex(
    (id) => String(id) === String(userId),
  );
  if (existingIndex === -1) {
    post.likes.push(userId);
  } else {
    post.likes.splice(existingIndex, 1);
  }

  await post.save();
  const liked = post.likes.some((id) => String(id) === String(userId));
  const likesCount = post.likes.length;

  // create a notification and emit in real-time when someone likes another user's post
  try {
    if (liked && String(post.user) !== String(userId)) {
      const notif = await Notification.create({
        recipient: post.user,
        sender: userId,
        type: "like",
        post: post._id,
      });
      // emit via socket.io (app stores io on app settings)
      try {
        const io = req.app.get("io");
        if (io) {
          // compute a usable thumbnail for the post (video -> jpg thumb)
          let postThumbnail = null;
          try {
            if (post.media && post.media.length) {
              const m = post.media[0];
              if (m) {
                if (m.mediaType === "video") {
                  const publicId = m.filename || extractPublicIdFromUrl(m.url);
                  if (publicId && cloudConfig && cloudConfig.cloudinary) {
                    try {
                      postThumbnail = cloudConfig.cloudinary.url(publicId, {
                        resource_type: "video",
                        format: "jpg",
                        transformation: [{ width: 48, height: 48, crop: "fill" }],
                      });
                    } catch (err) {
                      postThumbnail = m.url || null;
                    }
                  } else {
                    postThumbnail = m.url || null;
                  }
                } else {
                  postThumbnail = m.url || null;
                }
              }
            }
          } catch (err) {}

          const emitterPayload = {
            _id: notif._id,
            type: notif.type,
            isRead: notif.isRead,
            createdAt: notif.createdAt,
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
            post: {
              _id: post._id,
              thumbnail: postThumbnail,
            },
          };
          io.to(String(post.user)).emit("notification", emitterPayload);
        }
      } catch (err) {
        console.error("Socket emit error for like notification:", err);
      }
    }
  } catch (err) {
    console.error("Could not create like notification:", err);
  }
  // if AJAX / fetch request, send JSON so client can update UI without reload
  const wantsJson =
    req.xhr || (req.get("Accept") || "").includes("application/json");
  if (wantsJson) {
    return res.json({ liked, likesCount });
  }
  // fallback: redirect to home
  res.redirect("/");
};

module.exports.addingComment = async (req, res) => {
  const { postId } = req.params;
  const text = (req.body && (req.body.text || req.body.comment)) || "";
  if (!text || !text.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Comment text required" });
  }
  const post = await Post.findById(postId);
  if (!post)
    return res.status(404).json({ success: false, message: "Post not found" });

  const comment = new Comment({
    user: req.user._id,
    post: postId,
    text: text.trim(),
  });
  await comment.save();

  post.comments.push(comment._id);
  await post.save();

  // return minimal comment payload for client
  const payload = {
    _id: comment._id,
    text: comment.text,
    user: {
      _id: req.user._id,
      name: req.user.name || req.user.username || "",
      profilePic:
        (req.user.profilePic &&
          (typeof req.user.profilePic === "string"
            ? req.user.profilePic
            : req.user.profilePic.url)) ||
        "/assets/userProfilePic.png",
    },
    dateCreated: comment.dateCreated,
  };

  // create a comment notification for the post owner (unless commenter is owner)
  try {
    if (String(post.user) !== String(req.user._id)) {
      const notif = await Notification.create({
        recipient: post.user,
        sender: req.user._id,
        type: "comment",
        post: post._id,
        commentText: comment.text,
      });
      try {
        const io = req.app.get("io");
        if (io) {
          const textSnippet = (comment.text || "")
            .split(/\s+/)
            .slice(0, 3)
            .join(" ");
          // compute a usable thumbnail for the post (video -> jpg thumb)
          let postThumbnail = null;
          try {
            if (post.media && post.media.length) {
              const m = post.media[0];
              if (m) {
                if (m.mediaType === "video") {
                  const publicId = m.filename || extractPublicIdFromUrl(m.url);
                  if (publicId && cloudConfig && cloudConfig.cloudinary) {
                    try {
                      postThumbnail = cloudConfig.cloudinary.url(publicId, {
                        resource_type: "video",
                        format: "jpg",
                        transformation: [{ width: 48, height: 48, crop: "fill" }],
                      });
                    } catch (err) {
                      postThumbnail = m.url || null;
                    }
                  } else {
                    postThumbnail = m.url || null;
                  }
                } else {
                  postThumbnail = m.url || null;
                }
              }
            }
          } catch (err) {}

          const emitterPayload = {
            _id: notif._id,
            type: notif.type,
            isRead: notif.isRead,
            createdAt: notif.createdAt,
            commentText: comment.text,
            commentSnippet: textSnippet,
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
            post: {
              _id: post._id,
              thumbnail: postThumbnail,
            },
          };
          io.to(String(post.user)).emit("notification", emitterPayload);
        }
      } catch (err) {
        console.error("Socket emit error for comment notification:", err);
      }
    }
  } catch (err) {
    console.error("Could not create comment notification:", err);
  }

  res.json({
    success: true,
    comment: payload,
    commentsCount: post.comments.length,
  });
};

module.exports.deletingComment = async (req, res) => {
  const { postId, commentId } = req.params;
  const comment = await Comment.findById(commentId);
  if (!comment)
    return res
      .status(404)
      .json({ success: false, message: "Comment not found" });
  const post = await Post.findById(postId);
  if (!post)
    return res.status(404).json({ success: false, message: "Post not found" });

  const userId = req.user && req.user._id;
  const isCommentOwner = String(comment.user) === String(userId);
  const isPostOwner = String(post.user) === String(userId);
  if (!isCommentOwner && !isPostOwner) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this comment",
    });
  }

  // remove comment reference from post
  post.comments = (post.comments || []).filter(
    (c) => String(c) !== String(commentId),
  );
  await post.save();
  await Comment.findByIdAndDelete(commentId);

  res.json({ success: true });
};
