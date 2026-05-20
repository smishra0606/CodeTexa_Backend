const express = require('express');
const LiveClass = require('../models/LiveClass');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/session/:courseName', authMiddleware.protect, async (req, res) => {
	try {
		const liveClass = await LiveClass.findOne({
			courseName: req.params.courseName,
			isLive: true
		});

		if (!liveClass) {
			return res.status(404).json({ message: 'No active live class found' });
		}

		return res.json(liveClass);
	} catch (error) {
		console.error('Error fetching live class session:', error);
		return res.status(500).json({ message: 'Internal server error' });
	}
});

module.exports = router;
