import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isLoggedIn = await authService.isLoggedIn();

  if (isLoggedIn) {
    return true;
  } else {
    // Si no está logueado, redirigir a login
    router.navigate(['/login']);
    return false;
  }
};