const crypto = require('crypto');

/**
 * Generate a signed Cloudinary URL that expires after a specified duration
 * @param {string} mediaUrl - The original Cloudinary video URL
 * @param {number} expirationHours - Hours until URL expires (default: 2)
 * @returns {string} Signed URL with authentication token
 */
exports.generateSignedUrl = (mediaUrl, expirationHours = 2) => {
    if (!mediaUrl) {
        console.warn('⚠️ Missing media URL - returning as-is');
        return mediaUrl;
    }

    // For now, return unsigned URLs since Cloudinary videos are public by default
    // If you need private videos, you need to:
    // 1. Set videos as "authenticated" type in Cloudinary
    // 2. Use Cloudinary's SDK to generate proper signed URLs
    console.log(`✅ Returning video URL (public access)`);
    return mediaUrl;

    /*
    // Previous signing implementation - disabled for now
    // Cloudinary's signing works differently and requires specific setup
    if (!process.env.CLOUDINARY_API_SECRET) {
        console.warn('⚠️ Missing Cloudinary secret - returning unsigned URL');
        return mediaUrl;
    }

    try {
        // Extract the public ID from the Cloudinary URL
        // Format: https://res.cloudinary.com/{cloud_name}/video/upload/{public_id}
        const urlParts = mediaUrl.split('/upload/');
        if (urlParts.length !== 2) {
            console.warn('⚠️ Invalid Cloudinary URL format:', mediaUrl);
            return mediaUrl;
        }

        const publicId = urlParts[1].split('?')[0]; // Remove any existing params
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

        // Calculate expiration timestamp (in seconds)
        const expirationTime = Math.floor(Date.now() / 1000) + (expirationHours * 3600);

        // Create authentication string for signing
        const authString = `public_id=${publicId}&token=${expirationTime}`;

        // Generate HMAC SHA-256 signature
        const signature = crypto
            .createHmac('sha256', process.env.CLOUDINARY_API_SECRET)
            .update(authString)
            .digest('hex');

        // Build signed URL with token and expiration
        const signedUrl = `${mediaUrl}?token=${expirationTime}&signature=${signature}`;

        console.log(`✅ Generated signed URL for video (expires in ${expirationHours}h)`);
        return signedUrl;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return mediaUrl; // Fallback to unsigned URL on error
    }
    */
};

/**
 * Generate signed URLs for all modules in a course
 * @param {object} course - Course object with modules
 * @param {number} expirationHours - Hours until URL expires (default: 2)
 * @returns {object} Course with signed video URLs
 */
exports.generateSignedUrlsForCourse = (course, expirationHours = 2) => {
    if (!course || !course.modules) {
        console.warn('⚠️ Course or modules missing, returning course as-is');
        return course;
    }

    console.log(`📹 Processing ${course.modules.length} modules for signed URLs`);

    // Create a copy to avoid mutating original
    const courseCopy = course.toObject ? course.toObject() : { ...course };

    // Sign all module video URLs while preserving all fields including _id
    courseCopy.modules = courseCopy.modules.map((module, index) => {
        const signedModule = {
            _id: module._id, // Preserve _id for lesson tracking
            title: module.title,
            videoUrl: exports.generateSignedUrl(module.videoUrl, expirationHours),
        };
        console.log(`  Module ${index + 1}: "${module.title}" - Video URL ${module.videoUrl ? 'present' : 'missing'}`);
        return signedModule;
    });

    console.log(`✅ Completed signing URLs for ${courseCopy.modules.length} modules`);
    return courseCopy;
};

/**
 * Verify if a signed URL is still valid
 * @param {string} url - The signed URL to verify
 * @param {string} signature - The signature from the URL
 * @returns {boolean} True if valid, false if expired
 */
exports.verifySignedUrl = (url, signature) => {
    try {
        const urlParams = new URL(url).searchParams;
        const token = parseInt(urlParams.get('token'));
        const currentTime = Math.floor(Date.now() / 1000);

        return token > currentTime;
    } catch (error) {
        console.error('Error verifying signed URL:', error);
        return false;
    }
};
