const express = require('express');
const { generateCertificate, getMyCertificates } = require('../controllers/certificateController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All certificate routes are protected (require authentication)
router.use(protect);

// Generate certificate after passing quiz
router.post('/generate', generateCertificate);

// Get user's certificates
router.get('/my-certificates', getMyCertificates);

module.exports = router;
