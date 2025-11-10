import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [FormsModule, NgIf, HttpClientModule],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss']
})
export class LandingComponent {
  correo = '';
  contrasena = '';

  constructor(private auth: AuthService, private router: Router) {}

  onLogin() {
    const datos = { email: this.correo, password: this.contrasena };

    this.auth.login(datos).subscribe({
      next: (res: any) => {
        if (res.message === 'Login exitoso') {
          // Guarda el usuario si el login fue correcto
          localStorage.setItem('usuario', JSON.stringify(res.user));
          // Redirige al dashboard
          this.router.navigate(['/dashboard']);
        } else {
          alert('Correo o contraseña incorrectos');
        }
      },
      error: (err) => {
        console.error('Error de login:', err);
        alert('Ocurrió un error al iniciar sesión');
      }
    });
  }
}
