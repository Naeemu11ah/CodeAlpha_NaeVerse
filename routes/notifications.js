const express = require("express");
const router = express.Router();
const { isUserLoggedIn } = require("../utils/middlewares");
const asyncWrap = require("../utils/asyncWrap");
const controllers = require("../controllers/notifications");

// get all notifications for the logged in user
router.get("/", isUserLoggedIn, asyncWrap(controllers.getNotifications));

// mark a notification as read
router.post(
  "/:id/mark-read",
  isUserLoggedIn,
  asyncWrap(controllers.markAsRead),
);

// mark all notifications as read
router.post(
  "/mark-all",
  isUserLoggedIn,
  asyncWrap(controllers.markAllRead),
);

module.exports = router;
