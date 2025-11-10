import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async register(name: string, email: string, password: string) {

    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      return { message: 'El correo ya está registrado' };
    }

    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({ name, email, password: hashedPassword });
    return this.usersRepository.save(user);
  }

  async login(email: string, password: string) {
  const user = await this.usersRepository.findOne({ where: { email } });
  if (!user) return { message: 'Usuario no encontrado' };

  const match = await bcrypt.compare(password, user.password);
  if (!match) return { message: 'Contraseña incorrecta' };

  const { password: _, ...userWithoutPassword } = user;

  return { message: 'Login exitoso', user: userWithoutPassword };
}

}
