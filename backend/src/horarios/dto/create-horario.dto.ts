export class CreateHorarioDto {
  ruta_id: string;
  dia_semana: number;
  hora_inicio_plan: string;
  ventana_min?: number;
}