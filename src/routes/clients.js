import { Router } from 'express';
import { Client } from '../models/Client.js';
import { validateRequest } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();

const createClientSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z.string().optional()
});

// Criar cliente
router.post('/', validateRequest(createClientSchema), async (req, res) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Listar clientes
router.get('/', async (req, res) => {
  try {
    const clients = await Client.find().sort('-createdAt');
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar pontos do cliente
router.patch('/:id/points', async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { $inc: { points: 1 } },
      { new: true }
    );
    if (!client) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;