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

  // Helpers for fuzzy matching and scoring
  function tokenizeForSearch(text) {
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9]+/gi, ""))
      .filter(Boolean);
  }

  function levenshtein(a, b) {
    a = String(a || "");
    b = String(b || "");
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const matrix = Array.from({ length: a.length + 1 }, () => []);
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[a.length][b.length];
  }

  function similarity(a, b) {
    const maxLen = Math.max(String(a).length, String(b).length);
    if (maxLen === 0) return 1;
    const dist = levenshtein(a, b);
    return 1 - dist / maxLen; // normalized to 0..1
  }

  function scoreTextAgainstQuery(text, queryTokens) {
    const textTokens = tokenizeForSearch(text);
    if (!queryTokens.length || !textTokens.length) return 0;
    let total = 0;
    for (const q of queryTokens) {
      let best = 0;
      for (const t of textTokens) {
        if (!t || !q) continue;
        if (t.includes(q)) {
          best = 1; // exact substring match -> best possible
          break;
        }
        const s = similarity(q, t);
        if (s > best) best = s;
      }
      total += best;
    }
    return total / queryTokens.length;
  }

  // Break query into tokens and use them to fetch candidates from DB
  const tokens = tokenizeForSearch(query).filter((t) => t.length >= 2);
  if (!tokens.length) {
    // fallback to the original strict regex search for very short tokens
    const regex = new RegExp(escapeRegex(query), "i");
    // include owner data so we can filter private accounts
    const posts = await Post.find({ caption: regex })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("user")
      .lean();
    const users = await User.find({ $or: [{ name: regex }, { username: regex }] })
      .select("-password -email -__v")
      .limit(50);

    // filter posts by privacy
    const viewerId = req.user && req.user._id ? String(req.user._id) : null;
    let viewer = null;
    if (viewerId) {
      try {
        viewer = await User.findById(viewerId).lean();
      } catch (err) {
        viewer = null;
      }
    }
    const filteredPosts = (posts || []).filter((p) => {
      const owner = p.user;
      if (!owner) return false;
      if (!owner.privacy || owner.privacy !== "private") return true;
      if (!viewer) return false;
      if (String(owner._id) === String(viewerId)) return true;
      if (viewer.friends && Array.isArray(viewer.friends)) {
        return viewer.friends.some((f) => String(f) === String(owner._id));
      }
      return false;
    });

    return res.render("searchedResults", { posts: filteredPosts, users, searchQuery: query });
  }

  // Build a MongoDB OR query that matches any token in caption/name/username
  const postOr = tokens.map((t) => ({ caption: new RegExp(escapeRegex(t), "i") }));
  const userOr = tokens
    .map((t) => ({ name: new RegExp(escapeRegex(t), "i") }))
    .concat(tokens.map((t) => ({ username: new RegExp(escapeRegex(t), "i") })));

  // Retrieve a reasonable candidate set then score in-memory
  const [postCandidates, userCandidates] = await Promise.all([
    Post.find({ $or: postOr }).limit(500),
    User.find({ $or: userOr }).select("-password -email -__v").limit(200),
  ]);

  const scoredPosts = postCandidates
    .map((p) => {
      const s = scoreTextAgainstQuery(p.caption || "", tokens);
      return { item: p, score: s };
    })
    .filter((x) => x.score >= 0.4) // require ~40% similarity for inclusion
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .map((x) => x.item);

  const scoredUsers = userCandidates
    .map((u) => {
      const nameScore = scoreTextAgainstQuery(u.name || "", tokens);
      const usernameScore = scoreTextAgainstQuery(u.username || "", tokens);
      const s = Math.max(nameScore, usernameScore);
      return { item: u, score: s };
    })
    .filter((x) => x.score >= 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .map((x) => x.item);
  // Filter scored posts by owner privacy (only friends can see private accounts)
  try {
    const viewerId = req.user && req.user._id ? String(req.user._id) : null;
    let viewer = null;
    if (viewerId) {
      try {
        viewer = await User.findById(viewerId).lean();
      } catch (err) {
        viewer = null;
      }
    }
    const ownerIds = Array.from(new Set((scoredPosts || []).map((p) => String(p.user))));
    const owners = ownerIds.length ? await User.find({ _id: { $in: ownerIds } }).select("_id privacy").lean() : [];
    const ownerMap = (owners || []).reduce((m, o) => { m[String(o._id)] = o; return m; }, {});
    const filtered = (scoredPosts || []).filter((p) => {
      const owner = ownerMap[String(p.user)];
      if (!owner) return true; // keep if we couldn't find the owner doc
      if (!owner.privacy || owner.privacy !== "private") return true;
      if (!viewer) return false;
      if (String(owner._id) === String(viewerId)) return true;
      if (viewer.friends && Array.isArray(viewer.friends)) {
        return viewer.friends.some((f) => String(f) === String(owner._id));
      }
      return false;
    });
    const scoredPostsFiltered = filtered.slice(0, 50);
    return res.render("searchedResults", { posts: scoredPostsFiltered, users: scoredUsers, searchQuery: query });
  } catch (err) {
    return res.render("searchedResults", { posts: scoredPosts, users: scoredUsers, searchQuery: query });
  }
};

module.exports.renderAboutPage = async (req, res) => {
  res.render("pages/about", {
    title: "About – UOS Past Papers",
    metaDescription: "Learn about the UOS Past Papers project and our mission.",
  });
};


module.exports.renderPrivacySettingsPage = async (req, res) => {
  res.render("pages/privacySettings.ejs", {
    title: "Privacy Settings – NaeVerse",
    metaDescription: "Manage your privacy settings on NaeVerse.",
  });
};