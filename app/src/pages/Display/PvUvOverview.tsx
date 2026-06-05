import PageMeta from "../../components/common/PageMeta";
import { useColorTheme } from "../../context/ColorThemeContext";
import { useGadaData } from "../../context/GadaDataContext";
import { PageTitle, FitScaleBox } from "../../components/report/SlideKit";
import { SlideFrame } from "../../report/SlideFrame";
import type {
  DisplayAdData,
  VisitPlacementRow,
  VisitStatsTable,
} from "../../types/gada";

// 표 기준 크기(px) — FitScaleBox가 16:9 박스 크기를 측정해 비율 그대로 축소.
// 가로폭은 1404 × 1.1(110% 확대), 세로는 기존 720의 80%.
const BASE_TABLE_WIDTH = 1544;
const BASE_TABLE_HEIGHT = 576;
// 표 + 하단 주석을 함께 스케일하기 위한 콘텐츠 블록 높이(표 + 주석/여백 ≈ 60).
const CONTENT_BLOCK_HEIGHT = BASE_TABLE_HEIGHT + 60;

// ── 10열 × 8행 템플릿 표 ─────────────────────────────────────────────────
// 셀 번호 n = (행-1)*10 + 열 (행 우선, 1~80). 번호는 표시하지 않음.
const COLS = 10;
const ROWS = 8;
const WHITE = "#FFFFFF";
const GREY_LIGHT = "#E5E7EB";   // 밝은 그레이 (3~7행 1열)
const GREY_LIGHTER = "#F3F4F6"; // 밝은 그레이보다 더 옅은 그레이 (3~7행 2열)
const GREY_DARK = "#D1D5DB";    // 살짝 어두운 그레이 (8행)
const BORDER = "#D1D5DB";

// 병합 앵커 셀 → span, 그리고 병합으로 가려져 렌더하지 않는 셀
const COLSPAN: Record<number, number> = { 1: 2, 3: 4, 7: 4, 71: 2 };
const ROWSPAN: Record<number, number> = { 51: 2 };
const COVERED = new Set([2, 4, 5, 6, 8, 9, 10, 61, 72]);

// 표 하단 주석 문구 (두 표 공통). 개행하여 두 줄로 표시.
const TABLE_NOTES = [
  "* UV의 차이는 Count방법 상이 : 로그인 무관 시에는 IP count, 로그인 이후에는 ID count / 로그인 전에는 같은 회사에서 동일 IP로 접속 시 여러 명이 접속하더라도 1로 count.",
  "* 증감률은 전월대비 증감률을 나타냄. 월별 PV/UV 수는 최근 3개월 수치만 표현",
];

function fillOf(n: number, main: string): string {
  if (n <= 20) return main;          // 1~2행: 메인컬러
  if (n >= 71) return GREY_DARK;     // 8행: 살짝 어두운 그레이
  const col = ((n - 1) % COLS) + 1;  // 3~7행
  if (col === 1) return GREY_LIGHT;     // 21,31,41,51,61
  if (col === 2) return GREY_LIGHTER;   // 22,32,42,52,62
  return WHITE;
}

// 셀 번호별 표시 텍스트. months = [{M-2}월, {M-1}월, {M}월].
// 지정되지 않은 셀은 빈 칸(데이터는 추후 채움).
function textOf(n: number, months: [string, string, string]): string {
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

// 표의 세부메뉴(3~7행 2열) 순서 = 엑셀 a/b 표의 광고 지면 5개 순서와 동일.
const PLACEMENT_NAMES = [
  "메인 페이지 배너",                    // 3행 (메인 페이지)
  "이벤트 모음 페이지 배너",             // 4행 (홍보/이벤트)
  "검진센터 둘러보기 페이지 배너",       // 5행 (검진센터 둘러보기)
  "건강검진 예약하기 페이지 배너",       // 6행 (건강검진 예약)
  "건강검진 예약 정보 조회 페이지 배너", // 7행 (건강검진 예약)
];

// 월 번호(1~12) → 배열 인덱스로 값 조회. 범위를 벗어나면 undefined.
function valueAt(arr: number[] | undefined, monthNum: number): number | undefined {
  if (!arr) return undefined;
  const i = monthNum - 1;
  return i >= 0 && i < arr.length ? arr[i] : undefined;
}

// 천단위 콤마. 값이 없으면 빈 칸.
function fmtNum(v: number | undefined): string {
  if (v === undefined || v === null || Number.isNaN(v)) return "";
  return v.toLocaleString("ko-KR");
}

// 전월대비 증감률(%). 전월 값이 없거나 0이면 표시 생략.
function fmtRate(curr: number | undefined, prev: number | undefined): string {
  if (curr === undefined || prev === undefined) return "";
  if (prev === 0) return "";
  const r = ((curr - prev) / prev) * 100;
  // 소수점 반올림(예 26.7→27). 양수는 부호 없음, 음수는 - 유지(반올림 결과에 포함).
  return `${Math.round(r)}%`;
}

function TemplateTable({
  main,
  months,
  monthNums,
  data,
}: {
  main: string;
  months: [string, string, string];
  monthNums: [number, number, number];
  data: VisitStatsTable | null;
}) {
  // 표 행(3~7)의 지면명으로 엑셀 데이터 행을 찾는다(이름 우선, 없으면 순서).
  const placementRow = (idx: number): VisitPlacementRow | undefined => {
    if (!data) return undefined;
    const name = PLACEMENT_NAMES[idx];
    return data.rows.find((r) => r.placement === name) ?? data.rows[idx];
  };

  // 데이터 셀(3~7행: 지면별 / 8행: 합계, 3~10열)의 표시 텍스트.
  const cellData = (n: number): string => {
    if (!data) return "";
    const col = ((n - 1) % COLS) + 1;
    const row = Math.floor((n - 1) / COLS) + 1;
    if (row < 3 || col < 3 || col > 10) return ""; // 헤더/라벨 영역
    let pv: number[] | undefined;
    let uv: number[] | undefined;
    if (row === 8) {
      pv = data.pvTotal;
      uv = data.uvTotal;
    } else {
      const rowData = placementRow(row - 3);
      pv = rowData?.pv;
      uv = rowData?.uv;
    }
    const [m0, m1, m2] = monthNums;
    switch (col) {
      case 3: return fmtNum(valueAt(pv, m0));
      case 4: return fmtNum(valueAt(pv, m1));
      case 5: return fmtNum(valueAt(pv, m2));
      case 6: return fmtRate(valueAt(pv, m2), valueAt(pv, m2 - 1));
      case 7: return fmtNum(valueAt(uv, m0));
      case 8: return fmtNum(valueAt(uv, m1));
      case 9: return fmtNum(valueAt(uv, m2));
      case 10: return fmtRate(valueAt(uv, m2), valueAt(uv, m2 - 1));
      default: return "";
    }
  };

  return (
    <table
      className="table-fixed border-collapse"
      style={{ width: "100%", height: "100%" }}
    >
      <tbody>
        {Array.from({ length: ROWS }, (_, r) => {
          const row = r + 1;
          return (
            <tr key={row}>
              {Array.from({ length: COLS }, (_, c) => {
                const n = (row - 1) * COLS + (c + 1);
                if (COVERED.has(n)) return null;
                const fill = fillOf(n, main);
                const isMain = n <= 20;
                // 라벨 셀은 textOf, 데이터 셀은 cellData (서로 배타적).
                const content = textOf(n, months) || cellData(n);
                return (
                  <td
                    key={c + 1}
                    colSpan={COLSPAN[n]}
                    rowSpan={ROWSPAN[n]}
                    style={{
                      backgroundColor: fill,
                      color: isMain ? "#FFFFFF" : "#000000",
                      fontWeight: fill === WHITE ? 400 : 700,
                      border: `1px solid ${BORDER}`,
                      textAlign: "center",
                      verticalAlign: "middle",
                      padding: "6px 8px",
                      fontSize: "15.33px",
                      lineHeight: 1.3,
                    }}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// 디스플레이 데이터에서 최신(데이터가 있는 마지막) 월을 구함. 없으면 달력 기준 월.
function latestDataMonth(d: DisplayAdData | null): number {
  const scan = (pvTotal?: number[]) => {
    if (!pvTotal) return 0;
    for (let i = 11; i >= 0; i--) if (pvTotal[i] > 0) return i + 1;
    return 0;
  };
  return (
    scan(d?.totalVisit.pvTotal) ||
    scan(d?.memberVisit.pvTotal) ||
    new Date().getMonth() + 1
  );
}

// M 기준 최근 3개월 라벨 [{M-2}월, {M-1}월, {M}월]
function monthLabels(m: number): [string, string, string] {
  const lbl = (x: number) => `${x}월`;
  return [lbl(m - 2), lbl(m - 1), lbl(m)];
}

// ── 한 페이지(슬라이드): 1920×1080(16:9) 고정 + 사방 32px(p-8) 여백 ──────
function PageSection({
  sub,
  main,
  months,
  monthNums,
  data,
  border,
}: {
  sub: string;
  main: string;
  months: [string, string, string];
  monthNums: [number, number, number];
  data: VisitStatsTable | null;
  border: "b" | "t";
}) {
  return (
    <SlideFrame title={`디스플레이 광고 현황 - ${sub}`} border={border}>
      <div className="shrink-0 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
        <PageTitle main="디스플레이 광고 현황" sub={sub} />
      </div>
      {/* 표 + 하단 주석을 한 덩어리로 16:9 박스에 맞춰 균일 스케일 (p-8이 사방 여백) */}
      <FitScaleBox baseW={BASE_TABLE_WIDTH} baseH={CONTENT_BLOCK_HEIGHT}>
        <div className="w-full h-full flex flex-col">
          <div className="flex-1 min-h-0">
            <TemplateTable main={main} months={months} monthNums={monthNums} data={data} />
          </div>
          {/* 주석 폰트 15px: 이 표 블록은 폭 1544 기준으로 축소되고, 로그인 회원 PV
              2번째 페이지 주석은 폭 1132 기준이라, 화면상 같은 크기로 보이려면
              11 × (1544/1132) ≈ 15px 가 필요하다. */}
          <div className="shrink-0 mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
            {TABLE_NOTES.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        </div>
      </FitScaleBox>
    </SlideFrame>
  );
}

// ── 슬라이드 묶음 (메뉴 페이지 / 대시보드 미리보기 공용) ──────────────────
export function PvUvDeck() {
  const { currentTheme } = useColorTheme();
  const { displayAdData } = useGadaData();
  const latestMonth = latestDataMonth(displayAdData);
  const months = monthLabels(latestMonth);
  const monthNums: [number, number, number] = [
    latestMonth - 2,
    latestMonth - 1,
    latestMonth,
  ];

  return (
    <>
      {/* 페이지 1: 전체 방문통계 (표 a) */}
      <PageSection
        sub="PV/UV 전체 현황(전체 방문통계)"
        main={currentTheme.main}
        months={months}
        monthNums={monthNums}
        data={displayAdData?.totalVisit ?? null}
        border="b"
      />

      {/* 페이지 2: 로그인 회원 방문통계 (표 b) */}
      <PageSection
        sub="PV/UV 전체 현황(로그인 회원 방문통계)"
        main={currentTheme.main}
        months={months}
        monthNums={monthNums}
        data={displayAdData?.memberVisit ?? null}
        border="t"
      />
    </>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────
export default function PvUvOverview() {
  return (
    <>
      <PageMeta title="PV/UV 전체 현황" description="디스플레이 광고 현황 - PV/UV 전체 현황" />
      <div className="h-full flex flex-col">
        {/* ── 페이지 헤더 ───────────────────────────────────────────── */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            PV/UV 전체 현황
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              디스플레이 광고 현황
            </span>
          </h1>
        </div>

        {/* ── 스크롤 영역: 페이지 두 개를 스크롤로 이동 ──────────────── */}
        <div className="flex-1 overflow-y-auto font-nanum">
          <PvUvDeck />
        </div>
      </div>
    </>
  );
}
