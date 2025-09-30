
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { AccentPaletteKey, InterfaceDensity, User } from '../types'; // Added AccentPaletteKey, InterfaceDensity
import { ACCENT_COLOR_PALETTES, INTERFACE_DENSITY_OPTIONS } from '../constants'; // For default values
import { useAuth } from './AuthContext';
import { useData } from './DataContext';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isForced: boolean;
  accentPalette: AccentPaletteKey;
  setAccentPalette: (palette: AccentPaletteKey) => void;
  interfaceDensity: InterfaceDensity;
  setInterfaceDensity: (density: InterfaceDensity) => void;
  currentAccentBaseColor: string; // e.g., 'primary', 'emerald'
}

interface ThemeProviderProps {
  children: ReactNode;
  forcedTheme?: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, forcedTheme }) => {
  const { user: authUser } = useAuth();
  const { appData } = useData();

  const getDefaultAccentPalette = (): AccentPaletteKey => {
    const storedAccent = localStorage.getItem('accentPalette') as AccentPaletteKey | null;
    return storedAccent || 'DEFAULT_BLUE';
  };

  const getDefaultInterfaceDensity = (): InterfaceDensity => {
    const storedDensity = localStorage.getItem('interfaceDensity') as InterfaceDensity | null;
    return storedDensity || InterfaceDensity.COMFORTABLE;
  };

  const [internalTheme, setInternalTheme] = useState<'light' | 'dark'>(() => {
    if (forcedTheme) return forcedTheme;
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    return storedTheme || 'dark'; // Default to dark
  });

  const [accentPalette, setAccentPaletteState] = useState<AccentPaletteKey>(getDefaultAccentPalette());
  const [interfaceDensity, setInterfaceDensityState] = useState<InterfaceDensity>(getDefaultInterfaceDensity());

  // Effect to update document class (dark/light) and data-density attribute
  useEffect(() => {
    const themeToApply = forcedTheme || internalTheme;
    if (themeToApply === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    if (!forcedTheme) {
      localStorage.setItem('theme', themeToApply);
    }

    document.documentElement.dataset.density = interfaceDensity;
    localStorage.setItem('interfaceDensity', interfaceDensity);
    localStorage.setItem('accentPalette', accentPalette);

  }, [internalTheme, forcedTheme, accentPalette, interfaceDensity]);

  // Effect to react to changes in forcedTheme prop
  useEffect(() => {
    if (forcedTheme && forcedTheme !== internalTheme) {
      setInternalTheme(forcedTheme);
    } else if (!forcedTheme) {
      const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      const fallbackTheme = storedTheme || 'dark';
      if (internalTheme !== fallbackTheme) {
        setInternalTheme(fallbackTheme);
      }
    }
  }, [forcedTheme, internalTheme]);
  
  // Effect to load user preferences when authenticated user's data is available
  useEffect(() => {
    if (authUser && appData?.users) {
      const currentUserData = appData.users.find(u => u.id === authUser.id);
      if (currentUserData?.profileData) {
        const userAccent = currentUserData.profileData.accentPalette;
        const userDensity = currentUserData.profileData.interfaceDensity;

        if (userAccent && userAccent !== accentPalette) {
          setAccentPaletteState(userAccent);
          // localStorage.setItem('accentPalette', userAccent); // Already handled by main effect
        } else if (!userAccent && localStorage.getItem('accentPalette') === null) {
           setAccentPaletteState('DEFAULT_BLUE');
          //  localStorage.setItem('accentPalette', 'DEFAULT_BLUE');
        }


        if (userDensity && userDensity !== interfaceDensity) {
          setInterfaceDensityState(userDensity);
          // localStorage.setItem('interfaceDensity', userDensity); // Already handled by main effect
        } else if (!userDensity && localStorage.getItem('interfaceDensity') === null) {
            setInterfaceDensityState(InterfaceDensity.COMFORTABLE);
            // localStorage.setItem('interfaceDensity', InterfaceDensity.COMFORTABLE);
        }
      }
    } else if (!authUser) { // Reset to localStorage/defaults on logout
        setAccentPaletteState(getDefaultAccentPalette());
        setInterfaceDensityState(getDefaultInterfaceDensity());
    }
  // Key Change: Removed accentPalette and interfaceDensity from deps to avoid re-running when this effect itself sets them.
  // The effect should run when authUser or appData.users (the source of preferences) changes.
  }, [authUser, appData?.users]);


  const toggleTheme = () => {
    if (forcedTheme) return;
    setInternalTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const setAccentPalette = (palette: AccentPaletteKey) => {
    setAccentPaletteState(palette);
    // localStorage.setItem('accentPalette', palette); // Already handled by main effect
  };

  const setInterfaceDensity = (density: InterfaceDensity) => {
    setInterfaceDensityState(density);
    // localStorage.setItem('interfaceDensity', density); // Already handled by main effect
  };
  
  const currentAccentBaseColor = ACCENT_COLOR_PALETTES[accentPalette]?.baseColor || ACCENT_COLOR_PALETTES.DEFAULT_BLUE.baseColor;

  return (
    <ThemeContext.Provider value={{ 
      theme: forcedTheme || internalTheme, 
      toggleTheme, 
      isForced: !!forcedTheme,
      accentPalette,
      setAccentPalette,
      interfaceDensity,
      setInterfaceDensity,
      currentAccentBaseColor
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
