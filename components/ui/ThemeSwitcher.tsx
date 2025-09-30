import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { UI_TEXT_ROMANIAN } from '../../constants';

// FIX: Add type definitions for the View Transitions API to prevent TypeScript errors.
// This is a new browser API and may not be in all standard TS lib versions.
interface ViewTransition {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
}

interface DocumentWithViewTransition extends Document {
  startViewTransition(updateCallback: () => Promise<void> | void): ViewTransition;
}

const ThemeSwitcher: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Check for View Transitions API support
    if (!(document as DocumentWithViewTransition).startViewTransition) {
      toggleTheme();
      return;
    }

    // Get the toggle button's center coordinates for the reveal animation
    const toggleElement = event.currentTarget.parentElement; // The <label> element
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    if (toggleElement) {
        const rect = toggleElement.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
    }

    document.documentElement.style.setProperty('--x', `${x}px`);
    document.documentElement.style.setProperty('--y', `${y}px`);

    // Start the transition
    (document as DocumentWithViewTransition).startViewTransition(() => {
      toggleTheme();
    });
  };

  return (
    <label
      className="animated-theme-toggle"
      title={theme === 'dark' ? UI_TEXT_ROMANIAN.lightMode : UI_TEXT_ROMANIAN.darkMode}
      // Make the label focusable for accessibility. The default browser behavior
      // will forward Space key presses to the input, triggering onChange.
      tabIndex={0}
      onKeyDown={(e) => {
        // Trigger click on Enter key for better accessibility, as labels don't do this by default.
        if (e.key === 'Enter') {
          (e.currentTarget.querySelector('input') as HTMLInputElement)?.click();
           e.preventDefault();
        }
      }}
    >
      <input
        type="checkbox"
        checked={theme === 'dark'}
        onChange={handleThemeChange}
        aria-label={theme === 'dark' ? UI_TEXT_ROMANIAN.lightMode : UI_TEXT_ROMANIAN.darkMode}
        tabIndex={-1} // The input itself is not focusable, the label is.
      />
      <div />
    </label>
  );
};

export default ThemeSwitcher;