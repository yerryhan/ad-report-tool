import PageMeta from "../../components/common/PageMeta";
import { useColorTheme } from "../../context/ColorThemeContext";
import { useGadaData } from "../../context/GadaDataContext";
import type { DisplayAdData } from "../../types/gada";

// 표 크기를 고정하는 기준 뷰포트 높이(px). 창 높이가 이 값 이상이면 표는 더 커지지 않음.

// ── 페이지 제목 ─────────────────────────────────────────────────────────
// CompanyMarketing 의 PageTitle 과 동일한 폰트 스타일.
// 앞부분(dash 앞)은 text-base font-bold, dash 뒷부분은 text-sm font-bold.
function PageTitle({ main, sub }: { main: string; sub?: string }) {
  return (
    <h2 className="shrink-0 text-gray-900 dark:text-white">
      <span className="text-base font-bold">{main}</span>
      {sub ? <span className="text-sm font-bold">{` - ${sub}`}</span> : null}
    </h2>
  );
}

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

function TemplateTable({ main, months }: { main: string; months: [string, string, string] }) {
  return (
    <table className="w-full flex-1 table-fixed border-collapse">
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
                      fontSize: "12px",
                      lineHeight: 1.3,
                    }}
                  >
                    {textOf(n, months)}
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

// ── 한 페이지(화면) 섹션 ────────────────────────────────────────────────
function PageSection({
  sub,
  main,
  months,
  border,
}: {
  sub: string;
  main: string;
  months: [string, string, string];
  border: "b" | "t";
}) {
  return (
    <div
      className={`min-h-full flex flex-col bg-white dark:bg-gray-800 ${
        border === "b"
          ? "border-b border-gray-200 dark:border-gray-700"
          : "border-t border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="shrink-0 flex items-center px-6 py-3 border-b border-gray-100 dark:border-gray-700">
        <PageTitle main="디스플레이 광고 현황" sub={sub} />
      </div>
      <div className="flex-1 min-h-0 p-12 flex flex-col">
        <TemplateTable main={main} months={months} />
        <div className="shrink-0 mt-3 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400">
          {TABLE_NOTES.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────
export default function PvUvOverview() {
  const { currentTheme } = useColorTheme();
  const { displayAdData } = useGadaData();
  const months = monthLabels(latestDataMonth(displayAdData));

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
        <div className="flex-1 overflow-y-auto">
          {/* 페이지 1: 전체 방문통계 (표 a) */}
          <PageSection
            sub="PV/UV 전체 현황(전체 방문통계)"
            main={currentTheme.main}
            months={months}
            border="b"
          />

          {/* 페이지 2: 로그인 회원 방문통계 (표 b) */}
          <PageSection
            sub="PV/UV 전체 현황(로그인 회원 방문통계)"
            main={currentTheme.main}
            months={months}
            border="t"
          />
        </div>
      </div>
    </>
  );
}
