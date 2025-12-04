import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// Importamos el servicio para conectar con el Backend
import { VehiculosService } from '../services/vehiculos.service';

@Component({
  selector: 'app-vehiculos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehiculos.component.html',
  styleUrls: ['./vehiculos.component.scss']
})
export class VehiculosComponent implements OnInit {
  
  // Inyección del servicio
  private vehiculosService = inject(VehiculosService);

  // Estado
  vehiculos = signal<any[]>([]);
  filtro = signal('');
  modalAbierto = signal(false);
  vehiculoEnEdicion: string | null = null;

  // Formulario
  nuevoVehiculo: any = { 
    placa: '', 
    marca: '', 
    modelo: '', 
    activo: true 
  };

  marcasDisponibles = [
    'Kenworth', 'Mercedes-Benz', 'Volvo', 'Mack', 
    'Hino', 'Isuzu', 'Chevrolet', 'Foton', 'International'
  ];

  ngOnInit() {
    this.cargarVehiculos();
  }

  // --- 1. CARGAR (GET) DESDE BASE DE DATOS ---
  cargarVehiculos() {
    this.vehiculosService.getAll().subscribe({
      next: (data) => {
        this.vehiculos.set(data);
      },
      error: (err) => console.error('Error al cargar vehículos:', err)
    });
  }

  // --- FILTRO VISUAL ---
  vehiculosFiltrados = computed(() => {
    const term = this.filtro().toLowerCase();
    return this.vehiculos().filter(v => 
      v.placa.toLowerCase().includes(term) || 
      v.marca.toLowerCase().includes(term) ||
      (v.modelo && v.modelo.toString().includes(term))
    );
  });

  // --- GESTIÓN DEL MODAL ---
  abrirModalCrear() {
    this.vehiculoEnEdicion = null;
    this.nuevoVehiculo = { placa: '', marca: '', modelo: '', activo: true };
    this.modalAbierto.set(true);
  }

  abrirModalEditar(vehiculo: any) {
    this.vehiculoEnEdicion = vehiculo.id;
    // Copiamos los datos para no modificar la tabla directamente
    this.nuevoVehiculo = { 
      placa: vehiculo.placa, 
      marca: vehiculo.marca, 
      modelo: vehiculo.modelo, 
      activo: vehiculo.activo 
    };
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
    this.vehiculoEnEdicion = null;
  }

  // --- 2. GUARDAR (POST / PUT) EN BASE DE DATOS ---
  guardarVehiculo() {
    if (!this.nuevoVehiculo.placa || !this.nuevoVehiculo.marca) {
      alert('Por favor completa la Placa y la Marca.');
      return;
    }

    if (this.vehiculoEnEdicion) {
      // ACTUALIZAR
      this.vehiculosService.update(this.vehiculoEnEdicion, this.nuevoVehiculo).subscribe({
        next: (vehiculoActualizado) => {
          // Actualizamos la lista localmente
          this.vehiculos.update(lista => lista.map(v => 
            v.id === this.vehiculoEnEdicion ? vehiculoActualizado : v
          ));
          this.cerrarModal();
        },
        error: (err) => alert('Error al actualizar: ' + err.message)
      });

    } else {
      // CREAR
      this.vehiculosService.create(this.nuevoVehiculo).subscribe({
        next: (vehiculoCreado) => {
          // Agregamos el nuevo a la lista (al principio)
          this.vehiculos.update(lista => [vehiculoCreado, ...lista]);
          this.cerrarModal();
        },
        error: (err) => alert('Error al guardar: ' + err.message)
      });
    }
  }

  // --- 3. ELIMINAR (DELETE) DE BASE DE DATOS ---
  eliminarVehiculo(id: string) {
    if(confirm('¿Estás seguro de que quieres eliminar este vehículo?')) {
      this.vehiculosService.delete(id).subscribe({
        next: () => {
          this.vehiculos.update(lista => lista.filter(v => v.id !== id));
        },
        error: (err) => alert('Error al eliminar: ' + err.message)
      });
    }
  }
}