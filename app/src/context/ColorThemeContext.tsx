import { createContext, useContext, useState } from "react";

export type ColorTheme = {
  name: string;
  main: string;
  sub: string;
  bg: string;
  font: string;
};

export const colorThemes: ColorTheme[] = [
  { name: "기본", main: "#465fff", sub: "#9cb9ff", bg: "#ffffff", font: "#101828" },
  { name: "한국MSD", main: "#009484", sub: "#7DCAC3", bg: "#ECECEC", font: "#000000" },
];

type ColorThemeContextType = {
  selectedTheme: number;
  setSelectedTheme: (i: number) => void;
  currentTheme: ColorTheme;
};

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);

export const ColorThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedTheme, setSelectedThemeState] = useState<number>(() => {
    const saved = localStorage.getItem("colorTheme");
    const index = saved ? parseInt(saved, 10) : 0;
    return index >= 0 && index < colorThemes.length ? index : 0;
  });

  const setSelectedTheme = (i: number) => {
    setSelectedThemeState(i);
    localStorage.setItem("colorTheme", String(i));
  };

  return (
    <ColorThemeContext.Provider
      value={{ selectedTheme, setSelectedTheme, currentTheme: colorThemes[selectedTheme] }}
    >
      {children}
    </ColorThemeContext.Provider>
  );
};

export const useColorTheme = () => {
  const ctx = useContext(ColorThemeContext);
  if (!ctx) throw new Error("useColorTheme must be used within ColorThemeProvider");
  return ctx;
};
