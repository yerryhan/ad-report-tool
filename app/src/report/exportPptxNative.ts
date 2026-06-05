import pptxgen from "pptxgenjs";
import { toPng } from "html-to-image";
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
//  편집 가능한(네이티브) PPTX 생성기 — 화면 캡처 대신 텍스트·표·차트 객체로 생성.
//  복잡한 비주얼(대한민국 지도·아이콘)만 화면에서 이미지로 캡처해 삽입(하이브리드).
// ════════════════════════════════════════════════════════════════════════

type ThemePair = { name: string; main: string; sub: string };

export type ReportExportArgs = {
  theme: ThemePair;
  gadaData: GadaExcelData | null;
  displayAdData: DisplayAdData | null;
  memberStatsData: MemberStatsData | null;
  memberStatsByMonth: Record<number, MemberStatsData>;
  fileName: string;
};

// ── 레이아웃 상수(inch) ──────────────────────────────────────────────────
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const M = 0.7; // 사방 여백(넉넉하게)
const TITLE_Y = 0.4;
const TITLE_H = 0.55;
const BODY_Y = 1.15;
const BODY_W = SLIDE_W - 2 * M;
const BODY_H = SLIDE_H - BODY_Y - M;

const DARK = "101828";
const GREY_BORDER = "D1D5DB";
const GREY_100 = "F3F4F6";
const GREY_200 = "E5E7EB";
const GREY_300 = "D1D5DB";
const GREY_TEXT = "6B7280";
const WHITE = "FFFFFF";
const FONT = "NanumSquare";
const FONT_EB = "NanumSquare ExtraBold"; // 표지/장표지 전용 (설치 폰트명 기준)

// 기준선(그리드): 연한 그레이 + X축 격자 없음 (화면과 동일한 느낌)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GRID: any = {
  valGridLine: { color: GREY_100, size: 1 },
  catGridLine: { style: "none" },
};

const MONTH12 = [
  "1월","2월","3월","4월","5월","6월",
  "7월","8월","9월","10월","11월","12월",
];

const hex = (c: string) => c.replace("#", "").toUpperCase();

// ── 이미지 로딩 ──────────────────────────────────────────────────────────
type Img = { data: string; w: number; h: number };

async function fetchDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// dataURL + 원본 픽셀 크기(비율 유지용)
async function loadImage(url: string): Promise<Img | null> {
  const data = await fetchDataUrl(url);
  if (!data) return null;
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ data, w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = data;
  });
}

// 화면 미리보기에 렌더된 특정 노드를 PNG로 캡처(지도·아이콘 등)
async function captureNode(selector: string): Promise<string | null> {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return null;
  try {
    return await toPng(el, { cacheBust: true });
  } catch {
    return null;
  }
}

const fmtNum = (v: number | undefined): string =>
  v === undefined || v === null || Number.isNaN(v)
    ? ""
    : v.toLocaleString("ko-KR");

// ── 슬라이드 공통: 본문 슬라이드 제목 (표지/장표지/종표지 제외) ──────────
function addTitle(slide: pptxgen.Slide, main: string, sub?: string) {
  const runs: pptxgen.TextProps[] = [
    { text: main, options: { fontSize: 18, bold: true, color: DARK } },
  ];
  if (sub) {
    runs.push({
      text: ` - ${sub}`,
      options: { fontSize: 14, bold: true, color: DARK },
    });
  }
  slide.addText(runs, {
    x: M,
    y: TITLE_Y,
    w: BODY_W,
    h: TITLE_H,
    align: "left",
    valign: "middle",
    fontFace: FONT,
  });
  slide.addShape("line", {
    x: M,
    y: TITLE_Y + TITLE_H,
    w: BODY_W,
    h: 0,
    line: { color: GREY_200, width: 1 },
  });
}

// ════════════════════════════════════════════════════════════════════════
//  표지 / 장표지 / 종표지
// ════════════════════════════════════════════════════════════════════════
type CoverImgs = {
  main: Img | null;
  inner: Img | null;
  msd: Img | null;
  white: Img | null;
  black: Img | null;
};

function reportDateRange(): string {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const y = t.getFullYear();
  const m = t.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  const f = (d: number) =>
    `${y}.${String(m + 1).padStart(2, "0")}.${String(d).padStart(2, "0")}.`;
  return `${f(1)} ~ ${f(last)}`;
}

function addCover(pptx: pptxgen, imgs: CoverImgs, theme: ThemePair) {
  const slide = pptx.addSlide();
  slide.background = imgs.main ? { data: imgs.main.data } : { color: WHITE };

  if (imgs.msd) {
    const w = 2.16;
    const h = w * (imgs.msd.h / imgs.msd.w);
    slide.addImage({ data: imgs.msd.data, x: 0.97, y: 1.04, w, h });
  }

  slide.addText(
    [
      { text: "한국MSD 가다실9", options: { color: hex(theme.main), breakLine: true } },
      { text: "광고·마케팅 리포트", options: { color: "000000" } },
    ],
    { x: 0.95, y: 1.9, w: 9, h: 1.7, fontSize: 35, bold: true, fontFace: FONT_EB, align: "left", valign: "top" }
  );
  slide.addText(reportDateRange(), {
    x: 1.0, y: 3.7, w: 8, h: 0.4, fontSize: 14, color: "000000", fontFace: FONT_EB, align: "left",
  });
  slide.addText("Total Healthcare Service, HANCOM CARELINK", {
    x: 1.0, y: SLIDE_H - 0.7, w: 8, h: 0.35, fontSize: 12, color: "000000", fontFace: FONT_EB, align: "left",
  });
  if (imgs.white) {
    const w = 1.05;
    const h = w * (imgs.white.h / imgs.white.w);
    slide.addImage({ data: imgs.white.data, x: SLIDE_W - 0.97 - w, y: SLIDE_H - 0.39 - h, w, h });
  }
}

function addSection(pptx: pptxgen, imgs: CoverImgs, theme: ThemePair, num: string, title: string) {
  const slide = pptx.addSlide();
  slide.background = imgs.inner ? { data: imgs.inner.data } : { color: WHITE };
  slide.addText(
    [
      { text: num, options: { color: hex(theme.main) } },
      { text: ` ${title}`, options: { color: "000000" } },
    ],
    { x: 0, y: SLIDE_H / 2 - 0.6, w: SLIDE_W, h: 1.2, fontSize: 28, bold: true, align: "center", valign: "middle", fontFace: FONT_EB }
  );
}

function addEnd(pptx: pptxgen, imgs: CoverImgs) {
  const slide = pptx.addSlide();
  slide.background = imgs.main ? { data: imgs.main.data } : { color: WHITE };
  if (imgs.black) {
    const h = 0.88;
    const w = h * (imgs.black.w / imgs.black.h);
    slide.addImage({ data: imgs.black.data, x: (SLIDE_W - w) / 2, y: (SLIDE_H - h) / 2, w, h });
  }
}

// ════════════════════════════════════════════════════════════════════════
//  01 기업체·병원별 마케팅 현황
// ════════════════════════════════════════════════════════════════════════

function buildMonthly(
  display: GenderMonthly[] | undefined,
  gada: GadaExcelData | null,
  kind: "package" | "additional"
): { male: number; female: number }[] {
  const arr = Array.from({ length: 12 }, () => ({ male: 0, female: 0 }));
  if (display) for (let i = 0; i < 12; i++) arr[i] = { male: display[i].male, female: display[i].female };
  if (gada?.genderStats && gada.month >= 1 && gada.month <= 12) {
    const gs = gada.genderStats;
    arr[gada.month - 1] =
      kind === "package"
        ? { male: gs.packageMale, female: gs.packageFemale }
        : { male: gs.additionalMale, female: gs.additionalFemale };
  }
  return arr;
}

// C1: 기업체별 마케팅 현황 (9×3 빈 템플릿 표)
function slideCompanyTable(pptx: pptxgen, theme: ThemePair) {
  const slide = pptx.addSlide();
  addTitle(slide, "기업체별 마케팅 현황");
  const headers = ["기업체", "검진 단가", "마케팅 상세 내용"];
  const rows: pptxgen.TableRow[] = [];
  rows.push(
    headers.map((h) => ({
      text: h,
      options: { fill: { color: hex(theme.main) }, color: WHITE, bold: true, align: "center", valign: "middle", fontSize: 11 },
    }))
  );
  for (let r = 0; r < 8; r++) {
    rows.push(
      [0, 1, 2].map(() => ({
        text: "",
        options: { fill: { color: WHITE }, align: "center", valign: "middle", fontSize: 11 },
      }))
    );
  }
  slide.addTable(rows, {
    x: M, y: BODY_Y, w: BODY_W, h: BODY_H,
    colW: [BODY_W * 0.2143, BODY_W * 0.1429, BODY_W * 0.6428],
    rowH: Array(9).fill(BODY_H / 9),
    border: { type: "solid", pt: 0.5, color: GREY_BORDER },
    fontFace: FONT, valign: "middle",
  });
}

// C2: 통합 통계 (꺾은선 + 막대 2개 + 범례)
function slideIntegrated(pptx: pptxgen, theme: ThemePair, gada: GadaExcelData | null, display: DisplayAdData | null) {
  const slide = pptx.addSlide();
  addTitle(slide, "통합 통계");
  if (!gada?.genderStats) {
    slide.addText("업로드된 데이터가 없습니다", { x: M, y: BODY_Y, w: BODY_W, h: BODY_H, align: "center", valign: "middle", color: GREY_TEXT, fontSize: 14, fontFace: FONT });
    return;
  }
  const gs = gada.genderStats;
  const reportMonth = gada.month || new Date().getMonth() + 1;
  const weeks = Array.from({ length: 5 }, (_, i) => `${reportMonth}월 ${i + 1}주차`);
  const examCount = gs.packageMale + gs.packageFemale;
  const selfCount = gs.additionalMale + gs.additionalFemale;
  const total = examCount + selfCount;
  const examPct = total > 0 ? parseFloat(((examCount / total) * 100).toFixed(1)) : 0;
  const selfPct = total > 0 ? parseFloat(((selfCount / total) * 100).toFixed(1)) : 0;
  const weeklyExam = Array(5).fill(50);
  const weeklySelf = Array(5).fill(20);

  const halfW = BODY_W / 2 - 0.2;
  slide.addText("기간별 예약 신청통계", { x: M, y: BODY_Y, w: halfW, h: 0.3, fontSize: 11, bold: true, color: DARK, fontFace: FONT });
  slide.addChart(
    "line",
    [
      { name: "검진유형 예약", labels: weeks, values: weeklyExam },
      { name: "본인부담 예약", labels: weeks, values: weeklySelf },
    ],
    {
      x: M, y: BODY_Y + 0.35, w: halfW, h: BODY_H - 0.35,
      chartColors: [hex(theme.main), hex(theme.sub)],
      showLegend: true, legendPos: "t", lineSize: 2, lineSmooth: false,
      catAxisLabelFontSize: 9, valAxisLabelFontSize: 9, showValue: false,
      ...GRID,
    }
  );
  slide.addText(
    `검진유형 예약 ${examCount.toLocaleString("ko-KR")}건(${examPct}%) / 본인부담 예약 ${selfCount.toLocaleString("ko-KR")}건(${selfPct}%)`,
    { x: M, y: BODY_Y + BODY_H + 0.02, w: halfW, h: 0.25, fontSize: 9, color: GREY_TEXT, fontFace: FONT }
  );

  const pkg = buildMonthly(display?.packageMonthly, gada, "package").map((e) => e.male + e.female);
  const add = buildMonthly(display?.additionalMonthly, gada, "additional").map((e) => e.male + e.female);
  const rx = M + BODY_W / 2 + 0.2;
  const rh = BODY_H / 2 - 0.2;
  slide.addText("검진유형 패키지 월별 추이", { x: rx, y: BODY_Y, w: halfW, h: 0.25, fontSize: 11, bold: true, color: DARK, fontFace: FONT });
  slide.addChart("bar", [{ name: "검진유형 패키지", labels: MONTH12, values: pkg }], {
    x: rx, y: BODY_Y + 0.3, w: halfW, h: rh, chartColors: [hex(theme.main)], showLegend: false, catAxisLabelFontSize: 8, valAxisLabelFontSize: 8, ...GRID,
  });
  slide.addText("선택 추가항목 월별 추이", { x: rx, y: BODY_Y + rh + 0.35, w: halfW, h: 0.25, fontSize: 11, bold: true, color: DARK, fontFace: FONT });
  slide.addChart("bar", [{ name: "선택 추가항목", labels: MONTH12, values: add }], {
    x: rx, y: BODY_Y + rh + 0.65, w: halfW, h: rh, chartColors: [hex(theme.sub)], showLegend: false, catAxisLabelFontSize: 8, valAxisLabelFontSize: 8, ...GRID,
  });
}

// C3: 상세내역 (제목만)
function slideCompanyDetail(pptx: pptxgen) {
  const slide = pptx.addSlide();
  addTitle(slide, "기업체별 마케팅 현황", "상세내역");
}

// C4/C5: 성별 통계 (막대 + 도넛2 + 면적 + 표)
function slideGenderSection(
  pptx: pptxgen,
  theme: ThemePair,
  gada: GadaExcelData | null,
  display: DisplayAdData | null,
  kind: "package" | "additional"
) {
  const slide = pptx.addSlide();
  const sub = kind === "package" ? "검진유형 패키지 성별 통계내역" : "선택 추가항목 성별 통계내역";
  addTitle(slide, "기업체별 마케팅 현황", sub);
  if (!gada?.genderStats) {
    slide.addText("업로드된 데이터가 없습니다", { x: M, y: BODY_Y, w: BODY_W, h: BODY_H, align: "center", valign: "middle", color: GREY_TEXT, fontSize: 14, fontFace: FONT });
    return;
  }
  const gs = gada.genderStats;
  const monthly = buildMonthly(kind === "package" ? display?.packageMonthly : display?.additionalMonthly, gada, kind);
  const male = monthly.map((e) => e.male);
  const female = monthly.map((e) => e.female);
  const aPct = kind === "package" ? gs.packageMalePct : gs.additionalMalePct;
  const bPct = kind === "package" ? parseFloat((100 - aPct).toFixed(1)) : gs.additionalFemalePct;

  const halfW = BODY_W / 2 - 0.2;
  slide.addText("월별 남성/여성 통계", { x: M, y: BODY_Y, w: halfW, h: 0.25, fontSize: 11, bold: true, color: DARK, fontFace: FONT });
  slide.addChart(
    "bar",
    [
      { name: "남성", labels: MONTH12, values: male },
      { name: "여성", labels: MONTH12, values: female },
    ],
    { x: M, y: BODY_Y + 0.3, w: halfW, h: BODY_H * 0.55, barGrouping: "stacked", chartColors: [hex(theme.main), hex(theme.sub)], showLegend: true, legendPos: "t", catAxisLabelFontSize: 8, valAxisLabelFontSize: 8, ...GRID }
  );
  const cumMale = male.reduce((s, v) => s + v, 0);
  const cumFemale = female.reduce((s, v) => s + v, 0);
  const tblRows: pptxgen.TableRow[] = [
    [{ text: "", options: { fill: { color: GREY_100 } } }, ...MONTH12.map((m) => ({ text: m, options: { fill: { color: GREY_100 }, bold: true } })), { text: "누적", options: { fill: { color: GREY_100 }, bold: true } }],
    [{ text: "여성", options: { fill: { color: GREY_100 }, bold: true } }, ...female.map((v) => ({ text: String(v) })), { text: String(cumFemale), options: { bold: true } }],
    [{ text: "남성", options: { fill: { color: GREY_100 }, bold: true } }, ...male.map((v) => ({ text: String(v) })), { text: String(cumMale), options: { bold: true } }],
  ];
  slide.addTable(tblRows, { x: M, y: BODY_Y + 0.3 + BODY_H * 0.55 + 0.15, w: halfW, h: BODY_H * 0.28, fontSize: 7, align: "center", valign: "middle", border: { type: "solid", pt: 0.5, color: GREY_BORDER }, fontFace: FONT });

  const rx = M + BODY_W / 2 + 0.2;
  const donutH = BODY_H * 0.5;
  const donutW = halfW / 2 - 0.1;
  slide.addText("해당월 성별 비율", { x: rx, y: BODY_Y, w: halfW, h: 0.25, fontSize: 11, bold: true, color: DARK, fontFace: FONT });
  slide.addChart("doughnut", [{ name: "남성", labels: ["남성", "여성"], values: [aPct, parseFloat((100 - aPct).toFixed(1))] }], {
    x: rx, y: BODY_Y + 0.35, w: donutW, h: donutH, chartColors: [hex(theme.main), GREY_200], showLegend: false, dataLabelFontSize: 8, holeSize: 55, showValue: true,
  });
  slide.addText(`${aPct}%\n남성`, { x: rx, y: BODY_Y + 0.35, w: donutW, h: donutH, align: "center", valign: "middle", fontSize: 10, bold: true, color: DARK, fontFace: FONT });
  slide.addChart("doughnut", [{ name: "여성", labels: ["여성", "남성"], values: [bPct, parseFloat((100 - bPct).toFixed(1))] }], {
    x: rx + donutW + 0.2, y: BODY_Y + 0.35, w: donutW, h: donutH, chartColors: [hex(theme.sub), GREY_200], showLegend: false, dataLabelFontSize: 8, holeSize: 55, showValue: true,
  });
  slide.addText(`${bPct}%\n여성`, { x: rx + donutW + 0.2, y: BODY_Y + 0.35, w: donutW, h: donutH, align: "center", valign: "middle", fontSize: 10, bold: true, color: DARK, fontFace: FONT });

  // 우하단: 면적(추이) — 단색 대신 반투명 채움으로 그라데이션 면적 느낌 근사
  slide.addText("월별 남성/여성 통계 추이", { x: rx, y: BODY_Y + donutH + 0.45, w: halfW, h: 0.25, fontSize: 11, bold: true, color: DARK, fontFace: FONT });
  slide.addChart(
    "area",
    [
      { name: "남성", labels: MONTH12, values: male },
      { name: "여성", labels: MONTH12, values: female },
    ],
    { x: rx, y: BODY_Y + donutH + 0.75, w: halfW, h: BODY_H - donutH - 0.85, chartColors: [hex(theme.main), hex(theme.sub)], chartColorsOpacity: [40, 40], showLegend: true, legendPos: "t", catAxisLabelFontSize: 7, valAxisLabelFontSize: 7, ...GRID }
  );
}

// H1: 병원별 예약 현황 (막대 + 기타 목록)
function slideHospital(pptx: pptxgen, theme: ThemePair, gada: GadaExcelData | null) {
  const slide = pptx.addSlide();
  addTitle(slide, "병원별 예약 현황");
  if (!gada) {
    slide.addText("업로드된 데이터가 없습니다", { x: M, y: BODY_Y, w: BODY_W, h: BODY_H, align: "center", valign: "middle", color: GREY_TEXT, fontSize: 14, fontFace: FONT });
    return;
  }
  const otherCount = gada.otherHospitals.reduce((a, h) => a + h.count, 0);
  const totalCount = gada.mainHospitals.reduce((a, h) => a + h.count, 0) + otherCount;
  const cats = gada.mainHospitals.map((h) => h.hospital);
  const vals = gada.mainHospitals.map((h) => (totalCount > 0 ? parseFloat(((h.count / totalCount) * 100).toFixed(1)) : 0));

  const chartW = BODY_W * 0.62;
  slide.addChart("bar", [{ name: "예약 비율", labels: cats, values: vals }], {
    x: M, y: BODY_Y, w: chartW, h: BODY_H,
    chartColors: cats.map(() => hex(theme.main)),
    showLegend: false, showValue: true, dataLabelFontSize: 8, dataLabelFormatCode: '0.0"%"',
    catAxisLabelFontSize: 8, valAxisLabelFontSize: 8, valAxisTitle: "예약 비율 (%)", showValAxisTitle: true, valAxisTitleFontSize: 9,
    ...GRID,
  });

  const lx = M + chartW + 0.3;
  const lw = BODY_W - chartW - 0.3;
  slide.addText(`기타 병원 (${gada.otherHospitals.length}개)`, { x: lx, y: BODY_Y, w: lw, h: 0.3, fontSize: 11, bold: true, color: DARK, fontFace: FONT });
  const listText = gada.otherHospitals.map((h) => h.hospital).join("\n");
  // 행간 2배 + 글자 2pt 키움(8→10)
  slide.addText(listText || "기타 병원 없음", {
    x: lx, y: BODY_Y + 0.35, w: lw, h: BODY_H - 0.35, fontSize: 10, color: "374151", fontFace: FONT, align: "left", valign: "top", fill: { color: GREY_100 }, margin: 6, lineSpacingMultiple: 2,
  });
}

// ════════════════════════════════════════════════════════════════════════
//  02 디스플레이 광고 현황 — PV/UV 표
// ════════════════════════════════════════════════════════════════════════
const PV_COLS = 10;
const PV_COLSPAN: Record<number, number> = { 1: 2, 3: 4, 7: 4, 71: 2 };
const PV_ROWSPAN: Record<number, number> = { 51: 2 };
const PV_COVERED = new Set([2, 4, 5, 6, 8, 9, 10, 61, 72]);
const PLACEMENT_NAMES = [
  "메인 페이지 배너",
  "이벤트 모음 페이지 배너",
  "검진센터 둘러보기 페이지 배너",
  "건강검진 예약하기 페이지 배너",
  "건강검진 예약 정보 조회 페이지 배너",
];

function latestDataMonth(d: DisplayAdData | null): number {
  const scan = (pv?: number[]) => {
    if (!pv) return 0;
    for (let i = 11; i >= 0; i--) if (pv[i] > 0) return i + 1;
    return 0;
  };
  return scan(d?.totalVisit.pvTotal) || scan(d?.memberVisit.pvTotal) || new Date().getMonth() + 1;
}

function pvText(n: number, months: [string, string, string]): string {
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
  if (row === 8) {
    pv = data.pvTotal;
    uv = data.uvTotal;
  } else {
    const name = PLACEMENT_NAMES[row - 3];
    const rd: VisitPlacementRow | undefined = data.rows.find((r) => r.placement === name) ?? data.rows[row - 3];
    pv = rd?.pv;
    uv = rd?.uv;
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

function slidePvUv(pptx: pptxgen, theme: ThemePair, sub: string, data: VisitStatsTable | null, display: DisplayAdData | null) {
  const slide = pptx.addSlide();
  addTitle(slide, "디스플레이 광고 현황", sub);
  const lm = latestDataMonth(display);
  const months: [string, string, string] = [`${lm - 2}월`, `${lm - 1}월`, `${lm}월`];
  const monthNums: [number, number, number] = [lm - 2, lm - 1, lm];

  const rows: pptxgen.TableRow[] = [];
  for (let row = 1; row <= 8; row++) {
    const r: pptxgen.TableCell[] = [];
    for (let col = 1; col <= PV_COLS; col++) {
      const n = (row - 1) * PV_COLS + col;
      if (PV_COVERED.has(n)) continue;
      const fill = pvFill(n, theme.main);
      const text = pvText(n, months) || pvCellData(n, data, monthNums);
      r.push({
        text,
        options: {
          fill: { color: fill },
          color: n <= 20 ? WHITE : "000000",
          bold: fill !== WHITE,
          align: "center",
          valign: "middle",
          fontSize: 8,
          colspan: PV_COLSPAN[n],
          rowspan: PV_ROWSPAN[n],
        },
      });
    }
    rows.push(r);
  }
  const tableH = BODY_H - 0.5;
  slide.addTable(rows, {
    x: M, y: BODY_Y, w: BODY_W, h: tableH,
    colW: Array(PV_COLS).fill(BODY_W / PV_COLS),
    border: { type: "solid", pt: 0.5, color: GREY_BORDER }, fontFace: FONT, valign: "middle",
  });
  slide.addText(
    "* UV의 차이는 Count방법 상이 / * 증감률은 전월대비 증감률, 월별 PV/UV는 최근 3개월만 표현",
    { x: M, y: BODY_Y + tableH + 0.1, w: BODY_W, h: 0.35, fontSize: 8, color: GREY_TEXT, fontFace: FONT }
  );
}

// ── 회원 성별/연령대 표 (M1) ─────────────────────────────────────────────
const AGE_KEYS: (keyof MemberAgeCounts)[] = ["age20", "age30", "age40", "age50", "age60", "etc"];
const AGE_LABELS = ["20대", "30대", "40대", "50대", "60대", "기타"];
const GENDERS: { key: MemberGenderKey; label: string }[] = [
  { key: "male", label: "남성" },
  { key: "female", label: "여성" },
  { key: "unknown", label: "성별 미기재" },
];
const EMPTY_AGE: MemberAgeCounts = { age20: 0, age30: 0, age40: 0, age50: 0, age60: 0, etc: 0 };

function slideMemberGenderAge(pptx: pptxgen, theme: ThemePair, data: MemberStatsData | null) {
  const slide = pptx.addSlide();
  addTitle(slide, "로그인 회원 성별/연령대 기준", "PV 현황");
  const main = hex(theme.main);
  const countsOf = (label: string, key: MemberGenderKey) => data?.areaStats?.[label]?.[key] ?? EMPTY_AGE;
  const sumAge = (g: MemberAgeCounts) => AGE_KEYS.reduce((s, k) => s + g[k], 0);
  const num = (v: number) => (!data ? "" : v === 0 ? "-" : fmtNum(v));
  const period =
    data && data.year && data.month >= 1
      ? `${data.year}. ${String(data.month).padStart(2, "0")}. 01. ~ ${data.year}. ${String(data.month).padStart(2, "0")}. ${String(new Date(data.year, data.month, 0).getDate()).padStart(2, "0")}.`
      : "—";

  const head = (t: string, opt: Partial<pptxgen.TableCellProps> = {}): pptxgen.TableCell => ({
    text: t, options: { fill: { color: main }, color: WHITE, bold: true, align: "center", valign: "middle", fontSize: 7, ...opt },
  });
  const gcell = (t: string, fill: string, bold = false): pptxgen.TableCell => ({
    text: t, options: { fill: { color: fill }, color: "000000", bold, align: "center", valign: "middle", fontSize: 7 },
  });

  const rows: pptxgen.TableRow[] = [];
  rows.push([
    head("광고 영역", { rowspan: 3 }),
    head(period, { colspan: 21 }),
    head("합계", { rowspan: 3 }),
  ]);
  rows.push(GENDERS.map((g) => head(g.label, { colspan: 7 })));
  rows.push(GENDERS.flatMap(() => [...AGE_LABELS, "소계"].map((l) => head(l))));
  for (const label of MEMBER_AREA_LABELS) {
    const row: pptxgen.TableCell[] = [gcell(label, GREY_100, true)];
    let rowTotal = 0;
    for (const g of GENDERS) {
      const c = countsOf(label, g.key);
      for (const k of AGE_KEYS) row.push(gcell(num(c[k]), WHITE));
      const sub = sumAge(c);
      rowTotal += sub;
      row.push(gcell(num(sub), WHITE));
    }
    row.push(gcell(num(rowTotal), GREY_100));
    rows.push(row);
  }
  const colTotal = (key: MemberGenderKey, ageKey: keyof MemberAgeCounts) =>
    MEMBER_AREA_LABELS.reduce((s, l) => s + countsOf(l, key)[ageKey], 0);
  const genderTotal = (key: MemberGenderKey) =>
    MEMBER_AREA_LABELS.reduce((s, l) => s + sumAge(countsOf(l, key)), 0);
  const grand = MEMBER_AREA_LABELS.reduce((s, l) => s + GENDERS.reduce((ss, g) => ss + sumAge(countsOf(l, g.key)), 0), 0);
  const totRow: pptxgen.TableCell[] = [gcell("합 계", GREY_200, true)];
  for (const g of GENDERS) {
    for (const k of AGE_KEYS) totRow.push(gcell(num(colTotal(g.key, k)), GREY_200, true));
    totRow.push(gcell(num(genderTotal(g.key)), GREY_200, true));
  }
  totRow.push(gcell(num(grand), GREY_200, true));
  rows.push(totRow);

  const colW = [1.2, ...Array(21).fill((BODY_W - 1.2 - 1.0) / 21), 1.0];
  slide.addTable(rows, {
    x: M, y: BODY_Y, w: BODY_W, h: BODY_H - 0.3,
    colW, border: { type: "solid", pt: 0.5, color: GREY_BORDER }, fontFace: FONT, valign: "middle",
  });
}

// ── 회원 지역별 표 + 지도 이미지 (M2) ────────────────────────────────────
const REGION_ROWS: { label: string; key: MemberRegion }[] = [
  { label: "서울", key: "서울" },
  { label: "경기(인천)", key: "경기(인천)" },
  { label: "충청", key: "충청" },
  { label: "경상", key: "경상" },
  { label: "전라", key: "전라" },
  { label: "*지역 미기재", key: "지역 미기재" },
  { label: "강원", key: "강원" },
];

function slideMemberRegion(pptx: pptxgen, theme: ThemePair, data: MemberStatsData | null, mapImg: string | null) {
  const slide = pptx.addSlide();
  addTitle(slide, "로그인 회원 전국 지역별 기준", "PV 현황");
  const main = hex(theme.main);
  const total = data?.totalPv ?? 0;
  const rankOf = (key: MemberRegion) => 1 + REGION_ROWS.filter((r) => (data?.regionPv[r.key] ?? 0) > (data?.regionPv[key] ?? 0)).length;

  const head = (t: string): pptxgen.TableCell => ({ text: t, options: { fill: { color: main }, color: WHITE, bold: true, align: "center", valign: "middle", fontSize: 10 } });
  const rows: pptxgen.TableRow[] = [["지역", "PV", "비율", "순위"].map(head)];
  for (const { label, key } of REGION_ROWS) {
    const pv = data?.regionPv[key] ?? 0;
    rows.push([
      { text: label, options: { fill: { color: GREY_100 }, bold: true, align: "center", valign: "middle", fontSize: 10 } },
      { text: data ? fmtNum(pv) : "", options: { align: "center", valign: "middle", fontSize: 10 } },
      { text: data && total > 0 ? `${((pv / total) * 100).toFixed(1)}%` : "", options: { align: "center", valign: "middle", fontSize: 10 } },
      { text: data ? String(rankOf(key)) : "", options: { align: "center", valign: "middle", fontSize: 10 } },
    ]);
  }
  rows.push([
    { text: "전체", options: { fill: { color: GREY_200 }, bold: true, align: "center", valign: "middle", fontSize: 10 } },
    { text: data ? fmtNum(total) : "", options: { fill: { color: GREY_200 }, bold: true, align: "center", valign: "middle", fontSize: 10 } },
    { text: data && total > 0 ? "100.0%" : "", options: { fill: { color: GREY_200 }, bold: true, align: "center", valign: "middle", fontSize: 10 } },
    { text: "-", options: { fill: { color: GREY_200 }, bold: true, align: "center", valign: "middle", fontSize: 10 } },
  ]);

  const tblW = 4.6;
  slide.addTable(rows, { x: M, y: BODY_Y + 0.2, w: tblW, h: 4.0, colW: [1.5, 1.2, 1.0, 0.9], border: { type: "solid", pt: 0.5, color: GREY_BORDER }, fontFace: FONT, valign: "middle" });
  slide.addText(
    "* 거주지역(회원가입 시 거주지정보) 기반 산출",
    { x: M, y: BODY_Y + 4.3, w: tblW, h: 0.4, fontSize: 8, color: GREY_TEXT, fontFace: FONT }
  );
  if (mapImg) {
    slide.addImage({ data: mapImg, x: M + tblW + 0.4, y: BODY_Y, w: BODY_W - tblW - 0.4, h: BODY_H, sizing: { type: "contain", w: BODY_W - tblW - 0.4, h: BODY_H } });
  }
}

// ── 연령대 클릭률 (A1/A2) ────────────────────────────────────────────────
function slideAgeCtr(
  pptx: pptxgen,
  theme: ThemePair,
  gender: "male" | "female",
  gada: GadaExcelData | null,
  member: MemberStatsData | null,
  memberByMonth: Record<number, MemberStatsData>,
  icon: string | null
) {
  const slide = pptx.addSlide();
  const gLabel = gender === "male" ? "남성" : "여성";
  addTitle(slide, "로그인 회원 연령대 기준", `광고 클릭률 현황(${gLabel})`);
  const accent = gender === "male" ? hex(theme.main) : hex(theme.sub);
  if (!gada || !member) {
    slide.addText("필요한 데이터가 없습니다", { x: M, y: BODY_Y, w: BODY_W, h: BODY_H, align: "center", valign: "middle", color: GREY_TEXT, fontSize: 14, fontFace: FONT });
    return;
  }
  const sumAge = (g: MemberAgeCounts) => AGE_KEYS.reduce((s, k) => s + g[k], 0);
  const M_ = member.month;
  const prevM = M_ <= 1 ? 12 : M_ - 1;
  const curGA = member.genderAge[gender];
  const prevGA = memberByMonth[prevM]?.genderAge[gender] ?? null;
  const curTotal = sumAge(curGA);
  const prevTotal = prevGA ? sumAge(prevGA) : null;
  const growth = prevTotal != null && prevTotal > 0 ? Math.round(((curTotal - prevTotal) / prevTotal) * 100) : null;

  const visitors = gender === "male" ? gada.ageVisitorMale : gada.ageVisitorFemale;
  const ratio = AGE_KEYS.map((k) => (visitors[k] > 0 ? curGA[k] / visitors[k] : 0));
  const ratioSum = ratio.reduce((s, v) => s + v, 0);
  const donutPct = ratio.map((r) => (ratioSum > 0 ? parseFloat(((r * 100) / ratioSum).toFixed(1)) : 0));
  const barValues = AGE_KEYS.map((k) => curGA[k]);
  const sliceColors = [accent, hex(theme.main), hex(theme.sub), "9CA3AF", "E5E7EB", "D1D5DB"];

  const leftW = BODY_W * 0.42;
  // 왼쪽: 도넛(연령대별 클릭률) + 가운데 텍스트 + 하단 범례
  slide.addText("연령대별 클릭률", { x: M, y: BODY_Y, w: leftW, h: 0.25, fontSize: 11, bold: true, color: DARK, fontFace: FONT });
  const donutH = BODY_H - 0.3 - 0.95;
  slide.addChart("doughnut", [{ name: "클릭률", labels: AGE_LABELS, values: donutPct }], {
    x: M, y: BODY_Y + 0.3, w: leftW, h: donutH,
    chartColors: sliceColors, showLegend: false, showValue: true, dataLabelFontSize: 8, holeSize: 58,
  });
  // 도넛 가운데 텍스트
  slide.addText(
    [
      { text: `${gLabel} 연령대별\n`, options: { fontSize: 11, bold: true, color: DARK } },
      { text: "디스플레이 광고 관심도", options: { fontSize: 9, bold: true, color: GREY_TEXT } },
    ],
    { x: M + leftW * 0.2, y: BODY_Y + 0.3, w: leftW * 0.6, h: donutH, align: "center", valign: "middle", fontFace: FONT }
  );
  // 범례 (연령대 + 클릭률%)
  const legendStr = AGE_LABELS.map((l, i) => `${l} ${donutPct[i]}%`).join("     ");
  slide.addText(legendStr, { x: M, y: BODY_Y + 0.3 + donutH + 0.05, w: leftW, h: 0.85, align: "center", valign: "top", fontSize: 9, color: "374151", fontFace: FONT });

  // 오른쪽 위: 총 접속자 요약 박스 (아이콘 + 텍스트)
  const rx = M + leftW + 0.3;
  const rw = BODY_W - leftW - 0.3;
  const boxH = 0.75;
  const mm = (n: number) => String(n).padStart(2, "0");
  slide.addShape("roundRect", { x: rx, y: BODY_Y, w: rw, h: boxH, fill: { color: GREY_100 }, line: { type: "none" }, rectRadius: 0.06 });
  if (icon) {
    const isz = 0.42;
    slide.addImage({ data: icon, x: rx + 0.18, y: BODY_Y + (boxH - isz) / 2, w: isz, h: isz, sizing: { type: "contain", w: isz, h: isz } });
  }
  slide.addText(
    [
      { text: `${gLabel} 총 접속자 수     `, options: { bold: true, color: DARK } },
      { text: `${mm(prevM)}월: ${prevTotal != null ? fmtNum(prevTotal) : "—"}  →  ${mm(M_)}월: ${fmtNum(curTotal)}     `, options: { color: "374151" } },
      { text: growth != null ? `${growth >= 0 ? "▲" : "▼"} ${Math.abs(growth)}%` : "—", options: { bold: true, color: accent } },
    ],
    { x: rx + 0.72, y: BODY_Y, w: rw - 0.85, h: boxH, align: "left", valign: "middle", fontFace: FONT, fontSize: 11 }
  );
  // 오른쪽 아래: 연령별 접속자 막대
  slide.addText(`연령별 접속자 수 (Total: ${fmtNum(curTotal)})`, { x: rx, y: BODY_Y + boxH + 0.15, w: rw, h: 0.25, fontSize: 11, bold: true, color: DARK, fontFace: FONT });
  slide.addChart("bar", [{ name: "접속자 수", labels: AGE_LABELS, values: barValues }], {
    x: rx, y: BODY_Y + boxH + 0.45, w: rw, h: BODY_H - boxH - 0.55,
    chartColors: sliceColors,
    showLegend: false, showValue: true, dataLabelFontSize: 8, catAxisLabelFontSize: 9, valAxisLabelFontSize: 8,
    ...GRID,
  });
}

// G1: 유전자 (제목만)
function slideGenetic(pptx: pptxgen) {
  const slide = pptx.addSlide();
  addTitle(slide, "한컴Gx 유전자 검사 결과지 컨텐츠 현황");
}

// ════════════════════════════════════════════════════════════════════════
//  엔트리
// ════════════════════════════════════════════════════════════════════════
export async function exportReportPptx(args: ReportExportArgs): Promise<void> {
  const { theme, gadaData, displayAdData, memberStatsData, memberStatsByMonth, fileName } = args;

  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* noop */ }
  }

  const origin = window.location.origin;
  const [bgMain, bgInner, msd, white, black, mapImg, iconMale, iconFemale] = await Promise.all([
    loadImage(`${origin}/images/cover/bg-cover-main.png`),
    loadImage(`${origin}/images/cover/bg-cover-inner.png`),
    loadImage(`${origin}/images/cover/MSD-logo.png`),
    loadImage(`${origin}/images/cover/logo_white.png`),
    loadImage(`${origin}/images/cover/logo_black.png`),
    captureNode('[data-export-image="korea-map"]'),
    captureNode('[data-export-image="agectr-icon-male"]'),
    captureNode('[data-export-image="agectr-icon-female"]'),
  ]);
  const imgs: CoverImgs = { main: bgMain, inner: bgInner, msd, white, black };

  const pptx = new pptxgen();
  pptx.defineLayout({ name: "HC_16x9", width: SLIDE_W, height: SLIDE_H });
  pptx.layout = "HC_16x9";

  // 표지
  addCover(pptx, imgs, theme);

  // 01
  addSection(pptx, imgs, theme, "01", "기업체·병원별 마케팅 현황");
  slideCompanyTable(pptx, theme);
  slideIntegrated(pptx, theme, gadaData, displayAdData);
  slideCompanyDetail(pptx);
  slideGenderSection(pptx, theme, gadaData, displayAdData, "package");
  slideGenderSection(pptx, theme, gadaData, displayAdData, "additional");
  slideHospital(pptx, theme, gadaData);

  // 02
  addSection(pptx, imgs, theme, "02", "디스플레이 광고 현황");
  slidePvUv(pptx, theme, "PV/UV 전체 현황(전체 방문통계)", displayAdData?.totalVisit ?? null, displayAdData);
  slidePvUv(pptx, theme, "PV/UV 전체 현황(로그인 회원 방문통계)", displayAdData?.memberVisit ?? null, displayAdData);
  slideMemberGenderAge(pptx, theme, memberStatsData);
  slideMemberRegion(pptx, theme, memberStatsData, mapImg);
  slideAgeCtr(pptx, theme, "male", gadaData, memberStatsData, memberStatsByMonth, iconMale);
  slideAgeCtr(pptx, theme, "female", gadaData, memberStatsData, memberStatsByMonth, iconFemale);

  // 03
  addSection(pptx, imgs, theme, "03", "유전자 검사 콘텐츠 현황");
  slideGenetic(pptx);

  // 종표지
  addEnd(pptx, imgs);

  await pptx.writeFile({ fileName });
}
