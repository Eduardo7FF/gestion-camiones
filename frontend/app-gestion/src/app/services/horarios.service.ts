import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HorariosService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/horarios';

  constructor() {}

  // Crear un horario para una ruta
  create(horario: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, horario);
  }

  // Obtener horarios de una ruta específica
  getByRuta(rutaId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/ruta/${rutaId}`);
  }
}