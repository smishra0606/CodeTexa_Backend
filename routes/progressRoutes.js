const express = require('express');
const {
    getCourseProgress,
    updateCourseProgress,
    toggleModuleCompletion,
    getMyProgress,
    completeLesson,
    getProgressStatus
} = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All progress routes are protected (require authentication)
router.use(protect);

// Get user's progress for a specific course
router.get('/course/:courseId', getCourseProgress);

// Update user's progress for a course
router.put('/course/:courseId', updateCourseProgress);

// Toggle module completion
router.post('/course/:courseId/module/:moduleId/toggle', toggleModuleCompletion);

// Get all progress for current user
router.get('/my-progress', getMyProgress);

// Mark a lesson as complete
router.post('/complete-lesson', completeLesson);

// Get progress status for a course (check if testUnlocked)
router.get('/status/:courseId', getProgressStatus);

module.exports = router;
