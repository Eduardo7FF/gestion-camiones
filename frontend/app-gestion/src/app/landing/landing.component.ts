import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // Importante para directivas como *ngIf
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';

// Asegúrate de que la ruta a estos servicios sea correcta
import { AuthService } from '../auth.service';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  // CORRECCIÓN: Apuntando a los nombres de archivo estándar
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {
  correo = '';
  contrasena = '';
  
  // Inyección de servicios
  private toastService = inject(ToastService);
  private auth = inject(AuthService);
  private router = inject(Router);

  onLogin() {
    // Validación simple antes de enviar
    if (!this.correo || !this.contrasena) {
      this.toastService.showToast('Por favor completa todos los campos', 'warning', 3000);
      return;
    }

    const datos = { email: this.correo, password: this.contrasena };

    this.auth.login(datos).subscribe({
      next: (res: any) => {
        if (res.message === 'Login exitoso' || res.token) {
          this.toastService.showToast('¡Inicio de sesión exitoso!', 'success', 2000);
          
          // Guardar usuario y token si viene en la respuesta
          localStorage.setItem('usuario', JSON.stringify(res.user));
          if (res.token) localStorage.setItem('token', res.token);
          
          // Redirigir al dashboard un poco más rápido (2s es suficiente para leer el toast)
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 2000);
        } else {
          this.toastService.showToast('Correo o contraseña incorrectos', 'error', 3000);
        }
      },
      error: (err) => {
        console.error('Error de login:', err);
        // Manejo de errores específicos si el backend los envía
        const mensaje = err.error?.message || 'Ocurrió un error al iniciar sesión';
        this.toastService.showToast(mensaje, 'error', 3000);
      }
    });
  }
}