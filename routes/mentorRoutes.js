const express = require('express');
const { protect, isMentor } = require('../middleware/authMiddleware');

const router = express.Router();

// Mentor Dashboard
router.get('/dashboard', protect, isMentor, (req, res) => {
    res.status(200).json({
        success: true,
        message: `Welcome to the Mentor Dashboard, ${req.user.name}`
    });
});

module.exports = router;
