const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc    Protect routes - verify JWT token
// @access  Private
exports.protect = async (req, res, next) => {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user by id and attach to req object
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        next();
    } catch (error) {
        console.log(error);
        console.error('Token verification error:', error);

        // Handle specific JWT errors
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }

        res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

// @desc    Authorize specific roles
// @access  Private
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role '${req.user.role}' is not authorized to access this route`
            });
        }
        next();
    };
};

// @desc    Admin-only middleware (convenience wrapper)
// @access  Private
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Only admins and superadmins are authorized to access this route'
        });
    }
    next();
};

exports.admin = isAdmin;
exports.isAdmin = isAdmin;

// @desc    Mentor-only middleware
// @access  Private
exports.isMentor = (req, res, next) => {
    if (req.user.role !== 'mentor') {
        return res.status(403).json({
            success: false,
            message: 'Only mentors are authorized to access this route'
        });
    }
    next();
};

// @desc    SuperAdmin-only middleware
// @access  Private
exports.isSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({
            success: false,
            message: 'Only superadmins are authorized to access this route'
        });
    }
    next();
};

// @desc    Student-only middleware
// @access  Private
exports.isStudent = (req, res, next) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({
            success: false,
            message: 'Only students are authorized to access this route'
        });
    }
    next();
};

// @desc    Optional protect - verify JWT token if present, but don't fail if missing
// @access  Public/Private
exports.optionalProtect = async (req, res, next) => {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // If no token, proceed without user
    if (!token) {
        return next();
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user by id and attach to req object
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            // Token is invalid but we continue without user
            return next();
        }

        next();
    } catch (error) {
        // Token verification failed, but we continue without user
        console.error('Optional token verification failed:', error.message);
        next();
    }
};

module.exports = exports;
