const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    title: {
      type:     String,
      required: [true, 'Note title is required'],
      trim:     true,
    },
    content: {
      type:    String,
      trim:    true,
      default: '',
    },
    aiSummary: {
      type:    String,
      default: '',
    },
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Note', noteSchema);
