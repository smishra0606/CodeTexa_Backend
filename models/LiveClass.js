const mongoose = require('mongoose');

const mentorSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true
		},
		role: {
			type: String,
			required: true,
			trim: true
		}
	},
	{ _id: false }
);

const liveClassSchema = new mongoose.Schema(
	{
		courseName: {
			type: String,
			required: [true, 'Please provide a course name'],
			trim: true
		},
		topic: {
			type: String,
			required: [true, 'Please provide a topic'],
			trim: true
		},
		mentors: {
			type: [mentorSchema],
			default: []
		},
		liveRoomUrl: {
			type: String,
			required: [true, 'Please provide a live room URL'],
			trim: true
		},
		scheduledAt: {
			type: Date,
			required: [true, 'Please provide a scheduled time']
		},
		isLive: {
			type: Boolean,
			default: false
		}
	},
	{
		timestamps: true
	}
);

module.exports = mongoose.model('LiveClass', liveClassSchema);
