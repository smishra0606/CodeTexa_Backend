const express = require('express');
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const {
    getCourses,
    getLatestCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    completeLesson,
    markLessonComplete,
    checkCourseCompletion,
    getEnrolledCourses,
    getMentorCourses,
    getMentorStudents,
    getSystemStats
} = require('../controllers/courseController');
const { refreshVideoUrl } = require('../middleware/videoSignMiddleware');
const { logAdminAction, getAuditLogs, getTargetAuditHistory, getAuditStats } = require('../middleware/auditMiddleware');
const { protect, isAdmin, isStudent, authorize, isSuperAdmin, optionalProtect } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer with Cloudinary storage
const upload = multer({ storage });

// Middleware to conditionally apply multer based on content-type
const optionalUpload = (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    
    // Only use multer for multipart/form-data
    if (contentType.includes('multipart/form-data')) {
        return upload.single('thumbnail')(req, res, next);
    }
    
    // For JSON or other content types, skip multer
    next();
};

// Public Routes
router.get('/', getCourses);
router.get('/latest', getLatestCourses);

// Protected Routes (must come before /:id to avoid route matching issues)
// Student completion routes (enrollment is now handled via payment verification)
router.post('/complete-lesson', protect, completeLesson);
router.patch('/complete-lesson/:courseId/:lessonId', protect, isStudent, markLessonComplete);
router.get('/check-completion/:courseId', protect, isStudent, checkCourseCompletion);
router.get('/enrolled/my-courses', protect, getEnrolledCourses);

// Video URL refresh route (for expired signed URLs)
router.get('/refresh-video/:courseId/:lessonId', protect, isStudent, refreshVideoUrl);

// Mentor routes
router.get('/mentor/my-courses', protect, authorize('mentor', 'admin', 'superadmin'), getMentorCourses);
router.get('/mentor/my-students', protect, authorize('mentor', 'admin', 'superadmin'), getMentorStudents);

// Admin routes
router.get('/admin/system-stats', protect, isAdmin, getSystemStats);
router.get('/admin/logs', protect, isSuperAdmin, getAuditLogs);
router.get('/admin/logs/target/:targetId/:targetType', protect, isSuperAdmin, getTargetAuditHistory);
router.get('/admin/logs/stats', protect, isSuperAdmin, getAuditStats);

// Public route (must come after specific routes)
// Uses optionalProtect to check authentication if token is present
router.get('/:id', optionalProtect, getCourseById);

// Protected routes (Admin/Superadmin only) with audit logging
router.post('/', protect, isAdmin, optionalUpload, logAdminAction('CREATE_COURSE', 'Course'), createCourse);
router.put('/:id', protect, isAdmin, optionalUpload, logAdminAction('UPDATE_COURSE', 'Course'), updateCourse);

// Admin/Superadmin only routes
router.delete('/:id', protect, isAdmin, logAdminAction('DELETE_COURSE', 'Course'), deleteCourse);

module.exports = router;
