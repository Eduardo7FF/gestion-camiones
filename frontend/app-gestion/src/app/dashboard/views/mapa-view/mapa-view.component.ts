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
  panelRutasAbierto = signal(true);
  mostrandoCallesExternas = signal(false);
  cargandoCalles = signal(false);

  nuevaRutaForm = {
    nombre: ''
  };

  ngAfterViewInit() {
    this.cargarMapbox();
    this.cargarRutasExistentes();
  }

  ngOnDestroy() {
    if (this.map) this.map.remove();
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
  }

  cancelarModoCreacion() {
    this.modoCreacion.set(false);
    this.limpiarMapa();
    
    if (this.clickHandler) {
      this.map.off('click', this.clickHandler);
    }
    if (this.contextMenuHandler) {
      this.map.off('contextmenu', this.contextMenuHandler);
    }
    
    this.map.getCanvas().style.cursor = '';
  }

  agregarPuntoRuta(coords: { lng: number, lat: number }) {
    const punto = [coords.lng, coords.lat];
    this.puntosRuta.push(punto);
    
    const esPrimerPunto = this.puntosRuta.length === 1;
    this.crearMarcadorUbicacion(punto, esPrimerPunto ? '#10b981' : '#3B82F6');
    
    if (esPrimerPunto) {
      this.toastService.showToast('Punto inicial marcado', 'success', 2000);
    } else {
      this.toastService.showToast(`Punto ${this.puntosRuta.length} agregado`, 'success', 1500);
      this.dibujarRutaParcial();
    }
  }

  crearMarcadorUbicacion(lngLat: number[], color: string) {
    const el = document.createElement('div');
    el.className = 'custom-marker-ubicacion';
    el.innerHTML = `
      <svg width="32" height="40" viewBox="0 0 24 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 18 12 18s12-9 12-18c0-6.627-5.373-12-12-12z" fill="${color}"/>
        <circle cx="12" cy="12" r="5" fill="white"/>
      </svg>
    `;
    el.style.cursor = 'pointer';

    const lng = parseFloat(lngLat[0]?.toString() || '0');
    const lat = parseFloat(lngLat[1]?.toString() || '0');
    
    if (isNaN(lng) || isNaN(lat)) return;

    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([lng, lat])
      .addTo(this.map);
    this.markers.push(marker);
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
        
        const inicio = this.puntosRuta[0];
        const fin = this.puntosRuta[this.puntosRuta.length - 1];
        
        this.markers.forEach(m => m.remove());
        this.markers = [];
        
        this.crearMarcadorEspecial(inicio, 'INICIO', '#10b981');
        this.crearMarcadorEspecial(fin, 'FIN', '#EF4444');
        
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

  // ========== CALLES EXTERNAS ==========
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
          this.toastService.showToast('No hay calles disponibles', 'warning', 3000);
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
    this.toastService.showToast('Calles ocultadas', 'info', 2000);
  }

  abrirModalGuardar() {
    if (this.rutaGeometria.length === 0) {
      this.toastService.showToast('Debes trazar una ruta primero', 'warning', 3000);
      return;
    }
    this.modalGuardarAbierto.set(true);
  }

  cerrarModalGuardar() {
    this.modalGuardarAbierto.set(false);
    this.nuevaRutaForm = { nombre: '' };
  }

  confirmarGuardarRuta() {
    if (!this.nuevaRutaForm.nombre.trim()) {
      this.toastService.showToast('Escribe un nombre', 'warning', 3000);
      return;
    }

    const rutaPayload = {
      nombre_ruta: this.nuevaRutaForm.nombre,
      shape: JSON.stringify({
        type: 'LineString',
        coordinates: this.rutaGeometria
      })
    };

    this.apiService.crearRuta(rutaPayload).subscribe({
      next: () => {
        this.toastService.showToast('Ruta guardada correctamente', 'success', 3000);
        this.cerrarModalGuardar();
        this.limpiarMapa();
        
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
        
        this.crearMarcadorEspecial(coordinates[0], 'INICIO', '#10b981');
        this.crearMarcadorEspecial(coordinates[coordinates.length - 1], 'FIN', '#EF4444');

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
    
    // Redimensionar mapa después de la transición
    setTimeout(() => {
      if (this.map) {
        this.map.resize();
      }
    }, 350);
  }
}