import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// =================== TIPOS BASADOS EN LA DOCUMENTACIÓN OFICIAL ===================
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

type Clima = {
  ciudad: string;
  temperatura: number;
  condicion: string;
  humedad: number;
  velocidadViento: number;
  presion: number;
  visibilidad: number;
  probabilidadLluvia: number;
  icono: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  
  // =================== CONFIGURACIÓN DEL API ===================
  private readonly API_URL = '/api';
  readonly PERFIL_ID = '747b8d3d-bb13-434e-a497-46ea96fba6c7';
  private readonly WEATHER_API_KEY = 'e80d2a63e53d157428a22f9bde6c4ee1';
  private readonly WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

  // =================== UI STATE ===================
  menuAbierto = signal(true);
  tab = signal<'inicio' | 'vehiculos' | 'recorridos' | 'rutas' | 'calles' | 'administracion'>('inicio');
  usuarioNombre = '';
  
  // Estados de carga
  cargandoVehiculos = signal(false);
  cargandoRutas = signal(false);
  cargandoCalles = signal(false);
  cargandoRecorridos = signal(false);
  cargandoClima = signal(false);

  // =================== DATOS DEL API ===================
  vehiculos: Vehiculo[] = [];
  rutas: Ruta[] = [];
  calles: Calle[] = [];
  recorridos: Recorrido[] = [];
  posiciones: Posicion[] = [];

  // =================== DATOS CLIMÁTICOS ===================
  clima: Clima = {
    ciudad: 'Buenaventura',
    temperatura: 0,
    condicion: 'Cargando...',
    humedad: 0,
    velocidadViento: 0,
    presion: 0,
    visibilidad: 0,
    probabilidadLluvia: 0,
    icono: 'sunny'
  };

  // =================== FILTROS Y PAGINACIÓN ===================
  filtroVehiculos = signal('');
  filtroCalles = signal('');
  filtroRutas = signal('');
  filtroRecorridos = signal('');

  paginaVehiculos = signal(1);
  paginaCalles = signal(1);
  paginaRutas = signal(1);
  paginaRecorridos = signal(1);
  itemsPorPagina = 10;

  // Computed signals para datos filtrados y paginados
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
  modalEditarVehiculoAbierto = false;
  
  vehiculoNuevo = {
    placa: '',
    marca: '',
    modelo: '',
    activo: true
  };

  vehiculoEditando: Vehiculo | null = null;

  rutaNueva = {
    nombre_ruta: '',
    color_hex: '#25D366',
    calles_ids: [] as string[]
  };

  calleSeleccionada: Calle | null = null;

  // =================== SEGUIMIENTO EN TIEMPO REAL ===================
  recorridoEnCurso: Recorrido | null = null;
  posicionesEnTiempoReal: Posicion[] = [];
  intervaloActualizacion: any = null;
  
  mapaVisible = false;
  rutaSeleccionada: Ruta | null = null;
  
  rutaSeleccionadaId = '';
  vehiculoSeleccionadoId = '';

  coordenadasSimuladas: [number, number][] = [];
  indiceSimulacion = 0;
  simulacionActiva = false;

  // =================== SISTEMA DE NOTIFICACIONES ===================
  notificacion = signal<{ mensaje: string; tipo: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  mostrarNotificacion(mensaje: string, tipo: 'success' | 'error' | 'info' | 'warning' = 'info') {
    this.notificacion.set({ mensaje, tipo });
    setTimeout(() => this.notificacion.set(null), 4000);
  }

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    const u = localStorage.getItem('usuario');
    this.usuarioNombre = u ? JSON.parse(u).name || JSON.parse(u).nombre || 'Usuario' : 'Usuario';
    
    // Cargar datos iniciales
    this.cargarTodosDatos();
    
    // Cargar clima real
    this.obtenerClimaReal();
  }

  // =================== CARGAR TODOS LOS DATOS ===================
  cargarTodosDatos() {
    this.cargarVehiculos();
    this.cargarRutas();
    this.cargarCalles();
    this.cargarRecorridos();
  }

  // =================== CLIMA REAL (OpenWeatherMap) ===================
  obtenerClimaReal() {
    this.cargandoClima.set(true);
    
    // Coordenadas de Buenaventura, Colombia
    const lat = 3.8801;
    const lon = -77.0315;
    
    const url = `${this.WEATHER_API_URL}?lat=${lat}&lon=${lon}&appid=${this.WEATHER_API_KEY}&units=metric&lang=es`;
    
    this.http.get<any>(url).subscribe({
      next: (data) => {
        this.clima = {
          ciudad: data.name || 'Buenaventura',
          temperatura: Math.round(data.main.temp),
          condicion: data.weather[0].description,
          humedad: data.main.humidity,
          velocidadViento: Math.round(data.wind.speed * 3.6), // m/s a km/h
          presion: data.main.pressure,
          visibilidad: Math.round(data.visibility / 1000), // metros a km
          probabilidadLluvia: data.rain ? data.rain['1h'] || 0 : 0,
          icono: this.mapearIconoClima(data.weather[0].main)
        };
        this.cargandoClima.set(false);
      },
      error: (error) => {
        console.error('Error al obtener clima:', error);
        this.clima = {
          ciudad: 'Buenaventura',
          temperatura: 28,
          condicion: 'No disponible',
          humedad: 75,
          velocidadViento: 8,
          presion: 1013,
          visibilidad: 10,
          probabilidadLluvia: 0,
          icono: 'sunny'
        };
        this.cargandoClima.set(false);
        this.mostrarNotificacion('No se pudo cargar el clima actual', 'warning');
      }
    });
  }

  mapearIconoClima(condicion: string): string {
    const mapeo: { [key: string]: string } = {
      'Clear': 'sunny',
      'Clouds': 'cloudy',
      'Rain': 'rainy',
      'Drizzle': 'rainy',
      'Thunderstorm': 'stormy',
      'Snow': 'rainy',
      'Mist': 'cloudy',
      'Fog': 'cloudy'
    };
    return mapeo[condicion] || 'sunny';
  }

  // =================== HEADERS HTTP ===================
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  // =================== VEHÍCULOS ===================
  cargarVehiculos() {
    this.cargandoVehiculos.set(true);
    
    this.http.get<any>(`${this.API_URL}/vehiculos?perfil_id=${this.PERFIL_ID}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        const data = response.data || response || [];
        this.vehiculos = Array.isArray(data) ? data : [];
        this.cargandoVehiculos.set(false);
      },
      error: (error) => {
        console.error('Error al cargar vehículos:', error);
        this.vehiculos = [];
        this.cargandoVehiculos.set(false);
        this.mostrarNotificacion('Error al cargar vehículos', 'error');
      }
    });
  }

  crearVehiculo(vehiculoData: Partial<Vehiculo>) {
    const data = {
      ...vehiculoData,
      perfil_id: this.PERFIL_ID
    };

    this.http.post<any>(`${this.API_URL}/vehiculos`, data, {
      headers: this.getHeaders()
    }).subscribe({
      next: () => {
        this.mostrarNotificacion('Vehículo creado correctamente', 'success');
        this.cargarVehiculos();
      },
      error: (error) => {
        console.error('Error al crear vehículo:', error);
        this.mostrarNotificacion('Error al crear el vehículo', 'error');
      }
    });
  }

  actualizarVehiculo(id: string, vehiculoData: Partial<Vehiculo>) {
    const data = {
      ...vehiculoData,
      perfil_id: this.PERFIL_ID
    };

    this.http.put<any>(`${this.API_URL}/vehiculos/${id}`, data, {
      headers: this.getHeaders()
    }).subscribe({
      next: () => {
        this.mostrarNotificacion('Vehículo actualizado correctamente', 'success');
        this.cargarVehiculos();
      },
      error: (error) => {
        console.error('Error al actualizar vehículo:', error);
        this.mostrarNotificacion('Error al actualizar el vehículo', 'error');
      }
    });
  }

  eliminarVehiculo(id: string) {
    if (!confirm('¿Estás seguro de eliminar este vehículo?')) return;

    // Según la documentación: DELETE /api/vehiculos/{id}?perfil_id={uuid}
    this.http.delete(`${this.API_URL}/vehiculos/${id}?perfil_id=${this.PERFIL_ID}`, {
      headers: this.getHeaders(),
      observe: 'response'
    }).subscribe({
      next: (response) => {
        // La API devuelve 204 (No Content) cuando se elimina correctamente
        this.mostrarNotificacion('Vehículo eliminado correctamente', 'success');
        this.cargarVehiculos();
      },
      error: (error) => {
        console.error('Error al eliminar vehículo:', error);
        if (error.status === 404) {
          this.mostrarNotificacion('Vehículo no encontrado', 'error');
        } else if (error.status === 403) {
          this.mostrarNotificacion('No tienes permiso para eliminar este vehículo', 'error');
        } else {
          this.mostrarNotificacion('Error al eliminar el vehículo', 'error');
        }
      }
    });
  }

  // =================== MODALES DE VEHÍCULOS ===================
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

  abrirModalEditarVehiculo(vehiculo: Vehiculo) {
    this.vehiculoEditando = { ...vehiculo };
    this.modalEditarVehiculoAbierto = true;
  }

  cerrarModalEditarVehiculo() {
    this.modalEditarVehiculoAbierto = false;
    this.vehiculoEditando = null;
  }

  guardarEdicionVehiculo() {
    if (!this.vehiculoEditando) return;
    
    if (!this.vehiculoEditando.placa.trim()) {
      this.mostrarNotificacion('La placa es requerida', 'error');
      return;
    }

    this.actualizarVehiculo(this.vehiculoEditando.id, this.vehiculoEditando);
    this.cerrarModalEditarVehiculo();
  }

  // =================== RUTAS ===================
  cargarRutas() {
    this.cargandoRutas.set(true);
    
    this.http.get<any>(`${this.API_URL}/rutas?perfil_id=${this.PERFIL_ID}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        const data = response.data || response || [];
        this.rutas = Array.isArray(data) ? data : [];
        this.cargandoRutas.set(false);
      },
      error: (error) => {
        console.error('Error al cargar rutas:', error);
        this.rutas = [];
        this.cargandoRutas.set(false);
        this.mostrarNotificacion('Error al cargar rutas', 'error');
      }
    });
  }

  verDetalleRuta(id: string) {
    // Según la documentación: GET /api/rutas/{id}?perfil_id={uuid}
    this.http.get<any>(`${this.API_URL}/rutas/${id}?perfil_id=${this.PERFIL_ID}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (ruta) => {
        console.log('Detalle de ruta:', ruta);
        const info = `Ruta: ${ruta.nombre_ruta}\nColor: ${ruta.color_hex || 'N/A'}\nCreada: ${ruta.created_at ? new Date(ruta.created_at).toLocaleDateString() : 'N/A'}`;
        alert(info);
        this.mostrarNotificacion(`Ruta: ${ruta.nombre_ruta}`, 'info');
      },
      error: (error) => {
        console.error('Error al obtener detalle de ruta:', error);
        if (error.status === 403) {
          this.mostrarNotificacion('No tienes permiso para ver esta ruta', 'error');
        } else if (error.status === 404) {
          this.mostrarNotificacion('Ruta no encontrada', 'error');
        } else {
          this.mostrarNotificacion('Error al cargar el detalle de la ruta', 'error');
        }
      }
    });
  }

  crearRuta(rutaData: { nombre_ruta: string; color_hex?: string; shape?: string; calles_ids?: string[] }) {
    const data = {
      ...rutaData,
      perfil_id: this.PERFIL_ID
    };

    this.http.post<any>(`${this.API_URL}/rutas`, data, {
      headers: this.getHeaders()
    }).subscribe({
      next: () => {
        this.mostrarNotificacion('Ruta creada correctamente', 'success');
        this.cargarRutas();
      },
      error: (error) => {
        console.error('Error al crear ruta:', error);
        this.mostrarNotificacion('Error al crear la ruta', 'error');
      }
    });
  }

  // =================== MODALES DE RUTAS ===================
  abrirModalCrearRuta() {
    this.modalCrearRutaAbierta = true;
    this.rutaNueva = {
      nombre_ruta: '',
      color_hex: '#25D366',
      calles_ids: []
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

    // Si hay calles seleccionadas, usar calles_ids, sino crear con geometría de ejemplo
    if (this.rutaNueva.calles_ids.length > 0) {
      this.crearRuta({
        nombre_ruta: this.rutaNueva.nombre_ruta,
        color_hex: this.rutaNueva.color_hex,
        calles_ids: this.rutaNueva.calles_ids
      });
    } else {
      // Crear con geometría de ejemplo
      const geoJsonEjemplo = JSON.stringify({
        "type": "LineString",
        "coordinates": [
          [-77.0315, 3.8801],
          [-77.0320, 3.8805],
          [-77.0325, 3.8810]
        ]
      });
      
      this.crearRuta({
        nombre_ruta: this.rutaNueva.nombre_ruta,
        color_hex: this.rutaNueva.color_hex,
        shape: geoJsonEjemplo
      });
    }
    
    this.cerrarModalCrearRuta();
  }

  crearRutaConCallesPrimeras() {
    if (this.calles.length === 0) {
      this.mostrarNotificacion('No hay calles disponibles para crear una ruta', 'warning');
      return;
    }

    const callesIds = this.calles.slice(0, 3).map(c => c.id);
    
    this.crearRuta({
      nombre_ruta: 'Ruta con Calles Primeras',
      color_hex: '#25D366',
      calles_ids: callesIds
    });
  }

  // =================== CALLES ===================
  cargarCalles() {
    this.cargandoCalles.set(true);
    
    this.http.get<any>(`${this.API_URL}/calles`).subscribe({
      next: (response) => {
        const data = response.data || response || [];
        this.calles = Array.isArray(data) ? data : [];
        this.cargandoCalles.set(false);
      },
      error: (error) => {
        console.error('Error al cargar calles:', error);
        this.calles = [];
        this.cargandoCalles.set(false);
        this.mostrarNotificacion('Error al cargar calles', 'error');
      }
    });
  }

  verDetalleCalle(id: string) {
    this.http.get<Calle>(`${this.API_URL}/calles/${id}`).subscribe({
      next: (calle) => {
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
    this.cargandoRecorridos.set(true);
    
    this.http.get<any>(`${this.API_URL}/misrecorridos?perfil_id=${this.PERFIL_ID}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        const data = response.data || response || [];
        this.recorridos = Array.isArray(data) ? data : [];
        this.cargandoRecorridos.set(false);
      },
      error: (error) => {
        console.error('Error al cargar recorridos:', error);
        this.recorridos = [];
        this.cargandoRecorridos.set(false);
        this.mostrarNotificacion('Error al cargar recorridos', 'error');
      }
    });
  }

  iniciarRecorrido(rutaId: string, vehiculoId: string) {
    const data = {
      ruta_id: rutaId,
      vehiculo_id: vehiculoId,
      perfil_id: this.PERFIL_ID
    };

    this.http.post<any>(`${this.API_URL}/recorridos/iniciar`, data, {
      headers: this.getHeaders()
    }).subscribe({
      next: () => {
        this.mostrarNotificacion('Recorrido iniciado correctamente', 'success');
        this.cargarRecorridos();
      },
      error: (error) => {
        console.error('Error al iniciar recorrido:', error);
        this.mostrarNotificacion('Error al iniciar el recorrido', 'error');
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

  // =================== POSICIONES ===================
  verPosiciones(recorridoId: string) {
    this.http.get<any>(`${this.API_URL}/recorridos/${recorridoId}/posiciones?perfil_id=${this.PERFIL_ID}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (response) => {
        const data = response.data || response || [];
        this.posiciones = Array.isArray(data) ? data : [];
        
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

  registrarPosicion(recorridoId: string, lat: number, lon: number) {
    const data = {
      lat: lat,
      lon: lon,
      perfil_id: this.PERFIL_ID
    };

    this.http.post<any>(`${this.API_URL}/recorridos/${recorridoId}/posiciones`, data, {
      headers: this.getHeaders()
    }).subscribe({
      next: () => {
        this.mostrarNotificacion('Posición registrada correctamente', 'success');
      },
      error: (error) => {
        console.error('Error al registrar posición:', error);
        this.mostrarNotificacion('Error al registrar la posición', 'error');
      }
    });
  }

  

  // =================== ADMINISTRACIÓN ===================
  crearRutaConEjemplo() {
    const geoJsonEjemplo = JSON.stringify({
      "type": "LineString",
      "coordinates": [
        [-77.0315, 3.8801],
        [-77.0320, 3.8805],
        [-77.0325, 3.8810]
      ]
    });

    this.crearRuta({
      nombre_ruta: 'Ruta Ejemplo',
      color_hex: '#FF5733',
      shape: geoJsonEjemplo
    });
  }

  iniciarRecorridoEjemplo() {
    if (this.rutaSeleccionadaId && this.vehiculoSeleccionadoId) {
      this.iniciarRecorrido(this.rutaSeleccionadaId, this.vehiculoSeleccionadoId);
    } else {
      this.mostrarNotificacion('Debe seleccionar una ruta y un vehículo', 'error');
    }
  }

  // =================== PAGINACIÓN ===================
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