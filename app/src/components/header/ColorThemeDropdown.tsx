import { useEffect, useRef, useState } from "react";
import { colorThemes, useColorTheme } from "../../context/ColorThemeContext";
import type { ColorTheme } from "../../context/ColorThemeContext";

function ColorChips({ theme }: { theme: ColorTheme }) {
  return (
    <div className="flex rounded overflow-hidden border border-gray-200 dark:border-gray-600 shrink-0">
      {[theme.main, theme.sub, theme.bg, theme.font].map((color, i) => (
        <div key={i} className="w-5 h-5" style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

export default function ColorThemeDropdown() {
  const { selectedTheme, setSelectedTheme } = useColorTheme();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm transition-colors"
        aria-label="컬러 테마 선택"
      >
        <ColorChips theme={colorThemes[selectedTheme]} />
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.646 5.646a.5.5 0 0 1 .708 0L8 9.293l3.646-3.647a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 0-.708z"
            fill="currentColor"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-max">
          {colorThemes.map((theme, i) => (
            <button
              key={theme.name}
              onClick={() => {
                setSelectedTheme(i);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                selectedTheme === i
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              <ColorChips theme={theme} />
              <span>{theme.name}</span>
              {selectedTheme === i && (
                <svg
                  className="ml-auto text-brand-500"
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
