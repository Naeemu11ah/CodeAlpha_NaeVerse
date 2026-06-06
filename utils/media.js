let cloudinary;
try {
  const cfg = require("../cloudConfig");
  cloudinary = cfg.cloudinary || require("cloudinary").v2;
} catch (e) {
  cloudinary = require("cloudinary").v2;
}

const extractPublicIdFromUrl = (url) => {
  if (!url) return null;
  const m = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:$|\?)/);
  return m ? m[1] : null;
};

async function deleteCloudinaryMedia(mediaItem) {
  try {
    if (!mediaItem) return;
    const resourceType = mediaItem && mediaItem.mediaType === "video" ? "video" : "image";
    if (typeof mediaItem === "string") {
      const publicId = extractPublicIdFromUrl(mediaItem);
      if (publicId) await cloudinary.uploader.destroy(publicId, { resource_type: "auto" });
      return;
    }
    if (mediaItem.filename) {
      await cloudinary.uploader.destroy(mediaItem.filename, { resource_type: resourceType });
      return;
    }
    if (mediaItem.url) {
      const publicId = extractPublicIdFromUrl(mediaItem.url);
      if (publicId) await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    }
  } catch (err) {
    console.log("Cloudinary delete error:", err);
  }
}

module.exports = {
  deleteCloudinaryMedia,
  extractPublicIdFromUrl,
};
