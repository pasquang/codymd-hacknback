'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, WarningCircle, Info, Warning } from 'phosphor-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: WarningCircle,
  info: Info,
  warning: Warning,
};

const toastStyles = {
  success: 'border-green-500 bg-green-50 text-green-800',
  error: 'border-red-500 bg-red-50 text-red-800',
  info: 'border-blue-500 bg-blue-50 text-blue-800',
  warning: 'border-yellow-500 bg-yellow-50 text-yellow-800',
};

export function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const Icon = toastIcons[type];

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  return (
    <div
      className={`
        toast-container
        ${isVisible ? 'toast-enter' : ''}
        ${isLeaving ? 'toast-exit' : ''}
      `}
    >
      <div className={`toast ${toastStyles[type]}`}>
        <div className="flex items-start gap-3">
          <Icon size={20} weight="fill" className="mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{title}</h4>
            {message && (
              <p className="text-sm opacity-90 mt-1">{message}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded-md hover:bg-black hover:bg-opacity-10 transition-colors"
            aria-label="Close notification"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }: {
  toasts: Array<Omit<ToastProps, 'onClose'>>;
  onClose: (id: string) => void;
}) {
  return (
    <div className="toast-container-wrapper">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}