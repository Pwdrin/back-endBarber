import { Router } from 'express';
import { Service } from '../models/Service.js';
import { Appointment } from '../models/Appointment.js';
import { validateRequest } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();

const createServiceSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  price: z.number().min(0, 'Preço deve ser maior que zero'),
  duration: z.number().min(1, 'Duração deve ser maior que zero'),
  description: z.string().optional()
});

const updateServiceSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  price: z.number().min(0, 'Preço deve ser maior que zero').optional(),
  duration: z.number().min(1, 'Duração deve ser maior que zero').optional(),
  description: z.string().optional()
});

// Create service
router.post('/', validateRequest(createServiceSchema), async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update service
router.put('/:id', validateRequest(updateServiceSchema), async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }
    
    res.json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete service
router.delete('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    // Check for future appointments using this service
    const hasAppointments = await Appointment.exists({
      serviceId: service._id,
      date: { $gte: new Date() }
    });

    if (hasAppointments) {
      return res.status(400).json({ 
        error: 'Não é possível excluir um serviço com agendamentos futuros' 
      });
    }

    await service.deleteOne();
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List services
router.get('/', async (req, res) => {
  try {
    const services = await Service.find().sort('price');
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;