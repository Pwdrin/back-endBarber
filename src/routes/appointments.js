import { Router } from "express";
import { Appointment } from "../models/Appointment.js";
import { Client } from "../models/Client.js";
import { Service } from "../models/Service.js";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import mongoose from "mongoose";

const router = Router();

// Helper function to check if MongoDB ObjectId is valid
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Helper function to create a date at noon UTC
const createDateAtNoonUTC = (dateString) => {
  const date = new Date(dateString);
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      12,
      0,
      0
    )
  );
};

// Helper function to validate required fields
const validateAppointmentData = (data) => {
  const requiredFields = [
    "clientId",
    "barberId",
    "serviceId",
    "date",
    "time",
    "revenue",
  ];
  const missingFields = requiredFields.filter((field) => !data[field]);

  if (missingFields.length > 0) {
    throw new Error(
      `Campos obrigatórios faltando: ${missingFields.join(", ")}`
    );
  }

  if (!isValidObjectId(data.clientId))
    throw new Error("ID do cliente inválido");
  if (!isValidObjectId(data.barberId))
    throw new Error("ID do barbeiro inválido");
  if (!isValidObjectId(data.serviceId))
    throw new Error("ID do serviço inválido");

  const dateObj = parseISO(data.date);
  if (isNaN(dateObj.getTime())) throw new Error("Data inválida");

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(data.time)) throw new Error("Horário inválido");

  if (typeof data.revenue !== "number" || data.revenue < 0) {
    throw new Error("Valor inválido");
  }
};

// Helper function to populate appointment data
const populateAppointment = (query) => {
  return query
    .populate("clientId", "name phone points")
    .populate({
      path: "barberId",
      populate: {
        path: "user",
        select: "name email",
      },
    })
    .populate("serviceId", "name price duration");
};

// Check time availability
router.post("/check-availability", async (req, res) => {
  try {
    const { barberId, date, time, excludeAppointmentId } = req.body;

    const query = {
      barberId,
      date: createDateAtNoonUTC(date),
      time,
    };

    if (excludeAppointmentId) {
      query._id = { $ne: excludeAppointmentId };
    }

    const existingAppointment = await Appointment.findOne(query);

    res.json({
      available: !existingAppointment,
      conflictingAppointment: existingAppointment
        ? {
            id: existingAppointment._id,
            time: existingAppointment.time,
          }
        : null,
    });
  } catch (error) {
    console.error("Check availability error:", error);
    res.status(400).json({
      error: "Erro ao verificar disponibilidade",
      details: error.message,
    });
  }
});

// Create appointment
router.post("/", async (req, res) => {
  try {
    validateAppointmentData(req.body);

    const appointmentDate = createDateAtNoonUTC(req.body.date);

    const existingAppointment = await Appointment.findOne({
      barberId: req.body.barberId,
      date: appointmentDate,
      time: req.body.time,
    });

    if (existingAppointment) {
      return res.status(400).json({
        error: "Horário não disponível para este barbeiro",
      });
    }

    const appointment = await Appointment.create({
      ...req.body,
      date: appointmentDate,
    });

    const populatedAppointment = await populateAppointment(
      Appointment.findById(appointment._id)
    );

    res.status(201).json(populatedAppointment);
  } catch (error) {
    console.error("Create appointment error:", error);
    res.status(400).json({
      error: "Erro ao criar agendamento",
      details: error.message,
    });
  }
});

// List appointments
router.get("/", async (req, res) => {
  try {
    const { date, barberId, completed } = req.query;
    const query = {};

    if (date) {
      const searchDate = createDateAtNoonUTC(date);
      query.date = searchDate;
    }

    if (barberId && isValidObjectId(barberId)) {
      query.barberId = barberId;
    }

    if (completed !== undefined) {
      query.completed = completed === "true";
    }

    const appointments = await populateAppointment(
      Appointment.find(query).sort({ date: 1, time: 1 })
    );

    res.json(appointments);
  } catch (error) {
    console.error("List appointments error:", error);
    res.status(500).json({
      error: "Erro ao listar agendamentos",
      details: error.message,
    });
  }
});

// Update appointment
router.put("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    validateAppointmentData(req.body);

    const appointmentDate = createDateAtNoonUTC(req.body.date);

    const existingAppointment = await Appointment.findOne({
      _id: { $ne: req.params.id },
      barberId: req.body.barberId,
      date: appointmentDate,
      time: req.body.time,
    });

    if (existingAppointment) {
      return res.status(400).json({
        error: "Horário não disponível para este barbeiro",
      });
    }

    const appointment = await populateAppointment(
      Appointment.findByIdAndUpdate(
        req.params.id,
        {
          ...req.body,
          date: appointmentDate,
        },
        { new: true }
      )
    );

    if (!appointment) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    res.json(appointment);
  } catch (error) {
    console.error("Update appointment error:", error);
    res.status(400).json({
      error: "Erro ao atualizar agendamento",
      details: error.message,
    });
  }
});

// Delete appointment
router.delete("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    if (appointment.completed) {
      return res.status(400).json({
        error: "Não é possível excluir um agendamento já concluído",
      });
    }

    await appointment.deleteOne();
    res.status(204).send();
  } catch (error) {
    console.error("Delete appointment error:", error);
    res.status(400).json({
      error: "Erro ao excluir agendamento",
      details: error.message,
    });
  }
});

// Complete appointment
router.patch("/:id/complete", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    if (appointment.completed) {
      return res.status(400).json({ error: "Agendamento já foi concluído" });
    }

    // Update appointment
    appointment.completed = true;
    appointment.completedAt = new Date();
    await appointment.save();

    // Add points to client
    if (appointment.clientId) {
      await Client.findByIdAndUpdate(appointment.clientId, {
        $inc: { points: 1 },
      });
    }

    const populatedAppointment = await populateAppointment(
      Appointment.findById(appointment._id)
    );

    res.json(populatedAppointment);
  } catch (error) {
    console.error("Complete appointment error:", error);
    res.status(400).json({
      error: "Erro ao concluir agendamento",
      details: error.message,
    });
  }
});

export default router;
