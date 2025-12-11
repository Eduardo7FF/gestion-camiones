import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { AuthService } from '../auth.service';
import { filter } from 'rxjs/operators';

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
    RouterOutlet  // Cambiado: ahora usamos RouterOutlet en lugar de importar componentes directamente
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
    { id: 'home' as ViewType, label: 'Dashboard', route: '/dashboard/home' },
    { id: 'vehiculos' as ViewType, label: 'Vehículos', route: '/dashboard/vehiculos' },
    { id: 'mapa' as ViewType, label: 'Mapa', route: '/dashboard/mapa' }
  ];

  async ngOnInit() {
    // Esperar un momento para que el listener guarde la sesión
    setTimeout(() => {
      this.loadUserInfo();
    }, 100);

    // Detectar la ruta actual para sincronizar el estado
    this.syncCurrentViewFromRoute();

    // Suscribirse a cambios de navegación para mantener sincronizado el menu
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.syncCurrentViewFromRoute();
      });
  }

  // Sincronizar currentView basado en la URL actual
  private syncCurrentViewFromRoute() {
    const url = this.router.url;
    if (url.includes('/dashboard/vehiculos')) {
      this.currentView.set('vehiculos');
    } else if (url.includes('/dashboard/mapa')) {
      this.currentView.set('mapa');
    } else {
      this.currentView.set('home');
    }
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

  // CAMBIADO: Ahora navegamos usando el router en lugar de cambiar solo el signal
  setView(view: ViewType) {
    const menuItem = this.menuItems.find(item => item.id === view);
    if (menuItem) {
      this.router.navigate([menuItem.route]);
    }
  }

  toggleUserMenu() {
    this.userMenuOpen.set(!this.userMenuOpen());
  }

  async logout() {
    this.userMenuOpen.set(false);
    await this.auth.logout();
  }
}