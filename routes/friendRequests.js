const express = require("express");
const router = express.Router();
const asyncWrap = require("../utils/asyncWrap");
const { isUserLoggedIn } = require("../utils/middlewares");
const controllers = require("../controllers/friendRequests");

// send a friend request
router.post("/send/:to", isUserLoggedIn, asyncWrap(controllers.sendRequest));

// accept a friend request
router.post(
  "/:id/accept",
  isUserLoggedIn,
  asyncWrap(controllers.acceptRequest),
);

// reject a friend request
router.post(
  "/:id/reject",
  isUserLoggedIn,
  asyncWrap(controllers.rejectRequest),
);

// cancel a sent friend request (sender)
router.post(
  "/:id/cancel",
  isUserLoggedIn,
  asyncWrap(controllers.cancelRequest),
);

// unfriend a user
router.post(
  "/unfriend/:id",
  isUserLoggedIn,
  asyncWrap(controllers.unfriend),
);

// cancel a sent friend request
router.get("/incoming", isUserLoggedIn, asyncWrap(controllers.incoming));

module.exports = router;
