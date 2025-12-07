import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { HomeComponent } from './views/home/home.component';
import { VehiculosViewComponent } from './views/vehiculos-view/vehiculos-view.component';
import { MapaViewComponent } from './views/mapa-view/mapa-view.component';

type ViewType = 'home' | 'vehiculos' | 'mapa';

interface UserData {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  provider?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HomeComponent,
    VehiculosViewComponent,
    MapaViewComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);

  sidebarOpen = signal(true);
  currentView = signal<ViewType>('home');
  usuarioNombre = signal('Usuario');
  usuarioEmail = signal('');
  usuarioFoto = signal('');
  userMenuOpen = signal(false);

  menuItems = [
    { id: 'home' as ViewType, label: 'Dashboard' },
    { id: 'vehiculos' as ViewType, label: 'Vehículos' },
    { id: 'mapa' as ViewType, label: 'Mapa' }
  ];

  async ngOnInit() {
    // Esperar un momento para que el listener guarde la sesión
    setTimeout(() => {
      this.loadUserInfo();
    }, 100);
  }

  async loadUserInfo() {
    // 1. Intentar desde Supabase primero (fuente de verdad)
    try {
      const user = await this.auth.getUser();
      
      if (user) {
        const metadata = user.user_metadata || {};
        const appMetadata = user.app_metadata || {};
        
        const userData: UserData = {
          id: user.id,
          email: user.email || '',
          displayName: metadata['full_name'] || 
                       metadata['name'] || 
                       user.email?.split('@')[0] || 'Usuario',
          photoURL: metadata['avatar_url'] || 
                    metadata['picture'] || '',
          provider: appMetadata['provider'] || 'email'
        };
        
        // Guardar en localStorage
        localStorage.setItem('usuario', JSON.stringify(userData));
        
        // Actualizar UI
        this.usuarioEmail.set(userData.email);
        this.usuarioNombre.set(userData.displayName);
        this.usuarioFoto.set(userData.photoURL || '');
        
        console.log('Dashboard cargado con usuario:', userData);
        return;
      }
    } catch (error) {
      console.error('Error al cargar usuario desde Supabase:', error);
    }

    // 2. Si falla Supabase, intentar desde localStorage como fallback
    if (typeof localStorage !== 'undefined') {
      const userStr = localStorage.getItem('usuario');
      
      if (userStr) {
        try {
          const userData: UserData = JSON.parse(userStr);
          this.usuarioEmail.set(userData.email || '');
          this.usuarioNombre.set(userData.displayName || 'Usuario');
          this.usuarioFoto.set(userData.photoURL || '');
          console.log('Usuario cargado desde localStorage (fallback):', userData);
        } catch (error) {
          console.error('Error al parsear usuario:', error);
          this.setDefaultUser();
        }
      } else {
        this.setDefaultUser();
      }
    } else {
      this.setDefaultUser();
    }
  }

  private setDefaultUser() {
    this.usuarioNombre.set('Usuario');
    this.usuarioEmail.set('');
    this.usuarioFoto.set('');
  }

  toggleSidebar() {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  setView(view: ViewType) {
    this.currentView.set(view);
  }

  toggleUserMenu() {
    this.userMenuOpen.set(!this.userMenuOpen());
  }

  async logout() {
    this.userMenuOpen.set(false);
    await this.auth.logout();
  }
}