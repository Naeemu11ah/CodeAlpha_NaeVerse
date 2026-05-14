const express = require("express");
const router = express.Router();
const asyncWrap = require("../utils/asyncWrap");
const User = require("../models/user");
const Post = require("../models/post");
const controllersPages = require("../controllers/pages");
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|]/g, "\\$&");
}

// Landing page - all teachers
router.get("/", asyncWrap(controllersPages.renderLandingPage));

// getting terms and condition page
router.get("/terms", asyncWrap(controllersPages.renderTermsPage));

// getting privacy and policy page
router.get("/privacy", asyncWrap(controllersPages.renderPrivacyPage));

// searched listings
router.get("/search", asyncWrap(controllersPages.renderSearchResults));

// getting about page
router.get("/about", asyncWrap(controllersPages.renderAboutPage));

module.exports = router;
