
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext'; // Import useTheme

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const { currentAccentBaseColor, theme: currentTheme } = useTheme(); // Get accent color and current theme

  const baseStyle = "font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-150 ease-in-out flex items-center justify-center";
  
  // Define base variant styles, then conditionally override for accent
  let variantStyle = '';
  switch (variant) {
    case 'primary':
      variantStyle = `bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500 disabled:bg-primary-300`;
      break;
    case 'secondary': // This will be the main target for accent color
      variantStyle = `bg-${currentAccentBaseColor}-500 hover:bg-${currentAccentBaseColor}-600 text-white focus:ring-${currentAccentBaseColor}-400 disabled:bg-${currentAccentBaseColor}-300`;
      break;
    case 'danger':
      variantStyle = 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 disabled:bg-red-300';
      break;
    case 'ghost':
      variantStyle = 'bg-transparent hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 focus:ring-neutral-500 disabled:opacity-50';
      break;
    case 'outline': // This will also use accent color
      // For dark theme, text color might need adjustment if accent is too light
      const outlineTextColor = currentTheme === 'dark' && (currentAccentBaseColor === 'amber' || currentAccentBaseColor === 'yellow') 
                               ? `text-${currentAccentBaseColor}-300` 
                               : `text-${currentAccentBaseColor}-600 dark:text-${currentAccentBaseColor}-400`;
      variantStyle = `bg-transparent border border-${currentAccentBaseColor}-500 ${outlineTextColor} hover:bg-${currentAccentBaseColor}-50 dark:hover:bg-${currentAccentBaseColor}-900/30 focus:ring-${currentAccentBaseColor}-500 disabled:opacity-50 disabled:border-neutral-300 disabled:text-neutral-400`;
      break;
    default:
      variantStyle = `bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500 disabled:bg-primary-300`;
  }


  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const combinedClassName = `${baseStyle} ${variantStyle} ${sizeStyles[size]} ${className} ${disabled || isLoading ? 'cursor-not-allowed opacity-70' : ''}`;

  return (
    <button className={combinedClassName} disabled={disabled || isLoading} {...props}>
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {leftIcon && !isLoading && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && !isLoading && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button;
