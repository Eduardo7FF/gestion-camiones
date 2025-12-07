export class CreateRutaDto {
  nombre: string;
  color_hex?: string;
  // Recibimos la geometría como un objeto GeoJSON o string
  shape?: any; 
  longitud_m?: number;
  activo?: boolean;
}