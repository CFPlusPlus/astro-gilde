import type { Qs } from './dom';

export type ToastVariant = 'default' | 'error';
export type ShowToast = (message: unknown, variant?: ToastVariant) => void;

export interface ToastController {
  showToast: ShowToast;
}

export const initToast = (query: Qs): ToastController => {
  const toastEl = query<HTMLElement>('#toast');
  let toastTimer: number | null = null;

  const showToast: ShowToast = (message, variant = 'default') => {
    if (!toastEl) return;
    if (toastTimer != null) window.clearTimeout(toastTimer);

    toastEl.classList.remove('hidden');
    toastEl.replaceChildren();

    const card = document.createElement('div');
    card.className = `pointer-events-auto mg-card mg-card--glass px-4 py-3 ${
      variant === 'error' ? 'border-accent/30 bg-accent/10' : ''
    }`.trim();
    card.setAttribute('role', 'status');

    const text = document.createElement('p');
    text.className = 'text-sm text-fg/90';
    text.textContent = String(message);

    card.appendChild(text);
    toastEl.appendChild(card);

    toastTimer = window.setTimeout(() => {
      toastEl.classList.add('hidden');
      toastEl.replaceChildren();
    }, 2200);
  };

  return { showToast };
};
