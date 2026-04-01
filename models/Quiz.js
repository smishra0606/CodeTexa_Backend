const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
    {
        courseId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: [true, 'Please provide a course']
        },
        title: {
            type: String,
            required: [true, 'Please provide a quiz title'],
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        questions: [{
            _id: mongoose.Schema.Types.ObjectId,
            questionText: {
                type: String,
                required: [true, 'Question text is required']
            },
            questionNumber: Number,
            options: [{
                optionText: String,
                isCorrect: Boolean
            }],
            explanation: String
        }],
        passingScore: {
            type: Number,
            default: 70,
            min: 0,
            max: 100
        },
        totalQuestions: {
            type: Number,
            default: function() {
                return this.questions.length;
            }
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Quiz', quizSchema);
