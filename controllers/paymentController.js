const Razorpay = require('razorpay');
const Course = require('../models/Course');
const crypto = require('crypto');

// Initialize Razorpay instance with validation
const initializeRazorpay = () => {
    console.log('\n🔍 INITIALIZING RAZORPAY 🔍');
    console.log('RAZORPAY_KEY_ID exists:', !!process.env.RAZORPAY_KEY_ID);
    console.log('RAZORPAY_KEY_SECRET exists:', !!process.env.RAZORPAY_KEY_SECRET);
    console.log('KEY_ID value:', process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.substring(0, 10) + '...' : 'NOT SET');
    
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.error('❌ ERROR: Razorpay credentials not configured in .env file');
        console.error('Missing: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
        return null;
    }

    try {
        const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        console.log('✅ Razorpay initialized successfully');
        console.log('🔍 END INITIALIZATION 🔍\n');
        return instance;
    } catch (err) {
        console.error('❌ Failed to initialize Razorpay:', err.message);
        console.log('🔍 END INITIALIZATION 🔍\n');
        return null;
    }
};

let razorpay = initializeRazorpay();

// @desc    Create Razorpay order for course checkout
// @route   POST /api/payment/checkout
// @access  Private
exports.createCheckoutOrder = async (req, res) => {
    try {
        // Strict authentication check
        if (!req.user || !req.user._id) {
            console.error('❌ AUTHENTICATION FAILED - req.user or req.user._id is missing');
            console.error('req.user exists:', !!req.user);
            console.error('req.user._id exists:', !!req.user?._id);
            return res.status(401).json({
                success: false,
                message: 'Unauthorized - User authentication required',
                error: 'User not authenticated'
            });
        }

        console.log('✅ User authenticated:', req.user._id || req.user.id);

        // Check if Razorpay is initialized
        if (!razorpay) {
            console.error('ERROR: Razorpay not initialized. Check .env for RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
            return res.status(500).json({
                success: false,
                message: 'Payment gateway not configured. Please contact support.',
                error: 'Razorpay credentials missing'
            });
        }

        const { courseId } = req.body;
        console.log('Checkout request for courseId:', courseId);

        // Validate courseId
        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: 'Course ID is required'
            });
        }

        // Fetch course from database
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        console.log('Course found:', course.title, 'Price:', course.price);

        // Validate course price
        if (!course.price || course.price <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid course price'
            });
        }

        // Create Razorpay order with strict string conversion to avoid undefined values
        const userId = (req.user._id || req.user.id).toString();
        const options = {
            amount: Math.round(course.price * 100), // Amount in paise (Razorpay expects amount in smallest currency unit)
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`, // Shortened to stay under Razorpay's 40-character limit
            notes: {
                courseId: course._id.toString(),
                courseTitle: course.title || 'N/A',
                userId: userId,
            }
        };

        console.log('Creating Razorpay order with options:', JSON.stringify(options, null, 2));
        console.log('Razorpay instance type:', razorpay?.constructor?.name);
        console.log('Razorpay orders method exists:', typeof razorpay?.orders?.create);
        
        let order;
        try {
            order = await razorpay.orders.create(options);
            console.log('✓ Razorpay order created successfully:', order.id);
        } catch (razorpayError) {
            console.error('✗ Razorpay API Error:', razorpayError.message);
            console.error('  Status:', razorpayError.statusCode);
            console.error('  Response:', razorpayError.response);
            throw razorpayError;
        }

        // Return order details to frontend
        console.log('Sending response with orderId:', order.id);
        res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            courseTitle: course.title,
            coursePrice: course.price,
        });

    } catch (error) {
        console.error('\n❌ CHECKOUT ORDER ERROR ❌');
        console.error('Error Type:', error.constructor.name);
        console.error('Error Message:', error.message);
        console.error('Error Code:', error.code);
        console.error('Error Status:', error.statusCode);
        if (error.response) {
            console.error('Error Response:', JSON.stringify(error.response, null, 2));
        }
        console.error('Full Stack:', error.stack);
        console.error('❌ END ERROR ❌\n');
        
        res.status(500).json({
            success: false,
            message: 'Failed to create checkout order',
            error: error.message,
            errorType: error.constructor.name
        });
    }
};

// @desc    Verify Razorpay payment signature and enroll user
// @route   POST /api/payment/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
    try {
        // Strict authentication check
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized - User authentication required',
                error: 'User not authenticated'
            });
        }

        // Check if Razorpay is initialized
        if (!razorpay) {
            console.error('ERROR: Razorpay not initialized. Check .env for RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
            return res.status(500).json({
                success: false,
                message: 'Payment gateway not configured. Please contact support.',
                error: 'Razorpay credentials missing'
            });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = req.body;
        console.log('✅ Verifying payment - Order:', razorpay_order_id, 'Payment:', razorpay_payment_id);
        console.log('CourseId:', courseId, 'User:', req.user._id || req.user.id);

        // Validate required fields
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Missing payment verification details'
            });
        }

        if (!courseId) {
            return res.status(400).json({
                success: false,
                message: 'Course ID is required'
            });
        }

        // Verify signature using crypto module
        const crypto = require('crypto');
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;
        console.log('Signature verification:', isAuthentic ? 'SUCCESS' : 'FAILED');

        if (!isAuthentic) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed - Invalid signature'
            });
        }

        // Payment verified successfully - Now enroll the user
        const User = require('../models/User');
        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            console.error('User not found:', userId);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('User found:', user.name);

        // Check if user is already enrolled
        if (user.coursesEnrolled.includes(courseId)) {
            console.log('⚠️ User already enrolled in course:', courseId);
            return res.status(400).json({
                success: false,
                message: 'Already enrolled in this course'
            });
        }

        // Verify course exists
        const course = await Course.findById(courseId);
        if (!course) {
            console.error('❌ Course not found:', courseId);
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Add course to user's enrolledCourses array
        user.coursesEnrolled.push(courseId);
        await user.save();
        console.log('✅ User successfully enrolled in course:', course.title);
        console.log('Total courses enrolled:', user.coursesEnrolled.length);

        // Return success response
        res.status(200).json({
            success: true,
            message: 'Payment verified and enrollment successful! Redirecting to dashboard...',
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            courseId: courseId,
            courseTitle: course.title
        });

    } catch (error) {
        console.error('Payment verification error:', error.message);
        console.error('Full error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: error.message
        });
    }
};

// @desc    Diagnose payment configuration
// @route   GET /api/payment/diagnose
// @access  Public (for debugging)
exports.diagnosePayment = async (req, res) => {
    console.log('\n\n🔧 PAYMENT CONFIGURATION DIAGNOSTIC 🔧\n');
    
    const diagnostic = {
        timestamp: new Date().toISOString(),
        nodeEnvironment: process.env.NODE_ENV,
        razorpayKeyIdExists: !!process.env.RAZORPAY_KEY_ID,
        razorpayKeySecretExists: !!process.env.RAZORPAY_KEY_SECRET,
        razorpayInitialized: !!razorpay,
        razorpayHasOrders: razorpay && !!razorpay.orders,
        razorpayHasCreate: razorpay && !!razorpay.orders && !!razorpay.orders.create,
    };

    // Log diagnostic info
    console.log('🔍 DIAGNOSTIC REPORT:');
    console.log(JSON.stringify(diagnostic, null, 2));

    // Check database connection
    try {
        const mongoose = require('mongoose');
        diagnostic.mongooseConnected = mongoose.connection.readyState === 1;
        console.log('✅ Database connection status:', mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED');
    } catch (err) {
        diagnostic.mongooseError = err.message;
        console.log('❌ Database error:', err.message);
    }

    // Test Course model lookup
    try {
        const courseCount = await Course.countDocuments();
        diagnostic.totalCourses = courseCount;
        console.log('✅ Total courses in database:', courseCount);
        
        if (courseCount > 0) {
            const sampleCourse = await Course.findOne();
            diagnostic.sampleCourseTitleExists = !!sampleCourse.title;
            diagnostic.sampleCoursePriceExists = sampleCourse.price !== undefined;
            diagnostic.sampleCoursePrice = sampleCourse.price;
            console.log('✅ Sample course price:', sampleCourse.price);
        }
    } catch (err) {
        diagnostic.courseError = err.message;
        console.log('❌ Course lookup error:', err.message);
    }

    console.log('\n🔧 END DIAGNOSTIC 🔧\n\n');

    // Return diagnostic report as JSON
    res.status(200).json(diagnostic);
};

