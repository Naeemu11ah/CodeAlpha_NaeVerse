const Joi = require("joi");

// Schema validation for creating posts
const postSchema = Joi.object({
  caption: Joi.string().max(200).allow("", null),
});

// Schema validation for updating posts (caption only)
const postUpdateSchema = Joi.object({
  caption: Joi.string().max(200).allow("", null),
});

// Schema validation for user signup
const signupSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(8).required(),
});

// Schema validation for editing user profile (all fields optional)
const userEditSchema = Joi.object({
  name: Joi.string().max(30).allow("", null),
  bio: Joi.string().max(120).allow("", null),
  username: Joi.string().alphanum().min(3).max(30).allow("", null),
  password: Joi.string().min(8).allow("", null),
});

// Schema validation for comments
const commentSchema = Joi.object({
  text: Joi.string().trim().min(1).max(120).required(),
});

// Middleware helpers
function wantsJson(req) {
  return (
    req.xhr ||
    ((req.get && req.get("Accept")) || "").includes("application/json")
  );
}

function formatJoiError(err) {
  if (!err || !err.details) return "Invalid input";
  return err.details.map((d) => d.message).join(", ");
}

// Exported middleware
module.exports.validateNewPost = (req, res, next) => {
  const { error } = postSchema.validate(
    { caption: req.body && req.body.caption },
    { abortEarly: false },
  );
  if (error) {
    const msg = formatJoiError(error);
    if (wantsJson(req))
      return res.status(400).json({ success: false, message: msg });
    req.flash && req.flash("error", msg);
    return res.status(400).redirect("back");
  }
  next();
};

module.exports.validatePostUpdate = (req, res, next) => {
  const { error } = postUpdateSchema.validate(
    { caption: req.body && req.body.caption },
    { abortEarly: false },
  );
  if (error) {
    const msg = formatJoiError(error);
    if (wantsJson(req))
      return res.status(400).json({ success: false, message: msg });
    req.flash && req.flash("error", msg);
    return res.status(400).redirect("back");
  }
  next();
};

module.exports.validateSignup = (req, res, next) => {
  const { error } = signupSchema.validate(req.body || {}, {
    abortEarly: false,
  });
  if (error) {
    const msg = formatJoiError(error);
    req.flash && req.flash("error", msg);
    res.locals.errorMessage = req.flash && req.flash("error");
    return res.status(400).render("users/signup", {
      title: "Create Account – NaeVerse",
      metaDescription: "Sign up to contribute to the NaeVerse community.",
    });
  }
  next();
};

module.exports.validateUserEdit = (req, res, next) => {
  const { error } = userEditSchema.validate(req.body || {}, {
    abortEarly: false,
  });
  if (error) {
    const msg = formatJoiError(error);
    if (wantsJson(req))
      return res.status(400).json({ success: false, message: msg });
    req.flash && req.flash("error", msg);
    return res
      .status(400)
      .redirect("/user/profile/" + (req.params.id || "me") + "/edit");
  }
  next();
};

module.exports.validateProfilePic = (req, res, next) => {
  // multer already processed the file (route uses upload.single)
  if (!req.file) {
    req.flash &&
      req.flash(
        "error",
        "No file uploaded. Use the Remove button to delete the profile picture.",
      );
    return res.status(400).redirect("back");
  }
  const mimetype = req.file.mimetype || "";
  if (!mimetype.startsWith("image/")) {
    req.flash &&
      req.flash("error", "Profile picture must be an image (png/jpg/jpeg).");
    return res
      .status(400)
      .redirect("/user/profile/" + (req.params.id || "me") + "/editProfilePic");
  }
  next();
};

module.exports.validateComment = (req, res, next) => {
  const text = (req.body && (req.body.text || req.body.comment)) || "";
  const { error } = commentSchema.validate({ text }, { abortEarly: false });
  if (error) {
    const msg = formatJoiError(error);
    if (wantsJson(req))
      return res.status(400).json({ success: false, message: msg });
    req.flash && req.flash("error", msg);
    return res
      .status(400)
      .redirect("/user/profile/" + (req.params.id || "me") + "/edit");
  }
  next();
};

// Expose schemas for unit testing
module.exports.schemas = {
  postSchema,
  postUpdateSchema,
  signupSchema,
  userEditSchema,
  commentSchema,
};
