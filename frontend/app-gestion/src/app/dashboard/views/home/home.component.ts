import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../toast/toast.service';

interface StatCard {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: string;
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  main: string; // Clear, Clouds, Rain, etc.
  icon: string;
  sunrise: number;
  sunset: number;
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
  private http = inject(HttpClient);

  loading = signal(true);
  stats = signal<StatCard[]>([]);
  weather = signal<WeatherData | null>(null);
  loadingWeather = signal(true);
  currentDay = signal('');

  private readonly WEATHER_API_KEY = 'e80d2a63e53d157428a22f9bde6c4ee1';
  private readonly CITY = 'Buenaventura,CO';

  ngOnInit() {
    this.loadStats();
    this.loadWeather();
    this.setCurrentDay();
  }

  setCurrentDay() {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const today = new Date().getDay();
    this.currentDay.set(days[today]);
  }

  loadStats() {
    this.loading.set(true);

    this.apiService.getVehiculos().subscribe({
      next: (vehiculos) => {
        const totalVehiculos = Array.isArray(vehiculos) ? vehiculos.length : 0;
        const activos = Array.isArray(vehiculos) ? vehiculos.filter((v: any) => v.activo).length : 0;
        const inactivos = totalVehiculos - activos;

        this.apiService.getRutas().subscribe({
          next: (rutas) => {
            const totalRutas = Array.isArray(rutas) ? rutas.length : 0;

            this.stats.set([
              {
                title: 'Total Vehículos',
                value: totalVehiculos.toString(),
                subtitle: `${activos} ACTIVOS · ${inactivos} INACTIVOS`,
                icon: 'vehiculo',
                color: '#10B981'
              },
              {
                title: 'Rutas Creadas',
                value: totalRutas.toString(),
                subtitle: 'RUTAS DISPONIBLES EN EL SISTEMA',
                icon: 'M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z',
                color: '#10B981'
              },
              {
                title: 'Calles Disponibles',
                value: '985',
                subtitle: 'CALLES VÍA API EXTERNA',
                icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                color: '#F59E0B'
              }
            ]);

            this.loading.set(false);
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

  loadWeather() {
    this.loadingWeather.set(true);
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${this.CITY}&appid=${this.WEATHER_API_KEY}&units=metric&lang=es`;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        this.weather.set({
          temp: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          humidity: data.main.humidity,
          windSpeed: Math.round(data.wind.speed * 3.6), // m/s a km/h
          description: data.weather[0].description,
          main: data.weather[0].main,
          icon: data.weather[0].icon,
          sunrise: data.sys.sunrise,
          sunset: data.sys.sunset
        });
        this.loadingWeather.set(false);
      },
      error: () => {
        this.loadingWeather.set(false);
      }
    });
  }

  getWeatherIcon(main: string, icon: string): string {
    const isNight = icon.includes('n');
    
    switch(main.toLowerCase()) {
      case 'clear':
        return isNight ? 'moon' : 'sun';
      case 'clouds':
        return 'clouds';
      case 'rain':
      case 'drizzle':
        return 'rain';
      case 'thunderstorm':
        return 'storm';
      case 'snow':
        return 'snow';
      case 'mist':
      case 'fog':
        return 'fog';
      default:
        return 'sun';
    }
  }

  isNight(): boolean {
    const weather = this.weather();
    if (!weather) return false;
    
    const now = Math.floor(Date.now() / 1000);
    return now < weather.sunrise || now > weather.sunset;
  }
}