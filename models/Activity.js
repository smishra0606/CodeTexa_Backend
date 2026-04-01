const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['student_registered', 'course_created', 'session_scheduled', 'course_completed'],
            required: [true, 'Please provide activity type']
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Please provide user']
        },
        userName: {
            type: String,
            required: [true, 'Please provide user name']
        },
        userRole: {
            type: String,
            enum: ['student', 'mentor', 'admin', 'superadmin'],
            required: [true, 'Please provide user role']
        },
        description: {
            type: String,
            required: [true, 'Please provide activity description']
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

// Index for efficient querying
activitySchema.index({ createdAt: -1 });
activitySchema.index({ type: 1 });
activitySchema.index({ userId: 1 });

module.exports = mongoose.model('Activity', activitySchema);
