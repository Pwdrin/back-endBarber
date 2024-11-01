import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  points: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

export const Client = mongoose.model('Client', clientSchema);