import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // duration in minutes
    required: true
  },
  description: String
}, { timestamps: true });

export const Service = mongoose.model('Service', serviceSchema);