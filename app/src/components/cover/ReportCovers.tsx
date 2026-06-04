import { useEffect, useRef, useState } from "react";
import { useColorTheme } from "../../context/ColorThemeContext";

// ── 슬라이드 기준 해상도 (모든 표지는 1920×1080 기준으로 그린 뒤 컨테이너 폭에 맞춰 축소) ──
const BASE_W = 1920;
const BASE_H = 1080;

// 표지 우하단 화이트 로고 가로폭 (이전 126 → 120%)
const COVER_LOGO_W = 151;
// 종표지 블랙 로고 높이 — 단독 관리 (이전 화이트 기준 약 42.3px → 3배)
const END_LOGO_H = 127;

// 표지 좌측 컨텐츠 공통 좌측 여백(= 하단 텍스트의 좌측 여백, 우측 로고의 우측 여백과 동일)
const COVER_PAD = 140;
const COVER_BOTTOM = 56;

// 표지 이미지 경로 (public/images/cover)
const IMG = {
  main: "/images/cover/bg-cover-main.png",
  inner: "/images/cover/bg-cover-inner.png",
  msd: "/images/cover/MSD-logo.png",
  white: "/images/cover/logo_white.png",
  black: "/images/cover/logo_black.png",
};

/**
 * 리포트 대상 월의 날짜 범위 "YYYY.MM.DD. ~ YYYY.MM.DD." 를 만든다.
 * 대상 월 = 현재 기준 전월(상단 바의 "YYYY.MM 리포트"와 동일 규칙).
 */
export function getReportDateRange(): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const y = target.getFullYear();
  const m = target.getMonth(); // 0-based
  const lastDay = new Date(y, m + 1, 0).getDate();
  const fmt = (d: number) =>
    `${y}.${String(m + 1).padStart(2, "0")}.${String(d).padStart(2, "0")}.`;
  return `${fmt(1)} ~ ${fmt(lastDay)}`;
}

/**
 * 1920×1080 기준으로 그린 children 을 컨테이너 폭에 맞춰 transform scale 로 축소한다.
 * (px 단위 폰트/여백이 슬라이드 실제 비율 그대로 유지됨)
 */
export function SlideScaler({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / BASE_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="w-full overflow-hidden rounded shadow-md bg-white"
      style={{ aspectRatio: "16 / 9" }}
    >
      <div
        style={{
          width: BASE_W,
          height: BASE_H,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** 배경 이미지를 여백 없이 가득 채우는 공통 레이어 */
function BgFill({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
      draggable={false}
    />
  );
}

// ── 표지 ────────────────────────────────────────────────────────────────
export function CoverSlide() {
  const { currentTheme } = useColorTheme();
  const dateRange = getReportDateRange();

  return (
    <div
      className="relative font-nanum"
      style={{ width: BASE_W, height: BASE_H }}
    >
      <BgFill src={IMG.main} />

      {/* MSD 로고 + 리포트 타이틀 + 날짜 (좌측 정렬) */}
      <div
        className="absolute flex flex-col items-start"
        style={{ left: COVER_PAD, top: 150 }}
      >
        <img src={IMG.msd} alt="MSD" style={{ width: 311, marginBottom: 35 }} />
        <div
          style={{
            fontSize: 70,
            fontWeight: 800,
            lineHeight: "88px",
            color: currentTheme.main,
          }}
        >
          한국MSD 가다실9
        </div>
        <div
          style={{
            fontSize: 70,
            fontWeight: 800,
            lineHeight: "88px",
            color: "#000000",
          }}
        >
          광고·마케팅 리포트
        </div>
        <div
          style={{
            fontSize: 29,
            fontWeight: 400,
            color: "#000000",
            marginTop: 20,
          }}
        >
          {dateRange}
        </div>
      </div>

      {/* 좌측 하단 캡션 */}
      <div
        className="absolute"
        style={{
          left: COVER_PAD,
          bottom: COVER_BOTTOM,
          fontSize: 24,
          fontWeight: 400,
          color: "#000000",
        }}
      >
        Total Healthcare Service, HANCOM CARELINK
      </div>

      {/* 우측 하단 한컴케어링크 화이트 로고 (하단 정렬 동일, 우측 여백 = 좌측 여백) */}
      <img
        src={IMG.white}
        alt="HANCOM CARELINK"
        className="absolute"
        style={{ right: COVER_PAD, bottom: COVER_BOTTOM, width: COVER_LOGO_W }}
      />
    </div>
  );
}

// ── 장표지 ──────────────────────────────────────────────────────────────
export function SectionSlide({
  num,
  title,
}: {
  num: string;
  title: string;
}) {
  const { currentTheme } = useColorTheme();
  return (
    <div
      className="relative font-nanum"
      style={{ width: BASE_W, height: BASE_H }}
    >
      <BgFill src={IMG.inner} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.2 }}>
          <span style={{ color: currentTheme.main }}>{num}</span>
          <span style={{ color: "#000000" }}>{` ${title}`}</span>
        </div>
      </div>
    </div>
  );
}

// ── 종표지 ──────────────────────────────────────────────────────────────
export function EndSlide() {
  return (
    <div
      className="relative font-nanum"
      style={{ width: BASE_W, height: BASE_H }}
    >
      <BgFill src={IMG.main} />
      <div className="absolute inset-0 flex items-center justify-center">
        <img src={IMG.black} alt="HANCOM CARELINK" style={{ height: END_LOGO_H }} />
      </div>
    </div>
  );
}

// 장표지 3종 정의
export const SECTION_SLIDES = [
  { num: "01", title: "기업체·병원별 마케팅 현황" },
  { num: "02", title: "디스플레이 광고 현황" },
  { num: "03", title: "유전자 검사 콘텐츠 현황" },
];
