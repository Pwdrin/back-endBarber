import { Router } from 'express';
import { Barber } from '../models/Barber.js';
import { User } from '../models/User.js';
import { Appointment } from '../models/Appointment.js';
import { validateRequest } from '../middleware/validate.js';
import { z } from 'zod';
import { startOfMonth, endOfMonth } from 'date-fns';
import bcrypt from 'bcryptjs';

const router = Router();

// Get barber statistics
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const barbers = await Barber.find().populate('user', 'name email');
    const stats = {};

    await Promise.all(barbers.map(async (barber) => {
      // Get monthly appointments
      const monthlyAppointments = await Appointment.countDocuments({
        barberId: barber._id,
        date: {
          $gte: monthStart,
          $lte: monthEnd
        }
      });

      // Get completed appointments and revenue
      const completedAppointments = await Appointment.find({
        barberId: barber._id,
        completed: true,
        date: {
          $gte: monthStart,
          $lte: monthEnd
        }
      });

      // Calculate total revenue
      const revenue = completedAppointments.reduce((total, app) => total + (app.revenue || 0), 0);

      stats[barber._id] = {
        monthlyAppointments,
        completedAppointments: completedAppointments.length,
        revenue
      };
    }));

    res.json(stats);
  } catch (error) {
    console.error('Error getting barber stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create barber
router.post('/', validateRequest(z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  specialties: z.array(z.string()).optional()
})), async (req, res) => {
  try {
    const { name, email, password, specialties } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: 'barber'
    });

    // Create barber
    const barber = await Barber.create({
      userId: user._id,
      specialties: specialties || []
    });

    // Populate user data
    await barber.populate('user', '-password');

    res.status(201).json(barber);
  } catch (error) {
    console.error('Error creating barber:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update barber
router.put('/:id', validateRequest(z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional(),
  specialties: z.array(z.string()).optional()
})), async (req, res) => {
  try {
    const barber = await Barber.findById(req.params.id);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }

    const { name, email, password, specialties } = req.body;

    // Check if email is already in use by another user
    const existingUser = await User.findOne({ 
      email, 
      _id: { $ne: barber.userId } 
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Email já está em uso' });
    }

    // Update user
    const updateData = { name, email };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await User.findByIdAndUpdate(barber.userId, updateData);

    // Update barber
    barber.specialties = specialties || [];
    await barber.save();

    // Populate and return updated barber
    await barber.populate('user', '-password');
    res.json(barber);
  } catch (error) {
    console.error('Error updating barber:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete barber
router.delete('/:id', async (req, res) => {
  try {
    const barber = await Barber.findById(req.params.id);
    if (!barber) {
      return res.status(404).json({ error: 'Barbeiro não encontrado' });
    }

    // Check for future appointments
    const hasAppointments = await Appointment.exists({
      barberId: barber._id,
      date: { $gte: new Date() }
    });

    if (hasAppointments) {
      return res.status(400).json({ 
        error: 'Não é possível excluir um barbeiro com agendamentos futuros' 
      });
    }

    // Delete user and barber
    await User.findByIdAndDelete(barber.userId);
    await barber.deleteOne();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting barber:', error);
    res.status(400).json({ error: error.message });
  }
});

// List barbers
router.get('/', async (req, res) => {
  try {
    const barbers = await Barber.find()
      .populate('user', '-password')
      .sort('user.name');
    res.json(barbers);
  } catch (error) {
    console.error('Error listing barbers:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;