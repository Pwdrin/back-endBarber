import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  barberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Barber',
    required: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  revenue: {
    type: Number,
    required: true
  }
}, { timestamps: true });

export const Appointment = mongoose.model('Appointment', appointmentSchema);