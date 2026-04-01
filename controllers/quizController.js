const Quiz = require('../models/Quiz');
const Course = require('../models/Course');

// @desc    Get quiz questions for a course
// @route   GET /api/quiz/course/:courseId
// @access  Private
exports.getQuizQuestions = async (req, res, next) => {
    try {
        const { courseId } = req.params;

        // Verify course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Get quiz for the course
        const quiz = await Quiz.findOne({ courseId });

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: 'No quiz found for this course'
            });
        }

        // Return quiz without revealing correct answers initially
        const questionsWithoutAnswers = quiz.questions.map(question => ({
            _id: question._id,
            questionText: question.questionText,
            questionNumber: question.questionNumber,
            options: question.options.map(option => ({
                optionText: option.optionText
                // Don't send isCorrect to client
            })),
            explanation: null // Don't reveal explanation yet
        }));

        res.status(200).json({
            success: true,
            data: {
                quizId: quiz._id,
                title: quiz.title,
                description: quiz.description,
                passingScore: quiz.passingScore,
                totalQuestions: quiz.totalQuestions,
                questions: questionsWithoutAnswers
            }
        });
    } catch (error) {
        console.error('Get quiz error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quiz questions'
        });
    }
};

// @desc    Submit quiz answers and calculate score
// @route   POST /api/quiz/submit
// @access  Private
exports.submitQuiz = async (req, res, next) => {
    try {
        const { courseId, answers } = req.body;

        // Validate input
        if (!courseId || !answers) {
            return res.status(400).json({
                success: false,
                message: 'Please provide courseId and answers'
            });
        }

        // Get quiz for the course
        const quiz = await Quiz.findOne({ courseId });

        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: 'No quiz found for this course'
            });
        }

        // Calculate score
        let correctAnswers = 0;
        const detailedResults = [];

        quiz.questions.forEach((question, index) => {
            const userAnswerIndex = answers[index];
            const isCorrect = question.options[userAnswerIndex]?.isCorrect || false;

            if (isCorrect) {
                correctAnswers++;
            }

            detailedResults.push({
                questionNumber: index + 1,
                questionText: question.questionText,
                userAnswers: userAnswerIndex !== undefined ? question.options[userAnswerIndex]?.optionText : 'Not answered',
                correctAnswer: question.options.find(opt => opt.isCorrect)?.optionText,
                isCorrect,
                explanation: question.explanation
            });
        });

        const score = Math.round((correctAnswers / quiz.totalQuestions) * 100);
        const passed = score >= quiz.passingScore;

        res.status(200).json({
            success: true,
            data: {
                score,
                correctAnswers,
                totalQuestions: quiz.totalQuestions,
                passed,
                passingScore: quiz.passingScore,
                detailedResults
            }
        });
    } catch (error) {
        console.error('Submit quiz error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit quiz'
        });
    }
};

module.exports = exports;
