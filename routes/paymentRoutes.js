const express = require('express');
const router = express.Router();
const { createCheckoutOrder, verifyPayment, diagnosePayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/payment/diagnose
// @desc    Diagnose payment configuration (no auth required for debugging)
// @access  Public (debugging endpoint)
router.get('/diagnose', diagnosePayment);

// @route   POST /api/payment/checkout
// @desc    Create Razorpay order for course checkout
// @access  Private
router.post('/checkout', protect, createCheckoutOrder);

// @route   POST /api/payment/verify
// @desc    Verify Razorpay payment signature
// @access  Private
router.post('/verify', protect, verifyPayment);

module.exports = router;
