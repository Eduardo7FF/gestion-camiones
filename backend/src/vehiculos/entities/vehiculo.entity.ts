import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('vehiculos') // El nombre debe coincidir con la tabla de Supabase
export class Vehiculo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  placa: string;

  @Column('text', { nullable: true })
  marca: string;

  @Column('text', { nullable: true })
  modelo: string;

  @Column('boolean', { default: true })
  activo: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}