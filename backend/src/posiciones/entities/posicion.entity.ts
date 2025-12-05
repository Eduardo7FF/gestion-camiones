import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('posiciones') // Nombre de la tabla en Supabase
export class Posicion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  vehiculo_id: string; // ID del vehículo que envió la posición

  // Columna espacial PostGIS para un punto (POINT)
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point', // Tipo de geometría: Punto
    srid: 4326, // Sistema de Referencia: GPS (Latitud/Longitud)
    nullable: true,
  })
  geom: any; 

  @CreateDateColumn({ type: 'timestamptz' })
  capturado_ts: Date; // Fecha y hora de la captura
}