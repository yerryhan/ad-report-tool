import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { ReportDeck } from "../../report/ReportDeck";
import { exportReportPptx } from "../../report/specToPptx";
import { useGadaData } from "../../context/GadaDataContext";
import { useColorTheme } from "../../context/ColorThemeContext";

const formattedDate = (() => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}.${String(prev.getMonth() + 1).padStart(2, "0")}`;
})();

export default function Home() {
  const [exporting, setExporting] = useState(false);
  const { gadaData, displayAdData, memberStatsData, memberStatsByMonth } = useGadaData();
  const { currentTheme } = useColorTheme();

  const handleDownload = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportReportPptx(
        {
          theme: {
            name: currentTheme.name,
            main: currentTheme.main,
            sub: currentTheme.sub,
          },
          gadaData,
          displayAdData,
          memberStatsData,
          memberStatsByMonth,
        },
        `한국MSD_가다실9_광고마케팅_리포트_${formattedDate}.pptx`
      );
    } catch (err) {
      console.error(err);
      alert(
        "PPTX 내보내기에 실패했습니다.\n" +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageMeta
        title="광고 리포트 대시보드"
        description="광고 리포트 자동 생성 대시보드"
      />
      <div className="h-full flex flex-col">
        {/* Page Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {formattedDate} 리포트
          </h1>
          <button
            onClick={handleDownload}
            disabled={exporting}
            className="flex items-center gap-2 h-8 px-4 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="PPTX 다운로드"
          >
            {exporting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                생성 중…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 16L7 11H10V4H14V11H17L12 16Z" fill="currentColor" />
                  <path d="M20 18H4V20H20V18Z" fill="currentColor" />
                </svg>
                다운로드
              </>
            )}
          </button>
        </div>

        {/* PPTX 미리보기 영역 — 표지 / 장표지 / 모든 하위 페이지 / 종표지 */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800">
          <ReportDeck />
        </div>
      </div>
    </>
  );
}
