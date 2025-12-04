import { Component, AfterViewInit, ViewChild, ElementRef, signal, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  private map: any;
  private token = 'pk.eyJ1IjoiZWR1YXJkbzIwMDQiLCJhIjoiY21pZGRlbzl1MDBnaTJscHk5aXB4ZXZ6eiJ9.UEiVl9KSTv7aSEQsmb-_kw'; 
  
  // Estado de ruta
  origen: number[] | null = null;
  destino: number[] | null = null;
  rutaGeometria: number[][] = [];
  
  // --- NUEVO: Para la velocidad constante ---
  distanciasAcumuladas: number[] = []; 
  distanciaTotalMetros = 0;

  // Marcadores
  markerOrigen: any;
  markerDestino: any;
  markerCamion: any;

  // Estado UI
  modoCreacion = signal(false);
  distancia = signal('0 km');
  duracion = signal('0 min');
  animando = signal(false);

  // Gestión de vehículos
  vehiculosDisponibles = signal<any[]>([]);
  vehiculoSeleccionadoId = signal<string>(''); 

  ngOnInit() {
    this.cargarVehiculos();
  }

  ngAfterViewInit() {
    this.cargarMapbox();
  }

  ngOnDestroy() {
    if (this.map) this.map.remove();
  }

  // --- CARGA DE DATOS ---
  cargarVehiculos() {
    if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem('mis_vehiculos');
        if (data) {
          const lista = JSON.parse(data);
          this.vehiculosDisponibles.set(lista.filter((v: any) => v.activo));
        }
    }
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

  // --- INICIALIZACIÓN DEL MAPA ---
  iniciarMapa() {
    mapboxgl.accessToken = this.token;
    this.map = new mapboxgl.Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-77.0315, 3.8801],
      zoom: 14,
      pitch: 45,
    });

    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    this.map.on('click', (e: any) => {
      if (this.modoCreacion()) {
        this.manejarClicMapa(e.lngLat);
      }
    });
  }

  // --- LÓGICA DE RUTA ---
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
    el.style.width = '32px';
    el.style.height = '32px';
    el.style.borderRadius = '50%';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.color = 'white';
    el.style.fontWeight = 'bold';
    el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
    el.style.border = '2px solid white';
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
        
        // --- CÁLCULO DE DISTANCIAS REALES PARA SUAVIDAD ---
        this.calcularDistanciasAcumuladas();

        this.distancia.set((ruta.distance / 1000).toFixed(2) + ' km');
        this.duracion.set(Math.round(ruta.duration / 60) + ' min');
        this.dibujarLineaRuta();
        
        const bounds = new mapboxgl.LngLatBounds();
        this.rutaGeometria.forEach(p => bounds.extend(p as any));
        this.map.fitBounds(bounds, { padding: 80 });
      }
    } catch (error) {
      console.error(error);
      alert('Error calculando ruta');
    }
  }

  // Calcula la distancia total y la distancia en cada punto para interpolar correctamente
  calcularDistanciasAcumuladas() {
    this.distanciasAcumuladas = [0];
    this.distanciaTotalMetros = 0;
    
    for (let i = 0; i < this.rutaGeometria.length - 1; i++) {
      const p1 = this.rutaGeometria[i];
      const p2 = this.rutaGeometria[i+1];
      const dist = this.distanciaEntrePuntos(p1, p2);
      this.distanciaTotalMetros += dist;
      this.distanciasAcumuladas.push(this.distanciaTotalMetros);
    }
  }

  // Fórmula Haversine simplificada para metros
  distanciaEntrePuntos(coord1: number[], coord2: number[]): number {
    const R = 6371e3; // Radio tierra en metros
    const lat1 = coord1[1] * Math.PI/180;
    const lat2 = coord2[1] * Math.PI/180;
    const deltaLat = (coord2[1] - coord1[1]) * Math.PI/180;
    const deltaLon = (coord2[0] - coord1[0]) * Math.PI/180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  dibujarLineaRuta() {
    // === 1. CAPA RUTA PENDIENTE (AZUL) ===
    // Esta capa se inicializa con TODA la ruta y se irá "recortando"
    if (this.map.getSource('ruta-pendiente')) {
      this.map.getSource('ruta-pendiente').setData({
        type: 'Feature', properties: {},
        geometry: { type: 'LineString', coordinates: this.rutaGeometria }
      });
    } else {
      this.map.addSource('ruta-pendiente', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: this.rutaGeometria } }
      });
      // Borde
      this.map.addLayer({
        id: 'ruta-pendiente-borde', type: 'line', source: 'ruta-pendiente',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#104F8C', 'line-width': 8, 'line-opacity': 0.7 }
      });
      // Relleno
      this.map.addLayer({
        id: 'ruta-pendiente', type: 'line', source: 'ruta-pendiente',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#00A8FF', 'line-width': 5, 'line-opacity': 1 }
      });
    }

    // === 2. CAPA RUTA COMPLETADA (HUELLAS/GRIS) ===
    // Esta capa empieza VACÍA y se irá llenando
    if (this.map.getSource('ruta-completada')) {
      this.map.getSource('ruta-completada').setData({
        type: 'Feature', properties: {},
        geometry: { type: 'LineString', coordinates: [] }
      });
    } else {
      this.map.addSource('ruta-completada', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } }
      });
      // Estilo de "Huellas" (Punteado)
      this.map.addLayer({
        id: 'ruta-completada', type: 'line', source: 'ruta-completada',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 
          'line-color': '#666', 
          'line-width': 4, 
          'line-dasharray': [2, 4], 
          'line-opacity': 0.7 
        }
      });
      
      // Mover la capa completada debajo de la pendiente
      if (this.map.getLayer('ruta-pendiente-borde')) {
         this.map.moveLayer('ruta-completada', 'ruta-pendiente-borde');
      }
    }
  }

  // =========================================================
  //  MOTOR DE ANIMACIÓN CORREGIDO (VELOCIDAD CONSTANTE)
  // =========================================================
  iniciarSimulacion() {
    if (!this.vehiculoSeleccionadoId()) {
      alert('⚠️ Selecciona un vehículo primero.');
      return;
    }
    if (this.rutaGeometria.length === 0) return;
    
    this.animando.set(true);
    
    // 1. CREAR CAMIÓN (VISTA SUPERIOR 3D)
    if (!this.markerCamion) {
      const el = document.createElement('div');
      el.innerHTML = `
        <svg width="70" height="70" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 15px 15px rgba(0,0,0,0.4)); transform-origin: center;">
          <defs>
            <linearGradient id="cabinaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#007AFF" />
              <stop offset="100%" stop-color="#005ecb" />
            </linearGradient>
            <linearGradient id="cargaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#FFFFFF" />
              <stop offset="100%" stop-color="#F2F2F7" />
            </linearGradient>
          </defs>
          <ellipse cx="50" cy="50" rx="20" ry="35" fill="black" fill-opacity="0.2" filter="blur(4px)"/>
          <rect x="28" y="45" width="44" height="50" rx="6" fill="url(#cargaGrad)" stroke="#C7C7CC" stroke-width="1"/>
          <line x1="35" y1="50" x2="35" y2="90" stroke="#E5E5EA" stroke-width="2"/>
          <line x1="65" y1="50" x2="65" y2="90" stroke="#E5E5EA" stroke-width="2"/>
          <rect x="30" y="5" width="40" height="35" rx="8" fill="url(#cabinaGrad)" stroke="white" stroke-width="2"/>
          <path d="M 35 15 Q 50 12 65 15 L 65 25 Q 50 28 35 25 Z" fill="#333333" opacity="0.8"/>
          <circle cx="36" cy="35" r="2" fill="#FFD60A"/>
          <circle cx="64" cy="35" r="2" fill="#FFD60A"/>
        </svg>
      `;
      el.style.width = '70px';
      el.style.height = '70px';
      el.style.display = 'flex';
      el.style.justifyContent = 'center';
      el.style.alignItems = 'center';

      this.markerCamion = new mapboxgl.Marker({ 
        element: el, 
        rotationAlignment: 'map', 
        pitchAlignment: 'map'
      })
        .setLngLat(this.rutaGeometria[0])
        .addTo(this.map);
    }

    // 2. ANIMACIÓN BASADA EN DISTANCIA REAL (NO PUNTOS)
    const duracionTotal = 120000; // 120 segundos para toda la ruta
    let startTime: number | null = null;
    let lastIndexDibuja = -1;

    const animar = (timestamp: number) => {
      if (!this.animando()) return;
      if (!startTime) startTime = timestamp;

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duracionTotal, 1);
      
      // Distancia actual objetivo (en metros)
      const distanciaObjetivo = progress * this.distanciaTotalMetros;

      // Buscar en qué segmento estamos basado en la distancia
      let index = 0;
      // Optimización: buscar desde donde quedamos o un poco antes
      // Dado que el array es corto (miles de puntos max), un loop simple es muy rápido
      for (let i = 0; i < this.distanciasAcumuladas.length - 1; i++) {
        if (distanciaObjetivo >= this.distanciasAcumuladas[i] && distanciaObjetivo <= this.distanciasAcumuladas[i+1]) {
          index = i;
          break;
        }
      }

      const nextIndex = index + 1;
      const distInicioSegmento = this.distanciasAcumuladas[index];
      const distFinSegmento = this.distanciasAcumuladas[nextIndex];
      const largoSegmento = distFinSegmento - distInicioSegmento;

      // Progreso dentro de ESE segmento específico (0.0 a 1.0)
      const segmentProgress = largoSegmento > 0 ? (distanciaObjetivo - distInicioSegmento) / largoSegmento : 0;
      
      const p1 = this.rutaGeometria[index];
      const p2 = this.rutaGeometria[nextIndex];

      if (p1 && p2) {
        // Interpolación LERP exacta
        const lng = p1[0] + (p2[0] - p1[0]) * segmentProgress;
        const lat = p1[1] + (p2[1] - p1[1]) * segmentProgress;
        
        this.markerCamion.setLngLat([lng, lat]);

        // Rotación suave
        const bearing = this.calcularRotacion(p1, p2);
        this.markerCamion.setRotation(bearing);

        // ACTUALIZACIÓN VISUAL DE LÍNEAS (EFECTO "COMERSE" LA RUTA)
        // Solo actualizamos las capas cuando avanzamos de punto (index) para mejorar rendimiento
        if (index > lastIndexDibuja) {
          const rutaRecorrida = this.rutaGeometria.slice(0, index + 1);
          const rutaRestante = this.rutaGeometria.slice(index);

          // Actualizar huellas (Gris)
          if (this.map.getSource('ruta-completada')) {
            this.map.getSource('ruta-completada').setData({
              type: 'Feature', geometry: { type: 'LineString', coordinates: rutaRecorrida }, properties: {}
            });
          }
          
          // Actualizar pendiente (Azul)
          if (this.map.getSource('ruta-pendiente')) {
            this.map.getSource('ruta-pendiente').setData({
              type: 'Feature', geometry: { type: 'LineString', coordinates: rutaRestante }, properties: {}
            });
          }
          lastIndexDibuja = index;
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animar);
      } else {
        this.animando.set(false);
        const v = this.vehiculosDisponibles().find(x => x.id === this.vehiculoSeleccionadoId());
        alert(`🏁 Destino alcanzado por: ${v?.placa}`);
      }
    };
    
    requestAnimationFrame(animar);
  }

  // --- MATEMÁTICAS ---
  calcularRotacion(start: number[], end: number[]): number {
    const startLat = this.toRadians(start[1]);
    const startLng = this.toRadians(start[0]);
    const endLat = this.toRadians(end[1]);
    const endLng = this.toRadians(end[0]);

    const y = Math.sin(endLng - startLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);
    const brng = Math.atan2(y, x);
    return (this.toDegrees(brng) + 360) % 360;
  }

  toRadians(degrees: number) { return degrees * Math.PI / 180; }
  toDegrees(radians: number) { return radians * 180 / Math.PI; }

  limpiarMapa() {
    this.origen = null;
    this.destino = null;
    this.rutaGeometria = [];
    this.distancia.set('0 km');
    this.duracion.set('0 min');
    this.distanciasAcumuladas = []; // Resetear distancias
    if (this.markerOrigen) this.markerOrigen.remove();
    if (this.markerDestino) this.markerDestino.remove();
    if (this.markerCamion) this.markerCamion.remove();
    this.markerCamion = null; 
    
    if (this.map.getSource('ruta-pendiente')) {
      this.map.getSource('ruta-pendiente').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} });
    }
    if (this.map.getSource('ruta-completada')) {
      this.map.getSource('ruta-completada').setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} });
    }
  }
}