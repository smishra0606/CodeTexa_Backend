require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
// Security headers with helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            fontSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https:']
        }
    },
    frameguard: {
        action: 'deny'
    },
    noSniff: true,
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
    }
}));

app.use(cors());
app.use(express.json());

// Serve public folder for certificates and other static files
app.use(express.static('public'));

// Routes
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const mentorRoutes = require('./routes/mentorRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const adminRoutes = require('./routes/adminRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const progressRoutes = require('./routes/progressRoutes');
const activityRoutes = require('./routes/activityRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const quizRoutes = require('./routes/quizRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const imageReviewRoutes = require('./routes/imageReviewRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Test Route
app.get('/', (req, res) => {
    res.send('CodeTexa Backend is Running!');
});

// API Routes
app.use('/api/auth', userRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/reviews/image', imageReviewRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/certificate', certificateRoutes);
app.use('/api/payment', paymentRoutes);

// Error Handling Middleware (must be after all routes)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});