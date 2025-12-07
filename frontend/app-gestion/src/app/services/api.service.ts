import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'https://apirecoleccion.gonzaloandreslucio.com/api';
  private perfilId = '747b8d3d-bb13-434e-a497-46ea96fba6c7';

  constructor(private http: HttpClient) {}

  private getHeaders() {
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      })
    };
  }

  // VEHICULOS
  getVehiculos(): Observable<any[]> {
    const params = new HttpParams().set('perfil_id', this.perfilId);
    return this.http.get<any>(`${this.apiUrl}/vehiculos`, { params, ...this.getHeaders() })
      .pipe(
        map(response => response.data || [])
      );
  }

  crearVehiculo(vehiculo: any): Observable<any> {
    const payload = {
      perfil_id: this.perfilId,
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      activo: vehiculo.activo !== undefined ? vehiculo.activo : true
    };
    return this.http.post(`${this.apiUrl}/vehiculos`, payload, this.getHeaders());
  }

  actualizarVehiculo(vehiculoId: string, vehiculo: any): Observable<any> {
    const payload = {
      perfil_id: this.perfilId,
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      activo: vehiculo.activo
    };
    return this.http.put(`${this.apiUrl}/vehiculos/${vehiculoId}`, payload, this.getHeaders());
  }

  eliminarVehiculo(vehiculoId: string): Observable<any> {
    const params = new HttpParams().set('perfil_id', this.perfilId);
    return this.http.delete(`${this.apiUrl}/vehiculos/${vehiculoId}`, { params });
  }

  // RUTAS
  getRutas(): Observable<any[]> {
    const params = new HttpParams().set('perfil_id', this.perfilId);
    return this.http.get<any>(`${this.apiUrl}/rutas`, { params, ...this.getHeaders() })
      .pipe(
        map(response => response.data || [])
      );
  }

  crearRuta(ruta: any): Observable<any> {
    const payload = {
      perfil_id: this.perfilId,
      nombre_ruta: ruta.nombre_ruta,
      color_hex: ruta.color_hex || '#10b981',
      shape: ruta.shape
    };
    return this.http.post(`${this.apiUrl}/rutas`, payload, this.getHeaders());
  }

  eliminarRuta(rutaId: string): Observable<any> {
    const params = new HttpParams().set('perfil_id', this.perfilId);
    return this.http.delete(`${this.apiUrl}/rutas/${rutaId}`, { params });
  }

  // CALLES EXTERNAS
  getCallesExternas(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/calles`, this.getHeaders())
      .pipe(
        map(response => {
          if (response && response.data) {
            return Array.isArray(response.data) ? response.data : [];
          }
          if (Array.isArray(response)) {
            return response;
          }
          return [];
        })
      );
  }

  // RECORRIDOS
  getMisRecorridos(): Observable<any[]> {
    const params = new HttpParams().set('perfil_id', this.perfilId);
    return this.http.get<any>(`${this.apiUrl}/misrecorridos`, { params, ...this.getHeaders() })
      .pipe(
        map(response => response.data || response || [])
      );
  }

  iniciarRecorrido(vehiculoId: string, rutaId: string): Observable<any> {
    const payload = {
      vehiculo_id: vehiculoId,
      ruta_id: rutaId,
      perfil_id: this.perfilId
    };
    return this.http.post(`${this.apiUrl}/recorridos/iniciar`, payload, this.getHeaders());
  }

  finalizarRecorrido(recorridoId: string): Observable<any> {
    const payload = {
      perfil_id: this.perfilId
    };
    return this.http.post(`${this.apiUrl}/recorridos/${recorridoId}/finalizar`, payload, this.getHeaders());
  }

  // Obtener un recorrido específico con sus posiciones
  getRecorrido(recorridoId: string): Observable<any> {
    const params = new HttpParams().set('perfil_id', this.perfilId);
    return this.http.get<any>(`${this.apiUrl}/recorridos/${recorridoId}`, { params, ...this.getHeaders() });
  }
}