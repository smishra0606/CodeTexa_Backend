const Announcement = require('../models/Announcement');
const Course = require('../models/Course');
const User = require('../models/User');

// @desc    Create a new announcement
// @route   POST /api/announcements
// @access  Private (Mentor/Admin only)
exports.createAnnouncement = async (req, res) => {
    try {
        const { content, courseId, targetRole, announcementType, sessionDetails } = req.body;

        // Validate required fields
        if (!content || !courseId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide content and courseId'
            });
        }

        // Check if course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the instructor of the course or an admin
        if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to post announcements for this course'
            });
        }

        // Create announcement
        const announcement = await Announcement.create({
            content,
            course: courseId,
            targetRole: targetRole || 'students',
            announcementType: announcementType || 'general',
            author: req.user._id,
            sessionDetails: sessionDetails || null
        });

        // Populate author and course info
        await announcement.populate('author', 'name email');
        await announcement.populate('course', 'title');

        res.status(201).json({
            success: true,
            message: 'Announcement created successfully',
            data: announcement
        });
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating announcement',
            error: error.message
        });
    }
};

// @desc    Get announcements for a course
// @route   GET /api/announcements/course/:courseId
// @access  Public
exports.getCourseAnnouncements = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { targetRole } = req.query;

        let query = { course: courseId };

        // If targetRole is specified, filter by it
        if (targetRole) {
            query.targetRole = { $in: [targetRole, 'all'] };
        } else {
            query.targetRole = 'all';
        }

        const announcements = await Announcement.find(query)
            .populate('author', 'name email')
            .populate('course', 'title')
            .sort({ createdAt: -1 })
            .select('content course targetRole author announcementType sessionDetails createdAt');

        res.status(200).json({
            success: true,
            count: announcements.length,
            data: announcements
        });
    } catch (error) {
        console.error('Get course announcements error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching announcements',
            error: error.message
        });
    }
};

// @desc    Get announcements for student's enrolled courses
// @route   GET /api/announcements/my-announcements
// @access  Private (Students)
exports.getMyAnnouncements = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('coursesEnrolled role');

        if (!user || !user.coursesEnrolled || user.coursesEnrolled.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }

        // Get announcements for all enrolled courses that are targeted at students or all
        const announcements = await Announcement.find({
            course: { $in: user.coursesEnrolled },
            targetRole: { $in: ['students', 'all'] }
        })
            .populate('author', 'name email')
            .populate('course', 'title')
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            count: announcements.length,
            data: announcements
        });
    } catch (error) {
        console.error('Get my announcements error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching announcements',
            error: error.message
        });
    }
};

// @desc    Get announcements for mentor's courses
// @route   GET /api/announcements/mentor/my-announcements
// @access  Private (Mentor/Admin)
exports.getMentorAnnouncements = async (req, res) => {
    try {
        const mentorId = req.user._id;

        // Get all courses taught by this mentor
        const courses = await Course.find({ instructor: mentorId }).select('_id');
        const courseIds = courses.map(course => course._id);

        if (courseIds.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }

        // Get announcements for these courses
        const announcements = await Announcement.find({
            course: { $in: courseIds }
        })
            .populate('author', 'name email')
            .populate('course', 'title')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: announcements.length,
            data: announcements
        });
    } catch (error) {
        console.error('Get mentor announcements error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching announcements',
            error: error.message
        });
    }
};

// @desc    Delete an announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Author or Admin)
exports.deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        // Check if user is the author or an admin
        if (announcement.author.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to delete this announcement'
            });
        }

        await Announcement.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Announcement deleted successfully'
        });
    } catch (error) {
        console.error('Delete announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting announcement',
            error: error.message
        });
    }
};
