const express = require('express');
const {
    createAnnouncement,
    getCourseAnnouncements,
    getMyAnnouncements,
    getMentorAnnouncements,
    deleteAnnouncement
} = require('../controllers/announcementController');
const { protect, authorize, isMentor } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/course/:courseId', getCourseAnnouncements);

// Protected routes
router.post('/', protect, authorize('mentor', 'admin', 'superadmin'), createAnnouncement);

// Student routes
router.get('/my-announcements', protect, getMyAnnouncements);

// Mentor routes
router.get('/mentor/my-announcements', protect, isMentor, getMentorAnnouncements);

// Delete route
router.delete('/:id', protect, deleteAnnouncement);

module.exports = router;
