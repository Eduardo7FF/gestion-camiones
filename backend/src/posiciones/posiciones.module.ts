import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosicionesService } from './posiciones.service';
import { PosicionesController } from './posiciones.controller';
import { Posicion } from './entities/posicion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Posicion])],
  controllers: [PosicionesController],
  providers: [PosicionesService],
  exports: [PosicionesService], // Exportamos por si otros módulos lo necesitan
})
export class PosicionesModule {}