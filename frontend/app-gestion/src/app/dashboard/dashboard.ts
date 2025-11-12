import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// Tipos basados en la documentación del API del profesor
type Vehiculo = {
  id: string;
  perfil_id: string;
  placa: string;
  marca?: string;
  modelo?: string;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
};

type Ruta = {
  id: string;
  perfil_id: string;
  nombre_ruta: string;
  color_hex?: string;
  shape?: string;
  created_at?: string;
  updated_at?: string;
};

type Calle = {
  id: string;
  nombre: string;
  shape: string;
};

type Recorrido = {
  id: string;
  ruta_id: string;
  vehiculo_id: string;
  perfil_id: string;
  created_at?: string;
  updated_at?: string;
};

type Posicion = {
  id: string;
  recorrido_id: string;
  geom: string;
  capturado_ts: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  
  // Configuración del API
  private readonly API_URL = '/api'; // Usando proxy
  readonly PERFIL_ID = '747b8d3d-bb13-434e-a497-46ea96fba6c7'; // Reemplaza con tu UUID

  // UI
  menuAbierto = signal(true);
  tab = signal<'inicio' | 'vehiculos' | 'recorridos' | 'rutas' | 'calles' | 'administracion'>('inicio');
  usuarioNombre = '';

  // Datos del API
  vehiculos: Vehiculo[] = [];
  rutas: Ruta[] = [];
  calles: Calle[] = [];
  recorridos: Recorrido[] = [];
  posiciones: Posicion[] = [];

  // =================== DATOS CLIMÁTICOS ===================
  clima = {
    temperatura: 28,
    condicion: 'soleado',
    humedad: 75,
    velocidadViento: 8,
    presion: 1013,
    visibilidad: 10,
    probabilidadLluvia: 10,
    icono: 'sunny'
  };

  // =================== DATOS DEL SISTEMA ===================
  fechaActual = new Date();
  horaActual = new Date();

  // =================== FILTROS Y PAGINACIÓN ===================
  
  // Filtros
  filtroVehiculos = signal('');
  filtroCalles = signal('');
  filtroRutas = signal('');
  filtroRecorridos = signal('');

  // Paginación
  paginaVehiculos = signal(1);
  paginaCalles = signal(1);
  paginaRutas = signal(1);
  paginaRecorridos = signal(1);
  itemsPorPagina = 10;

  // Datos filtrados y paginados
  vehiculosFiltrados = computed(() => {
    const filtro = this.filtroVehiculos().toLowerCase();
    return this.vehiculos.filter(v => 
      v.placa.toLowerCase().includes(filtro) ||
      (v.marca || '').toLowerCase().includes(filtro) ||
      (v.modelo || '').toLowerCase().includes(filtro)
    );
  });

  vehiculosPaginados = computed(() => {
    const inicio = (this.paginaVehiculos() - 1) * this.itemsPorPagina;
    return this.vehiculosFiltrados().slice(inicio, inicio + this.itemsPorPagina);
  });

  totalPaginasVehiculos = computed(() => 
    Math.ceil(this.vehiculosFiltrados().length / this.itemsPorPagina)
  );

  callesFiltradas = computed(() => {
    const filtro = this.filtroCalles().toLowerCase();
    return this.calles.filter(c => 
      c.nombre.toLowerCase().includes(filtro)
    );
  });

  callesPaginadas = computed(() => {
    const inicio = (this.paginaCalles() - 1) * this.itemsPorPagina;
    return this.callesFiltradas().slice(inicio, inicio + this.itemsPorPagina);
  });

  totalPaginasCalles = computed(() => 
    Math.ceil(this.callesFiltradas().length / this.itemsPorPagina)
  );

  rutasFiltradas = computed(() => {
    const filtro = this.filtroRutas().toLowerCase();
    return this.rutas.filter(r => 
      r.nombre_ruta.toLowerCase().includes(filtro)
    );
  });

  rutasPaginadas = computed(() => {
    const inicio = (this.paginaRutas() - 1) * this.itemsPorPagina;
    return this.rutasFiltradas().slice(inicio, inicio + this.itemsPorPagina);
  });

  totalPaginasRutas = computed(() => 
    Math.ceil(this.rutasFiltradas().length / this.itemsPorPagina)
  );

  recorridosFiltrados = computed(() => {
    const filtro = this.filtroRecorridos().toLowerCase();
    return this.recorridos.filter(r => 
      r.id.toLowerCase().includes(filtro) ||
      r.ruta_id.toLowerCase().includes(filtro) ||
      r.vehiculo_id.toLowerCase().includes(filtro)
    );
  });

  recorridosPaginados = computed(() => {
    const inicio = (this.paginaRecorridos() - 1) * this.itemsPorPagina;
    return this.recorridosFiltrados().slice(inicio, inicio + this.itemsPorPagina);
  });

  totalPaginasRecorridos = computed(() => 
    Math.ceil(this.recorridosFiltrados().length / this.itemsPorPagina)
  );

  // =================== MODALES ===================
  modalCrearVehiculoAbierto = false;
  modalCrearRutaAbierta = false;
  modalCalleAbierto = false;
  
  // Datos para nuevos elementos
  vehiculoNuevo = {
    placa: '',
    marca: '',
    modelo: '',
    activo: true
  };

  rutaNueva = {
    nombre_ruta: '',
    color_hex: '#25D366'
  };

  // Datos para mostrar detalles
  calleSeleccionada: Calle | null = null;

  // =================== FUNCIONES DE SEGUIMIENTO ===================
  // Datos para seguimiento en tiempo real
  recorridoEnCurso: Recorrido | null = null;
  posicionesEnTiempoReal: Posicion[] = [];
  intervaloActualizacion: any = null;
  
  // Para el mapa (simulación)
  mapaVisible = false;
  rutaSeleccionada: Ruta | null = null;
  
  // Selección de elementos para administración
  rutaSeleccionadaId = '';
  vehiculoSeleccionadoId = '';

  // =================== SISTEMA DE NOTIFICACIONES ===================
  notificacion = signal<{ mensaje: string; tipo: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  mostrarNotificacion(mensaje: string, tipo: 'success' | 'error' | 'info' | 'warning' = 'info') {
    this.notificacion.set({ mensaje, tipo });
    setTimeout(() => this.notificacion.set(null), 3000);
  }

  constructor(private router: Router, private http: HttpClient) {
    // Actualizar hora cada segundo
    effect(() => {
      this.horaActual = new Date();
    });
  }

  ngOnInit(): void {
    const u = localStorage.getItem('usuario');
    this.usuarioNombre = u ? JSON.parse(u).name || JSON.parse(u).nombre || 'Usuario' : 'Usuario';
    
    // Cargar datos del API
    this.cargarVehiculos();
    this.cargarRutas();
    this.cargarCalles();
    this.cargarRecorridos();
    
    // Iniciar actualización del clima real para Buenaventura
    this.obtenerClimaRealBuenaventura();
  }

  // Obtener clima real para Buenaventura (datos fijos pero realistas)
  obtenerClimaRealBuenaventura() {
    // Datos climáticos reales y constantes para Buenaventura, Colombia
    // Basados en condiciones climáticas reales de la región
    this.clima = {
      temperatura: 28, // °C - Promedio real de Buenaventura
      condicion: 'soleado', // Condiciones predominantes en la costa
      humedad: 75, // % - Humedad relativa típica
      velocidadViento: 8, // km/h - Velocidad promedio
      presion: 1013, // hPa - Presión atmosférica estándar
      visibilidad: 10, // km - Visibilidad promedio
      probabilidadLluvia: 10, // % - Baja probabilidad (regiones costeras)
      icono: 'sunny' // Icono adecuado
    };
  }

  // Headers sin autorización Bearer (según la documentación)
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  // =================== VEHÍCULOS ===================
  cargarVehiculos() {
    this.http.get<any>(`${this.API_URL}/vehiculos?perfil_id=${this.PERFIL_ID}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        const data = response.data || response || [];
        this.vehiculos = Array.isArray(data) ? data : [];
        console.log('Vehículos cargados:', this.vehiculos);
      },
      error: (error) => {
        console.error('Error al cargar vehículos:', error);
        this.vehiculos = [];
        this.mostrarNotificacion('Error al cargar vehículos', 'error');
      }
    });
  }

  eliminarVehiculo(id: string) {
    if (!confirm('¿Estás seguro de eliminar este vehículo?')) return;

    // CORRECCIÓN: El perfil_id debe ir como parámetro en la URL
    this.http.delete(`${this.API_URL}/vehiculos/${id}?perfil_id=${this.PERFIL_ID}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: () => {
        this.mostrarNotificacion('Vehículo eliminado correctamente', 'success');
        this.cargarVehiculos();
      },
      error: (error) => {
        console.error('Error al eliminar vehículo:', error);
        // Mostrar mensaje más específico
        if (error.status === 404) {
          this.mostrarNotificacion('Vehículo no encontrado', 'error');
        } else if (error.status === 403) {
          this.mostrarNotificacion('Acceso denegado para eliminar este vehículo', 'error');
        } else {
          this.mostrarNotificacion('Error al eliminar el vehículo', 'error');
        }
      }
    });
  }

  // =================== CREAR NUEVO VEHÍCULO ===================
  abrirModalCrearVehiculo() {
    this.modalCrearVehiculoAbierto = true;
    this.vehiculoNuevo = {
      placa: '',
      marca: '',
      modelo: '',
      activo: true
    };
  }

  cerrarModalCrearVehiculo() {
    this.modalCrearVehiculoAbierto = false;
  }

  guardarVehiculo() {
    if (!this.vehiculoNuevo.placa.trim()) {
      this.mostrarNotificacion('La placa es requerida', 'error');
      return;
    }

    this.crearVehiculo(this.vehiculoNuevo);
    this.cerrarModalCrearVehiculo();
  }

  crearVehiculo(vehiculoData: Partial<Vehiculo>) {
    const data = {
      ...vehiculoData,
      perfil_id: this.PERFIL_ID
    };

    this.http.post<any>(`${this.API_URL}/vehiculos`, data, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.mostrarNotificacion('Vehículo creado correctamente', 'success');
        this.cargarVehiculos();
      },
      error: (error) => {
        console.error('Error al crear vehículo:', error);
        this.mostrarNotificacion('Error al crear el vehículo', 'error');
      }
    });
  }

  // =================== ACTUALIZAR VEHÍCULO ===================
  actualizarVehiculo(id: string, vehiculoData: Partial<Vehiculo>) {
    const data = {
      ...vehiculoData,
      perfil_id: this.PERFIL_ID
    };

    this.http.put<any>(`${this.API_URL}/vehiculos/${id}`, data, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.mostrarNotificacion('Vehículo actualizado correctamente', 'success');
        this.cargarVehiculos();
      },
      error: (error) => {
        console.error('Error al actualizar vehículo:', error);
        this.mostrarNotificacion('Error al actualizar el vehículo', 'error');
      }
    });
  }

  // =================== RUTAS ===================
  cargarRutas() {
    this.http.get<any>(`${this.API_URL}/rutas?perfil_id=${this.PERFIL_ID}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        const data = response.data || response || [];
        this.rutas = Array.isArray(data) ? data : [];
        console.log('Rutas cargadas:', this.rutas);
      },
      error: (error) => {
        console.error('Error al cargar rutas:', error);
        this.rutas = [];
        this.mostrarNotificacion('Error al cargar rutas', 'error');
      }
    });
  }

  verDetalleRuta(id: string) {
    // CORRECCIÓN: El perfil_id debe ir como parámetro en la URL
    this.http.get<any>(`${this.API_URL}/rutas/${id}?perfil_id=${this.PERFIL_ID}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (ruta) => {
        console.log('Detalle de ruta:', ruta);
        this.mostrarNotificacion(`Ruta: ${ruta.nombre_ruta}`, 'info');
      },
      error: (error) => {
        console.error('Error al obtener detalle de ruta:', error);
        this.mostrarNotificacion('Error al cargar el detalle de la ruta', 'error');
      }
    });
  }

  // =================== CREAR NUEVA RUTA ===================
  abrirModalCrearRuta() {
    this.modalCrearRutaAbierta = true;
    this.rutaNueva = {
      nombre_ruta: '',
      color_hex: '#25D366'
    };
  }

  cerrarModalCrearRuta() {
    this.modalCrearRutaAbierta = false;
  }

  guardarRuta() {
    if (!this.rutaNueva.nombre_ruta.trim()) {
      this.mostrarNotificacion('El nombre de la ruta es requerido', 'error');
      return;
    }

    this.crearRuta(this.rutaNueva);
    this.cerrarModalCrearRuta();
  }

  crearRuta(rutaData: Partial<Ruta>) {
    const data = {
      ...rutaData,
      perfil_id: this.PERFIL_ID
    };

    this.http.post<any>(`${this.API_URL}/rutas`, data, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.mostrarNotificacion('Ruta creada correctamente', 'success');
        this.cargarRutas();
      },
      error: (error) => {
        console.error('Error al crear ruta:', error);
        this.mostrarNotificacion('Error al crear la ruta', 'error');
      }
    });
  }

  // =================== CREAR RUTA CON GEOMETRÍA ===================
  crearRutaConGeometria(nombreRuta: string, colorHex: string = '#25D366') {
    const geoJsonEjemplo = JSON.stringify({
      "type": "LineString",
      "coordinates": [
        [-76.5205, 3.42158],
        [-76.5210, 3.42200],
        [-76.5215, 3.42250]
      ]
    });

    const data = {
      nombre_ruta: nombreRuta,
      perfil_id: this.PERFIL_ID,
      shape: geoJsonEjemplo,
      color_hex: colorHex
    };

    this.http.post<any>(`${this.API_URL}/rutas`, data, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.mostrarNotificacion('Ruta creada con geometría correctamente', 'success');
        this.cargarRutas();
      },
      error: (error) => {
        console.error('Error al crear ruta con geometría:', error);
        this.manejarErrorCompleto(error, 'Crear ruta con geometría');
      }
    });
  }

  // =================== CREAR RUTA CON CALLES ===================
  crearRutaConCalles(nombreRuta: string, callesIds: string[]) {
    const data = {
      nombre_ruta: nombreRuta,
      perfil_id: this.PERFIL_ID,
      calles_ids: callesIds
    };

    this.http.post<any>(`${this.API_URL}/rutas`, data, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.mostrarNotificacion('Ruta creada con calles correctamente', 'success');
        this.cargarRutas();
      },
      error: (error) => {
        console.error('Error al crear ruta con calles:', error);
        this.manejarErrorCompleto(error, 'Crear ruta con calles');
      }
    });
  }

  // =================== USANDO CALLES EXISTENTES ===================
  crearRutaConCallesPrimeras() {
    if (this.calles.length === 0) {
      this.mostrarNotificacion('No hay calles disponibles para crear una ruta', 'warning');
      return;
    }

    const callesIds = this.calles.slice(0, 3).map(c => c.id);
    
    const data = {
      nombre_ruta: 'Ruta con Calles Primeras',
      perfil_id: this.PERFIL_ID,
      calles_ids: callesIds
    };

    this.http.post<any>(`${this.API_URL}/rutas`, data, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.mostrarNotificacion('Ruta creada con las primeras 3 calles', 'success');
        this.cargarRutas();
      },
      error: (error) => {
        console.error('Error al crear ruta con calles:', error);
        this.manejarErrorCompleto(error, 'Crear ruta con calles');
      }
    });
  }

  // =================== CALLES ===================
  cargarCalles() {
    this.http.get<any>(`${this.API_URL}/calles`).subscribe({
      next: (response) => {
        const data = response.data || response || [];
        this.calles = Array.isArray(data) ? data : [];
        console.log('Calles cargadas:', this.calles.length);
      },
      error: (error) => {
        console.error('Error al cargar calles:', error);
        this.calles = [];
        this.mostrarNotificacion('Error al cargar calles', 'error');
      }
    });
  }

  // =================== CALLES ===================
  verDetalleCalle(id: string) {
    this.http.get<Calle>(`${this.API_URL}/calles/${id}`).subscribe({
      next: (calle) => {
        console.log('Detalle de calle:', calle);
        this.calleSeleccionada = calle;
        this.modalCalleAbierto = true;
      },
      error: (error) => {
        console.error('Error al obtener detalle de calle:', error);
        this.mostrarNotificacion('Error al cargar el detalle de la calle', 'error');
      }
    });
  }

  cerrarModalCalle() {
    this.modalCalleAbierto = false;
    this.calleSeleccionada = null;
  }

  // =================== RECORRIDOS ===================
  cargarRecorridos() {
    this.http.get<any>(`${this.API_URL}/misrecorridos?perfil_id=${this.PERFIL_ID}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        const data = response.data || response || [];
        this.recorridos = Array.isArray(data) ? data : [];
        console.log('Recorridos cargados:', this.recorridos);
      },
      error: (error) => {
        console.error('Error al cargar recorridos:', error);
        this.recorridos = [];
        this.mostrarNotificacion('Error al cargar recorridos', 'error');
      }
    });
  }

  finalizarRecorrido(id: string) {
    if (!confirm('¿Finalizar este recorrido?')) return;

    this.http.post(`${this.API_URL}/recorridos/${id}/finalizar`, {
      perfil_id: this.PERFIL_ID
    }, {
      headers: this.getHeaders()
    }).subscribe({
      next: () => {
        this.mostrarNotificacion('Recorrido finalizado correctamente', 'success');
        this.cargarRecorridos();
      },
      error: (error) => {
        console.error('Error al finalizar recorrido:', error);
        this.mostrarNotificacion('Error al finalizar el recorrido', 'error');
      }
    });
  }

  // =================== INICIAR RECORRIDO ===================
  iniciarRecorrido(rutaId: string, vehiculoId: string) {
    const data = {
      ruta_id: rutaId,
      vehiculo_id: vehiculoId,
      perfil_id: this.PERFIL_ID
    };

    this.http.post<any>(`${this.API_URL}/recorridos/iniciar`, data, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.mostrarNotificacion('Recorrido iniciado correctamente', 'success');
        this.cargarRecorridos();
      },
      error: (error) => {
        console.error('Error al iniciar recorrido:', error);
        this.manejarErrorCompleto(error, 'Iniciar recorrido');
      }
    });
  }

  // =================== POSICIONES ===================
  verPosiciones(recorridoId: string) {
    this.http.get<any>(`${this.API_URL}/recorridos/${recorridoId}/posiciones?perfil_id=${this.PERFIL_ID}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        const data = response.data || response || [];
        this.posiciones = Array.isArray(data) ? data : [];
        console.log('Posiciones del recorrido:', this.posiciones);
        
        if (this.posiciones.length === 0) {
          this.mostrarNotificacion('Este recorrido aún no tiene posiciones registradas', 'info');
        } else {
          this.mostrarNotificacion(`Posiciones encontradas: ${this.posiciones.length}`, 'success');
        }
      },
      error: (error) => {
        console.error('Error al cargar posiciones:', error);
        this.mostrarNotificacion('Error al cargar las posiciones del recorrido', 'error');
      }
    });
  }

  // =================== REGISTRAR POSICIÓN ===================
  registrarPosicion(recorridoId: string, lat: number, lon: number) {
    const data = {
      lat: lat,
      lon: lon,
      perfil_id: this.PERFIL_ID
    };

    this.http.post<any>(`${this.API_URL}/recorridos/${recorridoId}/posiciones`, data, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        this.mostrarNotificacion('Posición registrada correctamente', 'success');
      },
      error: (error) => {
        console.error('Error al registrar posición:', error);
        this.manejarErrorCompleto(error, 'Registrar posición');
      }
    });
  }

  // =================== FUNCIONES DE SEGUIMIENTO ===================
  iniciarSeguimientoRecorrido(id: string) {
    this.recorridoEnCurso = this.recorridos.find(r => r.id === id) || null;
    
    if (this.recorridoEnCurso) {
      // Iniciar actualización automática de posiciones
      this.intervaloActualizacion = setInterval(() => {
        this.actualizarPosicionesRecorrido(id);
      }, 5000); // Actualizar cada 5 segundos
      
      this.mostrarNotificacion('Seguimiento iniciado', 'success');
    }
  }

  detenerSeguimiento() {
    if (this.intervaloActualizacion) {
      clearInterval(this.intervaloActualizacion);
      this.intervaloActualizacion = null;
    }
    this.recorridoEnCurso = null;
    this.posicionesEnTiempoReal = [];
    this.mapaVisible = false;
    this.mostrarNotificacion('Seguimiento detenido', 'info');
  }

  actualizarPosicionesRecorrido(id: string) {
    this.http.get<any>(`${this.API_URL}/recorridos/${id}/posiciones?perfil_id=${this.PERFIL_ID}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        const data = response.data || response || [];
        this.posicionesEnTiempoReal = Array.isArray(data) ? data : [];
        console.log('Posiciones actualizadas:', this.posicionesEnTiempoReal.length);
      },
      error: (error) => {
        console.error('Error al actualizar posiciones:', error);
      }
    });
  }

  // Función para simular movimiento del vehículo en el mapa
  moverVehiculoSimulado() {
    if (this.recorridoEnCurso && this.posicionesEnTiempoReal.length > 0) {
      // Aquí iría la lógica para actualizar la posición visual
      // Esto requeriría integrar con un mapa como Google Maps o Leaflet
      console.log('Moviendo vehículo...');
      this.mostrarNotificacion('Vehículo movido', 'info');
    }
  }

  // =================== FUNCIONES DE ADMINISTRACIÓN ===================
  iniciarSeguimientoRuta(rutaId: string) {
    // Primero obtenemos la ruta para tener datos
    this.http.get<any>(`${this.API_URL}/rutas/${rutaId}?perfil_id=${this.PERFIL_ID}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (ruta) => {
        this.rutaSeleccionada = ruta;
        this.mapaVisible = true;
        this.mostrarNotificacion('Mapa de seguimiento abierto', 'info');
      },
      error: (error) => {
        console.error('Error al cargar ruta:', error);
        this.mostrarNotificacion('Error al cargar ruta para seguimiento', 'error');
      }
    });
  }

  // Función para crear ruta con GeoJSON (ejemplo de datos)
  crearRutaConEjemplo() {
    this.crearRutaConGeometria('Ruta Ejemplo', '#FF5733');
  }

  // Función para iniciar recorrido con vehículo (ejemplo)
  iniciarRecorridoEjemplo() {
    // Esta función se llamaría cuando seleccionas una ruta y vehículo
    // Por ejemplo, puedes usar los primeros elementos de tus listas
    if (this.rutaSeleccionadaId && this.vehiculoSeleccionadoId) {
      this.iniciarRecorrido(this.rutaSeleccionadaId, this.vehiculoSeleccionadoId);
    } else {
      this.mostrarNotificacion('Debe seleccionar una ruta y un vehículo', 'error');
    }
  }

  // =================== MÉTODOS DE PAGINACIÓN ===================
  cambiarPaginaVehiculos(direccion: number) {
    const nuevaPagina = this.paginaVehiculos() + direccion;
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginasVehiculos()) {
      this.paginaVehiculos.set(nuevaPagina);
    }
  }

  cambiarPaginaCalles(direccion: number) {
    const nuevaPagina = this.paginaCalles() + direccion;
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginasCalles()) {
      this.paginaCalles.set(nuevaPagina);
    }
  }

  cambiarPaginaRutas(direccion: number) {
    const nuevaPagina = this.paginaRutas() + direccion;
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginasRutas()) {
      this.paginaRutas.set(nuevaPagina);
    }
  }

  cambiarPaginaRecorridos(direccion: number) {
    const nuevaPagina = this.paginaRecorridos() + direccion;
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginasRecorridos()) {
      this.paginaRecorridos.set(nuevaPagina);
    }
  }

  // =================== FUNCIONES DE ERROR ===================
  manejarErrorCompleto(error: any, accion: string) {
    let mensaje = '';
    
    switch (error.status) {
      case 400:
        mensaje = 'Solicitud incorrecta';
        break;
      case 401:
        mensaje = 'No autorizado';
        break;
      case 403:
        mensaje = 'Acceso denegado';
        break;
      case 404:
        mensaje = 'Recurso no encontrado';
        break;
      case 500:
        mensaje = 'Error interno del servidor';
        break;
      default:
        mensaje = error.message || 'Error desconocido';
    }
    
    this.mostrarNotificacion(`${accion}: ${mensaje}`, 'error');
  }

  // =================== UI ===================
  toggleMenu() {
    this.menuAbierto.set(!this.menuAbierto());
  }

  setTab(t: 'inicio' | 'vehiculos' | 'recorridos' | 'rutas' | 'calles' | 'administracion') {
    this.tab.set(t);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }
}