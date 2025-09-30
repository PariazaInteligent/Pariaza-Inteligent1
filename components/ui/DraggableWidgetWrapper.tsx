
import React from 'react';
import { DashboardWidgetType } from '../../types';
import { UI_TEXT_ROMANIAN } from '../../constants';
import { EyeIcon, EyeSlashIcon, Bars3Icon } from './Icons'; // Assuming Bars3Icon for drag handle

interface DraggableWidgetWrapperProps {
  id: DashboardWidgetType;
  children: React.ReactNode;
  isCustomizing: boolean;
  isVisible: boolean;
  onVisibilityToggle: (id: DashboardWidgetType) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: DashboardWidgetType) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetId: DashboardWidgetType) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  className?: string;
}

const DraggableWidgetWrapper: React.FC<DraggableWidgetWrapperProps> = ({
  id,
  children,
  isCustomizing,
  isVisible,
  onVisibilityToggle,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  className = '',
}) => {
  if (!isVisible && !isCustomizing) {
    return null; // Don't render if not visible and not customizing
  }

  return (
    <div
      id={`widget-${id}`}
      draggable={isCustomizing}
      onDragStart={(e) => isCustomizing && onDragStart(e, id)}
      onDragOver={(e) => isCustomizing && onDragOver(e)}
      onDrop={(e) => isCustomizing && onDrop(e, id)}
      onDragEnd={(e) => isCustomizing && onDragEnd(e)}
      className={`relative transition-all duration-300 ease-in-out 
                  ${isCustomizing ? 'border-2 border-dashed border-primary-500 dark:border-primary-400 p-1 rounded-lg mb-2' : ''} 
                  ${!isVisible && isCustomizing ? 'opacity-50 bg-neutral-200 dark:bg-neutral-700' : ''}
                  ${className}`}
      aria-dropeffect={isCustomizing ? "move" : "none"}
    >
      {isCustomizing && (
        <div className="absolute top-0 right-0 flex items-center space-x-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-bl-md shadow z-10">
          <button
            onClick={() => onVisibilityToggle(id)}
            className="p-1 text-neutral-600 dark:text-neutral-300 hover:text-primary-500 dark:hover:text-primary-400"
            title={UI_TEXT_ROMANIAN.toggleWidgetVisibility}
            aria-pressed={isVisible}
          >
            {isVisible ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
          </button>
          <button
            className="p-1 text-neutral-600 dark:text-neutral-300 cursor-move"
            title={UI_TEXT_ROMANIAN.widgetDragHandle}
            aria-grabbed={false} // This could be dynamically set if needed
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
        </div>
      )}
      <div className={!isVisible && isCustomizing ? 'pointer-events-none' : ''}>
        {children}
      </div>
    </div>
  );
};

export default DraggableWidgetWrapper;
