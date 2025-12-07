import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  template: `
    <div class="app">
      <app-toast #toastRef></app-toast>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app {
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }
  `]
})
export class App {
  // Este método no es necesario en Angular 17+, pero lo dejamos para compatibilidad
}