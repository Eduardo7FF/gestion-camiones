import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { ToastrModule } from 'ngx-toastr';

export const appConfig: ApplicationConfig = {
  providers: [
    // 1. Rutas
    provideRouter(routes),
    
    // 2. Animaciones (Necesario para Toastr y Material)
    provideAnimations(), 
    
    // 3. Módulos antiguos importados
    importProvidersFrom(
      FormsModule,
      // Configuración de tus alertas
      ToastrModule.forRoot({
        positionClass: 'toast-top-right',
        timeOut: 3000,
        progressBar: true,
        progressAnimation: 'increasing',
        closeButton: true,
        preventDuplicates: true
      })
    ),
    
    // 4. Cliente HTTP Optimizado (Clave para conectar con NestJS/Supabase)
    provideHttpClient(withFetch()) 
  ]
};