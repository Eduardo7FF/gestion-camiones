import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RutasService {
  private http = inject(HttpClient);
  
  // URL del Backend
  private apiUrl = 'http://localhost:3000/rutas';

  constructor() {}

  // 1. Obtener todas las rutas guardadas
  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // 2. Guardar una nueva ruta (con geometría)
  create(ruta: any): Observable<any> {
    // El backend espera: { nombre, color_hex, shape: { type: 'LineString', coordinates: [...] } }
    return this.http.post<any>(this.apiUrl, ruta);
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}