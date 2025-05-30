// middlewares/cloudinaryUpload.js
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Tạo storage sử dụng cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "plantimages",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

// Khởi tạo multer với storage
const upload = multer({ storage });

module.exports = upload;
