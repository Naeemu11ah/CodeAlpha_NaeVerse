const express = require("express");
const router = express.Router();
const asyncWrap = require("../utils/asyncWrap");
const User = require("../models/user");
const Post = require("../models/post");
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|]/g, "\\$&");
}

// Landing page - all teachers
router.get(
  "/",
  asyncWrap(async (req, res) => {
    res.redirect("/post");
  }),
);

// getting terms and condition page
router.get(
  "/terms",
  asyncWrap(async (req, res) => {
    res.render("pages/terms&conditions", {
      title: "Terms & Conditions – UOS Past Papers",
      metaDescription:
        "Read our terms and conditions for using UOS Past Papers.",
    });
  }),
);

// getting privacy and policy page
router.get(
  "/privacy",
  asyncWrap(async (req, res) => {
    res.render("pages/privacyPolicy", {
      title: "Privacy Policy – UOS Past Papers",
      metaDescription: "Learn how we protect your privacy at UOS Past Papers.",
    });
  }),
);

// searched listings
router.get(
  "/search",
  asyncWrap(async (req, res) => {
    const query = (req.query.q || req.query.searchedQuery || "").trim();

    if (!query) {
      return res.render("searchedResults", {
        posts: [],
        users: [],
        searchQuery: "",
      });
    }
    const regex = new RegExp(escapeRegex(query), "i");
    const posts = await Post.find({ caption: regex })
      .sort({ createdAt: -1 })
      .limit(50);

    const users = await User.find({
      $or: [{ name: regex }, { username: regex }],
    })
      .select("-password -email -__v")
      .limit(50);

    res.render("searchedResults", { posts, users, searchQuery: query });
  }),
);

// getting about page
router.get(
  "/about",
  asyncWrap(async (req, res) => {
    res.render("pages/about", {
      title: "About – UOS Past Papers",
      metaDescription:
        "Learn about the UOS Past Papers project and our mission.",
    });
  }),
);

module.exports = router;
