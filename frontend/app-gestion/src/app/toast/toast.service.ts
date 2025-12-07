import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<ToastMessage[]>([]);
  private idCounter = 0;

  showToast(message: string, type: ToastType = 'info', duration: number = 3000) {
    const id = this.idCounter++;
    const toast: ToastMessage = { id, message, type, duration };
    
    this.toasts.update(current => [...current, toast]);

    setTimeout(() => {
      this.removeToast(id);
    }, duration);
  }

  removeToast(id: number) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

  
  success(message: string, duration: number = 3000) {
    this.showToast(message, 'success', duration);
  }

  error(message: string, duration: number = 3000) {
    this.showToast(message, 'error', duration);
  }

  warning(message: string, duration: number = 3000) {
    this.showToast(message, 'warning', duration);
  }

  info(message: string, duration: number = 3000) {
    this.showToast(message, 'info', duration);
  }
}