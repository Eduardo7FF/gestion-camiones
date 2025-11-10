import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

type Camion = { placa: string; modelo: string; capacidad: string; fechaRegistro: string };
type Chofer = { nombre: string; cedula: string; telefono: string; fechaIngreso: string };
type Asignacion = { camion: string; chofer: string; ruta: string; fecha: string };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  menuAbierto = signal(true);
  tab = signal<'inicio'|'camiones'|'choferes'|'rutas'|'asignaciones'|'reportes'|'config'>('inicio');

  usuarioNombre = '';
  camiones: Camion[] = [];
  choferes: Chofer[] = [];
  asignaciones: Asignacion[] = [];

  // formularios
  nuevoCamion: Camion = { placa:'', modelo:'', capacidad:'', fechaRegistro: '' };
  nuevoChofer: Chofer = { nombre:'', cedula:'', telefono:'', fechaIngreso: '' };
  nuevaAsignacion: Asignacion = { camion:'', chofer:'', ruta:'', fecha: '' };

  modalCamion = false;
  modalChofer = false;
  modalAsignacion = false;

  // Soporte para destacar tarjetas de configuración
  activeCard: number | null = null;
  toggleCard(id: number): void {
    this.activeCard = this.activeCard === id ? null : id;
  }

  constructor(private router: Router) {}

ngOnInit(): void {
  const u = localStorage.getItem('usuario');
  this.usuarioNombre = u ? JSON.parse(u).name || JSON.parse(u).nombre || 'Usuario' : 'Usuario';
  this.camiones = JSON.parse(localStorage.getItem('camiones') || '[]');
  this.choferes = JSON.parse(localStorage.getItem('choferes') || '[]');
  this.asignaciones = JSON.parse(localStorage.getItem('asignaciones') || '[]');
}


  toggleMenu() { this.menuAbierto.set(!this.menuAbierto()); }
  setTab(t: any) { this.tab.set(t); }

  // CRUD local (persistencia en localStorage)
  guardarCamiones() { localStorage.setItem('camiones', JSON.stringify(this.camiones)); }
  guardarChoferes() { localStorage.setItem('choferes', JSON.stringify(this.choferes)); }
  guardarAsignaciones() { localStorage.setItem('asignaciones', JSON.stringify(this.asignaciones)); }

  agregarCamion() {
    if (!this.nuevoCamion.placa) return window.alert('Ingrese placa');
    this.nuevoCamion.fechaRegistro = new Date().toISOString();
    this.camiones.unshift({...this.nuevoCamion});
    this.nuevoCamion = { placa:'', modelo:'', capacidad:'', fechaRegistro: '' };
    this.guardarCamiones();
    this.modalCamion = false;
    this.tab.set('camiones');
  }

  agregarChofer() {
    if (!this.nuevoChofer.nombre) return window.alert('Ingrese nombre');
    this.nuevoChofer.fechaIngreso = new Date().toISOString();
    this.choferes.unshift({...this.nuevoChofer});
    this.nuevoChofer = { nombre:'', cedula:'', telefono:'', fechaIngreso: '' };
    this.guardarChoferes();
    this.modalChofer = false;
    this.tab.set('choferes');
  }

  agregarAsignacion() {
    if (!this.nuevaAsignacion.camion || !this.nuevaAsignacion.chofer) return window.alert('Seleccione camion y chofer');
    this.nuevaAsignacion.fecha = new Date().toISOString();
    this.asignaciones.unshift({...this.nuevaAsignacion});
    this.nuevaAsignacion = { camion:'', chofer:'', ruta:'', fecha: '' };
    this.guardarAsignaciones();
    this.modalAsignacion = false;
    this.tab.set('asignaciones');
  }

  borrarCamion(index: number) {
    if (!window.confirm('Eliminar camion?')) return;
    this.camiones.splice(index,1);
    this.guardarCamiones();
  }

  borrarChofer(index: number) {
    if (!window.confirm('Eliminar chofer?')) return;
    this.choferes.splice(index,1);
    this.guardarChoferes();
  }

  limpiarDatosLocales() {
    localStorage.clear();
    window.alert('✅ Datos locales eliminados correctamente.');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }
}
