import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { PosicionesService } from './posiciones.service';
import { CreatePosicionDto } from './dto/create-posicion.dto';

@Controller('posiciones')
export class PosicionesController {
  constructor(private readonly posicionesService: PosicionesService) {}

  // Endpoint para registrar una posición (usado por el Frontend/Simulación)
  @Post()
  create(@Body() createPosicionDto: CreatePosicionDto) {
    return this.posicionesService.create(createPosicionDto);
  }
  
  // Endpoint para consultar las últimas posiciones (para auditoría o real-time)
  @Get('latest')
  findLatest(@Query('vehiculoId') vehiculoId: string) {
    if (!vehiculoId) {
        return { error: 'Se requiere vehiculoId' };
    }
    return this.posicionesService.findLatestByVehiculo(vehiculoId);
  }
}