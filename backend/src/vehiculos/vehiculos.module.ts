import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiculosService } from './vehiculos.service';
import { VehiculosController } from './vehiculos.controller';
import { Vehiculo } from './entities/vehiculo.entity';

@Module({
  // IMPORTANTE: Aquí registramos la entidad 'Vehiculo' para que TypeORM pueda usarla
  imports: [TypeOrmModule.forFeature([Vehiculo])],
  controllers: [VehiculosController],
  providers: [VehiculosService],
  // Exportamos el servicio por si algún otro módulo (como Rutas) necesita consultar vehículos
  exports: [VehiculosService] 
})
export class VehiculosModule {}