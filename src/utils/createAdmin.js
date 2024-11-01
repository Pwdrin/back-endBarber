import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';

export const createAdminIfNotExists = async () => {
  try {
    const adminData = {
      name: 'Administrador',
      email: 'admin@example.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin'
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    
    if (!existingAdmin) {
      // Create new admin
      await User.create(adminData);
      console.log('✅ Administrador criado com sucesso!');
      console.log('Email:', adminData.email);
      console.log('Senha: admin123');
    } else {
      console.log('ℹ️ Administrador já existe');
    }
  } catch (error) {
    console.error('❌ Erro ao criar administrador:', error);
  }
};