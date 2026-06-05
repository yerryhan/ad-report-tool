import { useGadaData } from "../context/GadaDataContext";
import { useColorTheme } from "../context/ColorThemeContext";
import { buildReportSpec } from "./reportSpec";
import { SpecSlideCard } from "./SpecRenderer";

// 대시보드 미리보기 = 'PPTX로 다운로드하면 보일 화면'.
// PPTX 내보내기와 동일한 buildReportSpec 사양을 그대로 HTML로 렌더한다.
export function ReportDeck() {
  const { gadaData, displayAdData, memberStatsData, memberStatsByMonth } = useGadaData();
  const { currentTheme } = useColorTheme();

  const slides = buildReportSpec({
    theme: { name: currentTheme.name, main: currentTheme.main, sub: currentTheme.sub },
    gadaData,
    displayAdData,
    memberStatsData,
    memberStatsByMonth,
  });

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center gap-6 px-4 py-8">
      {slides.map((s, i) => (
        <SpecSlideCard key={i} spec={s} />
      ))}
    </div>
  );
}
