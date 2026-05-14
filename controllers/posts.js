const express = require("express");
const router = express.Router();
const Post = require("../models/post");
const Comment = require("../models/comments");
const { isUserLoggedIn, isOwner } = require("../utils/middlewares");
const {
  validateNewPost,
  validatePostUpdate,
  validateComment,
} = require("../utils/validation");
const asyncWrap = require("../utils/asyncWrap");
const multer = require("multer");
const { storage } = require("../cloudConfig");
const upload = multer({ storage });
const { deleteCloudinaryMedia } = require("../utils/media");

module.exports.gettingAllPosts = async (req, res) => {
  const posts = await Post.find()
    .populate("user")
    .populate({ path: "comments", populate: { path: "user" } });
  res.render("posts/allPosts", {
    posts,
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
