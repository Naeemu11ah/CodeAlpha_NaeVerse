module.exports.isUserLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.userPrevPage = req.originalUrl;
    req.flash("error", "Please log in to continue!");
    return res.redirect("/login");
  }
  next();
};

module.exports.userPrevPage = (req, res, next) => {
  if (req.session.userPrevPage) {
    res.locals.userPrevPage = req.session.userPrevPage;
  }
  next();
};

module.exports.isOwner = async (req, res, next) => {
  try {
    const Post = require("../models/post");
    const postId = req.params.postId || req.params.id;
    if (!postId) {
      req.flash && req.flash("error", "Missing resource identifier.");
      const dest = req.session && req.session.userPrevPage ? req.session.userPrevPage : (res.locals && res.locals.userPrevPage ? res.locals.userPrevPage : "/");
      return res.redirect(dest);
    }
    const post = await Post.findById(postId);
    if (!post) {
      req.flash && req.flash("error", "Resource not found.");
      const dest = req.session && req.session.userPrevPage ? req.session.userPrevPage : (res.locals && res.locals.userPrevPage ? res.locals.userPrevPage : "/");
      return res.redirect(dest);
    }
    const currentUserId = (req.user && req.user._id) || (req.currUser && req.currUser._id);
    if (currentUserId && post.user && (post.user.equals ? post.user.equals(currentUserId) : String(post.user) === String(currentUserId))) {
      return next();
    }
    req.flash && req.flash("error", "You are not the owner!");
    const dest = req.session && req.session.userPrevPage ? req.session.userPrevPage : (res.locals && res.locals.userPrevPage ? res.locals.userPrevPage : "/");
    return res.redirect(dest);
  } catch (err) {
    return next(err);
  }
};

module.exports.isUserOwner = async (req, res, next) => {
  try {
    const User = require("../models/user");
    const userId = req.params.id;
    if (!userId) {
      req.flash && req.flash("error", "Missing user identifier.");
      const dest = req.session && req.session.userPrevPage ? req.session.userPrevPage : (res.locals && res.locals.userPrevPage ? res.locals.userPrevPage : "/");
      return res.redirect(dest);
    }
    const user = await User.findById(userId);
    if (!user) {
      req.flash && req.flash("error", "User not found.");
      const dest = req.session && req.session.userPrevPage ? req.session.userPrevPage : (res.locals && res.locals.userPrevPage ? res.locals.userPrevPage : "/");
      return res.redirect(dest);
    }
    const currentUserId = (req.user && req.user._id) || (req.currUser && req.currUser._id);
    if (currentUserId && String(currentUserId) === String(user._id)) {
      return next();
    }
    req.flash && req.flash("error", "You are not the owner!");
    const dest = req.session && req.session.userPrevPage ? req.session.userPrevPage : (res.locals && res.locals.userPrevPage ? res.locals.userPrevPage : (`/user/${userId}` || "/"));
    return res.redirect(dest);
  } catch (err) {
    return next(err);
  }
};
