const jsPDF = require('jspdf');
const User = require('../models/User');
const Course = require('../models/Course');
const path = require('path');
const fs = require('fs');

// @desc    Generate and save certificate
// @route   POST /api/certificate/generate
// @access  Private
exports.generateCertificate = async (req, res, next) => {
    try {
        const { courseId, score } = req.body;
        const userId = req.user._id;

        // Validate input
        if (!courseId || score === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Please provide courseId and score'
            });
        }

        if (score < 70) {
            return res.status(400).json({
                success: false,
                message: 'Score must be at least 70 to generate a certificate'
            });
        }

        // Get user and course details
        const user = await User.findById(userId);
        const course = await Course.findById(courseId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Create certificates directory if it doesn't exist
        const certificatesDir = path.join(__dirname, '../../public/certificates');
        if (!fs.existsSync(certificatesDir)) {
            fs.mkdirSync(certificatesDir, { recursive: true });
        }

        // Generate PDF certificate
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const certificateId = `${userId}-${courseId}-${Date.now()}`;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const completionDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Add decorative border
        pdf.setDrawColor(107, 15, 26); // Dark red color (#6B0F1A)
        pdf.setLineWidth(2);
        pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);

        // Inner border
        pdf.setLineWidth(1);
        pdf.rect(15, 15, pageWidth - 30, pageHeight - 30);

        // Add styling
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(107, 15, 26); // Dark red
        pdf.setFontSize(24);
        pdf.text('Certificate of Completion', pageWidth / 2, 40, { align: 'center' });

        // Add decorative line
        pdf.setDrawColor(107, 15, 26);
        pdf.setLineWidth(1);
        pdf.line(50, 45, pageWidth - 50, 45);

        // Certificate text
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(14);
        pdf.text('This certificate is proudly presented to', pageWidth / 2, 60, { align: 'center' });

        // Student name
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(107, 15, 26);
        pdf.setFontSize(20);
        pdf.text(user.name, pageWidth / 2, 75, { align: 'center' });

        // Course completion text
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(14);
        pdf.text('for successfully completing the course', pageWidth / 2, 95, { align: 'center' });

        // Course name
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(107, 15, 26);
        pdf.setFontSize(18);
        pdf.text(course.title, pageWidth / 2, 110, { align: 'center' });

        // Score and date
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(12);
        pdf.text(`Score: ${score}%`, pageWidth / 2, 130, { align: 'center' });
        pdf.text(`Completion Date: ${completionDate}`, pageWidth / 2, 142, { align: 'center' });

        // Certificate ID
        pdf.setFontSize(10);
        pdf.setTextColor(128, 128, 128); // Gray
        pdf.text(`Certificate ID: ${certificateId}`, pageWidth / 2, pageHeight - 25, { align: 'center' });

        // CodeTexa branding
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(107, 15, 26);
        pdf.setFontSize(14);
        pdf.text('CodeTexa', pageWidth / 2, pageHeight - 15, { align: 'center' });

        // Save PDF to file
        const filename = `${certificateId}.pdf`;
        const filepath = path.join(certificatesDir, filename);
        pdf.save(filepath);

        // Generate public URL for the certificate
        const certificateUrl = `/certificates/${filename}`;

        // Save certificate reference to user
        user.certificates.push({
            courseId,
            certificateUrl,
            score,
            completedAt: new Date()
        });

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Certificate generated successfully',
            data: {
                certificateUrl,
                certificateId,
                filename
            }
        });
    } catch (error) {
        console.error('Generate certificate error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate certificate',
            error: error.message
        });
    }
};

// @desc    Get user's certificates
// @route   GET /api/certificate/my-certificates
// @access  Private
exports.getMyCertificates = async (req, res, next) => {
    try {
        const userId = req.user._id;

        const user = await User.findById(userId).populate('certificates.courseId', 'title');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            count: user.certificates.length,
            data: user.certificates
        });
    } catch (error) {
        console.error('Get certificates error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch certificates'
        });
    }
};

module.exports = exports;
