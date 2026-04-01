const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Admin ID is required'],
        },
        action: {
            type: String,
            required: [true, 'Action is required'],
            enum: [
                'CREATE_COURSE',
                'UPDATE_COURSE',
                'DELETE_COURSE',
                'CREATE_USER',
                'UPDATE_USER',
                'DELETE_USER',
                'SUSPEND_USER',
                'ACTIVATE_USER',
                'APPROVE_MENTOR',
                'REJECT_MENTOR',
                'UPDATE_ANNOUNCEMENT',
                'DELETE_ANNOUNCEMENT',
                'SYSTEM_CONFIG_CHANGE'
            ],
        },
        targetId: {
            type: String,
            required: [true, 'Target ID is required'],
        },
        targetType: {
            type: String,
            required: [true, 'Target type is required'],
            enum: ['Course', 'User', 'Announcement', 'System'],
        },
        description: {
            type: String,
            default: '',
        },
        changedFields: {
            type: Map,
            of: String,
            default: new Map(),
        },
        ipAddress: {
            type: String,
            default: '',
        },
        userAgent: {
            type: String,
            default: '',
        },
        status: {
            type: String,
            enum: ['SUCCESS', 'FAILED'],
            default: 'SUCCESS',
        },
        errorMessage: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient querying
auditLogSchema.index({ admin: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ targetId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
