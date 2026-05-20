const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User'); 

// Route to create Razorpay Order with Coupon Logic
router.post('/create-order', async (req, res) => {
    try {
        const { courseId, couponCode } = req.body;
        
        // Base Price of Live Classes
        let finalPrice = 3499; 

        // Apply Coupon Logic
        if (couponCode && couponCode.toUpperCase() === 'CODE2699') {
            finalPrice = 2699;
        }

        // Initialize Razorpay
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID, 
            key_secret: process.env.RAZORPAY_SECRET 
        });

        const options = {
            amount: finalPrice * 100, // Amount in paise
            currency: "INR",
            receipt: "receipt_" + Math.random().toString(36).substring(7)
        };

        const order = await razorpay.orders.create(options);
        
        // Exactly matching what your frontend CourseDetail.tsx expects!
        res.json({ 
            success: true, 
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            courseTitle: "CodeTexa Live Mentorship", 
            message: couponCode === 'CODE2699' ? "Coupon Applied!" : "Standard Price" 
        });

    } catch (error) {
        console.error("Payment Route Error:", error);
        res.status(500).json({ success: false, message: "Payment failed", error: error.message });
    }
});

// Route to Verify Razorpay Payment After Success
router.post('/verify', async (req, res) => {
    try {
        // Frontend se ab userId bhi aayega
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId, userId } = req.body;
        
        console.log("Attempting to enroll User ID:", userId, "into Course ID:", courseId);

        // Agar frontend se ID nahi aayi toh yahi pakda jayega
        if (!userId) {
            console.log("Error: User ID is missing!");
            return res.status(400).json({ success: false, message: "User ID is missing from frontend!" });
        }

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET)
                                .update(sign.toString())
                                .digest("hex");

        if (razorpay_signature === expectedSign) {
            
            // Asli Magic Yahan Hai: User ke account mein course add karo!
            const updatedUser = await User.findByIdAndUpdate(
                userId, 
                { $addToSet: { coursesEnrolled: courseId } },
                { new: true } // Returns updated document
            );

            if (!updatedUser) {
                console.log("User DB mein nahi mila!");
                return res.status(404).json({ success: false, message: "User not found in database!" });
            }

            console.log("Success! Course Enrolled for user:", updatedUser.name);
            return res.status(200).json({ success: true, message: "Payment verified & Course Enrolled successfully!" });
        } else {
            return res.status(400).json({ success: false, message: "Invalid signature sent!" });
        }
    } catch (error) {
        console.error("Verification Error:", error);
        res.status(500).json({ success: false, message: "Verification failed", error: error.message });
    }
});

module.exports = router;