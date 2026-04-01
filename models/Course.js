const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide module title']
    },
    videoUrl: {
        type: String,
        required: [true, 'Please provide video URL for module']
    }
});

const quizSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, 'Please provide a quiz question']
    },
    options: {
        type: [String],
        required: [true, 'Please provide quiz options'],
        validate: {
            validator: function(options) {
                return options.length >= 2;
            },
            message: 'Quiz must have at least 2 options'
        }
    },
    correctAnswer: {
        type: String,
        required: [true, 'Please provide the correct answer'],
        validate: {
            validator: function(answer) {
                return this.options.includes(answer);
            },
            message: 'Correct answer must be one of the provided options'
        }
    }
});

const courseSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please provide a course title'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters']
        },
        description: {
            type: String,
            required: [true, 'Please provide a course description']
        },
        price: {
            type: Number,
            required: [true, 'Please provide a course price'],
            min: [0, 'Price cannot be negative']
        },
        thumbnail: {
            type: String,
            required: [true, 'Please provide a course thumbnail URL']
        },
        category: {
            type: String,
            required: [true, 'Please select a category'],
            enum: {
                values: [
                    'Web Dev',
                    'AI/ML',
                    'DevOps',
                    'Cloud Computing',
                    'Cyber Security',
                    'Full Stack',
                    'Mobile Development',
                    'Data Science',
                    'School Program',
                    'University Mentorship'
                ],
                message: '{VALUE} is not a valid category'
            }
        },
        instructor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Please provide an instructor'],
            validate: {
                isAsync: true,
                validator: async function (instructorId) {
                    const User = require('./User');
                    const user = await User.findById(instructorId);
                    return user && (user.role === 'mentor' || user.role === 'admin');
                },
                message: 'Instructor must have role mentor or admin'
            }
        },
        modules: {
            type: [moduleSchema],
            default: []
        },
        quiz: {
            type: [quizSchema],
            default: []
        },
        totalEnrolled: {
            type: Number,
            default: 0,
            min: [0, 'Total enrolled cannot be negative']
        }
    },
    {
        timestamps: true
    }
);

// Index for frequently searched fields
courseSchema.index({ category: 1 });
courseSchema.index({ instructor: 1 });
courseSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Course', courseSchema);
