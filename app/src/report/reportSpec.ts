import type {
  GadaExcelData,
  DisplayAdData,
  MemberStatsData,
  MemberAgeCounts,
  MemberGenderKey,
  MemberRegion,
  VisitStatsTable,
  VisitPlacementRow,
  GenderMonthly,
} from "../types/gada";
import { MEMBER_AREA_LABELS } from "../types/gada";

// ════════════════════════════════════════════════════════════════════════
//  공유 레이아웃 사양(Spec) — 미리보기(HTML)와 PPTX(PptxGenJS)가 모두 읽는다.
//  좌표 단위: inch (PPTX 기준). 폰트 단위: pt. 슬라이드 13.333×7.5in.
//  HTML 렌더러는 inch×96, pt×(96/72) 로 px 변환한다.
// ════════════════════════════════════════════════════════════════════════

export const SLIDE_W = 13.333;
export const SLIDE_H = 7.5;
export const PX_PER_IN = 96;

type ThemePair = { name: string; main: string; sub: string };

export type ReportData = {
  theme: ThemePair;
  gadaData: GadaExcelData | null;
  displayAdData: DisplayAdData | null;
  memberStatsData: MemberStatsData | null;
  memberStatsByMonth: Record<number, MemberStatsData>;
};

// ── 색/폰트 상수 ─────────────────────────────────────────────────────────
const DARK = "101828";
const GREY_BORDER = "D1D5DB";
const GREY_100 = "F3F4F6";
const GREY_200 = "E5E7EB";
const GREY_300 = "D1D5DB";
const GREY_TEXT = "6B7280";
const WHITE = "FFFFFF";
export const FONT = "NanumSquare";
export const FONT_EB = "NanumSquare ExtraBold";

// ── 레이아웃 상수(inch) ──────────────────────────────────────────────────
const M = 0.7;
const TITLE_Y = 0.4;
const TITLE_H = 0.55;
const BODY_Y = 1.15;
const BODY_W = SLIDE_W - 2 * M;
const BODY_H = SLIDE_H - BODY_Y - M;

const MONTH12 = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

const hex = (c: string) => c.replace("#", "").toUpperCase();
const fmtNum = (v: number | undefined): string =>
  v === undefined || v === null || Number.isNaN(v) ? "" : v.toLocaleString("ko-KR");

// 색을 흰색 쪽으로 ratio(0~1)만큼 섞어 밝게 만든 tint 색(hex, no '#').
function tint(color: string, ratio: number): string {
  const h = hex(color);
  const ch = (i: number) => parseInt(h.slice(i, i + 2), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * ratio);
  const to2 = (n: number) => mix(n).toString(16).padStart(2, "0").toUpperCase();
  return to2(ch(0)) + to2(ch(2)) + to2(ch(4));
}

// ── 요소 타입 ────────────────────────────────────────────────────────────
export type Align = "left" | "center" | "right";
export type VAlign = "top" | "middle" | "bottom";
export type Run = { text: string; bold?: boolean; color?: string; size?: number; italic?: boolean };

export type Cell = {
  text: string;
  fill?: string;
  color?: string;
  bold?: boolean;
  extraBold?: boolean; // NanumSquare ExtraBold (800)
  align?: Align;
  valign?: VAlign;
  size?: number;
  colspan?: number;
  rowspan?: number;
};

export type ChartKind = "bar" | "line" | "area" | "doughnut";
export type ChartSpec = {
  kind: ChartKind;
  labels: string[];
  series: { name: string; values: number[] }[];
  colors: string[]; // hex no '#'
  stacked?: boolean;
  legend?: "none" | "top" | "bottom";
  showValue?: boolean;
  valueSuffix?: string;
  valAxisSuffix?: string; // 값(Y)축 라벨 접미사(예: "%")
  valAxisTitle?: string; // 값(Y)축 제목(세로 표기)
  holeSize?: number; // doughnut (%)
  strokeColor?: string; // doughnut 슬라이스 테두리색(hex, no '#'). 미지정 시 흰색.
  areaGradient?: boolean;
  fillOpacity?: number; // 0~100
  lightGrid?: boolean;
  hideValAxis?: boolean; // 값(Y)축 눈금/라벨 숨김
  valuePosition?: "top" | "bottom"; // bar 데이터라벨 위치(top=막대 위, bottom=기준선)
  centerText?: Run[];
};

export type Box = { x: number; y: number; w: number; h: number };

export type El =
  | ({ kind: "rect"; fill?: string; radius?: number; line?: string } & Box)
  | ({ kind: "line"; color: string } & Box)
  | ({ kind: "tri"; fill: string; dir?: "up" | "down" } & Box)
  | ({
      kind: "text";
      runs: Run[];
      align?: Align;
      valign?: VAlign;
      size?: number;
      bold?: boolean;
      color?: string;
      fontFace?: string;
      fill?: string;
      lineSpacingMultiple?: number;
    } & Box)
  | ({ kind: "image"; src: string; contain?: boolean } & Box)
  | ({ kind: "asset"; asset: "map" | "icon"; tag: string; color?: string; mapData?: MemberStatsData | null } & Box)
  | ({ kind: "table"; colW: number[]; rows: Cell[][]; rowH?: number[]; borderColor?: string; fontFace?: string; tightCells?: boolean } & Box)
  | ({ kind: "chart"; chart: ChartSpec } & Box);

export type SlideSpec = {
  bg?: { color?: string; src?: string };
  els: El[];
};

// ── 공통: 본문 슬라이드 제목 ─────────────────────────────────────────────
function title(main: string, sub?: string): El[] {
  const runs: Run[] = [{ text: main, bold: true, color: DARK, size: 18 }];
  if (sub) runs.push({ text: ` - ${sub}`, bold: true, color: DARK, size: 14 });
  return [
    { kind: "text", x: M, y: TITLE_Y, w: BODY_W, h: TITLE_H, runs, align: "left", valign: "middle", fontFace: FONT_EB },
    { kind: "line", x: M, y: TITLE_Y + TITLE_H, w: BODY_W, h: 0, color: GREY_200 },
  ];
}

function emptyBody(msg = "업로드된 데이터가 없습니다"): El {
  return { kind: "text", x: M, y: BODY_Y, w: BODY_W, h: BODY_H, runs: [{ text: msg, color: GREY_TEXT, size: 14 }], align: "center", valign: "middle", fontFace: FONT };
}

// ════════════════════════════════════════════════════════════════════════
//  표지 / 장표지 / 종표지
// ════════════════════════════════════════════════════════════════════════
const IMG = {
  main: "/images/cover/bg-cover-main.png",
  inner: "/images/cover/bg-cover-inner.png",
  msd: "/images/cover/MSD-logo.png",
  white: "/images/cover/logo_white.png",
  black: "/images/cover/logo_black.png",
};

function reportDateRange(): string {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const y = t.getFullYear();
  const m = t.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  const f = (d: number) => `${y}.${String(m + 1).padStart(2, "0")}.${String(d).padStart(2, "0")}.`;
  return `${f(1)} ~ ${f(last)}`;
}

function coverSpec(theme: ThemePair): SlideSpec {
  return {
    bg: { src: IMG.main },
    els: [
      { kind: "image", src: IMG.msd, x: 0.97, y: 1.04, w: 1.672, h: 0.7, contain: true }, // 비율 480:201 유지
      {
        kind: "text", x: 0.95, y: 1.9, w: 9, h: 1.7, fontFace: FONT_EB, align: "left", valign: "top",
        runs: [
          { text: "한국MSD 가다실9\n", color: hex(theme.main), bold: true, size: 35 },
          { text: "광고·마케팅 리포트", color: "000000", bold: true, size: 35 },
        ],
      },
      { kind: "text", x: 1.0, y: 3.7, w: 8, h: 0.4, fontFace: FONT_EB, align: "left", valign: "middle", runs: [{ text: reportDateRange(), color: "000000", size: 14 }] },
      { kind: "text", x: 1.0, y: SLIDE_H - 0.7, w: 8, h: 0.35, fontFace: FONT_EB, align: "left", valign: "middle", runs: [{ text: "Total Healthcare Service, HANCOM CARELINK", color: "000000", size: 12 }] },
      { kind: "image", src: IMG.white, x: SLIDE_W - 0.97 - 1.05, y: SLIDE_H - 0.39 - 0.5 + (0.5 - 0.294) / 2, w: 1.05, h: 0.294, contain: true }, // 비율 1506:422 유지
    ],
  };
}

function sectionSpec(theme: ThemePair, num: string, t: string): SlideSpec {
  return {
    bg: { src: IMG.inner },
    els: [
      {
        kind: "text", x: 0, y: SLIDE_H / 2 - 0.6, w: SLIDE_W, h: 1.2, align: "center", valign: "middle", fontFace: FONT_EB,
        runs: [
          { text: num, color: hex(theme.main), bold: true, size: 28 },
          { text: ` ${t}`, color: "000000", bold: true, size: 28 },
        ],
      },
    ],
  };
}

function endSpec(): SlideSpec {
  return {
    bg: { src: IMG.main },
    els: [{ kind: "image", src: IMG.black, x: SLIDE_W / 2 - 2.41 / 2, y: SLIDE_H / 2 - 0.5, w: 2.41, h: 1.0, contain: true }], // 비율 2511:1042 유지
  };
}

// ════════════════════════════════════════════════════════════════════════
//  01 기업체·병원별 마케팅 현황
// ════════════════════════════════════════════════════════════════════════
function buildMonthly(display: GenderMonthly[] | undefined, gada: GadaExcelData | null, kind: "package" | "additional") {
  const arr = Array.from({ length: 12 }, () => ({ male: 0, female: 0 }));
  if (display) for (let i = 0; i < 12; i++) arr[i] = { male: display[i].male, female: display[i].female };
  if (gada?.genderStats && gada.month >= 1 && gada.month <= 12) {
    const gs = gada.genderStats;
    arr[gada.month - 1] = kind === "package"
      ? { male: gs.packageMale, female: gs.packageFemale }
      : { male: gs.additionalMale, female: gs.additionalFemale };
  }
  return arr;
}

function companyTableSpec(theme: ThemePair): SlideSpec {
  const headers = ["기업체", "검진 단가", "마케팅 상세 내용"];
  const rows: Cell[][] = [
    headers.map((h) => ({ text: h, fill: hex(theme.main), color: WHITE, bold: true, align: "center" as Align, valign: "middle" as VAlign, size: 11 })),
  ];
  for (let r = 0; r < 8; r++) rows.push([0, 1, 2].map(() => ({ text: "", fill: WHITE, align: "center" as Align, valign: "middle" as VAlign, size: 11 })));
  return {
    els: [
      ...title("기업체별 마케팅 현황"),
      { kind: "table", x: M, y: BODY_Y, w: BODY_W, h: BODY_H, colW: [BODY_W * 0.2143, BODY_W * 0.1429, BODY_W * 0.6428], rows, borderColor: GREY_BORDER, fontFace: FONT },
    ],
  };
}

function integratedSpec(theme: ThemePair, gada: GadaExcelData | null, display: DisplayAdData | null): SlideSpec {
  if (!gada?.genderStats) return { els: [...title("통합 통계"), emptyBody()] };
  const gs = gada.genderStats;
  const reportMonth = gada.month || new Date().getMonth() + 1;
  const weeks = Array.from({ length: 5 }, (_, i) => `${reportMonth}월 ${i + 1}주차`);
  const examCount = gs.packageMale + gs.packageFemale;
  const selfCount = gs.additionalMale + gs.additionalFemale;
  const tot = examCount + selfCount;
  const examPct = tot > 0 ? parseFloat(((examCount / tot) * 100).toFixed(1)) : 0;
  const selfPct = tot > 0 ? parseFloat(((selfCount / tot) * 100).toFixed(1)) : 0;
  const pkg = buildMonthly(display?.packageMonthly, gada, "package").map((e) => e.male + e.female);
  const add = buildMonthly(display?.additionalMonthly, gada, "additional").map((e) => e.male + e.female);

  const halfW = BODY_W / 2 - 0.2;
  const rx = M + BODY_W / 2 + 0.2;
  const rh = BODY_H / 2 - 0.2;
  return {
    els: [
      ...title("통합 통계"),
      { kind: "text", x: M, y: BODY_Y, w: halfW, h: 0.3, runs: [{ text: "기간별 예약 신청통계", bold: true, color: DARK, size: 11 }], fontFace: FONT },
      {
        kind: "chart", x: M, y: BODY_Y + 0.35, w: halfW, h: BODY_H - 0.35,
        chart: { kind: "line", labels: weeks, series: [{ name: "검진유형 예약", values: Array(5).fill(50) }, { name: "본인부담 예약", values: Array(5).fill(20) }], colors: [hex(theme.main), hex(theme.sub)], legend: "top", lightGrid: true },
      },
      { kind: "text", x: M, y: BODY_Y + BODY_H + 0.02, w: halfW, h: 0.25, runs: [{ text: `검진유형 예약 ${examCount.toLocaleString("ko-KR")}건(${examPct}%) / 본인부담 예약 ${selfCount.toLocaleString("ko-KR")}건(${selfPct}%)`, color: GREY_TEXT, size: 9 }], fontFace: FONT },
      { kind: "text", x: rx, y: BODY_Y, w: halfW, h: 0.25, runs: [{ text: "검진유형 패키지 월별 추이", bold: true, color: DARK, size: 11 }], fontFace: FONT },
      { kind: "chart", x: rx, y: BODY_Y + 0.3, w: halfW, h: rh, chart: { kind: "bar", labels: MONTH12, series: [{ name: "검진유형 패키지", values: pkg }], colors: [hex(theme.main)], legend: "none", lightGrid: true } },
      { kind: "text", x: rx, y: BODY_Y + rh + 0.35, w: halfW, h: 0.25, runs: [{ text: "선택 추가항목 월별 추이", bold: true, color: DARK, size: 11 }], fontFace: FONT },
      { kind: "chart", x: rx, y: BODY_Y + rh + 0.65, w: halfW, h: rh, chart: { kind: "bar", labels: MONTH12, series: [{ name: "선택 추가항목", values: add }], colors: [hex(theme.sub)], legend: "none", lightGrid: true } },
    ],
  };
}

function companyDetailSpec(): SlideSpec {
  return { els: [...title("기업체별 마케팅 현황", "상세내역")] };
}

function genderSectionSpec(theme: ThemePair, gada: GadaExcelData | null, display: DisplayAdData | null, kind: "package" | "additional"): SlideSpec {
  const sub = kind === "package" ? "검진유형 패키지 성별 통계내역" : "선택 추가항목 성별 통계내역";
  if (!gada?.genderStats) return { els: [...title("기업체별 마케팅 현황", sub), emptyBody()] };
  const gs = gada.genderStats;
  const monthly = buildMonthly(kind === "package" ? display?.packageMonthly : display?.additionalMonthly, gada, kind);
  const male = monthly.map((e) => e.male);
  const female = monthly.map((e) => e.female);
  const aPct = kind === "package" ? gs.packageMalePct : gs.additionalMalePct;
  const bPct = kind === "package" ? parseFloat((100 - aPct).toFixed(1)) : gs.additionalFemalePct;
  const cumMale = male.reduce((s, v) => s + v, 0);
  const cumFemale = female.reduce((s, v) => s + v, 0);

  const halfW = BODY_W / 2 - 0.2;
  const rx = M + BODY_W / 2 + 0.2;
  const donutH = BODY_H * 0.5;
  const donutW = halfW / 2 - 0.1;

  // 왼쪽 막대를 더 길게, 표 높이는 기존의 60%로, 표 하단을 우측 면적그래프 하단과 정렬.
  const barY = BODY_Y + 0.3;
  const areaBottom = BODY_Y + BODY_H - 0.1; // 우측 면적그래프 하단 기준점
  const tblH = BODY_H * 0.28 * 0.6;          // 기존 표 높이의 60%
  const tblY = areaBottom - tblH;            // 표 하단 = 면적그래프 하단
  const barH = tblY - 0.2 - barY;            // 막대를 표 바로 위까지 확장

  const tblRows: Cell[][] = [
    [{ text: "", fill: GREY_100 }, ...MONTH12.map((m) => ({ text: m, fill: GREY_100, bold: true })), { text: "누적", fill: GREY_100, bold: true }],
    [{ text: "여성", fill: GREY_100, bold: true }, ...female.map((v) => ({ text: String(v) })), { text: String(cumFemale), bold: true }],
    [{ text: "남성", fill: GREY_100, bold: true }, ...male.map((v) => ({ text: String(v) })), { text: String(cumMale), bold: true }],
  ].map((row) => row.map((c) => ({ ...c, align: "center" as Align, valign: "middle" as VAlign, size: 7 })));

  // 도넛: 웹 원본과 동일하게 비강조 슬라이스는 흰색 + 테마색 테두리(쪼개진 모양 유지, 칠만 외곽선).
  return {
    els: [
      ...title("기업체별 마케팅 현황", sub),
      { kind: "text", x: M, y: BODY_Y, w: halfW, h: 0.25, runs: [{ text: "월별 남성/여성 통계", bold: true, color: DARK, size: 11 }], fontFace: FONT },
      { kind: "chart", x: M, y: barY, w: halfW, h: barH, chart: { kind: "bar", labels: MONTH12, series: [{ name: "남성", values: male }, { name: "여성", values: female }], colors: [hex(theme.main), hex(theme.sub)], stacked: true, legend: "top", lightGrid: true } },
      { kind: "table", x: M, y: tblY, w: halfW, h: tblH, colW: Array(14).fill(halfW / 14), rows: tblRows, borderColor: GREY_BORDER, fontFace: FONT },
      { kind: "text", x: rx, y: BODY_Y, w: halfW, h: 0.25, runs: [{ text: "해당월 성별 비율", bold: true, color: DARK, size: 11 }], fontFace: FONT },
      { kind: "chart", x: rx, y: BODY_Y + 0.35, w: donutW, h: donutH, chart: { kind: "doughnut", labels: ["남성", "여성"], series: [{ name: "남성", values: [aPct, bPct] }], colors: [hex(theme.main), WHITE], strokeColor: hex(theme.main), legend: "none", holeSize: 52, centerText: [{ text: `${aPct}%\n`, bold: true, color: DARK, size: 10 }, { text: "남성", color: DARK, size: 9 }] } },
      { kind: "chart", x: rx + donutW + 0.2, y: BODY_Y + 0.35, w: donutW, h: donutH, chart: { kind: "doughnut", labels: ["남성", "여성"], series: [{ name: "여성", values: [aPct, bPct] }], colors: [WHITE, hex(theme.sub)], strokeColor: hex(theme.sub), legend: "none", holeSize: 52, centerText: [{ text: `${bPct}%\n`, bold: true, color: DARK, size: 10 }, { text: "여성", color: DARK, size: 9 }] } },
      { kind: "text", x: rx, y: BODY_Y + donutH + 0.45, w: halfW, h: 0.25, runs: [{ text: "월별 남성/여성 통계 추이", bold: true, color: DARK, size: 11 }], fontFace: FONT },
      { kind: "chart", x: rx, y: BODY_Y + donutH + 0.75, w: halfW, h: BODY_H - donutH - 0.85, chart: { kind: "area", labels: MONTH12, series: [{ name: "여성", values: female }, { name: "남성", values: male }], colors: [hex(theme.sub), hex(theme.main)], legend: "top", areaGradient: true, fillOpacity: 40, lightGrid: true } },
    ],
  };
}

function hospitalSpec(theme: ThemePair, gada: GadaExcelData | null): SlideSpec {
  if (!gada) return { els: [...title("병원별 예약 현황"), emptyBody()] };
  const otherCount = gada.otherHospitals.reduce((a, h) => a + h.count, 0);
  const totalCount = gada.mainHospitals.reduce((a, h) => a + h.count, 0) + otherCount;
  const cats = gada.mainHospitals.map((h) => h.hospital);
  const vals = gada.mainHospitals.map((h) => (totalCount > 0 ? parseFloat(((h.count / totalCount) * 100).toFixed(1)) : 0));
  const chartW = BODY_W * 0.62;
  const lx = M + chartW + 0.3;
  const lw = BODY_W - chartW - 0.3;
  const names = gada.otherHospitals.map((h) => h.hospital);
  const listY = BODY_Y + 0.35;
  const listH = BODY_H - 0.35;

  const els: El[] = [
    ...title("병원별 예약 현황"),
    { kind: "chart", x: M - 18 / PX_PER_IN, y: BODY_Y + 0.3, w: chartW + 18 / PX_PER_IN, h: BODY_H - 0.3, chart: { kind: "bar", labels: cats, series: [{ name: "예약 비율", values: vals }], colors: cats.map(() => hex(theme.main)), legend: "none", showValue: true, valueSuffix: "%", valAxisSuffix: "%", valAxisTitle: "예약 비율(%)", lightGrid: true, valuePosition: "top" } },
    { kind: "text", x: lx, y: BODY_Y, w: lw, h: 0.3, runs: [{ text: `기타 병원 (${gada.otherHospitals.length}개)`, bold: true, color: DARK, size: 11 }], fontFace: FONT },
  ];
  const listRuns = (arr: string[]): Run[] => [{ text: arr.join("\n"), color: "374151", size: 10 }];
  if (names.length === 0) {
    els.push({ kind: "text", x: lx, y: listY, w: lw, h: listH, runs: [{ text: "기타 병원 없음", color: "374151", size: 10 }], fontFace: FONT, fill: GREY_100, valign: "top", align: "left", lineSpacingMultiple: 2 });
  } else if (names.length > 15) {
    const colW = (lw - 0.1) / 2;
    els.push(
      { kind: "text", x: lx, y: listY, w: colW, h: listH, runs: listRuns(names.slice(0, 15)), fontFace: FONT, fill: GREY_100, valign: "top", align: "left", lineSpacingMultiple: 2 },
      { kind: "text", x: lx + colW + 0.1, y: listY, w: colW, h: listH, runs: listRuns(names.slice(15)), fontFace: FONT, fill: GREY_100, valign: "top", align: "left", lineSpacingMultiple: 2 }
    );
  } else {
    els.push({ kind: "text", x: lx, y: listY, w: lw, h: listH, runs: listRuns(names), fontFace: FONT, fill: GREY_100, valign: "top", align: "left", lineSpacingMultiple: 2 });
  }
  return { els };
}

// ════════════════════════════════════════════════════════════════════════
//  02 디스플레이 — PV/UV 표
// ════════════════════════════════════════════════════════════════════════
const PV_COLS = 10;
const PV_COLSPAN: Record<number, number> = { 1: 2, 3: 4, 7: 4, 71: 2 };
const PV_ROWSPAN: Record<number, number> = { 51: 2 };
const PV_COVERED = new Set([2, 4, 5, 6, 8, 9, 10, 61, 72]);
const PLACEMENT_NAMES = [
  "메인 페이지 배너", "이벤트 모음 페이지 배너", "검진센터 둘러보기 페이지 배너",
  "건강검진 예약하기 페이지 배너", "건강검진 예약 정보 조회 페이지 배너",
];

function latestDataMonth(d: DisplayAdData | null): number {
  const scan = (pv?: number[]) => {
    if (!pv) return 0;
    for (let i = 11; i >= 0; i--) if (pv[i] > 0) return i + 1;
    return 0;
  };
  return scan(d?.totalVisit.pvTotal) || scan(d?.memberVisit.pvTotal) || new Date().getMonth() + 1;
}

function pvLabel(n: number, months: [string, string, string]): string {
  switch (n) {
    case 1: return "광고 영역(광고 위치)";
    case 3: return "PV";
    case 7: return "UV";
    case 11: return "카테고리";
    case 12: return "세부 메뉴";
    case 13: case 17: return months[0];
    case 14: case 18: return months[1];
    case 15: case 19: return months[2];
    case 16: case 20: return "증감률";
    case 21: return "메인 페이지";
    case 22: return "메인 페이지 배너";
    case 31: return "홍보/이벤트";
    case 32: return "이벤트 모음 페이지 배너";
    case 41: return "검진센터 둘러보기";
    case 42: return "검진센터 둘러보기 페이지 배너";
    case 51: return "건강검진 예약";
    case 52: return "건강검진 예약하기 페이지 배너";
    case 62: return "건강검진 예약 정보 조회 페이지 배너";
    case 71: return "합계";
    default: return "";
  }
}

function pvFill(n: number, main: string): string {
  if (n <= 20) return hex(main);
  if (n >= 71) return GREY_300;
  const col = ((n - 1) % PV_COLS) + 1;
  if (col === 1) return GREY_200;
  if (col === 2) return GREY_100;
  return WHITE;
}

function pvCellData(n: number, data: VisitStatsTable | null, monthNums: [number, number, number]): string {
  if (!data) return "";
  const col = ((n - 1) % PV_COLS) + 1;
  const row = Math.floor((n - 1) / PV_COLS) + 1;
  if (row < 3 || col < 3 || col > 10) return "";
  let pv: number[] | undefined;
  let uv: number[] | undefined;
  if (row === 8) { pv = data.pvTotal; uv = data.uvTotal; }
  else {
    const name = PLACEMENT_NAMES[row - 3];
    const rd: VisitPlacementRow | undefined = data.rows.find((r) => r.placement === name) ?? data.rows[row - 3];
    pv = rd?.pv; uv = rd?.uv;
  }
  const at = (arr: number[] | undefined, mn: number) => (arr && mn - 1 >= 0 && mn - 1 < arr.length ? arr[mn - 1] : undefined);
  const rate = (c?: number, p?: number) => (c === undefined || p === undefined || p === 0 ? "" : `${Math.round(((c - p) / p) * 100)}%`);
  const [m0, m1, m2] = monthNums;
  switch (col) {
    case 3: return fmtNum(at(pv, m0));
    case 4: return fmtNum(at(pv, m1));
    case 5: return fmtNum(at(pv, m2));
    case 6: return rate(at(pv, m2), at(pv, m2 - 1));
    case 7: return fmtNum(at(uv, m0));
    case 8: return fmtNum(at(uv, m1));
    case 9: return fmtNum(at(uv, m2));
    case 10: return rate(at(uv, m2), at(uv, m2 - 1));
    default: return "";
  }
}

function pvUvSpec(theme: ThemePair, sub: string, data: VisitStatsTable | null, display: DisplayAdData | null): SlideSpec {
  const lm = latestDataMonth(display);
  const months: [string, string, string] = [`${lm - 2}월`, `${lm - 1}월`, `${lm}월`];
  const monthNums: [number, number, number] = [lm - 2, lm - 1, lm];
  const rows: Cell[][] = [];
  for (let row = 1; row <= 8; row++) {
    const r: Cell[] = [];
    for (let col = 1; col <= PV_COLS; col++) {
      const n = (row - 1) * PV_COLS + col;
      if (PV_COVERED.has(n)) continue;
      const fill = pvFill(n, theme.main);
      r.push({
        text: pvLabel(n, months) || pvCellData(n, data, monthNums),
        fill, color: n <= 20 ? WHITE : "000000", bold: fill !== WHITE,
        align: "center", valign: "middle", size: 9, // 표 내부 텍스트 -2pt
        colspan: PV_COLSPAN[n], rowspan: PV_ROWSPAN[n],
      });
    }
    rows.push(r);
  }
  const tableH = BODY_H - 0.5;
  return {
    els: [
      ...title("디스플레이 광고 현황", sub),
      { kind: "table", x: M, y: BODY_Y, w: BODY_W, h: tableH, colW: Array(PV_COLS).fill(BODY_W / PV_COLS), rows, borderColor: GREY_BORDER, fontFace: FONT },
      { kind: "text", x: M, y: BODY_Y + tableH + 0.1, w: BODY_W, h: 0.35, runs: [{ text: "* UV의 차이는 Count방법 상이 / * 증감률은 전월대비 증감률, 월별 PV/UV는 최근 3개월만 표현", color: GREY_TEXT, size: 8 }], fontFace: FONT },
    ],
  };
}

// ── 회원 성별/연령대 표 ──────────────────────────────────────────────────
const AGE_KEYS: (keyof MemberAgeCounts)[] = ["age20", "age30", "age40", "age50", "age60", "etc"];
const AGE_LABELS = ["20대", "30대", "40대", "50대", "60대", "기타"];
const GENDERS: { key: MemberGenderKey; label: string }[] = [
  { key: "male", label: "남성" }, { key: "female", label: "여성" }, { key: "unknown", label: "성별 미기재" },
];
const EMPTY_AGE: MemberAgeCounts = { age20: 0, age30: 0, age40: 0, age50: 0, age60: 0, etc: 0 };

function memberGenderAgeSpec(theme: ThemePair, data: MemberStatsData | null): SlideSpec {
  const main = hex(theme.main);
  const countsOf = (label: string, key: MemberGenderKey) => data?.areaStats?.[label]?.[key] ?? EMPTY_AGE;
  const sumAge = (g: MemberAgeCounts) => AGE_KEYS.reduce((s, k) => s + g[k], 0);
  const num = (v: number) => (!data ? "" : v === 0 ? "-" : fmtNum(v));
  const period = data && data.year && data.month >= 1
    ? `${data.year}. ${String(data.month).padStart(2, "0")}. 01. ~ ${data.year}. ${String(data.month).padStart(2, "0")}. ${String(new Date(data.year, data.month, 0).getDate()).padStart(2, "0")}.`
    : "—";
  const head = (t: string, extra: Partial<Cell> = {}): Cell => ({ text: t, fill: main, color: WHITE, bold: true, align: "center", valign: "middle", size: 8, ...extra });
  const gc = (t: string, fill: string, bold = false): Cell => ({ text: t, fill, color: "000000", bold, align: "center", valign: "middle", size: 8 });

  const rows: Cell[][] = [];
  rows.push([head("광고 영역", { rowspan: 3 }), head(period, { colspan: 21 }), head("합계", { rowspan: 3 })]);
  rows.push(GENDERS.map((g) => head(g.label, { colspan: 7 })));
  rows.push(GENDERS.flatMap(() => [...AGE_LABELS, "소계"].map((l) => head(l))));
  for (const label of MEMBER_AREA_LABELS) {
    const row: Cell[] = [gc(label, GREY_100, true)];
    let rowTotal = 0;
    for (const g of GENDERS) {
      const c = countsOf(label, g.key);
      for (const k of AGE_KEYS) row.push(gc(num(c[k]), WHITE));
      const s = sumAge(c); rowTotal += s; row.push(gc(num(s), WHITE));
    }
    row.push(gc(num(rowTotal), GREY_100));
    rows.push(row);
  }
  const colTotal = (key: MemberGenderKey, ak: keyof MemberAgeCounts) => MEMBER_AREA_LABELS.reduce((s, l) => s + countsOf(l, key)[ak], 0);
  const genderTotal = (key: MemberGenderKey) => MEMBER_AREA_LABELS.reduce((s, l) => s + sumAge(countsOf(l, key)), 0);
  const grand = MEMBER_AREA_LABELS.reduce((s, l) => s + GENDERS.reduce((ss, g) => ss + sumAge(countsOf(l, g.key)), 0), 0);
  const totRow: Cell[] = [gc("합 계", GREY_200, true)];
  for (const g of GENDERS) { for (const k of AGE_KEYS) totRow.push(gc(num(colTotal(g.key, k)), GREY_200, true)); totRow.push(gc(num(genderTotal(g.key)), GREY_200, true)); }
  totRow.push(gc(num(grand), GREY_200, true));
  rows.push(totRow);

  // 표 양옆 여백을 절반(M/2)으로 줄여 가로폭 확장 → 다섯자리 수치가 셀 안에서 개행되지 않게.
  const tableX = M / 2;
  const tableW = SLIDE_W - M;
  return {
    els: [
      ...title("로그인 회원 성별/연령대 기준", "PV 현황"),
      { kind: "table", x: tableX, y: BODY_Y, w: tableW, h: BODY_H - 0.3, colW: [1.2, ...Array(21).fill((tableW - 2.2) / 21), 1.0], rows, borderColor: GREY_BORDER, fontFace: FONT, tightCells: true },
    ],
  };
}

// ── 회원 지역별 표 + 지도 ────────────────────────────────────────────────
const REGION_ROWS: { label: string; key: MemberRegion }[] = [
  { label: "서울", key: "서울" }, { label: "경기(인천)", key: "경기(인천)" }, { label: "충청", key: "충청" },
  { label: "경상", key: "경상" }, { label: "전라", key: "전라" }, { label: "*지역 미기재", key: "지역 미기재" }, { label: "강원", key: "강원" },
];

function memberRegionSpec(theme: ThemePair, data: MemberStatsData | null): SlideSpec {
  const main = hex(theme.main);
  const total = data?.totalPv ?? 0;
  const rankOf = (key: MemberRegion) => 1 + REGION_ROWS.filter((r) => (data?.regionPv[r.key] ?? 0) > (data?.regionPv[key] ?? 0)).length;
  const head = (t: string): Cell => ({ text: t, fill: main, color: WHITE, bold: true, align: "center", valign: "middle", size: 10 });
  const rows: Cell[][] = [["지역", "PV", "비율", "순위"].map(head)];
  for (const { label, key } of REGION_ROWS) {
    const pv = data?.regionPv[key] ?? 0;
    rows.push([
      { text: label, fill: GREY_100, bold: true, align: "center", valign: "middle", size: 10 },
      { text: data ? fmtNum(pv) : "", align: "center", valign: "middle", size: 10 },
      { text: data && total > 0 ? `${((pv / total) * 100).toFixed(1)}%` : "", align: "center", valign: "middle", size: 10 },
      { text: data ? String(rankOf(key)) : "", align: "center", valign: "middle", size: 10 },
    ]);
  }
  rows.push([
    { text: "전체", fill: GREY_200, bold: true, align: "center", valign: "middle", size: 10 },
    { text: data ? fmtNum(total) : "", fill: GREY_200, bold: true, align: "center", valign: "middle", size: 10 },
    { text: data && total > 0 ? "100.0%" : "", fill: GREY_200, bold: true, align: "center", valign: "middle", size: 10 },
    { text: "-", fill: GREY_200, bold: true, align: "center", valign: "middle", size: 10 },
  ]);
  const tblW = 4.6;
  const tblH = 4.0;
  const tblY = (SLIDE_H - tblH) / 2; // 표 높이를 화면 세로 중앙에 맞춤(가로 위치는 그대로)
  return {
    els: [
      ...title("로그인 회원 전국 지역별 기준", "PV 현황"),
      { kind: "table", x: M, y: tblY, w: tblW, h: tblH, colW: [1.5, 1.2, 1.0, 0.9], rows, borderColor: GREY_BORDER, fontFace: FONT },
      { kind: "text", x: M, y: tblY + tblH + 0.1, w: tblW, h: 0.4, runs: [{ text: "* 거주지역(회원가입 시 거주지정보) 기반 산출", color: GREY_TEXT, size: 8 }], fontFace: FONT },
      { kind: "asset", asset: "map", tag: "korea-map", mapData: data, x: M + tblW + 0.4, y: BODY_Y, w: BODY_W - tblW - 0.4, h: BODY_H },
    ],
  };
}

// 값 배열을 합이 정확히 100.0%가 되도록 소수 1자리 비율로 변환(최대잉여법).
function toPct100(values: number[]): number[] {
  const sum = values.reduce((s, v) => s + v, 0);
  if (sum <= 0) return values.map(() => 0);
  const scaled = values.map((v) => (v / sum) * 1000);
  const floored = scaled.map((v) => Math.floor(v));
  const rest = 1000 - floored.reduce((s, v) => s + v, 0);
  const order = scaled.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  for (let j = 0; j < rest; j++) floored[order[j].i] += 1;
  return floored.map((v) => v / 10);
}

// ── 연령대 기준 접속자 비율 ──────────────────────────────────────────────
function ageCtrSpec(theme: ThemePair, gender: "male" | "female", _gada: GadaExcelData | null, member: MemberStatsData | null, byMonth: Record<number, MemberStatsData>): SlideSpec {
  const gLabel = gender === "male" ? "남성" : "여성";
  const accent = gender === "male" ? hex(theme.main) : hex(theme.sub);
  const base: El[] = [...title("로그인 회원 연령대 기준", `광고 클릭률 현황(${gLabel})`)];
  if (!member) return { els: [...base, emptyBody("필요한 데이터가 없습니다")] };

  const sumAge = (g: MemberAgeCounts) => AGE_KEYS.reduce((s, k) => s + g[k], 0);
  const M_ = member.month;
  const prevM = M_ <= 1 ? 12 : M_ - 1;
  const curGA = member.genderAge[gender];
  const prevGA = byMonth[prevM]?.genderAge[gender] ?? null;
  const curTotal = sumAge(curGA);
  const prevTotal = prevGA ? sumAge(prevGA) : null;
  const growth = prevTotal != null && prevTotal > 0 ? Math.round(((curTotal - prevTotal) / prevTotal) * 100) : null;
  const barValues = AGE_KEYS.map((k) => curGA[k]);
  const donutPct = toPct100(barValues);
  const maxValue = Math.max(...barValues);
  const maxIndex = maxValue > 0 ? barValues.indexOf(maxValue) : -1;
  // 연령대 슬라이스 색(도넛·막대·범례 공통, 웹 SLICE_COLORS와 동일):
  //  남성 = [tint메인0.5, 메인, 서브, 그레이400/200/300]
  //  여성 = [tint서브0.7(파스텔), 서브, tint서브0.4(밝은 서브), 그레이400/200/300]
  const sliceColors = gender === "male"
    ? [tint(hex(theme.main), 0.5), hex(theme.main), hex(theme.sub), "9CA3AF", "E5E7EB", "D1D5DB"]
    : [tint(hex(theme.sub), 0.7), hex(theme.sub), tint(hex(theme.sub), 0.4), "9CA3AF", "E5E7EB", "D1D5DB"];

  const leftW = BODY_W * 0.42;
  const donutH = BODY_H - 0.3 - 0.95;
  const rx = M + leftW + 0.3;
  const rw = BODY_W - leftW - 0.3;
  const boxH = 0.75;
  const mm = (n: number) => String(n).padStart(2, "0");
  const legendStr = AGE_LABELS.map((l, i) => `${l} ${donutPct[i]}%`).join("     ");
  const bodyY = BODY_Y + 24 / PX_PER_IN; // 시각화 전체를 아래로 24px 이동(제목 제외)

  // 우하단 막대 차트 박스 + "최대 접속 연령" 말풍선(웹 BarChartWithMaxLabel 대응).
  // 네이티브 차트라 막대 정확 좌표를 알 수 없어 플롯 영역을 추정해 최대 막대 위에 띄운다.
  const barX = rx;
  const barY = bodyY + boxH + 0.7;
  const barW = rw;
  const barH = BODY_H - boxH - 0.8;
  const maxLabelEls: El[] = [];
  if (maxIndex >= 0) {
    const plotLeft = barX + 0.45; // 좌측 값(Y)축 라벨 폭 추정
    const plotW = barW - 0.55; // 좌 0.45 + 우 0.1 여백 제외
    const cx = plotLeft + (maxIndex + 0.5) * (plotW / AGE_LABELS.length);
    const bw = 1.15, bh = 0.28, th = 0.1, by = barY + 0.02;
    maxLabelEls.push(
      { kind: "rect", x: cx - bw / 2, y: by, w: bw, h: bh, fill: hex(theme.sub), radius: 0.06 },
      { kind: "text", x: cx - bw / 2, y: by, w: bw, h: bh, runs: [{ text: "최대 접속 연령", bold: true, color: "000000", size: 9 }], align: "center", valign: "middle", fontFace: FONT },
      { kind: "tri", x: cx - 0.07, y: by + bh - 0.01, w: 0.14, h: th, fill: hex(theme.sub), dir: "down" },
    );
  }

  return {
    els: [
      ...base,
      {
        kind: "chart", x: M, y: bodyY + 0.3, w: leftW, h: donutH,
        chart: { kind: "doughnut", labels: AGE_LABELS, series: [{ name: "접속자 비율", values: donutPct }], colors: sliceColors, legend: "none", showValue: true, holeSize: 58, valueSuffix: "%", centerText: [{ text: `${gLabel} 연령대별\n`, bold: true, color: DARK, size: 11 }, { text: "디스플레이 광고 관심도", bold: true, color: GREY_TEXT, size: 9 }] },
      },
      { kind: "text", x: M, y: bodyY + 0.3 + donutH + 0.05, w: leftW, h: 0.85, runs: [{ text: legendStr, color: "374151", size: 9 }], align: "center", valign: "top", fontFace: FONT },
      { kind: "rect", x: rx, y: bodyY, w: rw, h: boxH, fill: GREY_100, radius: 0.06 },
      { kind: "asset", asset: "icon", tag: `agectr-icon-${gender}`, color: accent, x: rx + 0.18, y: bodyY + (boxH - 0.42) / 2, w: 0.42, h: 0.42 },
      {
        kind: "text", x: rx + 0.72, y: bodyY, w: rw - 0.85, h: boxH, align: "left", valign: "middle", fontFace: FONT, size: 11,
        runs: [
          { text: `${gLabel} 총 접속자 수     `, bold: true, color: DARK },
          { text: `${mm(prevM)}월: ${prevTotal != null ? fmtNum(prevTotal) : "—"}  →  ${mm(M_)}월: ${fmtNum(curTotal)}     `, color: "374151" },
          { text: growth != null ? `${growth >= 0 ? "▲" : "▼"} ${Math.abs(growth)}%` : "—", bold: true, color: accent, size: 14 },
        ],
      },
      {
        kind: "text", x: rx, y: bodyY + boxH + 0.15, w: rw, h: 0.5, align: "left", valign: "top", fontFace: FONT,
        runs: [
          { text: "연령별 접속자 수\n", bold: true, color: DARK, size: 11 },
          { text: `Total: ${fmtNum(curTotal)}`, color: "374151", size: 9 },
        ],
      },
      { kind: "chart", x: barX, y: barY, w: barW, h: barH, chart: { kind: "bar", labels: AGE_LABELS, series: [{ name: "접속자 수", values: barValues }], colors: sliceColors, legend: "none", showValue: true, lightGrid: true } },
      ...maxLabelEls,
    ],
  };
}

// ── 유전자 검사 콘텐츠 현황 표 (9행 × 17열) ──────────────────────────────
const GENETIC_RED = "F04438"; // 테일어드민 error-500
const GENETIC_DISEASES_1 = ["간암", "갑상선암", "고혈압", "고환암", "골관절염", "골다공증", "관상동맥/질환", "난소암", "뇌동맥류", "뇌졸중", "담낭암", "대장암", "류마티스/관절염", "만성폐쇄성/폐질환", "방광암", "비만"];
const GENETIC_DISEASES_2 = ["식도암", "신장암", "심근/경색증", "심방세동", "위암", "자궁/경부암", "자궁/내막암", "유방암", "전립선암", "제2형/당뇨병", "천식", "췌장암", "치매", "파킨슨병", "편두통/황반변성", "폐암"];
const nlSlash = (s: string) => s.replace("/", "\n"); // "/" → 셀 내 개행

function geneticSpec(theme: ThemePair): SlideSpec {
  const main = hex(theme.main);
  const period = reportDateRange();
  const sz = 9;
  const headCell = (text: string, extra: Partial<Cell> = {}): Cell => ({ text, fill: main, color: WHITE, extraBold: true, align: "center", valign: "middle", size: sz, ...extra });
  // "만성폐쇄성/폐질환"만 글자가 길어 셀을 넘쳐 1pt 줄임.
  const groupCell = (text: string): Cell => ({ text: nlSlash(text), fill: GREY_300, color: "000000", extraBold: true, align: "center", valign: "middle", size: text === "만성폐쇄성/폐질환" ? sz - 1 : sz });
  const labelCell = (text: string): Cell => ({ text, fill: GREY_100, color: "000000", extraBold: true, align: "center", valign: "middle", size: sz });
  const dataRow = (label: string): Cell[] => [labelCell(label), ...Array.from({ length: 16 }, () => ({ text: "1,000", fill: WHITE, color: "000000", align: "center" as Align, valign: "middle" as VAlign, size: sz }))];

  const rows: Cell[][] = [
    [headCell("기간"), headCell(period, { colspan: 16 })],
    [groupCell("구분"), ...GENETIC_DISEASES_1.map(groupCell)],
    dataRow("총수량"), dataRow("남성"), dataRow("여성"),
    [groupCell("구분"), ...GENETIC_DISEASES_2.map(groupCell)],
    dataRow("총수량"), dataRow("남성"), dataRow("여성"),
  ];

  const tableX = M / 2;
  const tableW = SLIDE_W - M;
  const labelW = 1.3;
  const colW = [labelW, ...Array(16).fill((tableW - labelW) / 16)];
  // 모든 행 동일 높이.
  const baseRowH = 0.5;
  const rowH = rows.map(() => baseRowH);
  const tableH = rowH.reduce((s, v) => s + v, 0);

  const noteRuns: Run[] = [
    { text: "* 한컴Gx 유전자 검사 25년 05월 신청건수: 20,403건( 남성 11,982 / 여성 8,421 )  \n", color: GREY_TEXT, size: 9 },
    { text: "* 한컴Gx 유전자 검사 신청고객에 대해 건강정보 발송 시 ", color: GREY_TEXT, size: 9 },
    { text: "“폐렴구균 예방접종”", color: GENETIC_RED, size: 9 },
    { text: " 안내( ※ 자궁경부(내막)암 신청하신 고객은 ", color: GREY_TEXT, size: 9 },
    { text: "“가다실9가”", color: GENETIC_RED, size: 9 },
    { text: "  별도 추가 안내 )", color: GREY_TEXT, size: 9 },
  ];

  const bodyY = BODY_Y + 24 / PX_PER_IN; // 표·문구만 아래로 24px (제목은 고정)
  return {
    els: [
      ...title("한컴Gx 유전자 검사 결과지 컨텐츠 현황"),
      { kind: "table", x: tableX, y: bodyY, w: tableW, h: tableH, colW, rowH, rows, borderColor: GREY_BORDER, fontFace: FONT },
      { kind: "text", x: tableX, y: bodyY + tableH + 0.2, w: tableW, h: 0.7, runs: noteRuns, align: "left", valign: "top", fontFace: FONT, lineSpacingMultiple: 1.3 },
    ],
  };
}

// ════════════════════════════════════════════════════════════════════════
//  전체 리포트 사양 (표지~종표지, 순서 = 미리보기/PPTX 공통)
// ════════════════════════════════════════════════════════════════════════
export function buildReportSpec(d: ReportData): SlideSpec[] {
  const { theme, gadaData, displayAdData, memberStatsData, memberStatsByMonth } = d;
  return [
    coverSpec(theme),
    sectionSpec(theme, "01", "기업체·병원별 마케팅 현황"),
    companyTableSpec(theme),
    integratedSpec(theme, gadaData, displayAdData),
    companyDetailSpec(),
    genderSectionSpec(theme, gadaData, displayAdData, "package"),
    genderSectionSpec(theme, gadaData, displayAdData, "additional"),
    hospitalSpec(theme, gadaData),
    sectionSpec(theme, "02", "디스플레이 광고 현황"),
    pvUvSpec(theme, "PV/UV 전체 현황(전체 방문통계)", displayAdData?.totalVisit ?? null, displayAdData),
    pvUvSpec(theme, "PV/UV 전체 현황(로그인 회원 방문통계)", displayAdData?.memberVisit ?? null, displayAdData),
    memberGenderAgeSpec(theme, memberStatsData),
    memberRegionSpec(theme, memberStatsData),
    ageCtrSpec(theme, "male", gadaData, memberStatsData, memberStatsByMonth),
    ageCtrSpec(theme, "female", gadaData, memberStatsData, memberStatsByMonth),
    sectionSpec(theme, "03", "유전자 검사 콘텐츠 현황"),
    geneticSpec(theme),
    endSpec(),
  ];
}
