import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [FormsModule, HttpClientModule],
  templateUrl: './landing.html',
  styleUrls: ['./landing.scss']
})
export class LandingComponent {
  correo = '';
  contrasena = '';
  private toastService = inject(ToastService);

  constructor(private auth: AuthService, private router: Router) {}

  onLogin() {
    const datos = { email: this.correo, password: this.contrasena };

    this.auth.login(datos).subscribe({
      next: (res: any) => {
        if (res.message === 'Login exitoso') {
          this.toastService.showToast('¡Inicio de sesión exitoso!', 'success', 3500);
          localStorage.setItem('usuario', JSON.stringify(res.user));
          
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 3800);
        } else {
          this.toastService.showToast('Correo o contraseña incorrectos', 'error', 3000);
        }
      },
      error: (err) => {
        console.error('Error de login:', err);
        this.toastService.showToast('Ocurrió un error al iniciar sesión', 'error', 3000);
      }
    });
  }
}