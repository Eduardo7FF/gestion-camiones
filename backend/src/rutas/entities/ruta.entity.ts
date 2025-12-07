import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('rutas')
export class Ruta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  nombre: string;

  @Column('text', { nullable: true })
  color_hex: string;

  // IMPORTANTE: Columna espacial para PostGIS
  // Guardamos un LINESTRING (línea) con SRID 4326 (GPS lat/long)
  @Column({
    type: 'geometry',
    spatialFeatureType: 'LineString',
    srid: 4326,
    nullable: true,
  })
  shape: any; 

  @Column('decimal', { nullable: true })
  longitud_m: number;

  @Column('boolean', { default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}