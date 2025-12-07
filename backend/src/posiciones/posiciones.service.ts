import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Posicion } from './entities/posicion.entity';
import { CreatePosicionDto } from './dto/create-posicion.dto';

@Injectable()
export class PosicionesService {
  constructor(
    @InjectRepository(Posicion)
    private readonly posicionRepo: Repository<Posicion>,
  ) {}

  // Guardar una nueva posición GPS (un punto)
  async create(createPosicionDto: CreatePosicionDto) {
    const nuevaPosicion = this.posicionRepo.create(createPosicionDto);
    return await this.posicionRepo.save(nuevaPosicion);
  }

  // Obtener las últimas posiciones de un vehículo (opcional)
  async findLatestByVehiculo(vehiculoId: string, limit: number = 10) {
    return await this.posicionRepo.find({
      where: { vehiculo_id: vehiculoId },
      order: { capturado_ts: 'DESC' },
      take: limit,
    });
  }
}