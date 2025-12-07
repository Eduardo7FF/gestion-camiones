import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../toast/toast.service';

interface StatCard {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: string;
  color: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private apiService = inject(ApiService);
  private toastService = inject(ToastService);

  loading = signal(true);
  stats = signal<StatCard[]>([]);

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.loading.set(true);

    this.apiService.getVehiculos().subscribe({
      next: (vehiculos) => {
        const totalVehiculos = Array.isArray(vehiculos) ? vehiculos.length : 0;
        const activos = Array.isArray(vehiculos) ? vehiculos.filter((v: any) => v.activo).length : 0;

        this.apiService.getRutas().subscribe({
          next: (rutas) => {
            const totalRutas = Array.isArray(rutas) ? rutas.length : 0;

            this.apiService.getMisRecorridos().subscribe({
              next: (recorridos) => {
                const totalRecorridos = Array.isArray(recorridos) ? recorridos.length : 0;

                this.stats.set([
                  {
                    title: 'Total Vehículos',
                    value: totalVehiculos.toString(),
                    change: `${activos} activos`,
                    changeType: 'positive',
                    icon: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
                    color: '#3B82F6'
                  },
                  {
                    title: 'Rutas Creadas',
                    value: totalRutas.toString(),
                    icon: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z',
                    color: '#10B981'
                  },
                  {
                    title: 'Recorridos',
                    value: totalRecorridos.toString(),
                    icon: 'M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z',
                    color: '#8B5CF6'
                  },
                  {
                    title: 'Calles Disponibles',
                    value: '985',
                    change: 'API Externa',
                    changeType: 'positive',
                    icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                    color: '#F59E0B'
                  }
                ]);

                this.loading.set(false);
              },
              error: () => {
                // Si falla recorridos, igual mostramos las otras estadísticas
                this.stats.set([
                  {
                    title: 'Total Vehículos',
                    value: totalVehiculos.toString(),
                    change: `${activos} activos`,
                    changeType: 'positive',
                    icon: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
                    color: '#3B82F6'
                  },
                  {
                    title: 'Rutas Creadas',
                    value: totalRutas.toString(),
                    icon: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z',
                    color: '#10B981'
                  },
                  {
                    title: 'Recorridos',
                    value: '0',
                    icon: 'M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z',
                    color: '#8B5CF6'
                  },
                  {
                    title: 'Calles Disponibles',
                    value: '985',
                    change: 'API Externa',
                    changeType: 'positive',
                    icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                    color: '#F59E0B'
                  }
                ]);
                this.loading.set(false);
              }
            });
          },
          error: () => {
            this.toastService.showToast('Error al cargar estadísticas', 'error', 3000);
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.toastService.showToast('Error al cargar estadísticas', 'error', 3000);
        this.loading.set(false);
      }
    });
  }
}