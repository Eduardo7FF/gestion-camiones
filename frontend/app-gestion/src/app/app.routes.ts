import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing';
import { DashboardComponent } from './dashboard/dashboard';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'dashboard/camiones', component: DashboardComponent },
  { path: 'dashboard/reportes', component: DashboardComponent },
  { path: 'dashboard/mapa', component: DashboardComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];
