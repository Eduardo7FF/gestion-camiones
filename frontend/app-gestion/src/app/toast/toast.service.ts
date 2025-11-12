import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<ToastMessage[]>([]);

  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', duration = 3500) {
    const id = Date.now().toString();
    const toast: ToastMessage = { id, message, type, duration };
    
    // Solo muestra un toast a la vez
    this.toasts.set([toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, duration);
    }
  }

  removeToast(id: string) {
    this.toasts.update(toasts => toasts.filter(t => t.id !== id));
  }
}