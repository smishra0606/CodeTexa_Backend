const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please provide a session title'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters']
        },
        mentorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Please provide a mentor'],
            validate: {
                isAsync: true,
                validator: async function (mentorId) {
                    const User = require('./User');
                    const user = await User.findById(mentorId);
                    return user && (user.role === 'mentor' || user.role === 'admin');
                },
                message: 'Session creator must have role mentor or admin'
            }
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: [true, 'Please provide a course']
        },
        meetingLink: {
            type: String,
            required: [true, 'Please provide a meeting link'],
            trim: true
        },
        date: {
            type: Date,
            required: [true, 'Please provide a session date']
        },
        time: {
            type: String,
            required: [true, 'Please provide a session time']
        },
        duration: {
            type: Number,
            default: 60, // Duration in minutes
            min: [15, 'Duration must be at least 15 minutes']
        },
        status: {
            type: String,
            enum: {
                values: ['scheduled', 'ongoing', 'completed', 'cancelled'],
                message: '{VALUE} is not a valid status'
            },
            default: 'scheduled'
        },
        attendees: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'User',
            default: []
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters']
        }
    },
    {
        timestamps: true
    }
);

// Index for querying sessions by mentor and course
sessionSchema.index({ mentorId: 1, courseId: 1 });
sessionSchema.index({ date: 1 });
sessionSchema.index({ status: 1 });

module.exports = mongoose.model('Session', sessionSchema);
