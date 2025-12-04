// frontend/src/app/services/calles-externas.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CalleExterna {
  id: string;      
  nombre: string;  
  shape: any;      
}

@Injectable({
  providedIn: 'root'
})
export class CallesExternasService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/calles/externas';

  getCalles(): Observable<CalleExterna[]> {
    return this.http.get<CalleExterna[]>(this.apiUrl);
  }
}