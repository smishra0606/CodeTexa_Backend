const mongoose = require('mongoose');

const imageReviewSchema = new mongoose.Schema(
    {
        studentName: {
            type: String,
            required: [true, 'Please provide student name'],
            trim: true
        },
        course: {
            type: String,
            required: [true, 'Please provide course name'],
            trim: true
        },
        caption: {
            type: String,
            trim: true
        },
        imageUrl: {
            type: String,
            required: [true, 'Image URL is required']
        },
        isActive: {
            type: Boolean,
            default: true
        },
        sortOrder: {
            type: Number,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('ImageReview', imageReviewSchema);
