import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast: boolean;
  reducedMotion: boolean;
  screenReaderMode: boolean;
  focusVisible: boolean;
  keyboardNavigation: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  lineSpacing: 'normal' | 'wide' | 'extra-wide';
  letterSpacing: 'normal' | 'wide' | 'extra-wide';
  dyslexicFont: boolean;
}

interface AccessibilityState {
  settings: AccessibilitySettings;
  isInitialized: boolean;
}

interface AccessibilityContextType extends AccessibilityState {
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  resetSettings: () => void;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  toggleScreenReaderMode: () => void;
  toggleFocusVisible: () => void;
  toggleKeyboardNavigation: () => void;
  toggleDyslexicFont: () => void;
  setFontSize: (size: AccessibilitySettings['fontSize']) => void;
  setColorBlindMode: (mode: AccessibilitySettings['colorBlindMode']) => void;
  setLineSpacing: (spacing: AccessibilitySettings['lineSpacing']) => void;
  setLetterSpacing: (spacing: AccessibilitySettings['letterSpacing']) => void;
}

type AccessibilityAction =
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AccessibilitySettings> }
  | { type: 'RESET_SETTINGS' }
  | { type: 'INITIALIZE'; payload: AccessibilitySettings };

const defaultSettings: AccessibilitySettings = {
  fontSize: 'medium',
  highContrast: false,
  reducedMotion: false,
  screenReaderMode: false,
  focusVisible: true,
  keyboardNavigation: false,
  colorBlindMode: 'none',
  lineSpacing: 'normal',
  letterSpacing: 'normal',
  dyslexicFont: false,
};

const initialState: AccessibilityState = {
  settings: defaultSettings,
  isInitialized: false,
};

const accessibilityReducer = (
  state: AccessibilityState,
  action: AccessibilityAction
): AccessibilityState => {
  switch (action.type) {
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };
    case 'RESET_SETTINGS':
      return {
        ...state,
        settings: defaultSettings,
      };
    case 'INITIALIZE':
      return {
        ...state,
        settings: action.payload,
        isInitialized: true,
      };
    default:
      return state;
  }
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(accessibilityReducer, initialState);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSettings = localStorage.getItem('accessibility-settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          dispatch({ type: 'INITIALIZE', payload: parsedSettings });
        } else {
          // Check for system preferences
          const systemPreferences = {
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            highContrast: window.matchMedia('(prefers-contrast: high)').matches,
          };
          
          const initialSettings = { ...defaultSettings, ...systemPreferences };
          dispatch({ type: 'INITIALIZE', payload: initialSettings });
        }
      } catch (error) {
        console.error('Failed to load accessibility settings:', error);
        dispatch({ type: 'INITIALIZE', payload: defaultSettings });
      }
    } else {
      dispatch({ type: 'INITIALIZE', payload: defaultSettings });
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (state.isInitialized && typeof window !== 'undefined') {
      try {
        localStorage.setItem('accessibility-settings', JSON.stringify(state.settings));
      } catch (error) {
        console.error('Failed to save accessibility settings:', error);
      }
    }
  }, [state.settings, state.isInitialized]);

  // Apply settings to document
  useEffect(() => {
    if (!state.isInitialized || typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const body = document.body;

    // Apply font size
    const fontSizeClasses = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
      'extra-large': 'text-xl',
    };
    
    // Remove all font size classes
    Object.values(fontSizeClasses).forEach(cls => {
      root.classList.remove(cls);
    });
    root.classList.add(fontSizeClasses[state.settings.fontSize]);

    // Apply high contrast
    if (state.settings.highContrast) {
      root.classList.add('high-contrast');
      body.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
      body.classList.remove('high-contrast');
    }

    // Apply reduced motion
    if (state.settings.reducedMotion) {
      root.classList.add('reduce-motion');
      body.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
      body.classList.remove('reduce-motion');
    }

    // Apply screen reader mode
    if (state.settings.screenReaderMode) {
      root.classList.add('screen-reader-mode');
      body.classList.add('screen-reader-mode');
    } else {
      root.classList.remove('screen-reader-mode');
      body.classList.remove('screen-reader-mode');
    }

    // Apply focus visible
    if (state.settings.focusVisible) {
      root.classList.add('focus-visible');
    } else {
      root.classList.remove('focus-visible');
    }

    // Apply keyboard navigation
    if (state.settings.keyboardNavigation) {
      root.classList.add('keyboard-nav');
      body.classList.add('keyboard-nav');
    } else {
      root.classList.remove('keyboard-nav');
      body.classList.remove('keyboard-nav');
    }

    // Apply color blind mode
    root.classList.remove('color-blind-protanopia', 'color-blind-deuteranopia', 'color-blind-tritanopia');
    if (state.settings.colorBlindMode !== 'none') {
      root.classList.add(`color-blind-${state.settings.colorBlindMode}`);
    }

    // Apply line spacing
    const lineSpacingClasses = {
      normal: 'leading-normal',
      wide: 'leading-relaxed',
      'extra-wide': 'leading-loose',
    };
    
    Object.values(lineSpacingClasses).forEach(cls => {
      body.classList.remove(cls);
    });
    body.classList.add(lineSpacingClasses[state.settings.lineSpacing]);

    // Apply letter spacing
    const letterSpacingClasses = {
      normal: 'tracking-normal',
      wide: 'tracking-wide',
      'extra-wide': 'tracking-wider',
    };
    
    Object.values(letterSpacingClasses).forEach(cls => {
      root.classList.remove(cls);
    });
    root.classList.add(letterSpacingClasses[state.settings.letterSpacing]);

    // Apply dyslexic font
    if (state.settings.dyslexicFont) {
      root.classList.add('dyslexic-font');
    } else {
      root.classList.remove('dyslexic-font');
    }

    // Update meta tags for screen readers
    if (state.settings.screenReaderMode) {
      updateMetaTag(' accessibility-speech-enabled', 'true');
    } else {
      updateMetaTag(' accessibility-speech-enabled', 'false');
    }

  }, [state.settings, state.isInitialized]);

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
  };

  const resetSettings = () => {
    dispatch({ type: 'RESET_SETTINGS' });
  };

  const toggleHighContrast = () => {
    updateSettings({ highContrast: !state.settings.highContrast });
  };

  const toggleReducedMotion = () => {
    updateSettings({ reducedMotion: !state.settings.reducedMotion });
  };

  const toggleScreenReaderMode = () => {
    updateSettings({ screenReaderMode: !state.settings.screenReaderMode });
  };

  const toggleFocusVisible = () => {
    updateSettings({ focusVisible: !state.settings.focusVisible });
  };

  const toggleKeyboardNavigation = () => {
    updateSettings({ keyboardNavigation: !state.settings.keyboardNavigation });
  };

  const toggleDyslexicFont = () => {
    updateSettings({ dyslexicFont: !state.settings.dyslexicFont });
  };

  const setFontSize = (size: AccessibilitySettings['fontSize']) => {
    updateSettings({ fontSize: size });
  };

  const setColorBlindMode = (mode: AccessibilitySettings['colorBlindMode']) => {
    updateSettings({ colorBlindMode: mode });
  };

  const setLineSpacing = (spacing: AccessibilitySettings['lineSpacing']) => {
    updateSettings({ lineSpacing: spacing });
  };

  const setLetterSpacing = (spacing: AccessibilitySettings['letterSpacing']) => {
    updateSettings({ letterSpacing: spacing });
  };

  const value: AccessibilityContextType = {
    ...state,
    updateSettings,
    resetSettings,
    toggleHighContrast,
    toggleReducedMotion,
    toggleScreenReaderMode,
    toggleFocusVisible,
    toggleKeyboardNavigation,
    toggleDyslexicFont,
    setFontSize,
    setColorBlindMode,
    setLineSpacing,
    setLetterSpacing,
  };

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

// Helper function to update meta tags
const updateMetaTag = (name: string, content: string) => {
  if (typeof document === 'undefined') return;

  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.appendChild(meta);
  }
  meta.content = content;
};

export default AccessibilityContext;