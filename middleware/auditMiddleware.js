const AuditLog = require('../models/AuditLog');

/**
 * Middleware to log administrative actions
 * Usage: router.post('/course', logAdminAction('CREATE_COURSE', 'Course'), createCourse)
 */
exports.logAdminAction = (action, targetType) => {
    return async (req, res, next) => {
        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json to capture successful responses
        res.json = function(data) {
            // Capture the response for later logging
            res.auditData = {
                data,
                statusCode: res.statusCode,
            };
            return originalJson(data);
        };

        // Capture the request info for logging
        res.logAuditData = async (targetId, changedFields = {}, description = '') => {
            try {
                const ipAddress = req.ip || req.connection.remoteAddress || '';
                const userAgent = req.get('user-agent') || '';

                // Determine if action was successful based on status code
                const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

                const auditLog = new AuditLog({
                    admin: req.user.id,
                    action,
                    targetId,
                    targetType,
                    description,
                    changedFields: new Map(Object.entries(changedFields)),
                    ipAddress,
                    userAgent,
                    status: isSuccess ? 'SUCCESS' : 'FAILED',
                    errorMessage: isSuccess ? '' : (res.auditData?.data?.message || 'Unknown error'),
                });

                await auditLog.save();
                console.log(
                    `[AUDIT] Admin ${req.user.id} performed ${action} on ${targetType} ${targetId}`
                );
            } catch (error) {
                console.error('Error logging audit:', error);
                // Don't throw error - logging failure shouldn't break the request
            }
        };

        next();
    };
};

/**
 * Middleware to automatically log errors for audit trails
 */
exports.logAuditError = async (req, res, error, action, targetType, targetId) => {
    try {
        const ipAddress = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.get('user-agent') || '';

        const auditLog = new AuditLog({
            admin: req.user?.id || 'Unknown',
            action,
            targetId,
            targetType,
            description: `Error: ${error.message}`,
            ipAddress,
            userAgent,
            status: 'FAILED',
            errorMessage: error.message,
        });

        await auditLog.save();
        console.log(
            `[AUDIT] Admin action FAILED: ${action} on ${targetType} ${targetId} - ${error.message}`
        );
    } catch (logError) {
        console.error('Error logging audit failure:', logError);
    }
};

/**
 * Get all audit logs (Super Admin only)
 */
const User = require('../models/User');

exports.getAuditLogs = async (req, res) => {
    try {
        const { action, admin, targetType, startDate, endDate, limit = 50, page = 1 } = req.query;

        let query = {};

        if (action) {
            query.action = action;
        }

        if (admin) {
            query.admin = admin;
        }

        if (targetType) {
            query.targetType = targetType;
        }

        // Date range filtering
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }

        const skip = (page - 1) * limit;

        const logs = await AuditLog.find(query)
            .populate('admin', 'name email role')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await AuditLog.countDocuments(query);

        res.status(200).json({
            success: true,
            count: logs.length,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: logs,
        });
    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit logs',
            error: error.message,
        });
    }
};

/**
 * Get audit log report for a specific target
 */
exports.getTargetAuditHistory = async (req, res) => {
    try {
        const { targetId, targetType } = req.params;

        const logs = await AuditLog.find({ targetId, targetType })
            .populate('admin', 'name email role')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs,
        });
    } catch (error) {
        console.error('Get target audit history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch target audit history',
            error: error.message,
        });
    }
};

/**
 * Get audit statistics for Super Admin dashboard
 */
exports.getAuditStats = async (req, res) => {
    try {
        const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const stats = {
            totalLogs: await AuditLog.countDocuments(),
            last30Days: await AuditLog.countDocuments({ createdAt: { $gte: last30Days } }),
            byAction: await AuditLog.aggregate([
                {
                    $group: {
                        _id: '$action',
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
            ]),
            byAdmin: await AuditLog.aggregate([
                {
                    $group: {
                        _id: '$admin',
                        count: { $sum: 1 },
                    },
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'adminInfo',
                    },
                },
                {
                    $unwind: '$adminInfo',
                },
                {
                    $project: {
                        _id: 0,
                        adminId: '$_id',
                        adminName: '$adminInfo.name',
                        count: 1,
                    },
                },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
            failedActions: await AuditLog.countDocuments({ status: 'FAILED' }),
        };

        res.status(200).json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('Get audit stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch audit statistics',
            error: error.message,
        });
    }
};
