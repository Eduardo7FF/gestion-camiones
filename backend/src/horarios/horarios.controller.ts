import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { HorariosService } from './horarios.service';
import { CreateHorarioDto } from './dto/create-horario.dto';

@Controller('horarios')
export class HorariosController {
  constructor(private readonly horariosService: HorariosService) {}

  @Post()
  create(@Body() createHorarioDto: CreateHorarioDto) {
    return this.horariosService.create(createHorarioDto);
  }

  @Get()
  findAll() {
    return this.horariosService.findAll();
  }

  // Nuevo endpoint: GET /horarios/ruta/:rutaId
  @Get('ruta/:rutaId')
  findByRuta(@Param('rutaId') rutaId: string) {
    return this.horariosService.findByRuta(rutaId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.horariosService.remove(id);
  }
}