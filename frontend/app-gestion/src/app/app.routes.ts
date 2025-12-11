import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component'; 
import { DashboardComponent } from './dashboard/dashboard.component';
import { HomeComponent } from './dashboard/views/home/home.component';
import { VehiculosViewComponent } from './dashboard/views/vehiculos-view/vehiculos-view.component';
import { MapaViewComponent } from './dashboard/views/mapa-view/mapa-view.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LandingComponent },
  { path: 'register', component: LandingComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'vehiculos', component: VehiculosViewComponent },
      { path: 'mapa', component: MapaViewComponent }
    ]
  },
  { path: '**', redirectTo: 'login', pathMatch: 'full' }
];