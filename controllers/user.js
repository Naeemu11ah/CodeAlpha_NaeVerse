const User = require("../models/user");
const Post = require("../models/post");
const Comment = require("../models/comments");
const cloudConfig = require("../cloudConfig");

module.exports.renderSignupForm = (req, res) => {
  res.render("users/signup", {
    title: "Create Account – NaeVerse",
    metaDescription: "Sign up to contribute to the NaeVerse community.",
  });
};

module.exports.postingSignupForm = async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      req.flash("error", "Username and password are required.");
      res.locals.errorMessage = req.flash("error");
      return res.status(400).render("users/signup", {
        title: "Create Account – NaeVerse",
        metaDescription: "Sign up to contribute to the NaeVerse community.",
      });
    }

    let newUser = new User({ username });
    const registeredUser = await User.register(newUser, password);
    req.login(registeredUser, (err) => {
      if (err) return next(err);
      req.flash("success", "Welcome to NaeVerse!");
      res.redirect("/post");
    });
  } catch (err) {
    req.flash(
      "error",
      err && err.message ? err.message : "Account not created!",
    );
    res.locals.errorMessage = req.flash("error");
    res.status(400).render("users/signup", {
      title: "Create Account – NaeVerse",
      metaDescription: "Sign up to contribute to the NaeVerse community.",
    });
  }
};

module.exports.renderLoginForm = (req, res) => {
  const next = req.query && req.query.next ? req.query.next : "";
  const nextFollowing = req.query && req.query.nextFollowing ? req.query.nextFollowing : "";
  res.render("users/login", {
    title: "Login – NaeVerse",
    metaDescription: "Login to your NaeVerse account.",
    next,
    nextFollowing,
  });
};

module.exports.afterLogin = async (req, res) => {
  req.flash("success", "Successfully Logged in!");
  // Prefer explicit `next` from the login form (POST body) if it's an internal path
  const bodyNext = req.body && req.body.next ? req.body.next : null;
  const nextFollowing = req.body && req.body.nextFollowing ? req.body.nextFollowing : null;
  if (bodyNext && String(bodyNext).startsWith("/")) {
    return res.redirect(bodyNext);
  }
  if (nextFollowing) {
    return res.redirect(`/user/${req.user._id}/following`);
  }
  let userPrevPage = res.locals.userPrevPage || "/post";
  res.redirect(userPrevPage);
};

module.exports.logout = (req, res, next) => {
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "Successfully Logged out!");
    res.redirect("/post");
  });
};

module.exports.showUserProfile = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).lean();
  if (!user) {
    req.flash("error", "User not found");
    return res.redirect("/post");
  }

  const posts = await Post.find({ user: id })
    .sort({ createdAt: -1 })
    .populate({
      path: "comments",
      populate: { path: "user", select: "username name profilePic" },
    })
    .lean();

  // posts liked by this user
  const likedPosts = await Post.find({ likes: id })
    .sort({ createdAt: -1 })
    .populate({
      path: "comments",
      populate: { path: "user", select: "username name profilePic" },
    })
    .lean();

  let profilePicSrc = "/assets/userProfilePic.png";
  if (user && user.profilePic) {
    const pp = user.profilePic;
    const url = typeof pp === "string" ? pp : pp && pp.url ? pp.url : null;
    if (url) {
      profilePicSrc =
        /^https?:\/\//i.test(url) || url.startsWith("/") ? url : "/" + url;
    }
  }

  // Ensure we have a fresh `currentUser` for this render so the template's
  // `isFollowing` check matches DB state even if session was recently updated.
  if (req.user && req.user._id) {
    try {
      const freshCurrent = await User.findById(req.user._id).lean();
      if (freshCurrent) res.locals.currentUser = freshCurrent;
    } catch (err) {
      console.error("Error refreshing currentUser for profile render:", err);
    }
  }

  res.render("users/userProfile.ejs", {
    user,
    posts,
    likedPosts,
    profilePicSrc,
    title: `${user.name || user.username} – Profile`,
    metaDescription: `View ${user.name || user.username}'s posts and profile.`,
  });
};

module.exports.showOwnProfile = async (req, res, next) => {
  try {
    if (req.user && req.user._id) {
      req.params.id = req.user._id;
    }
    return await module.exports.showUserProfile(req, res);
  } catch (err) {
    return next ? next(err) : res.redirect("/login");
  }
};

module.exports.toggleFollow = async (req, res) => {
  try {
    const targetId = req.params.id;
    const currentId = req.user && req.user._id;
    if (!currentId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (String(currentId) === String(targetId)) {
      return res.status(400).json({ error: "Cannot follow yourself" });
    }
    const currentUser = await User.findById(currentId);
    const targetUser = await User.findById(targetId);
    if (!currentUser) {
      return res.status(404).json({ error: "Current user not found" });
    }
    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }

    const isFollowing =
      currentUser.following &&
      currentUser.following.some((f) => String(f) === String(targetId));

    if (isFollowing) {
      currentUser.following = currentUser.following.filter(
        (f) => String(f) !== String(targetId),
      );
      targetUser.followers = (targetUser.followers || []).filter(
        (f) => String(f) !== String(currentId),
      );
      await currentUser.save();
      await targetUser.save();
      // fetch the fresh user from DB to avoid any stale mongoose doc state
      const updatedUser = await User.findById(currentId);
      return req.login(updatedUser, function (err) {
        if (err) console.error("Login refresh error after unfollow:", err);
        if (req.session && typeof req.session.save === "function") {
          return req.session.save(function (saveErr) {
            if (saveErr) console.error("Session save error after unfollow:", saveErr);
            return res.json({ status: "unfollowed" });
          });
        }
        return res.json({ status: "unfollowed" });
      });
    } else {
      currentUser.following = currentUser.following || [];
      if (!currentUser.following.some((f) => String(f) === String(targetId))) {
        currentUser.following.push(targetId);
      }
      targetUser.followers = targetUser.followers || [];
      if (!targetUser.followers.some((f) => String(f) === String(currentId))) {
        targetUser.followers.push(currentId);
      }
      await currentUser.save();
      await targetUser.save();
      // fetch the fresh user from DB to avoid any stale mongoose doc state
      const updatedUser = await User.findById(currentId);
      return req.login(updatedUser, function (err) {
        if (err) console.error("Login refresh error after follow:", err);
        if (req.session && typeof req.session.save === "function") {
          return req.session.save(function (saveErr) {
            if (saveErr) console.error("Session save error after follow:", saveErr);
            return res.json({ status: "followed" });
          });
        }
        return res.json({ status: "followed" });
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not update follow state" });
  }
};

module.exports.videosFollowingAccounts = async (req, res, next) => {
  try {
    // Ensure user is authenticated
    if (!req.user) {
      req.flash && req.flash("error", "Please login to view following posts");
      return res.redirect("/login");
    }

    const { id } = req.params;
    const user = await User.findById(id).lean();
    if (!user) {
      req.flash && req.flash("error", "User not found");
      return res.redirect("/post");
    }

    const following =
      user.following && user.following.length ? user.following : [];

    // If not following anyone, render empty list
    if (!following.length) {
      return res.render("posts/allPosts", {
        posts: [],
        title: "Following – NaeVerse",
        metaDescription: "Posts from accounts you follow.",
      });
    }

    const posts = await Post.find({ user: { $in: following } })
      .sort({ createdAt: -1 })
      .populate("user")
      .populate({ path: "comments", populate: { path: "user" } })
      .lean();

    res.render("posts/allPosts", {
      posts,
      title: "Following – NaeVerse",
      metaDescription: "Posts from accounts you follow.",
    });
  } catch (err) {
    return next ? next(err) : res.redirect("/post");
  }
};

module.exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/user");
    }

    // 1) Delete all posts and their Cloudinary media
    const userPosts = await Post.find({ user: id }).lean();
    for (const post of userPosts) {
      if (post.media && Array.isArray(post.media)) {
        for (const m of post.media) {
          const filename = m.filename || null;
          const url = m.url || null;
          try {
            if (filename) {
              await cloudConfig.cloudinary.uploader.destroy(filename);
            } else if (
              url &&
              typeof url === "string" &&
              url.includes("/upload/")
            ) {
              const match = url.match(/\/v\d+\/(.+)\.[a-zA-Z]+$/);
              if (match && match[1]) {
                const publicId = match[1];
                await cloudConfig.cloudinary.uploader.destroy(publicId);
              }
            }
          } catch (err) {
            console.error(
              "Cloudinary media deletion error for post:",
              post._id,
              err,
            );
          }
        }
      }
    }
    await Post.deleteMany({ user: id });

    // 2) Delete profile picture from Cloudinary if present
    try {
      const pic = user.profilePic;
      const picFilename = pic && pic.filename ? pic.filename : null;
      const picUrl =
        pic && (pic.url ? pic.url : typeof pic === "string" ? pic : null);
      if (picFilename) {
        await cloudConfig.cloudinary.uploader.destroy(picFilename);
      } else if (
        !picFilename &&
        picUrl &&
        typeof picUrl === "string" &&
        picUrl.includes("/upload/")
      ) {
        const match = picUrl.match(/\/v\d+\/(.+)\.[a-zA-Z]+$/);
        if (match && match[1]) {
          const publicId = match[1];
          await cloudConfig.cloudinary.uploader.destroy(publicId);
        }
      }
    } catch (err) {
      console.error("Cloudinary profile picture deletion error:", err);
    }

    // 3) Remove comments made by the user and remove their refs from posts
    const userComments = await Comment.find({ user: id }).lean();
    const userCommentIds = userComments.map((c) => c._id);
    if (userCommentIds.length > 0) {
      await Post.updateMany(
        { comments: { $in: userCommentIds } },
        { $pull: { comments: { $in: userCommentIds } } },
      );
      await Comment.deleteMany({ _id: { $in: userCommentIds } });
    }

    // 4) Remove likes by the user from posts
    await Post.updateMany({ likes: id }, { $pull: { likes: id } });

    // 5) Remove this user's id from other users' followers and following arrays
    await User.updateMany({ followers: id }, { $pull: { followers: id } });
    await User.updateMany({ following: id }, { $pull: { following: id } });

    // 6) Remove any saved post references (if implemented) - attempt common field names
    try {
      await User.updateMany({ saved: id }, { $pull: { saved: id } });
      await User.updateMany({ savedPosts: id }, { $pull: { savedPosts: id } });
    } catch (err) {
      // ignore if fields don't exist
    }

    // Finally remove user document
    await User.findByIdAndDelete(id);

    // Destroy session / log out
    req.logOut((err) => {
      if (err) console.error("Error logging out after account deletion:", err);
      req.flash("success", "Your account has been permanently deleted.");
      return res.redirect("/");
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not delete account. Try again later.");
    return res.redirect(`/user/profile/${req.params.id}`);
  }
};

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  res.render("users/editUserInfo.ejs", {
    user,
    title: "Edit User – NaeVerse",
    metaDescription: "Edit user details and profile information.",
  });
};

module.exports.updateUserInfo = async (req, res) => {
  const { id } = req.params;
  const { name, username, department, gender, password, bio } = req.body;
  const user = await User.findById(id);

  if (!user) {
    req.flash("error", "User does not exist!");
    return res.redirect("/user/profile/" + id);
  }

  // Always update name and bio when provided
  if (typeof name !== "undefined") user.name = name;
  if (typeof bio !== "undefined") user.bio = bio;

  // Update username only when it's provided and different
  if (
    username &&
    String(username).trim() !== "" &&
    String(username) !== String(user.username)
  ) {
    user.username = username;
  }
  if (gender) user.gender = gender;

  // Update password only when provided (non-empty)
  if (password && password.trim() !== "") {
    await new Promise((resolve, reject) => {
      user.setPassword(password, function (err, updatedUser) {
        if (err) return reject(err);
        resolve(updatedUser);
      });
    });
  }
  await user.save();
  req.flash("success", "User details updated!");
  res.redirect(`/user/profile/${user._id}`);
};

module.exports.renderEditProfilePicForm = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  res.render("users/editUserProfilePic.ejs", {
    user,
    title: "Edit Profile Picture – NaeVerse",
    metaDescription: "Change your profile picture on NaeVerse.",
  });
};

module.exports.updateUserProfilePic = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/user");
    }

    // Get old profile picture data
    const oldPic = user.profilePic;
    const oldFilename =
      oldPic && typeof oldPic === "object" ? oldPic.filename : null;
    const oldUrl =
      oldPic && typeof oldPic === "object"
        ? oldPic.url
        : typeof oldPic === "string"
        ? oldPic
        : null;

    // Function to delete old image from Cloudinary
    const deleteOldImage = async () => {
      try {
        // If filename exists, use it directly
        if (oldFilename) {
          await cloudConfig.cloudinary.uploader.destroy(oldFilename);
          return;
        }

        // If only URL exists, extract public_id
        if (oldUrl && oldUrl.includes("/upload/")) {
          const match = oldUrl.match(/\/v\d+\/(.+)\.[a-zA-Z]+$/);

          if (match && match[1]) {
            const publicId = match[1];
            await cloudConfig.cloudinary.uploader.destroy(publicId);
          }
        }
      } catch (err) {
        console.error("Cloudinary delete error:", err);
      }
    };

    // Only handle updates when a new file is uploaded
    if (!req.file) {
      req.flash(
        "error",
        "No file uploaded. Use the Remove button to delete the profile picture.",
      );
      return res.redirect(`/user/profile/${user._id}`);
    }

    // New file uploaded -> Replace profile picture

    // Delete old image first if it exists
    if (oldFilename || oldUrl) {
      await deleteOldImage();
    }

    // Save new image
    user.profilePic = {
      url:
        req.file.path ||
        req.file.secure_url ||
        req.file.url ||
        req.file.location,
      filename: req.file.filename || req.file.public_id,
    };

    await user.save();

    req.flash("success", "Profile picture updated.");
    return res.redirect(`/user/profile/${user._id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not update profile picture.");
    return res.redirect(`/user/profile/${id}`);
  }
};

module.exports.deleteUserProfilePic = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/user");
    }

    const pic = user.profilePic;
    if (!pic) {
      req.flash("error", "No profile picture to delete.");
      return res.redirect(`/user/profile/${user._id}`);
    }

    const picFilename = pic && pic.filename ? pic.filename : null;
    const picUrl =
      pic && (pic.url ? pic.url : typeof pic === "string" ? pic : null);

    // Try to delete from Cloudinary if we can determine a public id
    try {
      if (picFilename) {
        await cloudConfig.cloudinary.uploader.destroy(picFilename);
      } else if (
        picUrl &&
        typeof picUrl === "string" &&
        picUrl.includes("/upload/")
      ) {
        const match = picUrl.match(/\/v\d+\/(.+)\.[a-zA-Z]+$/);
        if (match && match[1]) {
          const publicId = match[1];
          await cloudConfig.cloudinary.uploader.destroy(publicId);
        }
      }
    } catch (err) {
      console.error("Cloudinary deletion error:", err);
    }

    // Remove from database
    user.profilePic = undefined;
    await user.save();
    req.flash("success", "Profile picture removed.");
    return res.redirect(`/user/profile/${user._id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not remove profile picture.");
    return res.redirect(`/user/profile/${id}`);
  }
};
