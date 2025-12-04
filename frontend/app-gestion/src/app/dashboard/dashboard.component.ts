import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// 1. IMPORTAMOS LOS COMPONENTES HIJOS
import { VehiculosComponent } from '../vehiculos/vehiculos.component';
// Asegúrate de que la ruta sea correcta según donde creaste el archivo
import { MapaRutasComponent } from '../mapa-rutas/mapa-rutas.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  // 2. AGREGAMOS MapaRutasComponent AQUÍ PARA QUE EL HTML LO RECONOZCA
  imports: [CommonModule, VehiculosComponent, MapaRutasComponent], 
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  
  private router = inject(Router);

  // --- ESTADO DE LA UI ---
  menuAbierto = signal(true);
  tab = signal<'inicio' | 'vehiculos' | 'rutas'>('inicio'); 
  usuarioNombre = '';

  ngOnInit() {
    // Recuperar nombre del usuario de forma segura
    if (typeof localStorage !== 'undefined') {
      const u = localStorage.getItem('usuario');
      if (u) {
        try {
          const userObj = JSON.parse(u);
          // Intentamos obtener el nombre de varias propiedades comunes
          this.usuarioNombre = userObj.nombre || userObj.name || userObj.email || 'Admin';
        } catch (e) {
          this.usuarioNombre = 'Admin';
        }
      }
    }
  }

  // --- ACCIONES ---
  toggleMenu() {
    this.menuAbierto.set(!this.menuAbierto());
  }

  setTab(t: 'inicio' | 'vehiculos' | 'rutas') {
    this.tab.set(t);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/']);
  }
}