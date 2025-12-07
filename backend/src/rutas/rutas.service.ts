import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ruta } from './entities/ruta.entity';
import { CreateRutaDto } from './dto/create-ruta.dto';

@Injectable()
export class RutasService {
  constructor(
    @InjectRepository(Ruta)
    private readonly rutaRepo: Repository<Ruta>,
  ) {}

  async create(createRutaDto: CreateRutaDto) {
    // TypeORM convierte automáticamente GeoJSON válido a geometría PostGIS
    const nuevaRuta = this.rutaRepo.create(createRutaDto);
    return await this.rutaRepo.save(nuevaRuta);
  }

  async findAll() {
    return await this.rutaRepo.find({
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string) {
    return await this.rutaRepo.findOneBy({ id });
  }

  async update(id: string, updateRutaDto: any) {
    await this.rutaRepo.update(id, updateRutaDto);
    return this.findOne(id);
  }

  async remove(id: string) {
    return await this.rutaRepo.delete(id);
  }
}