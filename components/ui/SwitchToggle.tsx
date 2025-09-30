
import React from 'react';

interface SwitchToggleProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const SwitchToggle: React.FC<SwitchToggleProps> = ({ id, label, description, checked, onChange, disabled = false }) => {
  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  // Base classes for the switch
  const switchBase = `relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`;
  const switchChecked = checked ? 'bg-green-500 dark:bg-green-600' : 'bg-red-500 dark:bg-red-600';
  const knobBase = 'inline-block w-4 h-4 transform bg-white rounded-full transition-transform';
  const knobChecked = checked ? 'translate-x-6' : 'translate-x-1';

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-grow">
        <label htmlFor={id} className={`block text-sm font-medium ${disabled ? 'text-neutral-400 dark:text-neutral-500' : 'text-neutral-700 dark:text-neutral-200'}`}>
          {label}
        </label>
        {description && <p className="text-xs text-neutral-500 dark:text-neutral-400">{description}</p>}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        disabled={disabled}
        className={`${switchBase} ${switchChecked}`}
      >
        <span className="sr-only">{label}</span>
        <span className={`${knobBase} ${knobChecked}`} />
      </button>
    </div>
  );
};

export default SwitchToggle;
