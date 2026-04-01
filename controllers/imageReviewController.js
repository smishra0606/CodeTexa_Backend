const ImageReview = require('../models/ImageReview');

// @desc    Add a new image review
// @route   POST /api/admin/reviews/image
// @access  Private (Admin only)
exports.addImageReview = async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        const { studentName, course, caption } = req.body;

        // Validate required fields
        if (!studentName || !course) {
            return res.status(400).json({
                success: false,
                message: 'Student name and course are required'
            });
        }

        // Get Cloudinary URL from multer (req.file.path contains the Cloudinary secure URL)
        const imageUrl = req.file.path;

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                message: 'Image upload failed - no URL provided'
            });
        }

        // Create new image review document
        const imageReview = await ImageReview.create({
            studentName,
            course,
            caption: caption || '',
            imageUrl,
            isActive: true,
            sortOrder: 0
        });

        console.log('[Image Review] Successfully added image review:', {
            id: imageReview._id,
            studentName,
            course,
            imageUrl
        });

        res.status(200).json({
            success: true,
            message: 'Image review added successfully',
            data: imageReview
        });
    } catch (error) {
        console.error('[Image Review] Error adding image review:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add image review',
            error: error.message
        });
    }
};

// @desc    Get all image reviews
// @route   GET /api/admin/reviews/image
// @access  Private
exports.getImageReviews = async (req, res) => {
    try {
        const reviews = await ImageReview.find().sort({ sortOrder: 1, createdAt: -1 });

        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews
        });
    } catch (error) {
        console.error('[Image Review] Error fetching image reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch image reviews',
            error: error.message
        });
    }
};

// @desc    Get active image reviews (for public display)
// @route   GET /api/admin/reviews/image/active
// @access  Public
exports.getActiveImageReviews = async (req, res) => {
    try {
        const reviews = await ImageReview.find({ isActive: true }).sort({ sortOrder: 1 });

        res.status(200).json({
            success: true,
            count: reviews.length,
            data: reviews
        });
    } catch (error) {
        console.error('[Image Review] Error fetching active image reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch image reviews',
            error: error.message
        });
    }
};

// @desc    Update image review
// @route   PUT /api/admin/reviews/image/:id
// @access  Private (Admin only)
exports.updateImageReview = async (req, res) => {
    try {
        const { studentName, course, caption, isActive, sortOrder } = req.body;

        const imageReview = await ImageReview.findByIdAndUpdate(
            req.params.id,
            {
                studentName,
                course,
                caption,
                isActive,
                sortOrder
            },
            { new: true, runValidators: true }
        );

        if (!imageReview) {
            return res.status(404).json({
                success: false,
                message: 'Image review not found'
            });
        }

        console.log('[Image Review] Updated image review:', imageReview._id);

        res.status(200).json({
            success: true,
            message: 'Image review updated successfully',
            data: imageReview
        });
    } catch (error) {
        console.error('[Image Review] Error updating image review:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update image review',
            error: error.message
        });
    }
};

// @desc    Delete image review
// @route   DELETE /api/admin/reviews/image/:id
// @access  Private (Admin only)
exports.deleteImageReview = async (req, res) => {
    try {
        const imageReview = await ImageReview.findByIdAndDelete(req.params.id);

        if (!imageReview) {
            return res.status(404).json({
                success: false,
                message: 'Image review not found'
            });
        }

        console.log('[Image Review] Deleted image review:', imageReview._id);

        res.status(200).json({
            success: true,
            message: 'Image review deleted successfully',
            data: {}
        });
    } catch (error) {
        console.error('[Image Review] Error deleting image review:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete image review',
            error: error.message
        });
    }
};

module.exports = exports;
