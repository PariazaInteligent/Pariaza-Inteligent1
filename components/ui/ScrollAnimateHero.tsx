import React, { useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ScrollAnimateHeroProps {
  mainText: string;
  words: string[];
}

// Mapping from the theme's accent color name to a specific hex value for the CSS variable.
const accentColorHexMap: Record<string, string> = {
    primary: '#3b82f6', // default blue from Tailwind config
    emerald: '#10b981',
    indigo: '#6366f1',
    rose: '#f43f5e',
    amber: '#f59e0b',
};

const ScrollAnimateHero: React.FC<ScrollAnimateHeroProps> = ({ mainText, words }) => {
  const { currentAccentBaseColor } = useTheme();

  // Effect to set the accent color CSS variable for the gradient
  useEffect(() => {
    // Look up the hex color, fallback to primary blue
    const accentColor = accentColorHexMap[currentAccentBaseColor] || accentColorHexMap.primary;
    document.documentElement.style.setProperty('--scroll-hero-accent', accentColor);
    
    // Cleanup on unmount
    return () => {
      document.documentElement.style.removeProperty('--scroll-hero-accent');
    };
  }, [currentAccentBaseColor]);

  const containerStyle = {
    '--count': words.length,
  } as React.CSSProperties;

  return (
    // Using a div for semantic correctness in this context, styled as the main hero element.
    <div
      className="scroll-hero-container"
      style={containerStyle}
      role="region"
      aria-label="Introducere animată a capabilităților platformei"
    >
      <div className="scroll-hero-content">
        <h2>
          <span>{mainText}&nbsp;</span>
        </h2>
        <ul>
          {words.map((word, index) => (
            <li key={index}>{word}.</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ScrollAnimateHero;