const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema({
    offeredBy: {
        type: String,
        required: true
    },

    skillOffered: {
        type: String,
        required: true
    },

    wantsToLearn: {
        type: String,
        required: true
    },

    datePosted: {
        type: Date,
        default: Date.now
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

module.exports = mongoose.model('Skill', SkillSchema);