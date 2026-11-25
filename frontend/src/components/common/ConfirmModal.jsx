import { FiAlertTriangle, FiX } from 'react-icons/fi';
import Button from './Button';

const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="kv-modal-backdrop" role="dialog" aria-modal="true">
      <div className="kv-modal">
        <div className="kv-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FiAlertTriangle size={20} color="var(--kv-warning)" />
            <h3 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h3>
          </div>
          <button
            type="button"
            className="kv-btn-ghost"
            style={{ border: 'none', padding: 4, borderRadius: 6 }}
            onClick={onCancel}
            aria-label="Close modal"
          >
            <FiX size={18} />
          </button>
        </div>
        <p style={{ fontSize: 14, color: 'var(--kv-text-secondary)' }}>{message}</p>
        <div className="kv-modal-footer">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
