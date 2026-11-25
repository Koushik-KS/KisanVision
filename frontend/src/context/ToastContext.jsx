import { createContext, useCallback, useContext, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  const renderIcon = (type) => {
    if (type === 'success') return <FiCheckCircle size={18} color="var(--kv-success)" />;
    if (type === 'error') return <FiAlertCircle size={18} color="var(--kv-danger)" />;
    return <FiInfo size={18} color="var(--kv-info)" />;
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="kv-toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`kv-toast kv-toast-${toast.type}`}>
            {renderIcon(toast.type)}
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="kv-btn-ghost"
              style={{ border: 'none', padding: 2, display: 'inline-flex' }}
              aria-label="Dismiss notification"
            >
              <FiX size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
