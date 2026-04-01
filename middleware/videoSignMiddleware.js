const { verifySignedUrl } = require('../utils/cloudinarySignedUrl');

/**
 * Middleware to verify that a Cloudinary signed URL is valid
 * This ensures that only valid, non-expired signed URLs can be used to stream videos
 */
exports.verifyVideoSignature = async (req, res, next) => {
    try {
        const { videoUrl } = req.query;

        if (!videoUrl) {
            return res.status(400).json({
                success: false,
                message: 'Video URL is required'
            });
        }

        // Extract signature and token from URL
        const urlParams = new URL(videoUrl).searchParams;
        const token = urlParams.get('token');
        const signature = urlParams.get('signature');

        if (!token || !signature) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or missing signature on video URL'
            });
        }

        // Verify the URL hasn't expired
        const isValid = verifySignedUrl(videoUrl, signature);

        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Video URL has expired. Please reload the course to get a fresh link.'
            });
        }

        // Attach verified URL to request for downstream use
        req.verifiedVideoUrl = videoUrl;
        next();
    } catch (error) {
        console.error('Video signature verification error:', error);
        return res.status(401).json({
            success: false,
            message: 'Failed to verify video URL'
        });
    }
};

/**
 * Endpoint to refresh/regenerate signed URLs
 * Students can call this to get a fresh signed URL if their current one expires
 */
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { generateSignedUrl } = require('../utils/cloudinarySignedUrl');

exports.refreshVideoUrl = async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId, lessonId } = req.params;

        // Verify user is enrolled in the course
        const enrollment = await Enrollment.findOne({
            student: userId,
            course: courseId
        });

        if (!enrollment) {
            return res.status(403).json({
                success: false,
                message: 'You are not enrolled in this course'
            });
        }

        // Get the course and find the specific lesson
        const course = await Course.findById(courseId);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const lesson = course.modules?.find(
            m => m._id.toString() === lessonId
        );

        if (!lesson) {
            return res.status(404).json({
                success: false,
                message: 'Lesson not found'
            });
        }

        // Generate a fresh signed URL with 2-hour expiration
        const signedUrl = generateSignedUrl(lesson.videoUrl, 2);

        res.status(200).json({
            success: true,
            data: {
                videoUrl: signedUrl,
                expiresIn: '2 hours'
            }
        });
    } catch (error) {
        console.error('Refresh video URL error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to refresh video URL',
            error: error.message
        });
    }
};
