const Progress = require('../models/Progress');
const Course = require('../models/Course');

// @desc    Get user's progress for a specific course
// @route   GET /api/progress/course/:courseId
// @access  Private
exports.getCourseProgress = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const userId = req.user._id;

        // Validate courseId
        if (!courseId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid course ID'
            });
        }

        // Find or create progress document
        let progress = await Progress.findOne({ userId, courseId });

        if (!progress) {
            console.log('✅ No progress found for user. Creating new progress document for course:', courseId);
            // Create new progress document if it doesn't exist (for newly enrolled students)
            try {
                progress = await Progress.create({
                    userId,
                    courseId,
                    completedModules: [],
                    progressPercentage: 0
                });
                console.log('✅ New progress document created successfully');
            } catch (createError) {
                console.warn('Could not create progress document:', createError.message);
                return res.status(200).json({
                    success: true,
                    data: {
                        userId,
                        courseId,
                        completedModules: [],
                        progressPercentage: 0,
                        _id: null,
                        message: 'Progress will be tracked from next lesson'
                    }
                });
            }
        }

        res.status(200).json({
            success: true,
            data: progress
        });
    } catch (error) {
        console.error('Get progress error:', error);
        // Gracefully return default progress data instead of failing
        const { courseId } = req.params;
        res.status(200).json({
            success: true,
            data: {
                courseId,
                completedModules: [],
                progressPercentage: 0,
                message: 'Default progress (unable to fetch stored progress)'
            }
        });
    }
};

// @desc    Update user's progress for a course
// @route   PUT /api/progress/course/:courseId
// @access  Private
exports.updateCourseProgress = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const userId = req.user._id;
        const { completedModules, lastAccessedModule } = req.body;

        // Verify course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Calculate progress percentage
        const totalModules = course.modules.length;
        const completedCount = completedModules ? completedModules.length : 0;
        const progressPercentage = totalModules > 0 
            ? Math.round((completedCount / totalModules) * 100)
            : 0;

        // Update or create progress
        let progress = await Progress.findOneAndUpdate(
            { userId, courseId },
            {
                completedModules: completedModules || [],
                lastAccessedModule,
                lastAccessedAt: Date.now(),
                progressPercentage
            },
            { new: true, upsert: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Progress updated successfully',
            data: progress
        });
    } catch (error) {
        console.error('Update progress error:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update progress'
        });
    }
};

// @desc    Toggle module completion status
// @route   POST /api/progress/course/:courseId/module/:moduleId/toggle
// @access  Private
exports.toggleModuleCompletion = async (req, res, next) => {
    try {
        const { courseId, moduleId } = req.params;
        const userId = req.user._id;

        // Verify course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Verify module exists in course
        const moduleExists = course.modules.some(m => m._id.toString() === moduleId);
        if (!moduleExists) {
            return res.status(404).json({
                success: false,
                message: 'Module not found in this course'
            });
        }

        // Find or create progress
        let progress = await Progress.findOne({ userId, courseId });
        
        if (!progress) {
            progress = new Progress({
                userId,
                courseId,
                completedModules: [moduleId],
                lastAccessedModule: moduleId,
                lastAccessedAt: Date.now()
            });
        } else {
            // Toggle module completion
            const moduleIndex = progress.completedModules.indexOf(moduleId);
            if (moduleIndex > -1) {
                progress.completedModules.splice(moduleIndex, 1);
            } else {
                progress.completedModules.push(moduleId);
            }
            progress.lastAccessedModule = moduleId;
            progress.lastAccessedAt = Date.now();
        }

        // Calculate progress percentage
        const totalModules = course.modules.length;
        const completedCount = progress.completedModules.length;
        progress.progressPercentage = totalModules > 0 
            ? Math.round((completedCount / totalModules) * 100)
            : 0;

        await progress.save();

        res.status(200).json({
            success: true,
            message: 'Module completion toggled',
            data: progress
        });
    } catch (error) {
        console.error('Toggle module error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle module completion'
        });
    }
};

// @desc    Get all progress for current user
// @route   GET /api/progress/my-progress
// @access  Private
exports.getMyProgress = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Get all progress for user, or return empty array if none exist (new students)
        const progressList = await Progress.find({ userId })
            .populate('courseId', 'title thumbnail category')
            .sort({ lastAccessedAt: -1 })
            .catch(error => {
                console.warn('Progress fetch warning:', error.message);
                return []; // Return empty array on error
            });

        if (!progressList || progressList.length === 0) {
            console.log('✅ No progress found for user (new student):', userId);
        }

        res.status(200).json({
            success: true,
            count: progressList?.length || 0,
            data: progressList || []
        });
    } catch (error) {
        console.error('Get my progress error:', error);
        // Gracefully return empty data instead of failing
        res.status(200).json({
            success: true,
            count: 0,
            data: [],
            message: 'No progress data available (new student)'
        });
    }
};

// @desc    Mark a lesson as complete
// @route   POST /api/progress/complete-lesson
// @access  Private
exports.completeLesson = async (req, res, next) => {
    try {
        const { lessonId, courseId } = req.body;
        const userId = req.user._id;

        // Validate input
        if (!lessonId || !courseId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide lessonId and courseId'
            });
        }

        // Verify course exists and get module count
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Verify lesson exists in course
        const lessonExists = course.modules.some(m => m._id.toString() === lessonId);
        if (!lessonExists) {
            return res.status(404).json({
                success: false,
                message: 'Lesson not found in this course'
            });
        }

        // Find or create progress
        let progress = await Progress.findOne({ userId, courseId });
        
        if (!progress) {
            progress = new Progress({
                userId,
                courseId,
                completedModules: [lessonId],
                lastAccessedModule: lessonId,
                lastAccessedAt: Date.now()
            });
        } else {
            // Add to completed modules if not already completed
            if (!progress.completedModules.includes(lessonId)) {
                progress.completedModules.push(lessonId);
            }
            progress.lastAccessedModule = lessonId;
            progress.lastAccessedAt = Date.now();
        }

        // Calculate progress percentage
        const totalModules = course.modules.length;
        const completedCount = progress.completedModules.length;
        progress.progressPercentage = totalModules > 0 
            ? Math.round((completedCount / totalModules) * 100)
            : 0;

        await progress.save();

        res.status(200).json({
            success: true,
            message: 'Lesson marked as complete',
            data: {
                progress: progress,
                progressPercentage: progress.progressPercentage
            }
        });
    } catch (error) {
        console.error('Complete lesson error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark lesson as complete'
        });
    }
};

// @desc    Get progress status for a course (check if testUnlocked)
// @route   GET /api/progress/status/:courseId
// @access  Private
exports.getProgressStatus = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const userId = req.user._id;

        // Verify course exists
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Get user's progress (gracefully handle if not found)
        let progress = null;
        try {
            progress = await Progress.findOne({ userId, courseId });
        } catch (error) {
            console.warn('Error fetching progress for status check:', error.message);
            // Continue with null progress - it will be treated as new student
        }

        // If no progress exists, all lessons are incomplete
        const completedLessons = progress?.completedModules || [];
        const totalLessons = course.modules.length;
        const progressPercentage = totalLessons > 0 
            ? Math.round((completedLessons.length / totalLessons) * 100)
            : 0;

        // Check if all lessons are completed
        const testUnlocked = completedLessons.length === totalLessons && totalLessons > 0;

        res.status(200).json({
            success: true,
            data: {
                courseId,
                completedLessons: completedLessons.length,
                totalLessons,
                progressPercentage,
                testUnlocked,
                isNewStudent: !progress // Flag indicating if this is a newly enrolled student
            }
        });
    } catch (error) {
        console.error('Get progress status error:', error);
        // Gracefully return default status even on error
        const { courseId } = req.params;
        res.status(200).json({
            success: true,
            data: {
                courseId,
                completedLessons: 0,
                totalLessons: 0,
                progressPercentage: 0,
                testUnlocked: false,
                isNewStudent: true,
                message: 'Default status (unable to fetch)'
            }
        });
    }
};

module.exports = exports;
