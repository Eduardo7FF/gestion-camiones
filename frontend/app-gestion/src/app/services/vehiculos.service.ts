import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VehiculosService {
  private http = inject(HttpClient);
  
  // URL de tu Backend (Asegúrate de que el backend corra en el puerto 3000)
  private apiUrl = 'http://localhost:3000/vehiculos';
  
  // ID TEMPORAL DEL PROFESOR (Tu UID)
  private readonly PERFIL_ID = '747b8d3d-bb13-434e-a497-46ea96fba6c7'; 

  constructor() {}

  // 1. Obtener todos (Filtra por tu UID en el Backend)
  getAll(): Observable<any[]> {
    // El Backend está configurado para filtrar por el perfil_id que le enviamos aquí.
    return this.http.get<any[]>(`${this.apiUrl}?perfilId=${this.PERFIL_ID}`);
  }

  // 2. Crear vehículo (El Backend asigna el PERFIL_ID automáticamente)
  create(vehiculo: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, vehiculo);
  }

  // 3. Actualizar (Enviamos el ID del vehículo a actualizar)
  update(id: string, vehiculo: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, vehiculo);
  }

  // 4. Eliminar (Enviamos el ID del vehículo a eliminar)
  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}