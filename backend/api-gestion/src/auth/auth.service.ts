import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Usuario } from './usuario.entity';
import { CreateUserDto } from './user.dto';
import { LoginDto } from './login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: CreateUserDto) {
    const existe = await this.usuarioRepo.findOne({ where: { correo: dto.correo } });
    if (existe) throw new BadRequestException('El correo ya está registrado.');

    const hashed = await bcrypt.hash(dto.contrasena, 10);
    const nuevo = this.usuarioRepo.create({
      nombre: dto.nombre,
      correo: dto.correo,
      contrasena: hashed,
    });

    const saved = await this.usuarioRepo.save(nuevo);
    const { contrasena, ...safe } = saved;
    return safe;
  }

  async login(dto: LoginDto) {
    const usuario = await this.usuarioRepo.findOne({ where: { correo: dto.correo } });
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');

    const ok = await bcrypt.compare(dto.contrasena, usuario.contrasena);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const payload = { id: usuario.id, correo: usuario.correo };
    const token = await this.jwtService.signAsync(payload);

    const { contrasena, ...safe } = usuario;
    return { usuario: safe, token };
  }

  async findAll() {
    const list = await this.usuarioRepo.find();
    return list.map(u => {
      const { contrasena, ...safe } = u;
      return safe;
    });
  }
}
