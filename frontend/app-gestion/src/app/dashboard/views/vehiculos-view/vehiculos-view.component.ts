import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../toast/toast.service';

interface Vehiculo {
  id?: string;
  placa: string;
  marca: string;
  modelo: string;
  activo: boolean;
  created_at?: string;
}

@Component({
  selector: 'app-vehiculos-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehiculos-view.component.html',
  styleUrls: ['./vehiculos-view.component.scss']
})
export class VehiculosViewComponent implements OnInit {
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);

  vehiculos = signal<Vehiculo[]>([]);
  loading = signal(true);
  modalAbierto = signal(false);
  modoEdicion = signal(false);
  modalEliminarAbierto = signal(false);
  vehiculoAEliminar: Vehiculo | null = null;
  
  nuevoVehiculo: Vehiculo = {
    placa: '',
    marca: '',
    modelo: '',
    activo: true
  };

  vehiculoEditando: Vehiculo | null = null;

  ngOnInit() {
    this.cargarVehiculos();
  }

  cargarVehiculos() {
    this.loading.set(true);
    this.apiService.getVehiculos().subscribe({
      next: (data) => {
        this.vehiculos.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error:', err);
        this.toastService.showToast('Error al cargar vehículos', 'error', 3000);
        this.loading.set(false);
      }
    });
  }

  abrirModal() {
    this.modoEdicion.set(false);
    this.nuevoVehiculo = {
      placa: '',
      marca: '',
      modelo: '',
      activo: true
    };
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
    this.modoEdicion.set(false);
    this.vehiculoEditando = null;
  }

  crearVehiculo() {
    if (!this.nuevoVehiculo.placa || !this.nuevoVehiculo.marca || !this.nuevoVehiculo.modelo) {
      this.toastService.showToast('Completa todos los campos obligatorios', 'warning', 3000);
      return;
    }

    const placaRegex = /^[A-Z]{3}-\d{3}$/;
    if (!placaRegex.test(this.nuevoVehiculo.placa.toUpperCase())) {
      this.toastService.showToast('Formato de placa inválido (Ej: ABC-123)', 'warning', 3000);
      return;
    }

    this.apiService.crearVehiculo({
      ...this.nuevoVehiculo,
      placa: this.nuevoVehiculo.placa.toUpperCase()
    }).subscribe({
      next: () => {
        this.toastService.showToast('Vehículo creado exitosamente', 'success', 3000);
        this.cargarVehiculos();
        this.cerrarModal();
      },
      error: (err) => {
        console.error(err);
        this.toastService.showToast('Error al crear vehículo', 'error', 3000);
      }
    });
  }

  editarVehiculo(vehiculo: Vehiculo) {
    this.modoEdicion.set(true);
    this.vehiculoEditando = vehiculo;
    this.nuevoVehiculo = { ...vehiculo };
    this.modalAbierto.set(true);
  }

  guardarEdicion() {
    if (!this.nuevoVehiculo.placa || !this.nuevoVehiculo.marca || !this.nuevoVehiculo.modelo) {
      this.toastService.showToast('Completa todos los campos obligatorios', 'warning', 3000);
      return;
    }

    if (this.vehiculoEditando && this.vehiculoEditando.id) {
      this.apiService.actualizarVehiculo(this.vehiculoEditando.id, this.nuevoVehiculo).subscribe({
        next: () => {
          this.toastService.showToast('Vehículo actualizado exitosamente', 'success', 3000);
          this.cargarVehiculos();
          this.cerrarModal();
        },
        error: (err) => {
          console.error(err);
          this.toastService.showToast('Error al actualizar vehículo', 'error', 3000);
        }
      });
    }
  }

  toggleActivo(vehiculo: Vehiculo) {
    if (vehiculo.id) {
      this.apiService.actualizarVehiculo(vehiculo.id, {
        ...vehiculo,
        activo: !vehiculo.activo
      }).subscribe({
        next: () => {
          this.toastService.showToast(
            vehiculo.activo ? 'Vehículo desactivado' : 'Vehículo activado',
            'info',
            2000
          );
          this.cargarVehiculos();
        },
        error: (err) => {
          console.error(err);
          this.toastService.showToast('Error al actualizar estado', 'error', 3000);
        }
      });
    }
  }

  abrirModalEliminar(vehiculo: Vehiculo) {
    this.vehiculoAEliminar = vehiculo;
    this.modalEliminarAbierto.set(true);
  }

  cerrarModalEliminar() {
    this.modalEliminarAbierto.set(false);
    this.vehiculoAEliminar = null;
  }

  confirmarEliminar() {
    if (this.vehiculoAEliminar && this.vehiculoAEliminar.id) {
      this.apiService.eliminarVehiculo(this.vehiculoAEliminar.id).subscribe({
        next: () => {
          this.toastService.showToast('Vehículo eliminado exitosamente', 'success', 3000);
          this.cargarVehiculos();
          this.cerrarModalEliminar();
        },
        error: (err) => {
          console.error(err);
          this.toastService.showToast('Error al eliminar vehículo', 'error', 3000);
        }
      });
    }
  }
}