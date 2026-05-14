const express = require("express");
const router = express.Router();
const asyncWrap = require("../utils/asyncWrap");
const User = require("../models/user");
const Post = require("../models/post");
const controllersPages = require("../controllers/pages");
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|]/g, "\\$&");
}

module.exports.renderLandingPage = async (req, res) => {
  res.redirect("/post");
};

module.exports.renderTermsPage = async (req, res) => {
  res.render("pages/terms&conditions", {
    title: "Terms & Conditions – NaeVerse",
    metaDescription: "Read our terms and conditions for using NaeVerse.",
  });
};

module.exports.renderPrivacyPage = async (req, res) => {
  res.render("pages/privacyPolicy", {
    title: "Privacy Policy – NaeVerse",
    metaDescription: "Learn how we protect your privacy at NaeVerse.",
  });
};

module.exports.renderSearchResults = async (req, res) => {
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
};

module.exports.renderAboutPage = async (req, res) => {
  res.render("pages/about", {
    title: "About – UOS Past Papers",
    metaDescription: "Learn about the UOS Past Papers project and our mission.",
  });
};
