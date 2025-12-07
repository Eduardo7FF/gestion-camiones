import { Component, AfterViewInit, ViewChild, ElementRef, signal, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../toast/toast.service';

declare var mapboxgl: any;

@Component({
  selector: 'app-mapa-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mapa-view.component.html',
  styleUrls: ['./mapa-view.component.scss']
})
export class MapaViewComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private apiService = inject(ApiService);
  private toastService = inject(ToastService);

  private map: any;
  private token = 'pk.eyJ1IjoiZWR1YXJkbzIwMDQiLCJhIjoiY21pdXltZ2xyMTZ6czNlb21xdDZhM200cSJ9.Hc5Kf79wFgp0jrzL8jR7Gw';
  
  puntosRuta: number[][] = [];
  rutaGeometria: number[][] = [];
  markers: any[] = [];
  private clickHandler: any = null;
  private contextMenuHandler: any = null;

  modoCreacion = signal(false);
  distancia = signal('0 km');
  duracion = signal('0 min');
  modalGuardarAbierto = signal(false);
  rutasExistentes = signal<any[]>([]);
  mostrandoCallesExternas = signal(false);
  cargandoCalles = signal(false);
  panelRutasAbierto = signal(true);
  
  vehiculosDisponibles = signal<any[]>([]);
  vehiculosSeleccionados: string[] = [];

  nuevaRutaForm = {
    nombre: '',
    descripcion: '',
    color: '#10b981'
  };

  coloresDisponibles = [
    { nombre: 'Verde', valor: '#10b981' },
    { nombre: 'Azul', valor: '#3B82F6' },
    { nombre: 'Rojo', valor: '#EF4444' },
    { nombre: 'Morado', valor: '#8B5CF6' },
    { nombre: 'Naranja', valor: '#F59E0B' },
    { nombre: 'Rosa', valor: '#EC4899' }
  ];

  ngAfterViewInit() {
    this.cargarMapbox();
    this.cargarRutasExistentes();
    this.cargarVehiculos();
  }

  ngOnDestroy() {
    if (this.map) this.map.remove();
  }

  cargarVehiculos() {
    this.apiService.getVehiculos().subscribe({
      next: (data) => {
        this.vehiculosDisponibles.set(Array.isArray(data) ? data : []);
      },
      error: (err) => {
        console.error('Error cargando vehículos:', err);
      }
    });
  }

  cargarRutasExistentes() {
    this.apiService.getRutas().subscribe({
      next: (data) => {
        this.rutasExistentes.set(Array.isArray(data) ? data : []);
        
        if (this.map && this.map.isStyleLoaded()) {
          setTimeout(() => {
            this.dibujarRutasExistentes();
          }, 500);
        }
      },
      error: (err) => {
        console.error('Error cargando rutas:', err);
      }
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
      zoom: 13,
      pitch: 0,
      bearing: 0
    });

    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    this.map.on('load', () => {
      setTimeout(() => {
        this.dibujarRutasExistentes();
      }, 1000);
    });
  }

  activarModoCreacion() {
    this.modoCreacion.set(true);
    this.limpiarMapa();
    
    if (this.clickHandler) {
      this.map.off('click', this.clickHandler);
    }
    if (this.contextMenuHandler) {
      this.map.off('contextmenu', this.contextMenuHandler);
    }

    this.clickHandler = (e: any) => {
      if (this.modoCreacion()) {
        this.agregarPuntoRuta(e.lngLat);
      }
    };

    this.contextMenuHandler = (e: any) => {
      e.preventDefault();
      if (this.modoCreacion() && this.puntosRuta.length >= 2) {
        this.finalizarRuta();
      }
    };

    this.map.on('click', this.clickHandler);
    this.map.on('contextmenu', this.contextMenuHandler);
    
    this.map.getCanvas().style.cursor = 'crosshair';
    this.toastService.showToast('Click en el mapa para agregar puntos. Click derecho para terminar', 'info', 4000);
  }

  agregarPuntoRuta(coords: { lng: number, lat: number }) {
    const punto = [coords.lng, coords.lat];
    this.puntosRuta.push(punto);
    
    const numeroMarker = this.puntosRuta.length;
    this.crearMarcador(punto, numeroMarker.toString(), this.getColorMarker(numeroMarker));
    
    if (this.puntosRuta.length === 1) {
      this.toastService.showToast('Punto inicial marcado', 'success', 2000);
    } else {
      this.toastService.showToast(`Punto ${numeroMarker} agregado`, 'success', 1500);
      this.dibujarRutaParcial();
    }
  }

  getColorMarker(numero: number): string {
    if (numero === 1) return '#10b981';
    if (numero === this.puntosRuta.length && this.puntosRuta.length > 1) return '#EF4444';
    return '#3B82F6';
  }

  async dibujarRutaParcial() {
    if (this.puntosRuta.length < 2) return;

    try {
      const coordinates = this.puntosRuta.map(p => `${p[0]},${p[1]}`).join(';');
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&overview=full&access_token=${this.token}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const ruta = data.routes[0];
        const rutaPorCalles = ruta.geometry.coordinates;

        const geojson: any = {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: rutaPorCalles
          }
        };

        if (this.map.getSource('ruta-temporal')) {
          this.map.getSource('ruta-temporal').setData(geojson);
        } else {
          this.map.addSource('ruta-temporal', {
            type: 'geojson',
            data: geojson
          });
          
          this.map.addLayer({
            id: 'ruta-temporal',
            type: 'line',
            source: 'ruta-temporal',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#10b981',
              'line-width': 5,
              'line-opacity': 0.9
            }
          });
        }

        this.distancia.set((ruta.distance / 1000).toFixed(2) + ' km');
        this.duracion.set(Math.round(ruta.duration / 60) + ' min');
      }
    } catch (error) {
      console.error('Error calculando ruta:', error);
      this.toastService.showToast('Error calculando ruta', 'error', 3000);
    }
  }

  async finalizarRuta() {
    if (this.puntosRuta.length < 2) {
      this.toastService.showToast('Necesitas al menos 2 puntos', 'warning', 3000);
      return;
    }

    try {
      const coordinates = this.puntosRuta.map(p => `${p[0]},${p[1]}`).join(';');
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&overview=full&access_token=${this.token}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const ruta = data.routes[0];
        this.rutaGeometria = ruta.geometry.coordinates;
        
        this.modoCreacion.set(false);
        
        if (this.clickHandler) {
          this.map.off('click', this.clickHandler);
        }
        if (this.contextMenuHandler) {
          this.map.off('contextmenu', this.contextMenuHandler);
        }
        
        this.map.getCanvas().style.cursor = '';
        
        if (this.markers.length >= 2) {
          const inicio = this.puntosRuta[0];
          const fin = this.puntosRuta[this.puntosRuta.length - 1];
          
          this.markers.forEach(m => m.remove());
          this.markers = [];
          
          this.crearMarcadorEspecial(inicio, 'INICIO', '#10b981');
          this.crearMarcadorEspecial(fin, 'FIN', '#EF4444');
        }
        
        if (this.map.getLayer('ruta-temporal')) {
          this.map.setPaintProperty('ruta-temporal', 'line-color', '#10b981');
          this.map.setPaintProperty('ruta-temporal', 'line-width', 6);
        }
        
        const bounds = new mapboxgl.LngLatBounds();
        this.rutaGeometria.forEach((p: number[]) => {
          bounds.extend([p[0], p[1]]);
        });
        this.map.fitBounds(bounds, { padding: 80 });

        this.toastService.showToast('Ruta creada. Puedes guardarla ahora', 'success', 3000);
      }
    } catch (error) {
      console.error('Error finalizando ruta:', error);
      this.toastService.showToast('Error al finalizar ruta', 'error', 3000);
    }
  }

  crearMarcador(lngLat: number[], texto: string, color: string) {
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.backgroundColor = color;
    el.style.width = '36px';
    el.style.height = '36px';
    el.style.borderRadius = '50%';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.color = 'white';
    el.style.fontWeight = '700';
    el.style.fontSize = '14px';
    el.style.boxShadow = '0 3px 10px rgba(0,0,0,0.3)';
    el.style.border = '3px solid white';
    el.innerText = texto;

    const lng = parseFloat(lngLat[0]?.toString() || '0');
    const lat = parseFloat(lngLat[1]?.toString() || '0');
    
    if (isNaN(lng) || isNaN(lat)) return;

    const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(this.map);
    this.markers.push(marker);
  }

  crearMarcadorEspecial(lngLat: number[], texto: string, color: string) {
    const el = document.createElement('div');
    el.className = 'custom-marker-special';
    el.style.backgroundColor = color;
    el.style.padding = '8px 14px';
    el.style.borderRadius = '20px';
    el.style.color = 'white';
    el.style.fontWeight = '700';
    el.style.fontSize = '12px';
    el.style.boxShadow = '0 3px 12px rgba(0,0,0,0.35)';
    el.style.border = '2px solid white';
    el.style.whiteSpace = 'nowrap';
    el.innerText = texto;

    const lng = parseFloat(lngLat[0]?.toString() || '0');
    const lat = parseFloat(lngLat[1]?.toString() || '0');
    
    if (isNaN(lng) || isNaN(lat)) return;

    const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(this.map);
    this.markers.push(marker);
  }

  crearMarcadorRecorrido(lngLat: number[], texto: string, color: string) {
    const el = document.createElement('div');
    el.className = 'custom-marker-recorrido';
    el.style.backgroundColor = color;
    el.style.width = '28px';
    el.style.height = '28px';
    el.style.borderRadius = '50%';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.color = 'white';
    el.style.fontWeight = '700';
    el.style.fontSize = '12px';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    el.style.border = '2px solid white';
    el.innerText = texto;

    const lng = parseFloat(lngLat[0]?.toString() || '0');
    const lat = parseFloat(lngLat[1]?.toString() || '0');
    
    if (isNaN(lng) || isNaN(lat)) return;

    const marker = new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(this.map);
    this.markers.push(marker);
  }

  dibujarRutasExistentes() {
    if (!this.map || !this.map.isStyleLoaded()) {
      setTimeout(() => this.dibujarRutasExistentes(), 500);
      return;
    }

    const rutasArray = this.rutasExistentes();

    rutasArray.forEach((ruta, index) => {
      if (!ruta.shape) return;

      try {
        const geometry = typeof ruta.shape === 'string' ? JSON.parse(ruta.shape) : ruta.shape;
        const sourceId = `ruta-${ruta.id || index}`;
        const layerId = `${sourceId}-line`;

        if (this.map.getLayer(layerId)) {
          this.map.removeLayer(layerId);
        }
        if (this.map.getSource(sourceId)) {
          this.map.removeSource(sourceId);
        }

        const colorRuta = ruta.color_hex || '#10b981';

        this.map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: geometry
          }
        });

        this.map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': colorRuta,
            'line-width': 4,
            'line-opacity': 0.9
          }
        });
      } catch (error) {
        console.error('Error dibujando ruta:', error);
      }
    });
  }

  toggleCallesExternas() {
    if (this.mostrandoCallesExternas()) {
      this.ocultarCallesExternas();
    } else {
      this.cargarCallesExternas();
    }
  }

  cargarCallesExternas() {
    this.cargandoCalles.set(true);
    
    this.apiService.getCallesExternas().subscribe({
      next: (calles) => {
        if (calles.length === 0) {
          this.toastService.showToast('No hay calles', 'warning', 3000);
          this.cargandoCalles.set(false);
          return;
        }

        this.dibujarCallesExternas(calles);
        this.mostrandoCallesExternas.set(true);
        this.cargandoCalles.set(false);
        this.toastService.showToast(`${calles.length} calles cargadas`, 'success', 2000);
      },
      error: (err) => {
        console.error('Error cargando calles:', err);
        this.toastService.showToast('Error al cargar calles', 'error', 3000);
        this.cargandoCalles.set(false);
      }
    });
  }

  dibujarCallesExternas(calles: any[]) {
    const features = calles.map((calle: any) => {
      let geometry;
      try {
        geometry = typeof calle.shape === 'string' ? JSON.parse(calle.shape) : calle.shape;
      } catch (error) {
        return null;
      }

      return {
        type: 'Feature',
        properties: { id: calle.id, nombre: calle.nombre || 'Sin nombre' },
        geometry: geometry
      };
    }).filter(f => f !== null);

    const geojson: any = {
      type: 'FeatureCollection',
      features: features
    };

    if (this.map.getLayer('calles-externas-layer')) {
      this.map.removeLayer('calles-externas-layer');
    }
    if (this.map.getSource('calles-externas')) {
      this.map.removeSource('calles-externas');
    }

    this.map.addSource('calles-externas', { type: 'geojson', data: geojson });
    this.map.addLayer({
      id: 'calles-externas-layer',
      type: 'line',
      source: 'calles-externas',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#FF6B35', 'line-width': 2, 'line-opacity': 0.6 }
    });
  }

  ocultarCallesExternas() {
    if (this.map.getLayer('calles-externas-layer')) {
      this.map.removeLayer('calles-externas-layer');
    }
    if (this.map.getSource('calles-externas')) {
      this.map.removeSource('calles-externas');
    }
    this.mostrandoCallesExternas.set(false);
  }

  abrirModalGuardar() {
    if (this.rutaGeometria.length === 0) {
      this.toastService.showToast('Debes trazar una ruta primero', 'warning', 3000);
      return;
    }
    
    this.vehiculosSeleccionados = [];
    this.modalGuardarAbierto.set(true);
  }

  cerrarModalGuardar() {
    this.modalGuardarAbierto.set(false);
    this.nuevaRutaForm = { nombre: '', descripcion: '', color: '#10b981' };
    this.vehiculosSeleccionados = [];
  }

  confirmarGuardarRuta() {
    if (!this.nuevaRutaForm.nombre.trim()) {
      this.toastService.showToast('Escribe un nombre', 'warning', 3000);
      return;
    }

    const rutaPayload = {
      nombre_ruta: this.nuevaRutaForm.nombre,
      descripcion: this.nuevaRutaForm.descripcion || '',
      shape: JSON.stringify({
        type: 'LineString',
        coordinates: this.rutaGeometria
      }),
      vehiculos: this.vehiculosSeleccionados
    };

    const colorSeleccionado = this.nuevaRutaForm.color;

    this.apiService.crearRuta(rutaPayload).subscribe({
      next: (response: any) => {
        this.toastService.showToast(`Ruta guardada con ${this.vehiculosSeleccionados.length} vehículos asignados`, 'success', 3000);
        this.cerrarModalGuardar();
        this.limpiarMapaYMantenerRutas();
        
        setTimeout(() => {
          this.cargarRutasExistentes();
        }, 800);
      },
      error: (err) => {
        console.error('Error guardando ruta:', err);
        this.toastService.showToast('Error al guardar', 'error', 3000);
      }
    });
  }

  toggleVehiculo(vehiculoId: string) {
    const index = this.vehiculosSeleccionados.indexOf(vehiculoId);
    if (index > -1) {
      this.vehiculosSeleccionados.splice(index, 1);
    } else {
      this.vehiculosSeleccionados.push(vehiculoId);
    }
  }

  isVehiculoSeleccionado(vehiculoId: string): boolean {
    return this.vehiculosSeleccionados.includes(vehiculoId);
  }

  limpiarMapaYMantenerRutas() {
    this.puntosRuta = [];
    this.rutaGeometria = [];
    this.distancia.set('0 km');
    this.duracion.set('0 min');
    
    this.markers.forEach(m => m.remove());
    this.markers = [];
    
    if (this.map && this.map.getSource('ruta-temporal')) {
      this.map.getSource('ruta-temporal').setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [] },
        properties: {}
      });
    }

    this.map.getCanvas().style.cursor = '';
  }

  limpiarMapa() {
    this.puntosRuta = [];
    this.rutaGeometria = [];
    this.distancia.set('0 km');
    this.duracion.set('0 min');
    
    this.markers.forEach(m => m.remove());
    this.markers = [];
    
    if (this.map && this.map.getSource('ruta-temporal')) {
      this.map.getSource('ruta-temporal').setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [] },
        properties: {}
      });
    }

    this.map.getCanvas().style.cursor = '';
  }

  verRuta(ruta: any) {
    if (!ruta.shape) return;

    try {
      const geometry = typeof ruta.shape === 'string' ? JSON.parse(ruta.shape) : ruta.shape;
      
      if (geometry.coordinates && geometry.coordinates.length > 0) {
        this.markers.forEach(m => m.remove());
        this.markers = [];

        const coordinates = geometry.coordinates;
        const totalPuntos = coordinates.length;
        const step = Math.max(1, Math.floor(totalPuntos / 15));
        
        this.crearMarcadorEspecial(coordinates[0], 'INICIO', '#10b981');
        
        let contador = 1;
        for (let i = step; i < totalPuntos - step; i += step) {
          this.crearMarcadorRecorrido(coordinates[i], contador.toString(), '#3B82F6');
          contador++;
        }
        
        this.crearMarcadorEspecial(coordinates[totalPuntos - 1], 'FIN', '#EF4444');

        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach((coord: number[]) => bounds.extend(coord));
        this.map.fitBounds(bounds, { padding: 100, duration: 1000 });

        this.toastService.showToast(`Visualizando: ${ruta.nombre_ruta}`, 'info', 2500);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  togglePanelRutas() {
    this.panelRutasAbierto.set(!this.panelRutasAbierto());
  }
}