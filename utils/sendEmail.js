const nodemailer = require('nodemailer');

/**
 * Send email utility function
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content of the email
 * @returns {Promise} - Resolves when email is sent
 */
const sendEmail = async (options) => {
    try {
        // Create transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail', // You can use 'gmail', 'outlook', or configure SMTP manually
            auth: {
                user: process.env.EMAIL_USER, // Your email address
                pass: process.env.EMAIL_PASSWORD // Your app password (not regular password)
            }
        });

        // Email options
        const mailOptions = {
            from: `CodeTexa <${process.env.EMAIL_USER}>`,
            to: options.email,
            subject: options.subject,
            html: options.html
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        console.log('Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

/**
 * Generate welcome email HTML template
 * @param {string} userName - User's name
 * @param {string} userRole - User's role (student, mentor, etc.)
 * @returns {string} - HTML email template
 */
const getWelcomeEmailTemplate = (userName, userRole = 'student') => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to CodeTexa</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #0a0a0a;
                color: #ffffff;
            }
            .email-container {
                max-width: 600px;
                margin: 0 auto;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 8px 32px rgba(0, 212, 255, 0.15);
            }
            .header {
                background: linear-gradient(135deg, #00d4ff 0%, #0099ff 100%);
                padding: 40px 20px;
                text-align: center;
            }
            .logo {
                font-size: 32px;
                font-weight: bold;
                color: #ffffff;
                text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                letter-spacing: 2px;
            }
            .content {
                padding: 40px 30px;
            }
            .greeting {
                font-size: 28px;
                font-weight: bold;
                color: #00d4ff;
                margin-bottom: 20px;
            }
            .message {
                font-size: 16px;
                line-height: 1.8;
                color: #e0e0e0;
                margin-bottom: 30px;
            }
            .cta-button {
                display: inline-block;
                padding: 16px 40px;
                background: linear-gradient(135deg, #00d4ff 0%, #0099ff 100%);
                color: #ffffff;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 16px;
                box-shadow: 0 4px 15px rgba(0, 212, 255, 0.4);
                transition: transform 0.3s ease;
            }
            .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0, 212, 255, 0.6);
            }
            .features {
                margin: 30px 0;
                padding: 20px;
                background: rgba(0, 212, 255, 0.05);
                border-left: 4px solid #00d4ff;
                border-radius: 8px;
            }
            .feature-item {
                margin: 15px 0;
                display: flex;
                align-items: center;
            }
            .feature-icon {
                display: inline-block;
                width: 24px;
                height: 24px;
                margin-right: 12px;
                color: #00d4ff;
                font-size: 20px;
            }
            .footer {
                padding: 30px;
                text-align: center;
                background: rgba(0, 0, 0, 0.3);
                border-top: 1px solid rgba(0, 212, 255, 0.2);
            }
            .footer-text {
                font-size: 14px;
                color: #888;
                margin: 5px 0;
            }
            .social-links {
                margin-top: 20px;
            }
            .social-link {
                display: inline-block;
                margin: 0 10px;
                color: #00d4ff;
                text-decoration: none;
                font-size: 14px;
            }
            .divider {
                height: 1px;
                background: linear-gradient(90deg, transparent, #00d4ff, transparent);
                margin: 30px 0;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <div class="logo">🚀 CODETEXA</div>
            </div>
            
            <div class="content">
                <div class="greeting">Welcome, ${userName}! 👋</div>
                
                <div class="message">
                    <p>We're thrilled to have you join the <strong>CodeTexa</strong> community! Your journey to mastering cutting-edge technology starts here.</p>
                    
                    <p>As a ${userRole === 'student' ? 'student' : userRole === 'mentor' ? 'mentor' : 'member'}, you now have access to:</p>
                </div>
                
                <div class="features">
                    ${userRole === 'student' ? `
                    <div class="feature-item">
                        <span class="feature-icon">📚</span>
                        <span>Premium courses in AI, Machine Learning, and Full Stack Development</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">🎓</span>
                        <span>Live mentoring sessions with industry experts</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">💻</span>
                        <span>Hands-on projects and real-world experience</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">🏆</span>
                        <span>Certificates upon course completion</span>
                    </div>
                    ` : userRole === 'mentor' ? `
                    <div class="feature-item">
                        <span class="feature-icon">👨‍🏫</span>
                        <span>Create and manage your courses</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">👥</span>
                        <span>Connect with students worldwide</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">📊</span>
                        <span>Track student progress and engagement</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">💰</span>
                        <span>Earn from your expertise</span>
                    </div>
                    ` : `
                    <div class="feature-item">
                        <span class="feature-icon">🎯</span>
                        <span>Full platform access</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">🌟</span>
                        <span>Personalized learning experience</span>
                    </div>
                    `}
                </div>
                
                <div class="message">
                    <p>Ready to get started? Head over to your dashboard and begin your learning adventure!</p>
                </div>
                
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="cta-button">
                        Start Learning Now 🚀
                    </a>
                </div>
                
                <div class="divider"></div>
                
                <div class="message">
                    <p style="font-size: 14px; color: #999;">
                        <strong>Need help?</strong> Our support team is here for you. Just reply to this email or visit our help center.
                    </p>
                </div>
            </div>
            
            <div class="footer">
                <p class="footer-text">
                    <strong>CodeTexa</strong> - Empowering the next generation of tech leaders
                </p>
                <p class="footer-text">
                    © 2026 CodeTexa. All rights reserved.
                </p>
                <div class="social-links">
                    <a href="#" class="social-link">Twitter</a> |
                    <a href="#" class="social-link">LinkedIn</a> |
                    <a href="#" class="social-link">Instagram</a>
                </div>
                <p class="footer-text" style="margin-top: 20px; font-size: 12px;">
                    You're receiving this email because you signed up for CodeTexa.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = { sendEmail, getWelcomeEmailTemplate };
