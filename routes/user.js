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
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudConfig = require("../cloudConfig");
// Multer-storage for profile pictures (store under `assets` folder)
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudConfig.cloudinary,
  params: {
    folder: "assets",
    allowed_formats: ["png", "jpg", "jpeg"],
  },
});
const upload = multer({ storage: profileStorage });

// user following account's posts
router.get(
  "/user/:id/following",
  isUserLoggedIn,
  asyncWrap(controllersUser.videosFollowingAccounts),
);

// view individual user profile
router.get("/user/:id", asyncWrap(controllersUser.showUserProfile));

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
  asyncWrap(controllersUser.updateUserProfilePic),
);

// deleting user's profile picture only
router.delete(
  "/user/profile/:id/editProfilePic",
  isUserLoggedIn,
  isUserOwner,
  asyncWrap(controllersUser.deleteUserProfilePic)
);

// signup or creating new accounts (public signup for social app)
router
  .route("/signup")
  .get(controllersUser.renderSignupForm)
  .post(asyncWrap(controllersUser.postingSignupForm));

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
