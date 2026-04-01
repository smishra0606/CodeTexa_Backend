const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { logActivity } = require('./activityController');
const { sendEmail, getWelcomeEmailTemplate } = require('../utils/sendEmail');
const { validatePassword, validateMobileNumber } = require('./userController');

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res, next) => {
    try {
        const { name, username, email, mobileNumber, password, role } = req.body;

        // Validation
        if (!name || !username || !email || !mobileNumber || !password) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed: Please provide name, username, email, mobile number, and password'
            });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: `Validation failed: ${passwordValidation.message}`
            });
        }

        // Validate mobile number
        const mobileValidation = validateMobileNumber(mobileNumber);
        if (!mobileValidation.valid) {
            return res.status(400).json({
                success: false,
                message: `Validation failed: ${mobileValidation.message}`
            });
        }

        // Check if username already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: 'Username already taken'
            });
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with that email'
            });
        }

        // Check if mobile number already exists
        const existingMobile = await User.findOne({ mobileNumber });
        if (existingMobile) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number already registered'
            });
        }

        // Create user
        let user = await User.create({
            name,
            username,
            email,
            mobileNumber,
            password,
            role: role || 'student' // Default to student if not provided
        });

        // Generate token
        const token = generateToken(user);

        // Log activity for student registration
        if (user.role === 'student') {
            await logActivity(
                'student_registered',
                user._id,
                user.name,
                user.role,
                `${user.name} registered as a new student`,
                { email: user.email }
            );
        }

        // Send welcome email (non-blocking)
        sendEmail({
            email: user.email,
            subject: 'Welcome to CodeTexa - Your Learning Journey Begins! 🚀',
            html: getWelcomeEmailTemplate(user.name, user.role)
        }).catch(error => {
            console.error('[REGISTRATION] Failed to send welcome email:', error.message);
            // Don't fail registration if email fails
        });

        // Return user data (without password) and token
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('[REGISTRATION] Error during registration:', error.message);
        console.error('[REGISTRATION] Error stack:', error.stack);

        // Handle validation errors from mongoose
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: `Validation failed: ${messages.join(', ')}`
            });
        }

        // Handle duplicate key error (username, email, or mobile number)
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            let message = 'Duplicate field value entered';
            
            if (field === 'username') {
                message = 'Username already taken';
            } else if (field === 'email') {
                message = 'Email already in use';
            } else if (field === 'mobileNumber') {
                message = 'Mobile number already registered';
            }

            return res.status(400).json({
                success: false,
                message
            });
        }

        // Handle network/database connection errors
        if (error.name === 'MongoNetworkError' || error.message.includes('ECONNREFUSED')) {
            console.error('[REGISTRATION] Database connection error');
            return res.status(503).json({
                success: false,
                message: 'Database connection timeout. Please try again later.'
            });
        }

        console.error('[REGISTRATION] Unexpected error:', error.message);
        return next(error);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email/username and password'
            });
        }

        // Check for user by email OR username (select password since it's not returned by default)
        const user = await User.findOne({
            $or: [
                { email: email },
                { username: email }
            ]
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if account is active
        if (user.isActive === false) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.'
            });
        }

        // Check password match
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = generateToken(user);

        // Return user data and token
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return next(error);
    }
};

// @desc    Update user profile (name and email)
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
    try {
        const { name, email } = req.body;

        // Validation
        if (!name && !email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide at least name or email to update'
            });
        }

        // Get user from request
        let user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if email is already in use by another user
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already in use'
                });
            }
            user.email = email;
        }

        // Update name if provided
        if (name) {
            user.name = name;
        }

        // Save updated user
        user = await user.save();

        // Log activity
        await logActivity(
            user._id,
            user.name,
            user.role,
            'profile_updated',
            'User updated their profile'
        );

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return next(error);
    }
};

// @desc    Change user password
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;

        // Validation
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide old password, new password, and confirmation'
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'New passwords do not match'
            });
        }

        // Validate new password strength
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                success: false,
                message: passwordValidation.message
            });
        }

        // Get user with password field
        const user = await User.findById(req.user.id).select('+password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify old password
        const isPasswordCorrect = await user.matchPassword(oldPassword);

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Old password is incorrect'
            });
        }

        // Set new password
        user.password = newPassword;

        // Save user (password will be hashed by pre-save middleware)
        await user.save();

        // Log activity
        await logActivity(
            user._id,
            user.name,
            user.role,
            'password_changed',
            'User changed their password'
        );

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        return next(error);
    }
};

// @desc    Update user's daily streak
// @route   POST /api/auth/update-streak
// @access  Private
exports.updateStreak = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
        if (lastActive) lastActive.setHours(0, 0, 0, 0);

        const diffTime = lastActive ? Math.abs(today - lastActive) : null;
        const diffDays = diffTime !== null ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : null;

        let streakUpdated = false;

        if (!lastActive || diffDays > 1) {
            user.currentStreak = 1;
            user.lastActiveDate = new Date();
            streakUpdated = true;
        } else if (diffDays === 1) {
            user.currentStreak += 1;
            user.lastActiveDate = new Date();
            streakUpdated = true;
        }

        if (user.currentStreak > user.maxStreak) {
            user.maxStreak = user.currentStreak;
        }

        if (streakUpdated) {
            await user.save();
        }

        res.status(200).json({
            success: true,
            data: { currentStreak: user.currentStreak, maxStreak: user.maxStreak, streakUpdated }
        });
    } catch (error) {
        console.error('Streak update error:', error);
        res.status(500).json({ success: false, message: 'Failed to update streak' });
    }
};

module.exports = exports;
