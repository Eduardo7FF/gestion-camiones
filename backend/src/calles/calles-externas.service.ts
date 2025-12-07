// backend/src/calles/calles-externas.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Observable, throwError } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';

export interface CalleExterna {
  id: string;      // ✅ Cambié de "d" a "id"
  nombre: string;  // ✅ Cambié de "ombre" a "nombre"
  shape: any;      // ✅ Cambié de "hape" a "shape"
}

@Injectable()
export class CallesExternasService {
  // ✅ URL correcta: endpoint que devuelve TODAS las calles
  private readonly apiProfesor = 'https://apirecoleccion.gonzaloandreslucio.com/api/calles';

  constructor(private readonly httpService: HttpService) {}

  getCalles(): Observable<CalleExterna[]> {
    console.log('🔍 Llamando al API del profesor:', this.apiProfesor);

    return this.httpService.get<{ data: CalleExterna[] }>(this.apiProfesor).pipe(
      timeout(15000),
      map(response => {
        // ✅ La respuesta viene envuelta en { data: [...] }
        const calles = response.data.data;
        console.log('✅ Respuesta exitosa del API!');
        console.log('📊 Total de calles recibidas:', calles?.length);
        
        if (calles?.length > 0) {
          console.log('📝 Ejemplo de primera calle:', JSON.stringify(calles[0], null, 2));
        }
        
        return calles;
      }),
      catchError(error => {
        console.error('❌ Error detallado:', {
          url: this.apiProfesor,
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          data: error.response?.data
        });
        
        return throwError(() => new HttpException(
          `Error al obtener calles del API externo: ${error.message}`,
          HttpStatus.BAD_GATEWAY
        ));
      })
    );
  }
}