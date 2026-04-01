const express = require('express');
const { registerUser, loginUser, updateProfile, changePassword, updateStreak } = require('../controllers/authController');
const { getMentors } = require('../controllers/userController');
const { getEnrolledCourses } = require('../controllers/courseController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Public Routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected Routes
router.get('/profile', protect, async (req, res) => {
    try {
        const User = require('../models/User');
        
        // Fetch user with fully populated coursesEnrolled (includes nested instructor population)
        const user = await User.findById(req.user._id)
            .populate({
                path: 'coursesEnrolled',
                select: 'title description price thumbnail category instructor totalEnrolled modules',
                populate: {
                    path: 'instructor',
                    select: 'name email'
                }
            });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user profile',
            error: error.message
        });
    }
});

router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/update-streak', protect, updateStreak);

// Student Routes
router.get('/my-courses', protect, getEnrolledCourses);

// Admin Routes
router.get('/mentors', protect, isAdmin, getMentors);

module.exports = router;
