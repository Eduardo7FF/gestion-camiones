import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PosicionesService {
  private http = inject(HttpClient);
  
  // URL del Backend para el módulo de Posiciones
  private apiUrl = 'http://localhost:3000/posiciones';

  constructor() {}

  /**
   * Registra una posición GPS en la base de datos.
   * @param data Objeto con vehiculo_id y la geometría POINT.
   */
  registerPosition(data: { vehiculo_id: string, geom: any }): Observable<any> {
    // Enviamos el objeto GeoJSON Point para que PostGIS lo entienda
    return this.http.post<any>(this.apiUrl, data);
  }
}