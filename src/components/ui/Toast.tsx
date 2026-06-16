// src/components/ui/Toast.tsx
import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let addToastFn: ((msg: string, type?: ToastType) => void) | null = null;

export const toast = {
  success: (msg: string) => addToastFn?.(msg, 'success'),
  error:   (msg: string) => addToastFn?.(msg, 'error'),
  warning: (msg: string) => addToastFn?.(msg, 'warning'),
  info:    (msg: string) => addToastFn?.(msg, 'info'),
  show:    (msg: string, type: ToastType = 'info') => addToastFn?.(msg, type),
};

const icons = {
  success: CheckCircle,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToastFn = (message, type = 'info') => {
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };
    return () => { addToastFn = null; };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className={`toast-pulse-${t.type}`} />
            <Icon size={14} className={`toast-icon-${t.type}`} />
            <span className="toast-message">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
