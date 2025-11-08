import { Component, signal, HostListener } from '@angular/core';
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
  showLogin = signal(false);
  isScrolled = signal(false);
  correo = '';
  contrasena = '';

  constructor(private auth: AuthService, private router: Router) {}

  toggleLogin() {
    this.showLogin.set(!this.showLogin());
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled.set(window.scrollY > 100);
  }

  onLogin() {
    const datos = { correo: this.correo, contrasena: this.contrasena };

    this.auth.login(datos).subscribe({
      next: (res: any) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('usuario', JSON.stringify(res.usuario));

        // ✅ Redirigir al dashboard
        this.toggleLogin();
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Error de login:', err);
        alert('Correo o contraseña incorrectos');
      }
    });
  }
}


