// El Frontend enviará el ID del vehículo y la coordenada como un objeto GeoJSON Point
export class CreatePosicionDto {
  vehiculo_id: string;
  
  // Objeto GeoJSON de tipo Point, ej: { type: 'Point', coordinates: [-77.0, 3.8] }
  geom: any; 
}