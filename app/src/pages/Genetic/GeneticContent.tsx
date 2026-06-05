import PageMeta from "../../components/common/PageMeta";
import { PageTitle } from "../../components/report/SlideKit";
import { SlideFrame } from "../../report/SlideFrame";

// ── 슬라이드(추후 작업 예정 — 빈 본문) ──────────────────────────────────
// 메뉴 페이지와 대시보드 미리보기에서 공용으로 쓰는 슬라이드 묶음.
export function GeneticDeck() {
  return (
    <SlideFrame title="유전자 검사 콘텐츠 현황">
      <div className="shrink-0 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
        <PageTitle main="한컴Gx 유전자 검사 결과지 컨텐츠 현황" />
      </div>
      <div className="flex-1 min-h-0" />
    </SlideFrame>
  );
}

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
          <GeneticDeck />
        </div>
      </div>
    </>
  );
}
