const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a name'],
            trim: true,
            maxlength: [50, 'Name cannot be more than 50 characters']
        },
        username: {
            type: String,
            required: [true, 'Please provide a username'],
            unique: true,
            trim: true,
            minlength: [3, 'Username must be at least 3 characters'],
            maxlength: [30, 'Username cannot be more than 30 characters']
        },
        email: {
            type: String,
            required: [true, 'Please provide an email'],
            unique: true,
            lowercase: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email'
            ]
        },
        mobileNumber: {
            type: String,
            required: [true, 'Please provide a mobile number'],
            unique: true,
            trim: true
        },
        password: {
            type: String,
            required: [true, 'Please provide a password'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false // Don't return password by default
        },
        role: {
            type: String,
            enum: {
                values: ['student', 'mentor', 'admin', 'superadmin'],
                message: '{VALUE} is not a valid role'
            },
            default: 'student'
        },
        isActive: {
            type: Boolean,
            default: true
        },
        coursesEnrolled: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'Course',
            default: []
        },
        completedLessons: {
            type: [String],
            default: []
        },
        currentStreak: {
            type: Number,
            default: 0
        },
        maxStreak: {
            type: Number,
            default: 0
        },
        lastActiveDate: {
            type: Date,
            default: null
        },
        certificates: [{
            courseId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Course'
            },
            certificateUrl: String,
            score: Number,
            completedAt: Date
        }]
    },
    {
        timestamps: true
    }
);

// Pre-save middleware to hash password
userSchema.pre('save', async function () {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
