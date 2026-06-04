import PageMeta from "../../components/common/PageMeta";
import { PageTitle } from "../../components/report/SlideKit";

export default function GeneticContent() {
  return (
    <>
      <PageMeta
        title="유전자 검사 콘텐츠 현황"
        description="유전자 검사 콘텐츠 현황"
      />
      <div className="h-full flex flex-col">
        {/* ── 페이지 헤더 ───────────────────────────────────────────── */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            유전자 검사 콘텐츠 현황
          </h1>
        </div>

        {/* ── 스크롤 영역 ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto font-nanum">
          {/* ══ 페이지 1: (빈 본문 — 추후 작업 예정) ════════════════════ */}
          {/* 1920×1080(16:9) 비율 고정 — 컨테이너 너비에 따라 세로가 늘어나지 않도록 */}
          <div
            className="w-full flex flex-col p-8 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
            style={{ aspectRatio: "16 / 9" }}
          >
            <div className="shrink-0 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
              <PageTitle main="한컴Gx 유전자 검사 결과지 컨텐츠 현황" />
            </div>
            <div className="flex-1 min-h-0" />
          </div>
        </div>
      </div>
    </>
  );
}
