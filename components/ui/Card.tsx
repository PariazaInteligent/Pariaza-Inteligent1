import React from 'react';
import { useTheme } from '../../contexts/ThemeContext'; // Import useTheme
import { InterfaceDensity } from '../../types'; // Import InterfaceDensity

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  bodyClassName?: string;
  footerContent?: React.ReactNode;
  icon?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', titleClassName = '', bodyClassName = '', footerContent, icon }) => {
  const { interfaceDensity } = useTheme(); // Get interfaceDensity

  const paddingClass = interfaceDensity === InterfaceDensity.COMPACT ? 'p-3' : 'p-5';
  const titlePaddingClass = interfaceDensity === InterfaceDensity.COMPACT ? 'p-3' : 'p-5';
  const footerPaddingClass = interfaceDensity === InterfaceDensity.COMPACT ? 'p-3' : 'p-5';

  return (
    <div className={`bg-white dark:bg-neutral-800 shadow-xl rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl ${className}`}>
      {(title || icon) && (
        <div className={`${titlePaddingClass} border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between ${titleClassName} transition-colors duration-300`}>
          <div className="flex items-center">
            {icon && <span className="mr-3 text-primary-500 dark:text-primary-400">{icon}</span>}
            {title && <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>}
          </div>
        </div>
      )}
      <div className={`${paddingClass} ${bodyClassName}`}>
        {children}
      </div>
      {footerContent && (
        <div className={`${footerPaddingClass} border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 transition-colors duration-300`}>
          {footerContent}
        </div>
      )}
    </div>
  );
};

export default Card;