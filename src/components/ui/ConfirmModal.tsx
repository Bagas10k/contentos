// src/components/ui/ConfirmModal.tsx
import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  singleButton?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Hapus',
  cancelText = 'Batal',
  type = 'danger',
  onConfirm,
  onCancel,
  singleButton = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colorMap = {
    danger:  '#FF3B30',
    warning: '#FF9500',
    info:    '#007AFF',
  };

  const IconMap = {
    danger:  AlertTriangle,
    warning: AlertTriangle,
    info:    HelpCircle,
  };

  const Icon = IconMap[type];
  const accentColor = colorMap[type];

  return createPortal(
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 9999 }}>
      <div 
        className="modal" 
        style={{ maxWidth: 360, borderRadius: 16, overflow: 'hidden' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-body flex flex-col items-center text-center p-6 gap-4">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: `${accentColor}14`, color: accentColor }}
          >
            <Icon size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold mb-1.5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              {title}
            </h3>
            <p className="text-xs px-2" style={{ color: 'var(--text-tertiary)', lineHeight: '1.4' }}>
              {message}
            </p>
          </div>
        </div>
        <div className="modal-footer p-4 pt-0 flex gap-2">
          {!singleButton && (
            <button 
              className="btn btn-secondary flex-1 justify-center py-2" 
              onClick={onCancel}
              style={{ borderRadius: 10, fontWeight: 600 }}
            >
              {cancelText}
            </button>
          )}
          <button 
            className="btn flex-1 justify-center py-2 text-white" 
            style={{ 
              background: accentColor, 
              borderRadius: 10,
              fontWeight: 600,
              boxShadow: type === 'danger' ? '0 2px 6px rgba(255,59,48,0.2)' : 'none'
            }}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
