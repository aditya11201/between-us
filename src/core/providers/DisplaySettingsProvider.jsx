import {
  createContext,
  useContext,
  useState,
} from "react";

const DisplaySettingsContext = createContext(null);

export function DisplaySettingsProvider({ children }) {
  const [brightness, setBrightness] = useState(75);

  const value = { brightness, setBrightness };

  return (
    <DisplaySettingsContext.Provider value={value}>
      {children}
    </DisplaySettingsContext.Provider>
  );
}

export function useDisplaySettings() {
  const context = useContext(DisplaySettingsContext);

  if (!context) {
    throw new Error(
      "useDisplaySettings must be used within DisplaySettingsProvider"
    );
  }

  return context;
}
