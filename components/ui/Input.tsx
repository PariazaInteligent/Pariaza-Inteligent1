import React, {useState} from 'react';
import { EyeIcon, EyeSlashIcon } from './Icons'; 
import { useTheme } from '../../contexts/ThemeContext'; // Import useTheme
import { InterfaceDensity } from '../../types'; // Import InterfaceDensity

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
  showPasswordToggle?: boolean;
}

const Input: React.FC<InputProps> = ({ label, name, error, className = '', containerClassName = '', type, showPasswordToggle, ...props }) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { interfaceDensity } = useTheme(); // Get interfaceDensity
  
  const paddingClass = interfaceDensity === InterfaceDensity.COMPACT ? 'px-3 py-2' : 'px-4 py-2.5';
  const baseStyle = `block w-full ${paddingClass} rounded-lg shadow-sm focus:outline-none focus:ring-2 appearance-none`;
  const themeStyle = "bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-300";
  const errorStyleInput = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-neutral-300 dark:border-neutral-600 focus:ring-primary-500 focus:border-primary-500";
  const inputType = showPasswordToggle && type === 'password' ? (isPasswordVisible ? 'text' : 'password') : type;

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={name}
          name={name}
          type={inputType}
          className={`${baseStyle} ${themeStyle} ${errorStyleInput} ${className} ${showPasswordToggle && type === 'password' ? 'pr-10' : ''}`}
          {...props}
        />
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            aria-label={isPasswordVisible ? "Ascunde parola" : "Arată parola"}
          >
            {isPasswordVisible ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        )}
      </div>
      {(error || props.maxLength) && (
        <div className="flex justify-between items-start mt-1">
          {error && <p className="text-xs text-red-500 flex-grow pr-2">{error}</p>}
          {props.maxLength && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 ml-auto">
              {String(props.value || '').length} / {props.maxLength}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Input;

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, name, error, className = '', containerClassName = '', ...props }) => {
  const { interfaceDensity } = useTheme(); // Get interfaceDensity
  const paddingClass = interfaceDensity === InterfaceDensity.COMPACT ? 'px-3 py-2' : 'px-4 py-2.5';
  const baseStyle = `block w-full ${paddingClass} rounded-lg shadow-sm focus:outline-none focus:ring-2 appearance-none`;
  const themeStyle = "bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-300";
  const errorStyle = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : "border-neutral-300 dark:border-neutral-600 focus:ring-primary-500 focus:border-primary-500";

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
          {label}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        className={`${baseStyle} ${themeStyle} ${errorStyle} ${className}`}
        rows={4}
        {...props}
      />
      {(error || props.maxLength) && (
        <div className="flex justify-between items-start mt-1">
          {error && <p className="text-xs text-red-500 flex-grow pr-2">{error}</p>}
          {props.maxLength && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 ml-auto">
              {String(props.value || '').length} / {props.maxLength}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
