const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  skillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill'
  },
  message: String,
  status: { // <-- ADD THIS ENTIRE FIELD
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected'],
    default: 'Pending'
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});
// Note: I have removed the 'response' and 'respondedAt' fields as they are replaced by the new status system. You can keep them if you need them for other purposes.

const Application = mongoose.model('Application', applicationSchema);
module.exports = Application;