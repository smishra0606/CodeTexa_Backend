const Session = require('../models/Session');
const Course = require('../models/Course');
const { logActivity } = require('./activityController');

// @desc    Create a new session
// @route   POST /api/sessions
// @access  Private (Mentor/Admin only)
exports.createSession = async (req, res, next) => {
    try {
        const { title, courseId, meetingLink, date, time, duration, description } = req.body;

        // Validation
        if (!title || !courseId || !meetingLink || !date || !time) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: title, courseId, meetingLink, date, and time'
            });
        }

        // Verify course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Verify that the mentor is the instructor of the course (or is an admin)
        if (req.user.role !== 'admin' && course.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only create sessions for courses you instruct'
            });
        }

        // Create session
        const session = await Session.create({
            title,
            mentorId: req.user._id,
            courseId,
            meetingLink,
            date,
            time,
            duration: duration || 60,
            description
        });

        // Populate mentor and course details
        await session.populate('mentorId', 'name email');
        await session.populate('courseId', 'title category');

        // Log activity for session scheduling
        await logActivity(
            'session_scheduled',
            req.user._id,
            req.user.name,
            req.user.role,
            `${req.user.name} scheduled a live session: ${title}`,
            { 
                sessionId: session._id, 
                sessionTitle: title, 
                courseTitle: course.title,
                date,
                time
            }
        );

        res.status(201).json({
            success: true,
            message: 'Session created successfully',
            data: session
        });
    } catch (error) {
        console.error('Create session error:', error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create session'
        });
    }
};

// @desc    Get all sessions for a specific course
// @route   GET /api/sessions/course/:courseId
// @access  Public (enrolled students can view)
exports.getSessionsForCourse = async (req, res, next) => {
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

        // Get all sessions for the course (only scheduled and ongoing)
        const sessions = await Session.find({
            courseId,
            status: { $in: ['scheduled', 'ongoing'] }
        })
            .populate('mentorId', 'name email')
            .populate('courseId', 'title category')
            .sort({ date: 1, time: 1 });

        res.status(200).json({
            success: true,
            count: sessions.length,
            data: sessions
        });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sessions'
        });
    }
};

// @desc    Get all sessions for a mentor
// @route   GET /api/sessions/mentor/my-sessions
// @access  Private (Mentor/Admin only)
exports.getMentorSessions = async (req, res, next) => {
    try {
        // Get all sessions created by the mentor
        const sessions = await Session.find({ mentorId: req.user._id })
            .populate('courseId', 'title category thumbnail')
            .sort({ date: 1, time: 1 });

        res.status(200).json({
            success: true,
            count: sessions.length,
            data: sessions
        });
    } catch (error) {
        console.error('Get mentor sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sessions'
        });
    }
};

// @desc    Get upcoming sessions (next 7 days)
// @route   GET /api/sessions/upcoming
// @access  Private
exports.getUpcomingSessions = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(23, 59, 59, 999);

        const sessions = await Session.find({
            date: { $gte: today, $lte: nextWeek },
            status: { $in: ['scheduled', 'ongoing'] }
        })
            .populate('mentorId', 'name email')
            .populate('courseId', 'title category thumbnail')
            .sort({ date: 1, time: 1 });

        res.status(200).json({
            success: true,
            count: sessions.length,
            data: sessions
        });
    } catch (error) {
        console.error('Get upcoming sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch upcoming sessions'
        });
    }
};

// @desc    Update session
// @route   PUT /api/sessions/:id
// @access  Private (Mentor/Admin only)
exports.updateSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        let session = await Session.findById(id);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Check if user is the session creator or admin
        if (req.user.role !== 'admin' && session.mentorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own sessions'
            });
        }

        // Update session
        session = await Session.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true
        })
            .populate('mentorId', 'name email')
            .populate('courseId', 'title category');

        res.status(200).json({
            success: true,
            message: 'Session updated successfully',
            data: session
        });
    } catch (error) {
        console.error('Update session error:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update session'
        });
    }
};

// @desc    Delete session
// @route   DELETE /api/sessions/:id
// @access  Private (Mentor/Admin only)
exports.deleteSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        const session = await Session.findById(id);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Check if user is the session creator or admin
        if (req.user.role !== 'admin' && session.mentorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own sessions'
            });
        }

        await Session.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Session deleted successfully'
        });
    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete session'
        });
    }
};

module.exports = exports;
