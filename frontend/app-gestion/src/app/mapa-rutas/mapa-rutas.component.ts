import { Component, AfterViewInit, ViewChild, ElementRef, signal, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehiculosService } from '../services/vehiculos.service'; 
import { RutasService } from '../services/rutas.service';
import { HorariosService } from '../services/horarios.service';
import { PosicionesService } from '../services/posiciones.service';
import { CallesExternasService } from '../services/calles-externas.service';

declare var mapboxgl: any;

@Component({
  selector: 'app-mapa-rutas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mapa-rutas.component.html',
  styleUrls: ['./mapa-rutas.component.scss']
})
export class MapaRutasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  // Inyección de servicios
  private vehiculosService = inject(VehiculosService);
  private rutasService = inject(RutasService);
  private horariosService = inject(HorariosService);
  private posicionesService = inject(PosicionesService);
  private callesExternasService = inject(CallesExternasService);

  private map: any;
  private token = 'pk.eyJ1IjoiZWR1YXJkbzIwMDQiLCJhIjoiY21pZGRlbzl1MDBnaTJscHk5aXB4ZXZ6eiJ9.UEiVl9KSTv7aSEQsmb-_kw'; 
  
  // Estado de la ruta
  origen: number[] | null = null;
  destino: number[] | null = null;
  rutaGeometria: number[][] = [];
  
  distanciasAcumuladas: number[] = []; 
  distanciaTotalMetros = 0;

  // Marcadores
  markerOrigen: any;
  markerDestino: any;
  markerCamion: any;

  // UI Signals
  modoCreacion = signal(false);
  distancia = signal('0 km');
  duracion = signal('0 min');
  animando = signal(false);
  modalGuardarAbierto = signal(false);
  
  // Lista de rutas existentes
  rutasExistentes = signal<any[]>([]);

  // Control de visibilidad de calles externas
  mostrandoCallesExternas = signal(false);
  cargandoCalles = signal(false);

  // Formulario de guardar ruta y horarios
  nuevaRutaForm = {
    nombre: '', color: '#2962FF', horaInicio: '06:00',
    dias: { lunes: false, martes: false, miercoles: false, jueves: false, viernes: false, sabado: false, domingo: false }
  };

  vehiculosDisponibles = signal<any[]>([]);
  vehiculoSeleccionadoId = signal<string>(''); 
  
  // Control de envío de GPS
  private lastGpsSendTime = 0;
  private readonly MIN_GPS_INTERVAL = 1000;

  ngOnInit() {
    this.cargarVehiculos();
    this.cargarRutasExistentes();
  }

  ngAfterViewInit() {
    this.cargarMapbox();
  }

  ngOnDestroy() {
    if (this.map) this.map.remove();
  }

  // --- CARGAR RUTAS EXISTENTES ---
  cargarRutasExistentes() {
    this.rutasService.getAll().subscribe({
      next: (data: any[]) => {
        this.rutasExistentes.set(data);
      },
      error: (err: any) => console.error('Error cargando rutas existentes:', err)
    });
  }

  // --- ELIMINAR RUTA ---
  eliminarRuta(id: string) {
    if (confirm('¿Estás seguro de eliminar esta ruta? Esto incluye sus horarios asociados.')) {
        this.rutasService.delete(id).subscribe({
            next: () => {
                alert('Ruta eliminada.');
                this.cargarRutasExistentes();
            },
            error: () => alert('Error al eliminar la ruta.')
        });
    }
  }

  cargarVehiculos() {
    this.vehiculosService.getAll().subscribe({
      next: (data: any[]) => {
        const activos = data.filter((v: any) => v.activo);
        this.vehiculosDisponibles.set(activos);
      },
      error: (err: any) => console.error('Error cargando vehículos:', err)
    });
  }

  cargarMapbox() {
    if (typeof mapboxgl === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.onload = () => {
        const link = document.createElement('link');
        link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        this.iniciarMapa();
      };
      document.head.appendChild(script);
    } else {
      this.iniciarMapa();
    }
  }

  iniciarMapa() {
    mapboxgl.accessToken = this.token;
    this.map = new mapboxgl.Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-77.0315, 3.8801],
      zoom: 15, 
      pitch: 45, 
      bearing: 0,
      antialias: true
    });

    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    this.map.on('click', (e: any) => {
      if (this.modoCreacion()) {
        this.manejarClicMapa(e.lngLat);
      }
    });
  }

  // ✅ NUEVO: Toggle de Calles Externas
  toggleCallesExternas() {
    if (this.mostrandoCallesExternas()) {
      this.ocultarCallesExternas();
    } else {
      this.cargarCallesExternas();
    }
  }

  // ✅ NUEVO: Cargar 985 calles del profesor
  cargarCallesExternas() {
    this.cargandoCalles.set(true);
    this.callesExternasService.getCalles().subscribe({
      next: (calles: any[]) => {
        this.dibujarCallesExternas(calles);
        this.mostrandoCallesExternas.set(true);
        this.cargandoCalles.set(false);
        console.log(`✅ ${calles.length} calles cargadas del API del profesor`);
      },
      error: (err: any) => {
        console.error('❌ Error cargando calles externas:', err);
        alert('Error al cargar las calles del profesor');
        this.cargandoCalles.set(false);
      }
    });
  }

  // ✅ ACTUALIZADO: Dibujar las calles en el mapa con campos correctos
  dibujarCallesExternas(calles: any[]) {
    console.log('🎨 Dibujando calles en el mapa...', calles.length);
    
    // Crear GeoJSON FeatureCollection
    const geojson = {
      type: 'FeatureCollection',
      features: calles.map((calle: any) => {
        // ✅ Parsear shape si viene como string
        let geometry;
        try {
          geometry = typeof calle.shape === 'string' 
            ? JSON.parse(calle.shape) 
            : calle.shape;
        } catch (error) {
          console.error('Error parseando geometría de calle:', calle.id, error);
          return null;
        }

        return {
          type: 'Feature',
          properties: {
            id: calle.id,        // ✅ Cambié de calle.d a calle.id
            nombre: calle.nombre // ✅ Cambié de calle.ombre a calle.nombre
          },
          geometry: geometry     // ✅ Cambié de calle.hape a calle.shape
        };
      }).filter(f => f !== null) // ✅ Filtrar calles con errores
    };

    console.log('📊 GeoJSON creado con', geojson.features.length, 'calles válidas');

    // Agregar source si no existe
    if (!this.map.getSource('calles-externas')) {
      this.map.addSource('calles-externas', {
        type: 'geojson',
        data: geojson
      });

      // Agregar capa de líneas con estilo iOS
      this.map.addLayer({
        id: 'calles-externas-layer',
        type: 'line',
        source: 'calles-externas',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#FF6B35', // Naranja iOS
          'line-width': 2,
          'line-opacity': 0.6
        }
      });

      console.log('✅ Capa de calles agregada al mapa');
    } else {
      // Actualizar datos si ya existe
      this.map.getSource('calles-externas').setData(geojson);
      console.log('✅ Datos de calles actualizados');
    }
  }

  // ✅ NUEVO: Ocultar calles externas
  ocultarCallesExternas() {
    if (this.map.getLayer('calles-externas-layer')) {
      this.map.removeLayer('calles-externas-layer');
    }
    if (this.map.getSource('calles-externas')) {
      this.map.removeSource('calles-externas');
    }
    this.mostrandoCallesExternas.set(false);
  }

  activarModoCreacion() {
    this.modoCreacion.set(true);
    this.limpiarMapa();
    this.map.getCanvas().style.cursor = 'crosshair';
  }

  manejarClicMapa(coords: { lng: number, lat: number }) {
    const punto = [coords.lng, coords.lat];

    if (!this.origen) {
      this.origen = punto;
      this.crearMarcador(punto, 'A', '#25D366');
    } else if (!this.destino) {
      this.destino = punto;
      this.crearMarcador(punto, 'B', '#FF3B30');
      this.map.getCanvas().style.cursor = '';
      this.calcularRutaInteligente();
      this.modoCreacion.set(false);
    }
  }

  crearMarcador(lngLat: number[], texto: string, color: string) {
    const el = document.createElement('div');
    el.className = 'marker-custom';
    el.style.backgroundColor = color;
    el.style.width = '32px'; el.style.height = '32px'; el.style.borderRadius = '50%';
    el.style.display = 'flex'; el.style.alignItems = 'center'; el.style.justifyContent = 'center';
    el.style.color = 'white'; el.style.fontWeight = 'bold';
    el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)'; el.style.border = '2px solid white';
    el.innerText = texto;

    const marker = new mapboxgl.Marker(el).setLngLat(lngLat).addTo(this.map);
    if (texto === 'A') this.markerOrigen = marker;
    else this.markerDestino = marker;
  }

  async calcularRutaInteligente() {
    if (!this.origen || !this.destino) return;

    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${this.origen.join(',')};${this.destino.join(',')}?geometries=geojson&steps=true&overview=full&access_token=${this.token}`;

    try {
      const respuesta = await fetch(url);
      const data = await respuesta.json();
      
      if (data.routes && data.routes.length > 0) {
        const ruta = data.routes[0];
        this.rutaGeometria = ruta.geometry.coordinates;
        this.calcularDistanciasAcumuladas();
        this.distancia.set((ruta.distance / 1000).toFixed(2) + ' km');
        this.duracion.set(Math.round(ruta.duration / 60) + ' min');
        this.dibujarLineaRuta();
        
        const bounds = new mapboxgl.LngLatBounds();
        this.rutaGeometria.forEach(p => bounds.extend(p as any));
        this.map.fitBounds(bounds, { padding: {top: 50, bottom: 50, left: 340, right: 50} });
      }
    } catch (error) { console.error(error); alert('Error calculando ruta'); }
  }

  // --- PERSISTENCIA Y HORARIOS ---
  guardarRutaActual() {
    this.abrirModalGuardar();
  }

  abrirModalGuardar() {
    if (this.rutaGeometria.length === 0) { alert('Debes trazar una ruta primero.'); return; }
    this.modalGuardarAbierto.set(true);
  }

  cerrarModalGuardar() {
    this.modalGuardarAbierto.set(false);
    this.nuevaRutaForm.nombre = ''; 
  }

  confirmarGuardarRuta() {
    if (!this.nuevaRutaForm.nombre) { alert('Escribe un nombre para la ruta'); return; }

    const rutaPayload = {
      nombre: this.nuevaRutaForm.nombre, color_hex: this.nuevaRutaForm.color,
      shape: { type: 'LineString', coordinates: this.rutaGeometria },
      longitud_m: this.distanciaTotalMetros, activo: true
    };

    this.rutasService.create(rutaPayload).subscribe({
      next: (rutaCreada: any) => {
        this.guardarHorarios(rutaCreada.id);
      },
      error: (err: any) => { console.error(err); alert('Error al guardar la ruta.'); }
    });
  }

  guardarHorarios(rutaId: string) {
    const diasMap: any = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
    const promesas = [];
    const diasForm: any = this.nuevaRutaForm.dias;

    for (const key in diasForm) {
      if (diasForm[key]) {
        const horarioPayload = {
          ruta_id: rutaId, dia_semana: diasMap[key],
          hora_inicio_plan: this.nuevaRutaForm.horaInicio + ':00',
          ventana_min: 120
        };
        promesas.push(new Promise((resolve) => {
            this.horariosService.create(horarioPayload).subscribe({
                next: (res) => resolve(res),
                error: (err) => resolve(null)
            });
        }));
      }
    }

    Promise.all(promesas).then(() => {
      alert('¡Ruta y horarios guardados exitosamente!');
      this.cargarRutasExistentes();
      this.cerrarModalGuardar();
    });
  }

  // --- MATEMÁTICAS Y DIBUJO ---
  calcularDistanciasAcumuladas() {
    this.distanciasAcumuladas = [0]; this.distanciaTotalMetros = 0;
    for (let i = 0; i < this.rutaGeometria.length - 1; i++) {
      const p1 = this.rutaGeometria[i]; const p2 = this.rutaGeometria[i+1];
      const dist = this.distanciaEntrePuntos(p1, p2);
      this.distanciaTotalMetros += dist; this.distanciasAcumuladas.push(this.distanciaTotalMetros);
    }
  }

  distanciaEntrePuntos(c1: number[], c2: number[]): number {
    const R = 6371e3; const lat1 = c1[1] * Math.PI/180; const lat2 = c2[1] * Math.PI/180;
    const dLat = (c2[1] - c1[1]) * Math.PI/180; const dLon = (c2[0] - c1[0]) * Math.PI/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  dibujarLineaRuta() {
    if (this.map.getSource('ruta-pendiente')) {
      this.map.getSource('ruta-pendiente').setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: this.rutaGeometria } });
    } else {
      this.map.addSource('ruta-pendiente', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: this.rutaGeometria } } });
      this.map.addLayer({ id: 'ruta-pendiente-borde', type: 'line', source: 'ruta-pendiente', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#104F8C', 'line-width': 8, 'line-opacity': 0.7 } });
      this.map.addLayer({ id: 'ruta-pendiente', type: 'line', source: 'ruta-pendiente', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#00A8FF', 'line-width': 5, 'line-opacity': 1 } });
    }
    if (this.map.getSource('ruta-completada')) {
      this.map.getSource('ruta-completada').setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
    } else {
      this.map.addSource('ruta-completada', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } } });
      this.map.addLayer({ id: 'ruta-completada', type: 'line', source: 'ruta-completada', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#666', 'line-width': 4, 'line-dasharray': [2, 4], 'line-opacity': 0.6 } });
    }
  }

  // --- ANIMACIÓN Y TRACKING GPS ---
  iniciarSimulacion() {
    if (!this.vehiculoSeleccionadoId()) { alert('Selecciona un vehículo'); return; }
    if (this.rutaGeometria.length === 0) return;
    this.animando.set(true);
    
    if (!this.markerCamion) {
      const el = document.createElement('div');
      el.innerHTML = `<svg width="70" height="70" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 15px 15px rgba(0,0,0,0.4)); transform-origin: center;"><defs><linearGradient id="cabinaGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#007AFF" /><stop offset="100%" stop-color="#005ecb" /></linearGradient><linearGradient id="cargaGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#FFFFFF" /><stop offset="100%" stop-color="#F2F2F7" /></linearGradient></defs><ellipse cx="50" cy="50" rx="20" ry="35" fill="black" fill-opacity="0.2" filter="blur(4px)"/><rect x="28" y="45" width="44" height="50" rx="6" fill="url(#cargaGrad)" stroke="#C7C7CC" stroke-width="1"/><line x1="35" y1="50" x2="35" y2="90" stroke="#E5E5EA" stroke-width="2"/><line x1="65" y1="50" x2="65" y2="90" stroke="#E5E5EA" stroke-width="2"/><rect x="30" y="5" width="40" height="35" rx="8" fill="url(#cabinaGrad)" stroke="white" stroke-width="2"/><path d="M 35 15 Q 50 12 65 15 L 65 25 Q 50 28 35 25 Z" fill="#333333" opacity="0.8"/><circle cx="36" cy="35" r="2" fill="#FFD60A"/><circle cx="64" cy="35" r="2" fill="#FFD60A"/></svg>`;
      el.style.width = '70px'; el.style.height = '70px'; el.style.display = 'flex'; el.style.justifyContent = 'center'; el.style.alignItems = 'center';
      this.markerCamion = new mapboxgl.Marker({ element: el, rotationAlignment: 'map', pitchAlignment: 'map' }).setLngLat(this.rutaGeometria[0]).addTo(this.map);
    }

    const duracionTotal = 120000; 
    let startTime: number | null = null;
    let lastIndexDibuja = -1;
    this.lastGpsSendTime = 0;

    const animar = (timestamp: number) => {
      if (!this.animando()) return;
      if (!startTime) startTime = timestamp;

      const elapsed = timestamp - startTime; const progress = Math.min(elapsed / duracionTotal, 1);
      const distanciaObjetivo = progress * this.distanciaTotalMetros;

      let index = 0;
      for (let i = 0; i < this.distanciasAcumuladas.length - 1; i++) {
        if (distanciaObjetivo >= this.distanciasAcumuladas[i] && distanciaObjetivo <= this.distanciasAcumuladas[i+1]) { index = i; break; }
      }
      
      const nextIndex = index + 1;
      const distInicio = this.distanciasAcumuladas[index];
      const distFin = this.distanciasAcumuladas[nextIndex];
      const largo = distFin - distInicio;
      const segmentProgress = largo > 0 ? (distanciaObjetivo - distInicio) / largo : 0;
      
      const p1 = this.rutaGeometria[index]; const p2 = this.rutaGeometria[nextIndex];

      if (p1 && p2) {
        const lng = p1[0] + (p2[0] - p1[0]) * segmentProgress; const lat = p1[1] + (p2[1] - p1[1]) * segmentProgress;
        this.markerCamion.setLngLat([lng, lat]);
        const bearing = this.calcularRotacion(p1, p2);
        this.markerCamion.setRotation(bearing);

        if (timestamp - this.lastGpsSendTime >= this.MIN_GPS_INTERVAL) {
            this.registrarPosicionGps(lng, lat);
            this.lastGpsSendTime = timestamp;
        }

        if (index > lastIndexDibuja) {
          const rutaRecorrida = this.rutaGeometria.slice(0, index + 1); const rutaRestante = this.rutaGeometria.slice(index);
          if (this.map.getSource('ruta-completada')) { this.map.getSource('ruta-completada').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: rutaRecorrida }, properties: {} }); }
          if (this.map.getSource('ruta-pendiente')) { this.map.getSource('ruta-pendiente').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: rutaRestante }, properties: {} }); }
          lastIndexDibuja = index;
        }
      }

      if (progress < 1) requestAnimationFrame(animar);
      else { this.animando.set(false); const v = this.vehiculosDisponibles().find(x => x.id === this.vehiculoSeleccionadoId()); alert(`🏁 Recorrido finalizado y posición registrada para: ${v?.placa}`); }
    };
    requestAnimationFrame(animar);
  }

  // --- REGISTRO DE POSICIÓN GPS ---
  registrarPosicionGps(lng: number, lat: number) {
    if (!this.vehiculoSeleccionadoId()) return;
    const payload = {
        vehiculo_id: this.vehiculoSeleccionadoId(),
        geom: { type: 'Point', coordinates: [lng, lat] }
    };
    this.posicionesService.registerPosition(payload).subscribe({
        error: (err) => console.error('Error al registrar GPS:', err)
    });
  }

  calcularRotacion(start: number[], end: number[]): number {
    const startLat = this.toRadians(start[1]); const startLng = this.toRadians(start[0]); const endLat = this.toRadians(end[1]); const endLng = this.toRadians(end[0]);
    const y = Math.sin(endLng - startLng) * Math.cos(endLat); const x = Math.cos(startLat) * Math.sin(endLat) - Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    const brng = Math.atan2(y, x); return (this.toDegrees(brng) + 360) % 360;
  }
  toRadians(d: number) { return d * Math.PI / 180; }
  toDegrees(r: number) { return r * 180 / Math.PI; }
  
  limpiarMapa() { 
    this.origen = null; this.destino = null; this.rutaGeometria = []; this.distancia.set('0 km'); this.duracion.set('0 min'); this.distanciasAcumuladas = [];
    if (this.markerOrigen) this.markerOrigen.remove(); if (this.markerDestino) this.markerDestino.remove(); if (this.markerCamion) this.markerCamion.remove(); this.markerCamion = null; 
    if (this.map.getSource('ruta-pendiente')) { this.map.getSource('ruta-pendiente').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} }); }
    if (this.map.getSource('ruta-completada')) { this.map.getSource('ruta-completada').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} }); }
  }
}