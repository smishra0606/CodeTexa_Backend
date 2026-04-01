const Activity = require('../models/Activity');

// @desc    Log a new activity
// @access  Internal helper function
exports.logActivity = async (type, userId, userName, userRole, description, metadata = {}) => {
    try {
        await Activity.create({
            type,
            userId,
            userName,
            userRole,
            description,
            metadata
        });
    } catch (error) {
        console.error('Error logging activity:', error);
        // Don't throw error to prevent disrupting the main operation
    }
};

// @desc    Get recent activities
// @route   GET /api/activities/recent
// @access  Private (SuperAdmin only)
exports.getRecentActivities = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const page = parseInt(req.query.page) || 1;
        const skip = (page - 1) * limit;

        const activities = await Activity.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Activity.countDocuments();

        res.status(200).json({
            success: true,
            count: activities.length,
            total,
            page,
            pages: Math.ceil(total / limit),
            data: activities
        });
    } catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activities'
        });
    }
};

// @desc    Get activities by type
// @route   GET /api/activities/type/:type
// @access  Private (SuperAdmin only)
exports.getActivitiesByType = async (req, res, next) => {
    try {
        const { type } = req.params;
        const limit = parseInt(req.query.limit) || 20;

        const activities = await Activity.find({ type })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.status(200).json({
            success: true,
            count: activities.length,
            data: activities
        });
    } catch (error) {
        console.error('Get activities by type error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activities'
        });
    }
};

// @desc    Get activity stats
// @route   GET /api/activities/stats
// @access  Private (SuperAdmin only)
exports.getActivityStats = async (req, res, next) => {
    try {
        const stats = await Activity.aggregate([
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statsObject = {
            student_registered: 0,
            course_created: 0,
            session_scheduled: 0
        };

        stats.forEach(stat => {
            statsObject[stat._id] = stat.count;
        });

        res.status(200).json({
            success: true,
            data: statsObject
        });
    } catch (error) {
        console.error('Get activity stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activity stats'
        });
    }
};

module.exports = exports;
