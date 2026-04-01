const express = require('express');
const { getCompanyStats, getSystemSummary, getAllUsers, createUser, updateUserRole, toggleUserStatus, deleteUser } = require('../controllers/adminController');
const { protect, isAdmin, isSuperAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Super Admin only routes
router.get('/company-stats', protect, isSuperAdmin, getCompanyStats);
router.get('/system-summary', protect, isSuperAdmin, getSystemSummary);
router.get('/users', protect, isAdmin, getAllUsers);
router.post('/users', protect, isAdmin, createUser);
router.put('/users/:id/role', protect, isAdmin, updateUserRole);
router.put('/users/:id/status', protect, isAdmin, toggleUserStatus);
router.delete('/users/:id', protect, isAdmin, deleteUser);

module.exports = router;
