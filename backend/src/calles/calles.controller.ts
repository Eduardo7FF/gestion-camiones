// backend/src/calles/calles.controller.ts
import { Controller, Get } from '@nestjs/common';
import { Observable } from 'rxjs';
import { CallesExternasService, CalleExterna } from './calles-externas.service'; //  Importar la interfaz del servicio

@Controller('calles')
export class CallesController {
  constructor(private readonly callesExternasService: CallesExternasService) {}

  /**
   * @Route GET /calles/externas
   * Llama al API externo del profesor para obtener las 985 calles con geometría.
   * @returns Observable con el array de Calles (GeoJSON).
   */
  @Get('externas')
  findAllExternal(): Observable<CalleExterna[]> { 
    console.log('📍 Endpoint /calles/externas llamado'); // Log para debugging
    return this.callesExternasService.getCalles();
  }
}