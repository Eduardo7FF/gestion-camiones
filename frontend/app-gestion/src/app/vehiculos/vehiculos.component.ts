import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-vehiculos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vehiculos.component.html',
  styleUrls: ['./vehiculos.component.scss']
})
export class VehiculosComponent implements OnInit {

  // Lista principal de vehículos (Signal para que la UI reaccione rápido)
  vehiculos = signal<any[]>([]);

  // Variables de control de la interfaz
  filtro = signal('');
  modalAbierto = signal(false);
  
  // Si esta variable tiene un ID, estamos editando. Si es null, estamos creando.
  vehiculoEnEdicion: string | null = null;

  // Objeto del formulario (Coincide con los ngModel del HTML)
  nuevoVehiculo: any = { 
    placa: '', 
    marca: '', 
    modelo: '', 
    activo: true 
  };

  // Opciones para el select de marcas
  marcasDisponibles = [
    'Kenworth', 
    'Mercedes-Benz', 
    'Volvo', 
    'Mack', 
    'Hino', 
    'Isuzu', 
    'Chevrolet', 
    'Foton',
    'International'
  ];

  ngOnInit() {
    this.cargarDeStorage();
  }

  // --- PERSISTENCIA DE DATOS (LOCALSTORAGE) ---
  cargarDeStorage() {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem('mis_vehiculos');
      if (data) {
        this.vehiculos.set(JSON.parse(data));
      } else {
        // Datos de prueba iniciales para que no se vea vacío al principio
        this.vehiculos.set([
          { id: '1', placa: 'TUK-909', marca: 'Kenworth', modelo: 'T800', activo: true },
          { id: '2', placa: 'SXZ-123', marca: 'Mercedes-Benz', modelo: 'Atego', activo: true },
          { id: '3', placa: 'ABC-456', marca: 'Volvo', modelo: 'FMX', activo: false }
        ]);
        this.guardarEnStorage();
      }
    }
  }

  guardarEnStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mis_vehiculos', JSON.stringify(this.vehiculos()));
    }
  }

  // --- LÓGICA DE FILTRADO (BUSCADOR) ---
  vehiculosFiltrados = computed(() => {
    const term = this.filtro().toLowerCase();
    return this.vehiculos().filter(v => 
      v.placa.toLowerCase().includes(term) || 
      v.marca.toLowerCase().includes(term) ||
      (v.modelo && v.modelo.toString().includes(term))
    );
  });

  // --- GESTIÓN DEL MODAL ---

  // 1. Abrir modal para CREAR un vehículo nuevo
  abrirModalCrear() {
    this.vehiculoEnEdicion = null; // Indicamos que es creación
    // Limpiamos el formulario
    this.nuevoVehiculo = { placa: '', marca: '', modelo: '', activo: true };
    this.modalAbierto.set(true);
  }

  // 2. Abrir modal para EDITAR un vehículo existente
  abrirModalEditar(vehiculo: any) {
    this.vehiculoEnEdicion = vehiculo.id; // Guardamos el ID del que vamos a editar
    // Copiamos los datos al formulario para que aparezcan en los inputs
    this.nuevoVehiculo = { 
      placa: vehiculo.placa, 
      marca: vehiculo.marca, 
      modelo: vehiculo.modelo, 
      activo: vehiculo.activo 
    };
    this.modalAbierto.set(true);
  }

  // Cerrar modal y limpiar estado
  cerrarModal() {
    this.modalAbierto.set(false);
    this.vehiculoEnEdicion = null;
  }

  // 3. Guardar cambios (Sirve tanto para Crear como para Editar)
  guardarVehiculo() {
    // Validación simple
    if (!this.nuevoVehiculo.placa || !this.nuevoVehiculo.marca) {
      alert('Por favor completa la Placa y la Marca.');
      return;
    }

    if (this.vehiculoEnEdicion) {
      // --- LÓGICA DE ACTUALIZACIÓN ---
      this.vehiculos.update(lista => lista.map(v => {
        if (v.id === this.vehiculoEnEdicion) {
          // Si encontramos el vehículo, actualizamos sus datos
          return { ...v, ...this.nuevoVehiculo };
        }
        return v;
      }));
    } else {
      // --- LÓGICA DE CREACIÓN ---
      const nuevoObj = {
        id: crypto.randomUUID(), // Generamos un ID único
        ...this.nuevoVehiculo
      };
      // Agregamos al principio de la lista
      this.vehiculos.update(lista => [nuevoObj, ...lista]);
    }
    
    // Guardamos en memoria permanente y cerramos
    this.guardarEnStorage();
    this.cerrarModal();
  }

  // Eliminar vehículo
  eliminarVehiculo(id: string) {
    if(confirm('¿Estás seguro de que quieres eliminar este vehículo?')) {
      this.vehiculos.update(lista => lista.filter(v => v.id !== id));
      this.guardarEnStorage();
    }
  }
}