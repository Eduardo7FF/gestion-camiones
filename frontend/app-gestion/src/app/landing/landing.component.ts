import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent implements OnInit {
  correo = '';
  contrasena = '';
  modoRegistro = signal(false);
  mostrarContrasena = signal(false);
  correoTocado = signal(false);
  
  // Modales de recuperación
  modalRecuperacion = signal(false);
  modalNuevaContrasena = signal(false);
  correoRecuperacion = '';
  nuevaContrasena = '';
  confirmarContrasena = '';
  
  toastService = inject(ToastService); 
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit() {
    // Detectar si la ruta es /register
    this.router.events.subscribe(() => {
      this.checkRoute();
    });
    this.checkRoute();

    // Detectar si viene del link de recuperación
    this.route.fragment.subscribe(fragment => {
      if (fragment && fragment.includes('type=recovery')) {
        this.modalNuevaContrasena.set(true);
      }
    });
  }

  private checkRoute() {
    const url = this.router.url;
    if (url.includes('/register')) {
      this.modoRegistro.set(true);
    } else {
      this.modoRegistro.set(false);
    }
  }

  async onLogin() {
    if (!this.correo || !this.contrasena) {
      this.toastService.warning('Completa todos los campos', 3000);
      return;
    }
    await this.auth.loginWithEmail(this.correo, this.contrasena);
  }

  async onRegister() {
    if (!this.correo || !this.contrasena) {
      this.toastService.warning('Completa todos los campos', 3000);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.correo)) {
      this.toastService.error('Ingresa un correo electrónico válido', 3000);
      return;
    }

    const dominiosComunes = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'live.com', 'mail.com'];
    const dominio = this.correo.split('@')[1]?.toLowerCase();
    
    if (dominio && !dominiosComunes.includes(dominio)) {
      this.toastService.warning('⚠️ Asegúrate de usar tu correo real para poder recuperar tu contraseña', 3500);
    }

    if (this.contrasena.length < 6) {
      this.toastService.warning('La contraseña debe tener al menos 6 caracteres', 3000);
      return;
    }

    const success = await this.auth.register(this.correo, this.contrasena);
    if (success) {
      // Después de registrarse exitosamente, ir a login
      this.correo = '';
      this.contrasena = '';
      this.correoTocado.set(false);
      this.router.navigate(['/login']);
    }
  }

  toggleModo() {
    // Navegar a la ruta correspondiente
    if (this.modoRegistro()) {
      this.router.navigate(['/login']);
    } else {
      this.router.navigate(['/register']);
    }
    this.correo = '';
    this.contrasena = '';
    this.correoTocado.set(false);
  }

  toggleMostrarContrasena() {
    this.mostrarContrasena.set(!this.mostrarContrasena());
  }

  async onGoogleLogin() {
    await this.auth.loginWithGoogle();
  }

  async onGitHubLogin() {
    await this.auth.loginWithGitHub();
  }

  // RECUPERACIÓN DE CONTRASEÑA
  abrirModalRecuperacion() {
    this.correoRecuperacion = '';
    this.modalRecuperacion.set(true);
  }

  cerrarModalRecuperacion() {
    this.modalRecuperacion.set(false);
    this.correoRecuperacion = '';
  }

  async enviarEmailRecuperacion() {
    if (!this.correoRecuperacion) {
      this.toastService.warning('Escribe tu correo electrónico', 3000);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.correoRecuperacion)) {
      this.toastService.error('Ingresa un correo válido', 3000);
      return;
    }

    const success = await this.auth.resetPassword(this.correoRecuperacion);
    if (success) {
      this.cerrarModalRecuperacion();
    }
  }

  cerrarModalNuevaContrasena() {
    this.modalNuevaContrasena.set(false);
    this.nuevaContrasena = '';
    this.confirmarContrasena = '';
  }

  async actualizarContrasena() {
    if (!this.nuevaContrasena || !this.confirmarContrasena) {
      this.toastService.warning('Completa todos los campos', 3000);
      return;
    }

    if (this.nuevaContrasena.length < 6) {
      this.toastService.warning('La contraseña debe tener al menos 6 caracteres', 3000);
      return;
    }

    if (this.nuevaContrasena !== this.confirmarContrasena) {
      this.toastService.error('Las contraseñas no coinciden', 3000);
      return;
    }

    const success = await this.auth.updatePassword(this.nuevaContrasena);
    if (success) {
      this.cerrarModalNuevaContrasena();
    }
  }
}