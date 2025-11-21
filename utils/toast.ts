/**
 * Simple toast notification system
 * Replaces alert() calls with better UX
 */

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  duration?: number;
  position?: 'top' | 'bottom';
}

export const toast = {
  show: (message: string, type: ToastType = 'info', options: ToastOptions = {}) => {
    const { duration = 3000, position = 'top' } = options;

    // Create toast element
    const toastEl = document.createElement('div');
    toastEl.className = `fixed ${position === 'top' ? 'top-4' : 'bottom-4'} right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg border animate-fade-in-up`;

    // Style based on type
    const styles = {
      success: 'bg-green-900/90 border-green-500/50 text-green-100',
      error: 'bg-red-900/90 border-red-500/50 text-red-100',
      info: 'bg-blue-900/90 border-blue-500/50 text-blue-100',
      warning: 'bg-yellow-900/90 border-yellow-500/50 text-yellow-100'
    };

    toastEl.className += ` ${styles[type]}`;
    toastEl.textContent = message;

    document.body.appendChild(toastEl);

    // Auto remove
    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transition = 'opacity 0.3s';
      setTimeout(() => toastEl.remove(), 300);
    }, duration);
  },

  success: (message: string, options?: ToastOptions) => {
    toast.show(message, 'success', options);
  },

  error: (message: string, options?: ToastOptions) => {
    toast.show(message, 'error', options);
  },

  info: (message: string, options?: ToastOptions) => {
    toast.show(message, 'info', options);
  },

  warning: (message: string, options?: ToastOptions) => {
    toast.show(message, 'warning', options);
  }
};
