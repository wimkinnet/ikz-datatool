const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    schoolYear: { type: String, default: '' },
    category: { type: String, enum: ['bijlage', 'rapport', 'overig'], default: 'overig' },
    questionKey: { type: String, default: '' }, // set when attached to a questionnaire answer
    originalName: { type: String, required: true },
    storedFileName: { type: String, required: true },
    mimeType: { type: String },
    size: { type: Number },
    notes: { type: String, trim: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

documentSchema.index({ school: 1, schoolYear: 1 });

module.exports = mongoose.model('Document', documentSchema);
