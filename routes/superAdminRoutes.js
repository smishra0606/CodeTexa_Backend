const express = require('express');
const { getCompanyOverview, getRevenueStats } = require('../controllers/superAdminController');
const { protect, isSuperAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected and require superadmin role
router.get('/overview', protect, isSuperAdmin, getCompanyOverview);
router.get('/revenue-stats', protect, isSuperAdmin, getRevenueStats);

module.exports = router;
