import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/auth'; // URL de tu backend

  constructor(private http: HttpClient) {}

  login(data: { correo: string; contrasena: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, data);
  }

  register(data: { nombre: string; correo: string; contrasena: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, data);
  }

  // ✅ Método agregado para que no dé error el landing
  loginWithGoogle() {
    console.log('Login con Google todavía no implementado');
  }
}
