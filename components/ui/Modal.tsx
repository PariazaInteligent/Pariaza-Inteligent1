import React from 'react';
import Button from './Button';
import { XMarkIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'screen75';
}

const sizeClasses = {
  sm: 'max-w-sm max-h-[90vh]',
  md: 'max-w-md max-h-[90vh]',
  lg: 'max-w-lg max-h-[90vh]',
  xl: 'max-w-xl max-h-[90vh]',
  screen75: 'w-11/12 md:w-3/4 h-auto md:h-3/4 max-h-[90vh]',
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footerContent, size = 'md' }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in"
      onClick={onClose} // Close on backdrop click
    >
      <div 
        className={`w-full ${sizeClasses[size]} rounded-2xl bg-white dark:bg-neutral-800 shadow-xl p-6 transition-colors duration-300 flex flex-col`}
        onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside it
      >
        <div className="flex-shrink-0 flex justify-between items-center border-b pb-2 border-neutral-200 dark:border-neutral-700 transition-colors duration-300">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
            aria-label="Închide"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-4 flex-grow overflow-y-auto pr-2 text-sm text-neutral-600 dark:text-neutral-300">
          {children}
        </div>

        {footerContent && (
          <div className="flex-shrink-0 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700 transition-colors duration-300">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmă",
  cancelText = "Anulează"
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-neutral-600 dark:text-neutral-300">{message}</p>
      <div className="mt-6 flex justify-end space-x-3">
        <Button variant="ghost" onClick={onClose}>
          {cancelText}
        </Button>
        <Button variant="danger" onClick={() => { onConfirm(); onClose(); }}>
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};