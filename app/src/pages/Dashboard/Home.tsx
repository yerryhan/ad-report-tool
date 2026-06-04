import PageMeta from "../../components/common/PageMeta";
import {
  SlideScaler,
  CoverSlide,
  SectionSlide,
  EndSlide,
  SECTION_SLIDES,
} from "../../components/cover/ReportCovers";

const formattedDate = (() => {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}.${String(prev.getMonth() + 1).padStart(2, "0")}`;
})();

export default function Home() {
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
            onClick={() => {
              /* PDF download logic will be added later */
            }}
            className="flex items-center gap-2 h-8 px-4 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
            aria-label="PDF 다운로드"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 16L7 11H10V4H14V11H17L12 16Z" fill="currentColor" />
              <path d="M20 18H4V20H20V18Z" fill="currentColor" />
            </svg>
            다운로드
          </button>
        </div>

        {/* PDF Preview Area — 표지 / 장표지 3장 / 종표지 */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800">
          <div className="flex flex-col items-center py-8 px-4 gap-6">

            {/* 표지 */}
            <SlideScaler>
              <CoverSlide />
            </SlideScaler>

            {/* 장표지 3장 */}
            {SECTION_SLIDES.map((s) => (
              <SlideScaler key={s.num}>
                <SectionSlide num={s.num} title={s.title} />
              </SlideScaler>
            ))}

            {/* 종표지 */}
            <SlideScaler>
              <EndSlide />
            </SlideScaler>
          </div>
        </div>
      </div>
    </>
  );
}
