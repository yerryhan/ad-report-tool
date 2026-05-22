import { useEffect, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";

type ColorTheme = {
  name: string;
  main: string;
  sub: string;
  bg: string;
  font: string;
};

const colorThemes: ColorTheme[] = [
  {
    name: "TailAdmin 기본",
    main: "#465fff",
    sub: "#9cb9ff",
    bg: "#ffffff",
    font: "#101828",
  },
  {
    name: "커스텀",
    main: "#3B9189",
    sub: "#7DCAC3",
    bg: "#ECECEC",
    font: "#000000",
  },
];

function ColorChips({ theme }: { theme: ColorTheme }) {
  return (
    <div className="flex rounded overflow-hidden border border-gray-200 dark:border-gray-600 shrink-0">
      {[theme.main, theme.sub, theme.bg, theme.font].map((color, i) => (
        <div key={i} className="w-5 h-5" style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

export default function Home() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTheme, setSelectedTheme] = useState(0);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);

  const prevMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const formattedDate = `${currentDate.getFullYear()}.${String(
    currentDate.getMonth() + 1
  ).padStart(2, "0")}`;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        themeDropdownRef.current &&
        !themeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsThemeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <PageMeta
        title="광고 리포트 대시보드"
        description="광고 리포트 자동 생성 대시보드"
      />
      <div className="h-full flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">

          {/* Left spacer */}
          <div className="flex-1" />

          {/* Month Navigator — center */}
          <div className="flex items-center gap-5">
            <button
              onClick={prevMonth}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              aria-label="이전 달"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10.354 3.646a.5.5 0 0 1 0 .708L6.707 8l3.647 3.646a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 0 1 .708 0z"
                  fill="currentColor"
                />
              </svg>
            </button>

            <span className="text-xl font-semibold text-gray-900 dark:text-white w-28 text-center tabular-nums">
              {formattedDate}
            </span>

            <button
              onClick={nextMonth}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              aria-label="다음 달"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.646 3.646a.5.5 0 0 0 0 .708L9.293 8 5.646 11.646a.5.5 0 0 0 .708.708l4-4a.5.5 0 0 0 0-.708l-4-4a.5.5 0 0 0-.708 0z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>

          {/* Right controls */}
          <div className="flex-1 flex items-center justify-end gap-2">

            {/* Color Theme Dropdown */}
            <div className="relative" ref={themeDropdownRef}>
              <button
                onClick={() => setIsThemeOpen((v) => !v)}
                className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm transition-colors"
                aria-label="컬러 테마 선택"
              >
                <ColorChips theme={colorThemes[selectedTheme]} />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  className={`transition-transform duration-200 ${isThemeOpen ? "rotate-180" : ""}`}
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3.646 5.646a.5.5 0 0 1 .708 0L8 9.293l3.646-3.647a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 0-.708z"
                    fill="currentColor"
                  />
                </svg>
              </button>

              {isThemeOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 min-w-max">
                  {colorThemes.map((theme, i) => (
                    <button
                      key={theme.name}
                      onClick={() => {
                        setSelectedTheme(i);
                        setIsThemeOpen(false);
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

            {/* Download Button */}
            <button
              onClick={() => {
                /* PDF download logic will be added later */
              }}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
              aria-label="PDF 다운로드"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 16L7 11H10V4H14V11H17L12 16Z"
                  fill="currentColor"
                />
                <path
                  d="M20 18H4V20H20V18Z"
                  fill="currentColor"
                />
              </svg>
              다운로드
            </button>
          </div>
        </div>

        {/* PDF Preview Area */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800">
          <div className="flex flex-col items-center py-8 px-4 gap-6">
            {[1, 2, 3].map((page) => (
              <div
                key={page}
                className="w-full bg-white dark:bg-gray-900 shadow-md rounded"
                style={{ aspectRatio: "16 / 9" }}
              >
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <svg
                      className="mx-auto mb-3 text-gray-200 dark:text-gray-700"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M7 18H17V16H7V18ZM7 14H17V12H7V14ZM5 22C4.45 22 3.979 21.804 3.587 21.412C3.195 21.02 2.99933 20.5493 3 20V4C3 3.45 3.196 2.979 3.588 2.587C3.98 2.195 4.45067 1.99933 5 2H15L21 8V20C21 20.55 20.804 21.021 20.412 21.413C20.02 21.805 19.5493 22.0007 19 22H5ZM14 9V4H5V20H19V9H14Z" />
                    </svg>
                    <p className="text-sm text-gray-400 dark:text-gray-600">
                      {formattedDate} 광고 리포트 · {page}페이지
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
