/* eslint-disable react-refresh/only-export-components */
import { useState, createContext, useContext, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, options = {}) => {
    // Backward compat: addToast(msg, type) still works
    const opts = typeof options === 'string'
      ? { type: options }
      : options;
    const {
      type = 'info',
      duration = 4000,
      action = null, // { label, onClick }
    } = opts;
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, action, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, opts) => addToast(msg, { ...opts, type: 'success' }),
    error: (msg, opts) => addToast(msg, { ...opts, type: 'error' }),
    info: (msg, opts) => addToast(msg, { ...opts, type: 'info' }),
    warning: (msg, opts) => addToast(msg, { ...opts, type: 'warning' }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="toast toast-top toast-center z-50"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map(t => (
          <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function Toast({ message, type, onClose, action }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
  };

  const alertClass = {
    success: 'alert-success',
    error: 'alert-error',
    info: 'alert-info',
    warning: 'alert-warning',
  };

  const handleAction = () => {
    if (action?.onClick) action.onClick();
    onClose();
  };

  return (
    <div
      className={`alert ${alertClass[type]} shadow-lg`}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      {icons[type]}
      <span>{message}</span>
      {action && (
        <button
          onClick={handleAction}
          className="btn btn-ghost btn-xs font-semibold uppercase tracking-wide"
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}
      <button
        onClick={onClose}
        className="btn btn-ghost btn-xs"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default Toast;
