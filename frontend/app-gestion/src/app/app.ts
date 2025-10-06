import { Component, signal, HostListener } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App {
  showLogin = signal(false);
  isScrolled = signal(false);

  toggleLogin() {
    this.showLogin.set(!this.showLogin());
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled.set(window.scrollY > 100);
  }
}
