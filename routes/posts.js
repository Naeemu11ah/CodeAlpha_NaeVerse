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
const controllersPosts = require("../controllers/posts");

// getting all posts
router.get("/", asyncWrap(controllersPosts.gettingAllPosts));

// adding new post
router.get(
  "/new",
  isUserLoggedIn,
  asyncWrap(controllersPosts.renderNewPostForm),
);
router.post(
  "/new",
  isUserLoggedIn,
  upload.array("page1"),
  validateNewPost,
  asyncWrap(controllersPosts.createNewPost),
);

// getting single post
router.get("/:postId", asyncWrap(controllersPosts.gettingSinglePost));

// editing post
router.get(
  "/:postId/edit",
  isUserLoggedIn,
  isOwner,
  asyncWrap(controllersPosts.renderEditForm),
);
router.patch(
  "/:postId/edit",
  isUserLoggedIn,
  isOwner,
  validatePostUpdate,
  asyncWrap(controllersPosts.updatePost),
);

// deleting post
router.delete(
  "/:postId/delete",
  isUserLoggedIn,
  isOwner,
  asyncWrap(controllersPosts.deletePost),
);

// liking post
router.post(
  "/:postId/like",
  isUserLoggedIn,
  asyncWrap(controllersPosts.toggleLike),
);

// Adding comment (AJAX)
router.post(
  "/:postId/comment/add",
  isUserLoggedIn,
  validateComment,
  asyncWrap(controllersPosts.addingComment),
);

// Delete a comment (AJAX)
router.delete(
  "/:postId/comment/:commentId/delete",
  isUserLoggedIn,
  asyncWrap(controllersPosts.deletingComment),
);

module.exports = router;
