const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Please provide a student'],
            validate: {
                isAsync: true,
                validator: async function (studentId) {
                    const User = require('./User');
                    const user = await User.findById(studentId);
                    return user && user.role === 'student';
                },
                message: 'Student must be a valid user with student role'
            }
        },
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: [true, 'Please provide a course']
        },
        amount: {
            type: Number,
            required: [true, 'Please provide an enrollment amount'],
            min: [0, 'Amount cannot be negative']
        },
        status: {
            type: String,
            enum: {
                values: ['pending', 'completed', 'cancelled'],
                message: '{VALUE} is not a valid enrollment status'
            },
            default: 'completed'
        },
        isCompleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Create a compound index to prevent duplicate enrollments
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
