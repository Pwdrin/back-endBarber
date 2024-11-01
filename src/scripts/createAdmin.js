import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/User.js';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado ao MongoDB');

    const adminData = {
      name: 'dayvd',
      email: 'admin@example.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin'
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    
    if (existingAdmin) {
      console.log('Administrador já existe!');
      console.log('Email:', adminData.email);
      console.log('Senha: admin123');
    } else {
      // Create new admin
      const admin = await User.create(adminData);
      console.log('Administrador criado com sucesso!');
      console.log('Email:', adminData.email);
      console.log('Senha: admin123');
    }

  } catch (error) {
    console.error('Erro ao criar administrador:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();