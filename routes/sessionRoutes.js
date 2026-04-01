const express = require('express');
const {
    createSession,
    getSessionsForCourse,
    getMentorSessions,
    getUpcomingSessions,
    updateSession,
    deleteSession
} = require('../controllers/sessionController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Protected routes - Mentor/Admin can create sessions
router.post('/', protect, authorize('mentor', 'admin'), createSession);

// Get sessions for a specific course (students can view)
router.get('/course/:courseId', getSessionsForCourse);

// Get mentor's own sessions
router.get('/mentor/my-sessions', protect, authorize('mentor', 'admin'), getMentorSessions);

// Get upcoming sessions (next 7 days)
router.get('/upcoming', protect, getUpcomingSessions);

// Update and delete sessions
router.put('/:id', protect, authorize('mentor', 'admin'), updateSession);
router.delete('/:id', protect, authorize('mentor', 'admin'), deleteSession);

module.exports = router;
