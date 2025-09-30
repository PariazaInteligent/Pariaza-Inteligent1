import React from 'react';

interface ScrollIndicatorProps {
  isVisible: boolean;
}

const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({ isVisible }) => {
  return (
    <div
      className={`scroll-indicator-container ${!isVisible ? 'fade-out' : ''}`}
      aria-hidden={!isVisible}
    >
      <div className="scroll-mouse">
        <div className="scroll-wheel"></div>
      </div>
    </div>
  );
};

export default ScrollIndicator;