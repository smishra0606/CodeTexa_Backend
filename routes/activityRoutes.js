const express = require('express');
const {
    getRecentActivities,
    getActivitiesByType,
    getActivityStats
} = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All activity routes require authentication
router.use(protect);

// Get recent activities
router.get('/recent', getRecentActivities);

// Get activities by type
router.get('/type/:type', getActivitiesByType);

// Get activity stats
router.get('/stats', getActivityStats);

module.exports = router;
