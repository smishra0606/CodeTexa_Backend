const express = require('express');
const { getQuizQuestions, submitQuiz } = require('../controllers/quizController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All quiz routes are protected (require authentication)
router.use(protect);

// Get quiz questions for a course
router.get('/course/:courseId', getQuizQuestions);

// Submit quiz answers
router.post('/submit', submitQuiz);

module.exports = router;
