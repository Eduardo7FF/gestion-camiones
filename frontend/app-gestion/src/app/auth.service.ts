import { Injectable, inject } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { ToastService } from './toast/toast.service';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  private router = inject(Router);
  private toastService = inject(ToastService);
  private isInitialLoad = true; // Flag para detectar carga inicial
  private hasShownLoginToast = false; // Flag para evitar toasts duplicados

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.key
    );

    this.initAuthListener();
    this.checkInitialSession();
  }

  // Verificar sesión inicial al cargar la app
  private async checkInitialSession() {
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session?.user) {
      this.saveUserToLocalStorage(session.user);
      // Si ya hay sesión, marcar que ya se mostró el toast
      this.hasShownLoginToast = true;
    }
    // Después de verificar la sesión inicial, marcamos que ya no es carga inicial
    setTimeout(() => {
      this.isInitialLoad = false;
    }, 1000);
  }

  // Listener de cambios de autenticación
  private initAuthListener() {
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('Usuario autenticado:', session.user.email);
        this.saveUserToLocalStorage(session.user);
        
        // Solo mostrar toast si NO es la carga inicial Y no se ha mostrado ya
        // Esto evita el toast al regresar a la página con sesión activa
        if (!this.isInitialLoad && !this.hasShownLoginToast) {
          const provider = session.user.app_metadata?.['provider'];
          if (provider === 'google' || provider === 'github') {
            this.hasShownLoginToast = true;
            this.toastService.success('Login exitoso', 2000);
            // Redirigir al dashboard solo en login nuevo
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 2000);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('Sesión cerrada');
        localStorage.removeItem('usuario');
        this.hasShownLoginToast = false; // Resetear el flag al cerrar sesión
      }
    });
  }

  // Guardar usuario en localStorage
  private saveUserToLocalStorage(user: any) {
    const metadata = user.user_metadata || {};
    const appMetadata = user.app_metadata || {};
    
    const provider = appMetadata['provider'] || 'email';
    let displayName = '';
    let email = user.email || '';
    
    if (provider === 'github') {
      displayName = metadata['user_name'] || 
                   metadata['preferred_username'] ||
                   metadata['name'] || 
                   metadata['full_name'] || 
                   'Usuario de GitHub';
      
      if (!email) {
        email = metadata['user_name'] ? '@' + metadata['user_name'] : '';
      }
    } else {
      displayName = metadata['full_name'] || 
                   metadata['name'] || 
                   email.split('@')[0] || 
                   'Usuario';
    }
    
    const userData = {
      id: user.id,
      email: email,
      displayName: displayName,
      photoURL: metadata['avatar_url'] || 
                metadata['picture'] || '',
      provider: provider
    };
    
    localStorage.setItem('usuario', JSON.stringify(userData));
    console.log('Usuario guardado:', userData);
  }

  async loginWithEmail(email: string, password: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // Marcar que se mostró el toast para este login
      this.hasShownLoginToast = true;
      this.toastService.success('Inicio sesión exitoso', 2000);
      
      if (data.user) {
        this.saveUserToLocalStorage(data.user);
      }
      
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 2000);
      
      return true;
    } catch (error: any) {
      let errorMessage = 'Error al iniciar sesión';
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Credenciales incorrectas';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Debes confirmar tu correo electrónico';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Correo electrónico inválido';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.toastService.error(errorMessage, 3000);
      return false;
    }
  }

  async loginWithGoogle(): Promise<void> {
    try {
      localStorage.removeItem('usuario');
      // Resetear el flag antes de un nuevo login
      this.hasShownLoginToast = false;
      
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      this.toastService.error(error.message || 'Error con Google', 3000);
    }
  }

  async loginWithGitHub(): Promise<void> {
    try {
      localStorage.removeItem('usuario');
      // Resetear el flag antes de un nuevo login
      this.hasShownLoginToast = false;
      
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      this.toastService.error(error.message || 'Error con GitHub', 3000);
    }
  }

  async register(email: string, password: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) throw error;

      if (data.user) {
        this.toastService.success('Cuenta creada exitosamente', 3000);
        
        if (data.user.confirmed_at) {
          this.saveUserToLocalStorage(data.user);
        }
        
        return true;
      }

      return false;
    } catch (error: any) {
      let errorMessage = 'Error al registrar';
      
      if (error.message.includes('already registered')) {
        errorMessage = 'Este correo ya está registrado';
      } else if (error.message.includes('Password')) {
        errorMessage = 'La contraseña no cumple los requisitos';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.toastService.error(errorMessage, 3000);
      return false;
    }
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    localStorage.clear();
    this.toastService.info('Sesión cerrada', 2000);
    this.router.navigate(['/']);
  }

  async getUser() {
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }

  async isLoggedIn(): Promise<boolean> {
    const { data } = await this.supabase.auth.getUser();
    return !!data.user;
  }

  async resetPassword(email: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`
      });

      if (error) throw error;

      this.toastService.success('Revisa tu correo para restablecer la contraseña', 3000);
      return true;
    } catch (error: any) {
      this.toastService.error(error.message || 'Error al enviar email', 3000);
      return false;
    }
  }

  async updatePassword(newPassword: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      this.toastService.success('Contraseña actualizada exitosamente', 3000);
      
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 2000);
      
      return true;
    } catch (error: any) {
      this.toastService.error(error.message || 'Error al actualizar contraseña', 3000);
      return false;
    }
  }
}