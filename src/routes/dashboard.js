import { Router } from 'express';
import { Appointment } from '../models/Appointment.js';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays } from 'date-fns';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);

    // Dados diários
    const dailyStats = await Appointment.aggregate([
      {
        $match: {
          date: {
            $gte: startOfDay(today),
            $lte: endOfDay(today)
          }
        }
      },
      {
        $group: {
          _id: null,
          dailyClients: { $sum: 1 },
          dailyRevenue: { $sum: '$revenue' }
        }
      }
    ]).exec();

    // Dados mensais
    const monthlyRevenue = await Appointment.aggregate([
      {
        $match: {
          date: {
            $gte: startOfMonth(today),
            $lte: endOfMonth(today)
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$revenue' }
        }
      }
    ]).exec();

    // Estatísticas semanais
    const weeklyStats = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const date = subDays(today, i);
        return Appointment.countDocuments({
          date: {
            $gte: startOfDay(date),
            $lte: endOfDay(date)
          }
        }).exec();
      })
    ).then(counts => 
      counts.map((clients, i) => ({
        date: subDays(today, i).toISOString(),
        clients
      }))
    );

    res.json({
      dailyClients: dailyStats[0]?.dailyClients || 0,
      dailyRevenue: dailyStats[0]?.dailyRevenue || 0,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      weeklyStats: weeklyStats.reverse()
    });
  } catch (error) {
    console.error('Dashboard route error:', error);
    res.status(500).json({ 
      error: 'Erro ao carregar dados do dashboard',
      details: error.message 
    });
  }
});

export default router;