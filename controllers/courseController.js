const Course = require('../models/Course');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const { logActivity } = require('./activityController');
const { generateSignedUrlsForCourse } = require('../utils/cloudinarySignedUrl');
const crypto = require('crypto');

// @desc    Get all courses with search and filter
// @route   GET /api/courses
// @access  Public
exports.getCourses = async (req, res) => {
    try {
        const { category, search } = req.query;

        let query = {};

        // Filter by category if provided - case-insensitive using regex
        if (category && category.trim()) {
            // Use regex for case-insensitive category matching
            query.category = { $regex: `^${category.trim()}$`, $options: 'i' };
        }

        // Search using case-insensitive regex on title and description
        if (search && search.trim()) {
            const searchRegex = { $regex: search.trim(), $options: 'i' };
            query.$or = [
                { title: searchRegex },
                { description: searchRegex }
            ];
        }

        const courses = await Course.find(query)
            .select('title description price thumbnail category instructor totalEnrolled')
            .populate('instructor', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching courses',
            error: error.message
        });
    }
};

// @desc    Get latest 6 courses for homepage
// @route   GET /api/courses/latest
// @access  Public
exports.getLatestCourses = async (req, res) => {
    try {
        const courses = await Course.find()
            .sort({ createdAt: -1 })
            .limit(6)
            .populate('instructor', 'name')
            .select('title description price thumbnail category instructor totalEnrolled createdAt');

        // Remove video URLs from preview (not needed for homepage)
        const coursesWithoutVideos = courses.map(course => {
            const courseObj = course.toObject ? course.toObject() : course;
            delete courseObj.modules; // Don't include modules on homepage
            return courseObj;
        });

        res.status(200).json({
            success: true,
            count: coursesWithoutVideos.length,
            data: coursesWithoutVideos
        });
    } catch (error) {
        console.error('Get latest courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching latest courses',
            error: error.message
        });
    }
};

// @desc    Get course by ID with full details
// @route   GET /api/courses/:id
// @access  Public (but signed URLs only for enrolled students, course instructors, and admins)
exports.getCourseById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?._id || req.user?.id; // Support both _id and id
        const userRole = req.user?.role; // From auth middleware

        // Validate MongoDB ID
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid course ID'
            });
        }

        let course = await Course.findById(id).populate('instructor', 'name');

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user has access to full course content
        let hasFullAccess = false;
        let isEnrolled = false;
        let isMentor = false;
        let isAdmin = false;

        if (userId) {
            // Check if user is the course instructor/mentor
            if (course.instructor._id.toString() === userId.toString()) {
                hasFullAccess = true;
                isMentor = true;
            }

            // Check if user is admin or superadmin
            if (userRole === 'admin' || userRole === 'superadmin') {
                hasFullAccess = true;
                isAdmin = true;
            }

            // Check if user is enrolled as a student (check both Enrollment model and User.coursesEnrolled)
            const enrollment = await Enrollment.findOne({
                student: userId,
                course: id
            });
            
            // Also check user's coursesEnrolled array as fallback (use .some() with .toString() for ObjectId comparison)
            const User = require('../models/User');
            const user = await User.findById(userId).select('coursesEnrolled');
            const isInCoursesEnrolled = user?.coursesEnrolled?.some(enrolledId => 
                enrolledId.toString() === id.toString()
            );
            
            if (enrollment || isInCoursesEnrolled) {
                hasFullAccess = true;
                isEnrolled = true;
            }
        }

        // If user has full access, generate signed URLs for videos (valid for 2 hours)
        if (hasFullAccess) {
            course = generateSignedUrlsForCourse(course, 2); // 2 hours expiration
        } else if (userId) {
            // Authenticated but no access - don't include videoUrl
            const courseObj = course.toObject ? course.toObject() : course;
            courseObj.modules = courseObj.modules.map(({ title }) => ({ title }));
            course = courseObj;
        } else {
            // Not authenticated - don't include videoUrl
            const courseObj = course.toObject ? course.toObject() : course;
            courseObj.modules = courseObj.modules.map(({ title }) => ({ title }));
            course = courseObj;
        }

        res.status(200).json({
            success: true,
            data: course,
            isEnrolled,
            isMentor,
            isAdmin,
            hasFullAccess
        });
    } catch (error) {
        console.error('Get course by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching course',
            error: error.message
        });
    }
};

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private (Mentor/Admin only)
exports.createCourse = async (req, res) => {
    try {
        const { title, description, price, thumbnail, category, modules, instructorId, quiz } = req.body;

        // Validation
        if (!title || !description || !price || !category) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: title, description, price, category'
            });
        }

        // Validate quiz data if provided
        let validatedQuiz = [];
        if (quiz && Array.isArray(quiz) && quiz.length > 0) {
            try {
                validatedQuiz = quiz.map((q, index) => {
                    // Validate question exists
                    if (!q.question || typeof q.question !== 'string') {
                        throw new Error(`Quiz question ${index + 1}: question field is required and must be a string`);
                    }

                    // Validate options array
                    if (!Array.isArray(q.options) || q.options.length < 2) {
                        throw new Error(`Quiz question ${index + 1}: must have at least 2 options`);
                    }

                    // Validate all options are strings
                    if (!q.options.every(opt => typeof opt === 'string')) {
                        throw new Error(`Quiz question ${index + 1}: all options must be strings`);
                    }

                    // Validate correctAnswer exists and is one of the options
                    if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
                        throw new Error(`Quiz question ${index + 1}: correctAnswer is required and must be a string`);
                    }

                    if (!q.options.includes(q.correctAnswer)) {
                        throw new Error(`Quiz question ${index + 1}: correctAnswer must be one of the provided options`);
                    }

                    return {
                        question: q.question,
                        options: q.options,
                        correctAnswer: q.correctAnswer
                    };
                });

            } catch (quizError) {
                return res.status(400).json({
                    success: false,
                    message: `Quiz validation error: ${quizError.message}`
                });
            }
        }

        // Handle thumbnail - accept both file upload and URL string
        let thumbnailUrl;
        if (req.file) {
            // File was uploaded via multer/Cloudinary
            thumbnailUrl = req.file.path;
        } else if (thumbnail) {
            // URL was provided in the body (legacy support)
            thumbnailUrl = thumbnail;
        } else {
            return res.status(400).json({
                success: false,
                message: 'Please provide a course thumbnail (upload or URL)'
            });
        }

        // Determine the instructor ID
        // Admin/SuperAdmin can assign a mentor (instructorId), or default to themselves
        let assignedInstructorId = req.user._id;
        
        if (instructorId && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
            // Validate the instructor exists and is a mentor
            const assignedInstructor = await User.findById(instructorId);
            if (!assignedInstructor) {
                return res.status(404).json({
                    success: false,
                    message: 'Assigned instructor not found'
                });
            }
            if (assignedInstructor.role !== 'mentor') {
                return res.status(400).json({
                    success: false,
                    message: 'Assigned instructor must have role mentor'
                });
            }
            assignedInstructorId = instructorId;
        } else {
            // If no instructorId provided or user is not admin, use current user
            const instructor = await User.findById(req.user._id);
            if (!instructor || (instructor.role !== 'mentor' && instructor.role !== 'admin' && instructor.role !== 'superadmin')) {
                return res.status(403).json({
                    success: false,
                    message: 'Only mentors and admins can create courses'
                });
            }
        }

        // Create course with assigned instructor and quiz data
        const course = await Course.create({
            title,
            description,
            price,
            thumbnail: thumbnailUrl,
            category,
            modules: modules || [],
            quiz: validatedQuiz,
            instructor: assignedInstructorId
        });

        // Populate instructor details before sending response
        await course.populate('instructor', 'name email role');

        // Log activity for course creation
        await logActivity(
            'course_created',
            req.user._id,
            req.user.name,
            req.user.role,
            `${req.user.name} created a new course: ${title}`,
            { courseId: course._id, courseTitle: title, category, instructorId: assignedInstructorId, quizCount: validatedQuiz.length }
        );

        // Log to audit trail if logAuditData exists (from audit middleware)
        if (res.logAuditData) {
            await res.logAuditData(
                course._id,
                { title, description, price, category, quizCount: validatedQuiz.length },
                `Created new course: ${title}${validatedQuiz.length > 0 ? ` with ${validatedQuiz.length} quiz questions` : ''}`
            );
        }

        res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: course
        });
    } catch (error) {
        console.error('Create course error:', error);

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
            message: 'Server error while creating course',
            error: error.message
        });
    }
};

// @desc    Update a course
// @route   PUT /api/courses/:id
// @access  Private (Mentor/Admin - owner/admin only)
exports.updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, thumbnail, category, modules, instructorId, quiz } = req.body;

        // Validate MongoDB ID
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid course ID'
            });
        }

        const course = await Course.findById(id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the instructor, admin, or superadmin
        const isAuthorized = 
            course.instructor.toString() === req.user._id.toString() || 
            req.user.role === 'admin' || 
            req.user.role === 'superadmin';

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this course'
            });
        }

        // Validate and update quiz if provided
        if (quiz !== undefined) {
            if (Array.isArray(quiz) && quiz.length > 0) {
                try {
                    const validatedQuiz = quiz.map((q, index) => {
                        // Validate question exists
                        if (!q.question || typeof q.question !== 'string') {
                            throw new Error(`Quiz question ${index + 1}: question field is required and must be a string`);
                        }

                        // Validate options array
                        if (!Array.isArray(q.options) || q.options.length < 2) {
                            throw new Error(`Quiz question ${index + 1}: must have at least 2 options`);
                        }

                        // Validate all options are strings
                        if (!q.options.every(opt => typeof opt === 'string')) {
                            throw new Error(`Quiz question ${index + 1}: all options must be strings`);
                        }

                        // Validate correctAnswer exists and is one of the options
                        if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
                            throw new Error(`Quiz question ${index + 1}: correctAnswer is required and must be a string`);
                        }

                        if (!q.options.includes(q.correctAnswer)) {
                            throw new Error(`Quiz question ${index + 1}: correctAnswer must be one of the provided options`);
                        }

                        return {
                            question: q.question,
                            options: q.options,
                            correctAnswer: q.correctAnswer
                        };
                    });

                    course.quiz = validatedQuiz;
                } catch (quizError) {
                    return res.status(400).json({
                        success: false,
                        message: `Quiz validation error: ${quizError.message}`
                    });
                }
            } else if (Array.isArray(quiz) && quiz.length === 0) {
                // Allow clearing quiz
                course.quiz = [];
            }
        }

        // Update fields
        if (title) course.title = title;
        if (description) course.description = description;
        if (price) course.price = price;
        
        // Handle thumbnail update - prioritize uploaded file over body
        if (req.file) {
            course.thumbnail = req.file.path; // Cloudinary secure URL
        } else if (thumbnail) {
            course.thumbnail = thumbnail; // Fallback to URL from body
        }
        
        if (category) course.category = category;
        if (modules) course.modules = modules;

        // Handle instructor update (admin/superadmin only)
        if (instructorId && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
            // Validate the new instructor exists and is a mentor
            const newInstructor = await User.findById(instructorId);
            if (!newInstructor) {
                return res.status(404).json({
                    success: false,
                    message: 'Assigned instructor not found'
                });
            }
            if (newInstructor.role !== 'mentor') {
                return res.status(400).json({
                    success: false,
                    message: 'Assigned instructor must have role mentor'
                });
            }
            course.instructor = instructorId;
        }

        await course.save();
        await course.populate('instructor', 'name email role');

        // Log activity for course update
        await logActivity(
            'course_updated',
            req.user._id,
            req.user.name,
            req.user.role,
            `${req.user.name} updated course: ${course.title}`,
            { courseId: course._id, courseTitle: course.title, quizUpdated: quiz !== undefined }
        );

        // Log to audit trail if logAuditData exists (from audit middleware)
        if (res.logAuditData) {
            const changedFields = {};
            if (title) changedFields.title = title;
            if (description) changedFields.description = description;
            if (price) changedFields.price = price;
            if (category) changedFields.category = category;
            if (instructorId) changedFields.instructor = instructorId;
            if (quiz !== undefined) changedFields.quizCount = Array.isArray(quiz) ? quiz.length : 0;

            await res.logAuditData(
                id,
                changedFields,
                `Updated course: ${course.title}${quiz !== undefined ? ` (quiz updated)` : ''}`
            );
        }

        res.status(200).json({
            success: true,
            message: 'Course updated successfully',
            data: course
        });
    } catch (error) {
        console.error('Update course error:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Server error while updating course',
            error: error.message
        });
    }
};

// @desc    Delete a course
// @route   DELETE /api/courses/:id
// @access  Private (Admin/Instructor only)
exports.deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ID
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid course ID'
            });
        }

        const course = await Course.findById(id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is the instructor or an admin
        if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this course'
            });
        }

        const deletedCourseName = course.title;
        await Course.findByIdAndDelete(id);

        // Log to audit trail if logAuditData exists (from audit middleware)
        if (res.logAuditData) {
            await res.logAuditData(
                id,
                { title: deletedCourseName },
                `Deleted course: ${deletedCourseName}`
            );
        }

        res.status(200).json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting course',
            error: error.message
        });
    }
};

// NOTE: enrollStudent helper function has been REMOVED.
// Enrollment now ONLY occurs through payment verification at /api/payment/verify
// after successful Razorpay signature validation.

// NOTE: Direct enrollment function has been REMOVED.
// Enrollment now ONLY occurs through payment verification at /api/payment/verify
// after successful Razorpay signature validation.

const getCompletionStatus = (completedLessons, course) => {
    const lessonIds = course.modules.map(module => module._id.toString());
    const completedSet = new Set(
        (completedLessons || []).filter(lessonId => lessonIds.includes(lessonId))
    );
    const totalLessons = lessonIds.length;
    const completedCount = completedSet.size;

    return {
        totalLessons,
        completedCount,
        isCompleted: totalLessons > 0 && completedCount === totalLessons
    };
};

// @desc    Complete a lesson and update enrollment completion status
// @route   POST /api/courses/complete-lesson
// @access  Private (Students)
exports.completeLesson = async (req, res) => {
    try {
        const { courseId, lessonId } = req.body;
        const userId = req.user._id;

        if (!courseId || !lessonId) {
            return res.status(400).json({
                success: false,
                message: 'courseId and lessonId are required'
            });
        }

        if (!courseId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid course ID'
            });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const lessonExists = course.modules.some(module => module._id.toString() === lessonId);
        if (!lessonExists) {
            return res.status(404).json({
                success: false,
                message: 'Lesson not found in this course'
            });
        }

        const user = await User.findById(userId).select('completedLessons coursesEnrolled');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check enrollment using safe ObjectId comparison
        const isEnrolled = user.coursesEnrolled
            .some(enrolledId => enrolledId.toString() === courseId.toString());
        if (!isEnrolled) {
            return res.status(403).json({
                success: false,
                message: 'You must be enrolled in this course to complete lessons'
            });
        }

        if (!user.completedLessons.includes(lessonId)) {
            user.completedLessons.push(lessonId);
            await user.save();
        }

        const completionStatus = getCompletionStatus(user.completedLessons, course);

        if (completionStatus.isCompleted) {
            const enrollment = await Enrollment.findOne({ student: userId, course: courseId });
            if (!enrollment) {
                return res.status(404).json({
                    success: false,
                    message: 'Enrollment record not found'
                });
            }

            if (!enrollment.isCompleted) {
                enrollment.isCompleted = true;
                await enrollment.save();
            }
        }

        res.status(200).json({
            success: true,
            message: 'Lesson marked as completed',
            data: completionStatus
        });
    } catch (error) {
        console.error('Complete lesson error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while completing lesson',
            error: error.message
        });
    }
};

// @desc    Get enrolled courses for current user
// @route   GET /api/courses/enrolled/my-courses, GET /api/users/my-courses
// @access  Private (Students)
// @desc    Get enrolled courses for current user (students + mentors get their assigned courses)
// @route   GET /api/courses/enrolled/my-courses
// @access  Private
exports.getEnrolledCourses = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        let coursesWithStatus = [];

        // If user is a mentor, include courses they're assigned to as instructor
        if (userRole === 'mentor' || userRole === 'admin' || userRole === 'superadmin') {
            const mentorCourses = await Course.find({ instructor: userId })
                .select('title description price thumbnail category instructor modules totalEnrolled')
                .populate('instructor', 'name')
                .sort({ createdAt: -1 });

            // Add mentor courses with isMentor flag
            const mentorCoursesWithStatus = mentorCourses.map(course => ({
                ...course.toObject(),
                isCompleted: false, // Mentors don't have completion status
                isMentor: true,
                isEnrolled: false
            }));

            coursesWithStatus.push(...mentorCoursesWithStatus);
        }

        // For all users (including mentors who might also be enrolled as students), get their enrollments
        const enrollments = await Enrollment.find({ student: userId })
            .populate({
                path: 'course',
                select: 'title description price thumbnail category instructor modules totalEnrolled',
                populate: {
                    path: 'instructor',
                    select: 'name'
                }
            })
            .select('course isCompleted');

        // Filter out any null courses (in case a course was deleted)
        const validEnrollments = enrollments.filter(enrollment => enrollment.course);

        // Map to include isCompleted status with course data
        const enrolledCourses = validEnrollments.map(enrollment => ({
            ...enrollment.course.toObject(),
            isCompleted: enrollment.isCompleted || false,
            isMentor: false,
            isEnrolled: true
        }));

        // Also fetch courses from user's coursesEnrolled array (for payment-based enrollments)
        const user = await User.findById(userId)
            .populate({
                path: 'coursesEnrolled',
                select: 'title description price thumbnail category instructor modules totalEnrolled',
                populate: {
                    path: 'instructor',
                    select: 'name'
                }
            });
        
        const coursesFromUserArray = (user?.coursesEnrolled || []).map(course => ({
            ...course.toObject(),
            isCompleted: false, // TODO: Calculate completion from user.completedLessons
            isMentor: false,
            isEnrolled: true
        }));
        
        // Merge enrollment courses with user.coursesEnrolled
        enrolledCourses.push(...coursesFromUserArray);

        // Merge both lists, avoiding duplicates (in case a mentor is also enrolled in their own course)
        const courseMap = new Map();
        
        // Add mentor courses first
        coursesWithStatus.forEach(course => {
            courseMap.set(course._id.toString(), course);
        });
        
        // Add enrolled courses (will override if mentor is also enrolled, giving student view priority)
        enrolledCourses.forEach(course => {
            const courseId = course._id.toString();
            if (courseMap.has(courseId)) {
                // If mentor is enrolled in their own course, merge the flags
                const existing = courseMap.get(courseId);
                courseMap.set(courseId, {
                    ...course,
                    isMentor: true, // Keep mentor flag
                    isEnrolled: true // Mark as enrolled too
                });
            } else {
                courseMap.set(courseId, course);
            }
        });

        // Convert map back to array
        const allCourses = Array.from(courseMap.values());

        res.status(200).json({
            success: true,
            count: allCourses.length,
            data: allCourses
        });
    } catch (error) {
        console.error('Get enrolled courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching enrolled courses',
            error: error.message
        });
    }
};

// @desc    Get all courses created by the current mentor
// @route   GET /api/courses/mentor/my-courses
// @access  Private (Mentor/Admin)
exports.getMentorCourses = async (req, res) => {
    try {
        const mentorId = req.user._id;

        // Find all courses where instructor is the current user
        const courses = await Course.find({ instructor: mentorId })
            .select('title description price thumbnail category instructor modules totalEnrolled createdAt')
            .populate('instructor', 'name email role')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        console.error('Get mentor courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching mentor courses',
            error: error.message
        });
    }
};

// @desc    Get all students enrolled in mentor's courses
// @route   GET /api/courses/mentor/my-students
// @access  Private (Mentor only)
exports.getMentorStudents = async (req, res) => {
    try {
        const mentorId = req.user._id;

        // Find all courses where instructor is the current user
        const mentorCourses = await Course.find({ instructor: mentorId }).select('_id title');

        if (mentorCourses.length === 0) {
            return res.status(200).json({
                success: true,
                count: 0,
                data: []
            });
        }

        const courseIds = mentorCourses.map(course => course._id);

        // Get all enrollments for these courses and populate student and course info
        const enrollments = await Enrollment.find({ course: { $in: courseIds } })
            .populate('student', 'name email')
            .populate('course', 'title')
            .select('student course status createdAt');

        // Create a map to store unique students with their courses
        const studentMap = {};

        enrollments.forEach(enrollment => {
            if (enrollment.student && enrollment.course) {
                const studentId = enrollment.student._id.toString();
                
                if (!studentMap[studentId]) {
                    studentMap[studentId] = {
                        _id: enrollment.student._id,
                        name: enrollment.student.name,
                        email: enrollment.student.email,
                        courses: [],
                        enrollmentStatus: enrollment.status
                    };
                }

                // Add course information if not already present
                const courseInfo = {
                    courseId: enrollment.course._id,
                    courseTitle: enrollment.course.title,
                    enrolledAt: enrollment.createdAt,
                    status: enrollment.status
                };

                const courseExists = studentMap[studentId].courses.some(
                    c => c.courseId.toString() === enrollment.course._id.toString()
                );

                if (!courseExists) {
                    studentMap[studentId].courses.push(courseInfo);
                }
            }
        });

        const uniqueStudents = Object.values(studentMap);

        res.status(200).json({
            success: true,
            count: uniqueStudents.length,
            data: uniqueStudents
        });
    } catch (error) {
        console.error('Get mentor students error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching mentor students',
            error: error.message
        });
    }
};

// @desc    Get system-wide statistics (Admin only)
// @route   GET /api/courses/admin/system-stats
// @access  Private (Admin only)
exports.getSystemStats = async (req, res) => {
    try {
        // Count total users
        const totalUsers = await User.countDocuments();

        // Count users by role
        const usersByRole = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Count total courses
        const totalCourses = await Course.countDocuments();

        // Calculate total revenue and enrollments
        const courseStats = await Course.aggregate([
            {
                $group: {
                    _id: null,
                    totalEnrollments: { $sum: '$totalEnrolled' },
                    totalRevenue: {
                        $sum: {
                            $multiply: ['$price', '$totalEnrolled']
                        }
                    },
                    averagePrice: { $avg: '$price' }
                }
            }
        ]);

        // Get mentor count
        const totalMentors = await User.countDocuments({ role: 'mentor' });

        // Format user role breakdown
        const roleBreakdown = {};
        usersByRole.forEach(item => {
            roleBreakdown[item._id] = item.count;
        });

        const stats = {
            users: {
                total: totalUsers,
                breakdown: roleBreakdown,
                mentors: totalMentors
            },
            courses: {
                total: totalCourses,
                totalEnrollments: courseStats[0]?.totalEnrollments || 0,
                averagePrice: courseStats[0]?.averagePrice ? parseFloat(courseStats[0].averagePrice.toFixed(2)) : 0
            },
            revenue: {
                total: courseStats[0]?.totalRevenue ? parseFloat(courseStats[0].totalRevenue.toFixed(2)) : 0
            }
        };

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get system stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching system statistics',
            error: error.message
        });
    }
};

// @desc    Mark a lesson as completed with progress tracking
// @route   PATCH /api/courses/complete-lesson/:courseId/:lessonId
// @access  Private (Students)
exports.markLessonComplete = async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        const userId = req.user._id;

        // Validate MongoDB IDs
        if (!courseId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid course ID'
            });
        }

        if (!lessonId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid lesson ID'
            });
        }

        // Find course and verify lesson exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const lessonExists = course.modules.some(module => module._id.toString() === lessonId);
        if (!lessonExists) {
            return res.status(404).json({
                success: false,
                message: 'Lesson not found in this course'
            });
        }

        // Check enrollment (check both Enrollment model and User.coursesEnrolled)
        const enrollment = await Enrollment.findOne({ student: userId, course: courseId });
        
        // Also check user's coursesEnrolled array using safe ObjectId comparison
        const user = await User.findById(userId).select('coursesEnrolled completedLessons');
        const isInCoursesEnrolled = user?.coursesEnrolled?.some(enrolledId => 
            enrolledId.toString() === courseId.toString()
        );
        
        if (!enrollment && !isInCoursesEnrolled) {
            return res.status(403).json({
                success: false,
                message: 'You must be enrolled in this course to complete lessons'
            });
        }

        // Use $addToSet to add lesson ID to completedLessons array (prevents duplicates)
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { completedLessons: lessonId } },
            { new: true, select: 'completedLessons' }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Calculate progress percentage
        const totalLessons = course.modules.length;
        const completedLessonsForCourse = course.modules.filter(module => 
            updatedUser.completedLessons.includes(module._id.toString())
        ).length;
        
        const progressPercentage = totalLessons > 0 
            ? Math.round((completedLessonsForCourse / totalLessons) * 100)
            : 0;

        const isCompleted = completedLessonsForCourse === totalLessons;

        // Update enrollment completion status if all lessons completed
        if (isCompleted && !enrollment.isCompleted) {
            enrollment.isCompleted = true;
            await enrollment.save();
        }

        // Log activity
        await logActivity({
            user: userId,
            action: 'completed_lesson',
            description: `Completed lesson in course: ${course.title}`,
            metadata: { courseId: course._id, lessonId }
        });

        res.status(200).json({
            success: true,
            message: 'Lesson marked as completed',
            data: {
                lessonId,
                courseId,
                progressPercentage,
                completedLessons: completedLessonsForCourse,
                totalLessons,
                isCompleted
            }
        });
    } catch (error) {
        console.error('Mark lesson complete error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while marking lesson as complete',
            error: error.message
        });
    }
};

// @desc    Check if a student has completed a course
// @route   GET /api/courses/check-completion/:courseId
// @access  Private (Students only)
exports.checkCourseCompletion = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user._id;

        // Validate MongoDB ID
        if (!courseId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid course ID'
            });
        }

        // Find the course
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check if user is enrolled in the course (check both Enrollment model and User.coursesEnrolled)
        const enrollment = await Enrollment.findOne({ student: userId, course: courseId });
        
        // Also check user's coursesEnrolled array using safe ObjectId comparison
        const user = await User.findById(userId).select('name role coursesEnrolled');
        const isInCoursesEnrolled = user?.coursesEnrolled?.some(enrolledId => 
            enrolledId.toString() === courseId.toString()
        );
        
        if (!enrollment && !isInCoursesEnrolled) {
            return res.status(403).json({
                success: false,
                message: 'You must be enrolled in this course to check completion'
            });
        }

        // Fetch progress from Progress model instead of User model
        const progress = await Progress.findOne({ userId, courseId });
        const completedLessons = progress?.completedModules || [];
        if (!completedLessons || completedLessons.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    isCompleted: false,
                    completedLessons: 0,
                    totalLessons: course.modules?.length || 0,
                    progressPercentage: 0,
                    certificateId: null,
                    message: 'Student has not started or completed the course yet'
                }
            });
        }

        const courseLessonIds = course.modules.map(module => module._id.toString());
        const completedLessonsForCourse = course.modules.filter(module =>
            completedLessons.includes(module._id.toString())
        ).length;

        const totalLessons = courseLessonIds.length;
        const isCompleted = totalLessons > 0 && completedLessonsForCourse === totalLessons;

        let certificateId = null;

        // Generate certificate ID if course is completed
        if (isCompleted) {
            // Generate unique certificateId using crypto
            certificateId = `CERT-${Date.now()}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

            // Update enrollment isCompleted flag
            if (enrollment && !enrollment.isCompleted) {
                enrollment.isCompleted = true;
                await enrollment.save();
            }

            // Log completion activity
            await logActivity('course_completed', userId, user.name || 'Student', user.role || 'student', `Completed course: ${course.title}`, { courseId: course._id, courseTitle: course.title, certificateId });
        }

        res.status(200).json({
            success: true,
            data: {
                courseId,
                courseName: course.title,
                isCompleted,
                completedLessons: completedLessonsForCourse,
                totalLessons,
                progressPercentage: totalLessons > 0 ? Math.round((completedLessonsForCourse / totalLessons) * 100) : 0,
                certificateId: isCompleted ? certificateId : null,
                enrollmentId: enrollment ? enrollment._id : null
            }
        });
    } catch (error) {
        console.error('Check course completion error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while checking course completion',
            error: error.message
        });
    }
};

module.exports = exports;
