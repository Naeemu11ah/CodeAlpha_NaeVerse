const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
  //   "username" and "password" will be set unique and automatically for each user by "Passport" library
  name: {
    type: String,
    default: "user_993",
    trim: true,
  },
  profilePic: {
    url: {
      type: String,
      default: "",
    },
    filename: {
      type: String,
    },
  },
  bio: {
    type: String,
    maxlength: 100,
    default: "Create bio 🌟",
  },
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
  ],
  // friends (mutual) and privacy settings
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  // privacy: public | private
  privacy: {
    type: String,
    enum: ["public", "private"],
    default: "public",
  },
  // follow requests received (for private accounts)
  pendingFollowRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  // follow requests sent by this user (optional)
  sentFollowRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  dateCreated: {
    type: Date,
    default: Date.now,
  },
});

userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", userSchema);
