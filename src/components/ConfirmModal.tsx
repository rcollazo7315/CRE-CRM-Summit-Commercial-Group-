import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  requireTextConfirmation?: boolean;
  textConfirmationWord?: string;
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  requireTextConfirmation = false,
  textConfirmationWord = 'DELETE',
  isLoading = false
}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmDisabled = requireTextConfirmation && inputValue !== textConfirmationWord;

  const variantStyles = {
    danger: {
      icon: <Trash2 size={24} />,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonBg: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: <AlertTriangle size={24} />,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      buttonBg: 'bg-amber-600 hover:bg-amber-700',
    },
    info: {
      icon: <AlertTriangle size={24} />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const styles = variantStyles[variant];

  const handleConfirm = () => {
    if (!isConfirmDisabled && !isLoading) {
      onConfirm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isConfirmDisabled && !isLoading) {
      handleConfirm();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${styles.iconBg} ${styles.iconColor} flex items-center justify-center`}>
              {styles.icon}
            </div>
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition-colors"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-slate-600 whitespace-pre-line">{message}</p>
          
          {requireTextConfirmation && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type <span className="font-bold text-red-600">{textConfirmationWord}</span> to confirm:
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none font-mono"
                placeholder={textConfirmationWord}
                autoFocus
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled || isLoading}
            className={`px-5 py-2.5 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${styles.buttonBg}`}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;