import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import authRouter from "./routes/auth.js";
import clientsRouter from "./routes/clients.js";
import appointmentsRouter from "./routes/appointments.js";
import dashboardRouter from "./routes/dashboard.js";
import barbersRouter from "./routes/barbers.js";
import servicesRouter from "./routes/services.js";
import { createAdminIfNotExists } from "./utils/createAdmin.js";

// Configure dotenv with the correct path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/auth", authRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/barbers", barbersRouter);
app.use("/api/services", servicesRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({
    error: "Erro interno do servidor",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

let isConnecting = false;

// MongoDB connection with retry logic
const connectDB = async (retries = 5) => {
  if (isConnecting) return;

  try {
    isConnecting = true;
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error(
        "MONGODB_URI não está definido nas variáveis de ambiente"
      );
    }

    console.log("Tentando conectar ao MongoDB...");

    await mongoose.connect(mongoUri);

    console.log("✅ Conectado ao MongoDB");
    isConnecting = false;

    // Create admin user after successful connection
    await createAdminIfNotExists();
  } catch (error) {
    console.error("❌ Erro ao conectar ao MongoDB:", error);
    isConnecting = false;

    if (retries > 0) {
      console.log(`⏳ Tentando reconectar... ${retries} tentativas restantes`);
      setTimeout(() => connectDB(retries - 1), 5000);
    } else {
      console.error("❌ Todas as tentativas de conexão falharam");
      process.exit(1);
    }
  }
};

// Handle MongoDB connection events
mongoose.connection.on("disconnected", () => {
  if (!isConnecting) {
    console.log("❌ MongoDB desconectado. Tentando reconectar...");
    connectDB();
  }
});

mongoose.connection.on("error", (error) => {
  console.error("❌ Erro na conexão MongoDB:", error);
});

const startServer = async () => {
  try {
    await connectDB();
    const PORT = process.env.PORT || 3002;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Servidor rodando na porta ${PORT}`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);
    });
  } catch (error) {
    console.error("❌ Erro ao iniciar o servidor:", error);
    process.exit(1);
  }
};

startServer();

export default app;
