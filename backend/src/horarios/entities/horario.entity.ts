import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('horarios')
export class Horario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  ruta_id: string; // Relación con la tabla de rutas

  @Column('smallint')
  dia_semana: number; // 0=Domingo, 1=Lunes, etc.

  @Column('time')
  hora_inicio_plan: string; // Ej: "08:00:00"

  @Column('smallint', { nullable: true })
  ventana_min: number; // Duración estimada en minutos
}