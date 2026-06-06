const express = require("express");
const router = express.Router({ mergeParams: true });
const asyncWrap = require("../utils/asyncWrap");
const passport = require("passport");
const {
  userPrevPage,
  isUserLoggedIn,
  isUserOwner,
} = require("../utils/middlewares");
const controllersUser = require("../controllers/user");
const {
  validateSignup,
  validateUserEdit,
  validateProfilePic,
} = require("../utils/validation");
const multer = require("multer");
const cloudConfig = require("../cloudConfig");
// Limit profile picture uploads to 5MB to avoid long uploads/timeouts
const upload = multer({
  storage: cloudConfig.profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// user following account's posts
router.get(
  "/user/:id/following",
  isUserLoggedIn,
  asyncWrap(controllersUser.videosFollowingAccounts),
);

// user friends' posts
router.get(
  "/user/:id/friends",
  isUserLoggedIn,
  asyncWrap(controllersUser.videosFriendsAccounts),
);

// view individual user profile
router.get("/user/:id", asyncWrap(controllersUser.showUserProfile));

// minimal JSON user info (used by client-side notification rendering)
router.get("/api/user/:id", asyncWrap(controllersUser.userInfo));

// follow/unfollow toggle (AJAX)
router.post(
  "/user/:id/follow",
  isUserLoggedIn,
  asyncWrap(controllersUser.toggleFollow),
);

// view your own profile
router.get(
  "/user/profile/:id",
  isUserLoggedIn,
  asyncWrap(controllersUser.showOwnProfile),
);

// delete a user account
router.delete(
  "/user/:id/delete",
  isUserLoggedIn,
  isUserOwner,
  asyncWrap(controllersUser.deleteUser),
);

// editing user
router.get(
  "/user/profile/:id/edit",
  isUserLoggedIn,
  isUserOwner,
  asyncWrap(controllersUser.renderEditForm),
);
router.patch(
  "/user/profile/:id/edit",
  isUserLoggedIn,
  isUserOwner,
  upload.single("profilePic"),
  validateUserEdit,
  asyncWrap(controllersUser.updateUserInfo),
);

// editing user's profile picture only
router.get(
  "/user/profile/:id/editProfilePic",
  isUserLoggedIn,
  isUserOwner,
  asyncWrap(controllersUser.renderEditProfilePicForm),
);
router.patch(
  "/user/profile/:id/editProfilePic",
  isUserLoggedIn,
  isUserOwner,
  upload.single("profilePic"),
  validateProfilePic,
  asyncWrap(controllersUser.updateUserProfilePic),
);

// deleting user's profile picture only
router.delete(
  "/user/profile/:id/editProfilePic",
  isUserLoggedIn,
  isUserOwner,
  asyncWrap(controllersUser.deleteUserProfilePic),
);

// viewing user activity (likes, comments, friend requests, etc.)
router.get(
  "/user/:id/activity",
  isUserLoggedIn,
  asyncWrap(controllersUser.showUserActivity),
);

// approve / reject follow requests (for private accounts)
router.post(
  "/user/:id/follow/approve/:requesterId",
  isUserLoggedIn,
  isUserOwner,
  asyncWrap(controllersUser.approveFollowRequest),
);
router.post(
  "/user/:id/follow/reject/:requesterId",
  isUserLoggedIn,
  isUserOwner,
  asyncWrap(controllersUser.rejectFollowRequest),
);

// Privacy settings UI
router.get(
  "/privacySettings",
  isUserLoggedIn,
  asyncWrap(controllersUser.renderPrivacySettings),
);
router.patch(
  "/user/:id/privacy",
  isUserLoggedIn,
  isUserOwner,
  asyncWrap(controllersUser.updatePrivacySettings),
);

// signup or creating new accounts (public signup for social app)
router
  .route("/signup")
  .get(controllersUser.renderSignupForm)
  .post(validateSignup, asyncWrap(controllersUser.postingSignupForm));

// logging in
router
  .route("/login")
  .get(controllersUser.renderLoginForm)
  .post(
    userPrevPage,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    controllersUser.afterLogin,
  );

// logout
router.get("/logout", controllersUser.logout);

module.exports = router;
