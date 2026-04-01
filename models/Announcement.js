const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            required: [true, 'Please provide announcement content'],
            maxlength: [1000, 'Announcement content cannot exceed 1000 characters']
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: [true, 'Please provide a course']
        },
        targetRole: {
            type: String,
            enum: {
                values: ['students', 'mentors', 'admin', 'all'],
                message: '{VALUE} is not a valid target role'
            },
            default: 'students'
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Please provide author']
        },
        announcementType: {
            type: String,
            enum: {
                values: ['general', 'session', 'update', 'urgent'],
                message: '{VALUE} is not a valid announcement type'
            },
            default: 'general'
        },
        // Session-specific fields
        sessionDetails: {
            sessionId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Session'
            },
            meetingLink: String,
            sessionTime: String,
            sessionDate: Date
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Create index for faster queries
announcementSchema.index({ course: 1, targetRole: 1 });
announcementSchema.index({ course: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
