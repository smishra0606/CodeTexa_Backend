const express = require('express');
const multer = require('multer');
const {
    addImageReview,
    getImageReviews,
    getActiveImageReviews,
    updateImageReview,
    deleteImageReview
} = require('../controllers/imageReviewController');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { reviewsStorage } = require('../config/cloudinary');

const router = express.Router();

// Configure multer for image reviews using Cloudinary storage
const upload = multer({
    storage: reviewsStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Public route - get active image reviews
router.get('/active', getActiveImageReviews);

// Protected routes - require authentication and admin role
router.use(protect, isAdmin);

// Get all image reviews
router.get('/', getImageReviews);

// Add new image review with file upload
router.post('/', upload.single('image'), addImageReview);

// Update image review
router.put('/:id', updateImageReview);

// Delete image review
router.delete('/:id', deleteImageReview);

module.exports = router;
