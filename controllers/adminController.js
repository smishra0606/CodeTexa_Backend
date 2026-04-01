const Course = require('../models/Course');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Enrollment = require('../models/Enrollment');

// @desc    Get company statistics for Super Admin
// @route   GET /api/admin/company-stats
// @access  Private/SuperAdmin
exports.getCompanyStats = async (req, res) => {
    try {
        // 1. Calculate Total Revenue (sum of all prices for enrolled courses)
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

        // 2. User Breakdown - Count of Students, Mentors, and Admins
        const studentCount = await User.countDocuments({ role: 'student' });
        const mentorCount = await User.countDocuments({ role: 'mentor' });
        const adminCount = await User.countDocuments({ role: 'admin' });
        const superAdminCount = await User.countDocuments({ role: 'superadmin' });

        // 3. Course Performance - List of courses with enrollment counts
        const coursePerformance = await Course.find()
            .select('title description price thumbnail category totalEnrolled instructor createdAt')
            .populate('instructor', 'name email role')
            .sort({ totalEnrolled: -1 });

        const coursesWithStats = coursePerformance.map(course => ({
            id: course._id,
            title: course.title,
            description: course.description,
            price: course.price,
            thumbnail: course.thumbnail,
            category: course.category,
            studentsEnrolled: course.totalEnrolled || 0,
            revenue: (course.price || 0) * (course.totalEnrolled || 0),
            instructor: {
                id: course.instructor._id,
                name: course.instructor.name,
                email: course.instructor.email,
                role: course.instructor.role
            },
            createdAt: course.createdAt
        }));

        // 4. Mentor Directory - List of all mentors with course counts
        const mentors = await User.find({ role: 'mentor' })
            .select('name email createdAt');

        const mentorDirectory = await Promise.all(
            mentors.map(async (mentor) => {
                // Count courses where this mentor is the instructor
                const courseCount = await Course.countDocuments({ instructor: mentor._id });
                
                // Get total students across all mentor's courses
                const mentorCourses = await Course.find({ instructor: mentor._id })
                    .select('totalEnrolled');
                
                const totalStudents = mentorCourses.reduce(
                    (sum, course) => sum + (course.totalEnrolled || 0),
                    0
                );

                return {
                    id: mentor._id,
                    name: mentor.name,
                    email: mentor.email,
                    coursesAssociated: courseCount,
                    totalStudents: totalStudents,
                    joinedAt: mentor.createdAt
                };
            })
        );

        // Sort mentors by course count (descending)
        mentorDirectory.sort((a, b) => b.coursesAssociated - a.coursesAssociated);

        // Additional stats
        const totalCourses = await Course.countDocuments();
        const totalEnrollments = await User.aggregate([
            { $project: { enrollmentCount: { $size: { $ifNull: ['$coursesEnrolled', []] } } } },
            { $group: { _id: null, total: { $sum: '$enrollmentCount' } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalRevenue: {
                    amount: totalRevenue,
                    currency: 'USD',
                    formatted: `$${totalRevenue.toLocaleString()}`
                },
                userBreakdown: {
                    students: studentCount,
                    mentors: mentorCount,
                    admins: adminCount,
                    superAdmins: superAdminCount,
                    total: studentCount + mentorCount + adminCount + superAdminCount
                },
                coursePerformance: {
                    totalCourses: totalCourses,
                    totalEnrollments: totalEnrollments.length > 0 ? totalEnrollments[0].total : 0,
                    courses: coursesWithStats
                },
                mentorDirectory: {
                    totalMentors: mentorCount,
                    mentors: mentorDirectory
                },
                summary: {
                    averageRevenuePerCourse: totalCourses > 0 ? totalRevenue / totalCourses : 0,
                    averageEnrollmentsPerCourse: totalCourses > 0 
                        ? (totalEnrollments.length > 0 ? totalEnrollments[0].total : 0) / totalCourses 
                        : 0,
                    coursesPerMentor: mentorCount > 0 ? totalCourses / mentorCount : 0
                }
            }
        });
    } catch (error) {
        console.error('Get company stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching company statistics',
            error: error.message
        });
    }
};

// @desc    Get system summary with logs and mentor performance
// @route   GET /api/admin/system-summary
// @access  Private/SuperAdmin
exports.getSystemSummary = async (req, res) => {
    try {
        // 1. Get System Logs - 10 most recent activities
        const systemLogs = await Activity.find()
            .populate('userId', 'name email role')
            .sort({ createdAt: -1 })
            .limit(10)
            .select('type description userName userRole createdAt metadata');

        const formattedLogs = systemLogs.map(activity => ({
            _id: activity._id,
            type: activity.type,
            action: activity.type.replace(/_/g, ' ').toUpperCase(),
            description: activity.description,
            user: activity.userName,
            userRole: activity.userRole,
            timestamp: activity.createdAt,
            metadata: activity.metadata
        }));

        // 2. Get Mentor Performance - sorted by student count
        const mentors = await User.find({ role: 'mentor' })
            .select('_id name email createdAt')
            .sort({ createdAt: -1 });

        const mentorPerformance = await Promise.all(
            mentors.map(async (mentor) => {
                // Get all courses taught by this mentor
                const mentorCourses = await Course.find({ instructor: mentor._id })
                    .select('_id totalEnrolled price');

                // Calculate total students
                const totalStudents = mentorCourses.reduce(
                    (sum, course) => sum + (course.totalEnrolled || 0),
                    0
                );

                // Calculate total revenue from courses
                const totalRevenue = mentorCourses.reduce(
                    (sum, course) => sum + (course.price * (course.totalEnrolled || 0)),
                    0
                );

                return {
                    _id: mentor._id,
                    name: mentor.name,
                    email: mentor.email,
                    totalCourses: mentorCourses.length,
                    totalStudents: totalStudents,
                    totalRevenue: totalRevenue,
                    joinedDate: mentor.createdAt,
                    averageStudentsPerCourse: mentorCourses.length > 0 ? Math.round(totalStudents / mentorCourses.length) : 0
                };
            })
        );

        // Sort mentors by total students (descending)
        mentorPerformance.sort((a, b) => b.totalStudents - a.totalStudents);

        res.status(200).json({
            success: true,
            data: {
                systemLogs: {
                    total: formattedLogs.length,
                    logs: formattedLogs
                },
                mentorPerformance: {
                    total: mentorPerformance.length,
                    mentors: mentorPerformance.slice(0, 10) // Top 10 mentors
                }
            }
        });
    } catch (error) {
        console.error('Get system summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching system summary',
            error: error.message
        });
    }
};

// @desc    Get all users for user management
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching users',
            error: error.message
        });
    }
};

// @desc    Create a new user (admin action)
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and password'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with that email'
            });
        }

        const validRoles = ['student', 'mentor', 'admin', 'superadmin'];
        const userRole = role && validRoles.includes(role) ? role : 'student';

        if (req.user.role !== 'superadmin' && ['admin', 'superadmin'].includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Only superadmins can create admin or superadmin accounts'
            });
        }

        const user = await User.create({
            name,
            email,
            password,
            role: userRole
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating user',
            error: error.message
        });
    }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/SuperAdmin
exports.updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // Validate role
        const validRoles = ['student', 'mentor', 'admin', 'superadmin'];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be one of: student, mentor, admin, superadmin'
            });
        }

        // Find user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent changing own role
        if (user._id.toString() === req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You cannot change your own role'
            });
        }

        const oldRole = user.role;

        if (req.user.role !== 'superadmin') {
            if (['admin', 'superadmin'].includes(user.role) || ['admin', 'superadmin'].includes(role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Only superadmins can manage admin or superadmin roles'
                });
            }
        }
        user.role = role;
        await user.save();

        // Log activity
        const { logActivity } = require('./activityController');
        await logActivity(
            req.user.id,
            req.user.name,
            req.user.role,
            'role_changed',
            `Changed ${user.name}'s role from ${oldRole} to ${role}`
        );

        res.status(200).json({
            success: true,
            message: `User role updated from ${oldRole} to ${role}`,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating user role',
            error: error.message
        });
    }
};

// @desc    Toggle user account status (activate/deactivate)
// @route   PUT /api/admin/users/:id/status
// @access  Private/SuperAdmin
exports.toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        // Validate isActive
        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isActive must be a boolean value'
            });
        }

        // Find user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent deactivating own account
        if (user._id.toString() === req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You cannot deactivate your own account'
            });
        }

        if (req.user.role !== 'superadmin' && ['admin', 'superadmin'].includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only superadmins can change admin or superadmin status'
            });
        }

        // Update user status
        user.isActive = isActive;
        await user.save();

        // Log activity
        const { logActivity } = require('./activityController');
        await logActivity(
            req.user.id,
            req.user.name,
            req.user.role,
            'account_status_changed',
            `${isActive ? 'Activated' : 'Deactivated'} account for ${user.name}`
        );

        res.status(200).json({
            success: true,
            message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating user status',
            error: error.message
        });
    }
};

// @desc    Delete user account permanently
// @route   DELETE /api/admin/users/:id
// @access  Private/SuperAdmin
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const requesterRole = req.user.role;
        const requesterId = req.user.id;

        // Find user to delete
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // RULE 2: Prevent any user from deleting themselves
        if (user._id.toString() === requesterId) {
            return res.status(403).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        // RULE 1: If requester is admin (not superadmin), they can ONLY delete students or mentors
        if (requesterRole === 'admin') {
            const allowedRolesToDelete = ['student', 'mentor'];
            if (!allowedRolesToDelete.includes(user.role)) {
                return res.status(403).json({
                    success: false,
                    message: `Admins can only delete students or mentors. Cannot delete ${user.role} accounts. Only superadmins can perform this action.`
                });
            }
        }

        // RULE 3: Only superadmin can delete admin or superadmin accounts
        if (requesterRole !== 'superadmin' && ['admin', 'superadmin'].includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Only superadmins can delete admin or superadmin accounts'
            });
        }

        const userName = user.name;
        const userEmail = user.email;
        const userRole = user.role;

        // Delete user
        await User.findByIdAndDelete(id);

        // Log activity with audit trail
        const { logActivity } = require('./activityController');
        await logActivity(
            requesterId,
            req.user.name,
            requesterRole,
            'user_deleted',
            `Deleted ${userRole} account: ${userName} (${userEmail})`
        );

        // Log to audit middleware if available
        if (res.logAuditData) {
            res.logAuditData({
                targetId: id,
                targetType: 'User',
                deletedUserInfo: { name: userName, email: userEmail, role: userRole }
            });
        }

        res.status(200).json({
            success: true,
            message: `User account for ${userName} (${userRole}) has been permanently deleted`
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting user',
            error: error.message
        });
    }
};

