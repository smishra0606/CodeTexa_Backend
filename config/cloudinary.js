const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary Storage for Multer - Courses
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'CodeTexa_Courses',
    allowed_formats: ['jpg', 'png', 'webp'],
    transformation: [{ width: 1000, quality: 'auto' }],
  },
});

// Configure Cloudinary Storage for Multer - Image Reviews
const reviewsStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'CodeTexa_Reviews',
    allowed_formats: ['jpg', 'png', 'webp', 'jpeg'],
    transformation: [{ width: 800, quality: 'auto' }],
  },
});

module.exports = { cloudinary, storage, reviewsStorage };
