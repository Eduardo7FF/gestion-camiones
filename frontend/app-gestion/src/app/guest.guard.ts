import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const guestGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isLoggedIn = await authService.isLoggedIn();

  if (!isLoggedIn) {
    // Si NO está logueado, puede ver login/register
    return true;
  } else {
    // Si YA está logueado, redirigir al dashboard
    router.navigate(['/dashboard/home']);
    return false;
  }
};