import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Horario } from './entities/horario.entity';
import { CreateHorarioDto } from './dto/create-horario.dto';

@Injectable()
export class HorariosService {
  constructor(
    @InjectRepository(Horario)
    private readonly horarioRepo: Repository<Horario>,
  ) {}

  async create(createHorarioDto: CreateHorarioDto) {
    const horario = this.horarioRepo.create(createHorarioDto);
    return await this.horarioRepo.save(horario);
  }

  async findAll() {
    return await this.horarioRepo.find();
  }

  // Buscar todos los horarios de una ruta específica
  async findByRuta(rutaId: string) {
    return await this.horarioRepo.find({
      where: { ruta_id: rutaId },
      order: { dia_semana: 'ASC', hora_inicio_plan: 'ASC' }
    });
  }

  async remove(id: string) {
    return await this.horarioRepo.delete(id);
  }
}