import {
  CoverSlide,
  SectionSlide,
  EndSlide,
  SECTION_SLIDES,
} from "../components/cover/ReportCovers";
import { CoverFrame } from "./SlideFrame";
import { PreviewVariant } from "./SlideContext";
import { CompanyMarketingDeck } from "../pages/Marketing/CompanyMarketing";
import { HospitalDeck } from "../pages/Marketing/HospitalBooking";
import { PvUvDeck } from "../pages/Display/PvUvOverview";
import { MemberPvDeck } from "../pages/Display/MemberPv";
import { AgeCtrDeck } from "../pages/Display/AgeCtr";
import { GeneticDeck } from "../pages/Genetic/GeneticContent";

// 표지 → 장표지01 → (기업체·병원) → 장표지02 → (디스플레이) → 장표지03 → (유전자) → 종표지
// 모든 슬라이드는 PreviewVariant 안에서 1920×1080 고정 + data-export-slide 로 렌더되어
// 그대로 미리보기 카드이자 PPTX 캡처 대상이 된다.
export function ReportDeck() {
  const [s1, s2, s3] = SECTION_SLIDES;
  return (
    <PreviewVariant>
      <div className="mx-auto flex w-full max-w-[1100px] flex-col items-center gap-6 px-4 py-8">
        {/* 표지 */}
        <CoverFrame title="표지">
          <CoverSlide />
        </CoverFrame>

        {/* 01 기업체·병원별 마케팅 현황 */}
        <CoverFrame title={`${s1.num} ${s1.title}`}>
          <SectionSlide num={s1.num} title={s1.title} />
        </CoverFrame>
        <CompanyMarketingDeck />
        <HospitalDeck />

        {/* 02 디스플레이 광고 현황 */}
        <CoverFrame title={`${s2.num} ${s2.title}`}>
          <SectionSlide num={s2.num} title={s2.title} />
        </CoverFrame>
        <PvUvDeck />
        <MemberPvDeck />
        <AgeCtrDeck />

        {/* 03 유전자 검사 콘텐츠 현황 */}
        <CoverFrame title={`${s3.num} ${s3.title}`}>
          <SectionSlide num={s3.num} title={s3.title} />
        </CoverFrame>
        <GeneticDeck />

        {/* 종표지 */}
        <CoverFrame title="종표지">
          <EndSlide />
        </CoverFrame>
      </div>
    </PreviewVariant>
  );
}
