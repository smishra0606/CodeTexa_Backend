const Course = require('../models/Course');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');

// @desc    Get company overview statistics
// @route   GET /api/superadmin/overview
// @access  Private/SuperAdmin
exports.getCompanyOverview = async (req, res) => {
    try {
        // 1. Calculate Total Revenue (sum of all course prices from enrollments)
        const allUsers = await User.find({ coursesEnrolled: { $exists: true, $ne: [] } })
            .populate('coursesEnrolled', 'price title');

        let totalRevenue = 0;
        allUsers.forEach(user => {
            user.coursesEnrolled.forEach(course => {
                if (course && course.price) {
                    totalRevenue += course.price;
                }
            });
        });

        // 2. Count Total Active Mentors
        const totalMentors = await User.countDocuments({ role: 'mentor' });

        // 3. Count Total Students
        const totalStudents = await User.countDocuments({ role: 'student' });

        // 4. Get Top Selling Courses
        const topSellingCourses = await Course.find()
            .select('title description price thumbnail category totalEnrolled instructor')
            .populate('instructor', 'name email')
            .sort({ totalEnrolled: -1 })
            .limit(10);

        // 5. Additional useful stats
        const totalCourses = await Course.countDocuments();
        const totalAdmins = await User.countDocuments({ role: 'admin' });
        const totalSuperAdmins = await User.countDocuments({ role: 'superadmin' });
        const totalEnrollments = await User.aggregate([
            { $project: { enrollmentCount: { $size: { $ifNull: ['$coursesEnrolled', []] } } } },
            { $group: { _id: null, total: { $sum: '$enrollmentCount' } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                revenue: {
                    total: totalRevenue,
                    currency: 'USD'
                },
                users: {
                    totalMentors,
                    totalStudents,
                    totalAdmins,
                    totalSuperAdmins,
                    totalUsers: totalMentors + totalStudents + totalAdmins + totalSuperAdmins
                },
                courses: {
                    totalCourses,
                    totalEnrollments: totalEnrollments.length > 0 ? totalEnrollments[0].total : 0,
                    topSellingCourses
                }
            }
        });
    } catch (error) {
        console.error('Get company overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching company overview',
            error: error.message
        });
    }
};

// @desc    Get revenue statistics from all enrollments
// @route   GET /api/superadmin/revenue-stats
// @access  Private/SuperAdmin
exports.getRevenueStats = async (req, res) => {
    try {
        // Aggregate all enrollments and sum the amounts
        const revenueStats = await Enrollment.aggregate([
            {
                $match: { status: 'completed' }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$amount' },
                    totalEnrollments: { $sum: 1 },
                    averageEnrollmentValue: { $avg: '$amount' }
                }
            }
        ]);

        // Get enrollment count by status
        const enrollmentsByStatus = await Enrollment.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get top revenue generating courses
        const topCourses = await Enrollment.aggregate([
            {
                $match: { status: 'completed' }
            },
            {
                $group: {
                    _id: '$course',
                    courseRevenue: { $sum: '$amount' },
                    enrollmentCount: { $sum: 1 }
                }
            },
            {
                $sort: { courseRevenue: -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: 'courses',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'courseDetails'
                }
            },
            {
                $unwind: '$courseDetails'
            },
            {
                $project: {
                    _id: 1,
                    courseRevenue: 1,
                    enrollmentCount: 1,
                    courseTitle: '$courseDetails.title',
                    courseCategory: '$courseDetails.category'
                }
            }
        ]);

        const stats = revenueStats.length > 0 ? revenueStats[0] : {
            totalRevenue: 0,
            totalEnrollments: 0,
            averageEnrollmentValue: 0
        };

        res.status(200).json({
            success: true,
            data: {
                revenue: {
                    total: stats.totalRevenue,
                    currency: 'USD',
                    average: stats.averageEnrollmentValue
                },
                enrollments: {
                    total: stats.totalEnrollments,
                    byStatus: enrollmentsByStatus
                },
                topRevenueGeneratingCourses: topCourses
            }
        });
    } catch (error) {
        console.error('Get revenue stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching revenue statistics',
            error: error.message
        });
    }
};
