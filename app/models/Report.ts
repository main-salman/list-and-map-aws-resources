import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
  company: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: false,
  },
  issue: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Report || mongoose.model('Report', ReportSchema); 