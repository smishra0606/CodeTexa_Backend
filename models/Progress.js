const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Please provide a user']
        },
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: [true, 'Please provide a course']
        },
        completedModules: {
            type: [String], // Array of module IDs
            default: []
        },
        lastAccessedModule: {
            type: String
        },
        lastAccessedAt: {
            type: Date,
            default: Date.now
        },
        progressPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },
    {
        timestamps: true
    }
);

// Compound index to ensure one progress document per user-course pair
progressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);
