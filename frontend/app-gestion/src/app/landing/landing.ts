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
    const datos = { correo: this.correo, contrasena: this.contrasena };
    this.auth.login(datos).subscribe({
      next: (res: any) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('usuario', JSON.stringify(res.usuario));
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Error de login:', err);
        alert('Correo o contraseña incorrectos');
      }
    });
  }
}
