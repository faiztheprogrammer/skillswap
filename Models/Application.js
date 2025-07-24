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
  response: String, // Response from the skill owner
  respondedAt: Date, // To track time of response
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const Application = mongoose.model('Application', applicationSchema);
module.exports = Application;
