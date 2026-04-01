const User = require('../models/User');

// Regex patterns for validation
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
const MOBILE_NUMBER_REGEX = /^[6-9]\d{9}$/;

// @desc    Validate password strength
// @param   {string} password - The password to validate
// @return  {object} Validation result with success flag and message
const validatePassword = (password) => {
    if (!password) {
        return { valid: false, message: 'Password is required' };
    }

    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/\d/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number' };
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>\/?)' };
    }

    return { valid: true, message: 'Password is valid' };
};

// @desc    Validate mobile number
// @param   {string} mobileNumber - The mobile number to validate
// @return  {object} Validation result with success flag and message
const validateMobileNumber = (mobileNumber) => {
    if (!mobileNumber) {
        return { valid: false, message: 'Mobile number is required' };
    }

    const cleanNumber = mobileNumber.toString().replace(/\D/g, '');

    if (cleanNumber.length !== 10) {
        return { valid: false, message: 'Mobile number must be exactly 10 digits' };
    }

    if (!MOBILE_NUMBER_REGEX.test(cleanNumber)) {
        return { valid: false, message: 'Mobile number must be a valid Indian number (starting with 6-9)' };
    }

    return { valid: true, message: 'Mobile number is valid' };
};

// Export validation functions
exports.validatePassword = validatePassword;
exports.validateMobileNumber = validateMobileNumber;

// @desc    Get all mentors
// @route   GET /api/users/mentors
// @access  Private (Admin/SuperAdmin)
exports.getMentors = async (req, res) => {
    try {
        const mentors = await User.find({ role: 'mentor' })
            .select('name email role createdAt')
            .sort({ name: 1 });

        res.status(200).json({
            success: true,
            count: mentors.length,
            data: mentors
        });
    } catch (error) {
        console.error('Get mentors error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching mentors',
            error: error.message
        });
    }
};
