import { useMemo, useState, useEffect, useRef } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { useGadaData } from "../../context/GadaDataContext";
import { useColorTheme } from "../../context/ColorThemeContext";

// ── 상수 ────────────────────────────────────────────────────────────────
const MONTH_LABELS = [
  "1월","2월","3월","4월","5월","6월",
  "7월","8월","9월","10월","11월","12월","누적합계",
];
const MONTH_LABELS_12 = [
  "1월","2월","3월","4월","5월","6월",
  "7월","8월","9월","10월","11월","12월",
];

type MonthlyEntry = { male: number; female: number };

// ── 도넛 옵션 팩토리 ────────────────────────────────────────────────────
function makeDonutOpts(
  fillColors: [string, string],
  strokeColor: string,
): ApexOptions {
  return {
    chart: {
      type: "donut",
      fontFamily: "NanumSquare, sans-serif",
      animations: { enabled: false },
      background: "transparent",
    },
    colors: fillColors,
    stroke: { show: true, width: 2, colors: [strokeColor] },
    dataLabels: { enabled: false },
    legend:  { show: false },
    tooltip: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "52%",
          // 중앙 % 텍스트는 ApexCharts 라벨 대신 HTML 오버레이로 그려서
          // 차트 크기와 무관하게 항상 정확히 가운데 정렬되도록 한다.
          labels: { show: false },
        },
      },
    },
  };
}

// ── 막대 그래프 옵션 팩토리 ────────────────────────────────────────────
function makeBarOptions(yMax: number, mainColor: string, subColor: string): ApexOptions {
  return {
    chart: {
      type: "bar",
      stacked: true,
      toolbar: { show: false },
      fontFamily: "NanumSquare, sans-serif",
      animations: { enabled: false },
      background: "transparent",
      offsetX: 0,
      offsetY: 0,
    },
    colors: [mainColor, subColor],
    plotOptions: {
      bar: {
        columnWidth: "52%",
        dataLabels: { total: { enabled: false } },
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: MONTH_LABELS,
      axisBorder: { show: false },
      axisTicks:  { show: false },
      labels: { show: false },
    },
    yaxis: {
      tickAmount: yMax / 20,
      max: yMax,
      min: 0,
      labels: {
        formatter: (v: number) => String(v),
        style: { fontSize: "10px", colors: ["#9ca3af"] },
        minWidth: 38,
        maxWidth: 38,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontSize: "12px",
      fontFamily: "NanumSquare, sans-serif",
      fontWeight: 400,
      markers: { size: 8 },
    },
    grid: {
      borderColor: "#f3f4f6",
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: { left: 0, right: 0, top: 0, bottom: 0 },
    },
    tooltip: {
      y: { formatter: (v: number) => `${v}명` },
    },
  };
}

// ── 면적 그래프 옵션 팩토리 ────────────────────────────────────────────
function makeAreaOptions(yMax: number, mainColor: string, subColor: string): ApexOptions {
  return {
    chart: {
      type: "area",
      toolbar: { show: false },
      zoom: { enabled: false, allowMouseWheelZoom: false },
      fontFamily: "NanumSquare, sans-serif",
      animations: { enabled: false },
      background: "transparent",
    },
    colors: [mainColor, subColor],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.04,
        stops: [0, 100],
      },
    },
    stroke: { curve: "smooth", width: 2 },
    dataLabels: { enabled: false },
    xaxis: {
      categories: MONTH_LABELS_12,
      axisBorder: { show: false },
      axisTicks:  { show: false },
      labels: { style: { fontSize: "10px", colors: Array(12).fill("#9ca3af") } },
    },
    yaxis: {
      min: 0,
      max: yMax,
      tickAmount: yMax / 10,
      labels: {
        formatter: (v: number) => String(v),
        style: { fontSize: "10px", colors: ["#9ca3af"] },
        minWidth: 28,
        maxWidth: 28,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontSize: "12px",
      fontFamily: "NanumSquare, sans-serif",
      fontWeight: 400,
      markers: { size: 8, strokeWidth: 0, shape: "square" },
    },
    grid: {
      borderColor: "#f3f4f6",
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: { left: 0, right: 8, top: 0, bottom: 0 },
    },
    tooltip: { y: { formatter: (v: number) => `${v}명` } },
  };
}

// ── 표 페이지(기업체별 마케팅 현황) 스케일 ─────────────────────────────
// PV/UV 전체 현황 표(BASE_TABLE_HEIGHT=576)와 동일한 높이가 되도록 같은 기준값 사용.
const TBL_BASE_VH = 980;
const TBL_BASE_W = 1544;
const TBL_BASE_H = 576;
function useTableScale(): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => setScale(Math.min(1, window.innerHeight / TBL_BASE_VH));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return scale;
}

// 기업체별 마케팅 현황 표: 3열 × 9행, 열 너비 3:2:9.
// 1행 헤더(메인컬러 배경·흰색 볼드), 2~9행 내용(흰 배경·검정, 수기 입력 예정).
// 폰트/테두리/패딩은 PvUvOverview 표와 동일하게 맞춤(15.33px).
const COMPANY_TABLE_HEADERS = ["기업체", "검진 단가", "마케팅 상세 내용"];
const COMPANY_TABLE_COL_WIDTHS = ["21.43%", "14.29%", "64.28%"]; // 3:2:9
function CompanyMarketingTable({ main }: { main: string }) {
  return (
    <table className="table-fixed border-collapse" style={{ width: "100%", height: "100%" }}>
      <colgroup>
        {COMPANY_TABLE_COL_WIDTHS.map((w, i) => (
          <col key={i} style={{ width: w }} />
        ))}
      </colgroup>
      <tbody>
        {Array.from({ length: 9 }, (_, r) => (
          <tr key={r} style={{ height: `${100 / 9}%` }}>
            {Array.from({ length: 3 }, (_, c) => {
              const isHeader = r === 0;
              return (
                <td
                  key={c}
                  style={{
                    backgroundColor: isHeader ? main : "#FFFFFF",
                    color: isHeader ? "#FFFFFF" : "#000000",
                    fontWeight: isHeader ? 700 : 400,
                    border: "1px solid #D1D5DB",
                    textAlign: "center",
                    verticalAlign: "middle",
                    padding: "6px 8px",
                    fontSize: "15.33px",
                    lineHeight: 1.3,
                  }}
                >
                  {isHeader ? COMPANY_TABLE_HEADERS[c] : ""}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// 주차 라벨 생성 (하드코딩 금지 — M월 기준 1~5주차 자동 생성, pptx 내보내기 시 수정 가능)
function makeWeekLabels(month: number): string[] {
  return Array.from({ length: 5 }, (_, i) => `${month}월 ${i + 1}주차`);
}

// "10의 자리에서 반올림" = 100단위 반올림 (예 234→200, 250→300)
function roundToHundred(n: number): number {
  return Math.round(n / 100) * 100;
}

// ── 통합 통계: 기간별 예약 신청 꺾은선 옵션 ─────────────────────────────
// 점(마커)은 선 색을 그대로 따름. 범례는 HTML로 별도 표시하므로 비활성.
function makeWeeklyLineOptions(
  weeks: string[],
  yMax: number,
  mainColor: string,
  subColor: string,
): ApexOptions {
  return {
    chart: {
      type: "line",
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "NanumSquare, sans-serif",
      animations: { enabled: false },
      background: "transparent",
    },
    colors: [mainColor, subColor],
    stroke: { curve: "straight", width: 3 },
    markers: { size: 5, strokeWidth: 0, hover: { sizeOffset: 2 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: weeks,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "11px", colors: weeks.map(() => "#9ca3af") } },
    },
    yaxis: {
      min: 0,
      max: yMax,
      tickAmount: Math.max(1, Math.round(yMax / 10)),
      labels: {
        formatter: (v: number) => String(Math.round(v)),
        style: { fontSize: "10px", colors: ["#9ca3af"] },
        minWidth: 28,
        maxWidth: 28,
      },
    },
    legend: { show: false },
    grid: {
      borderColor: "#f3f4f6",
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: { left: 0, right: 8, top: 0, bottom: 0 },
    },
    tooltip: { y: { formatter: (v: number) => `${v}건` } },
  };
}

// ── 통합 통계: 월별 남/녀 세로막대 옵션 (면적그래프를 막대로 표현) ────────
function makeGroupedBarOptions(yMax: number, mainColor: string, subColor: string): ApexOptions {
  return {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "NanumSquare, sans-serif",
      animations: { enabled: false },
      background: "transparent",
    },
    colors: [mainColor, subColor],
    plotOptions: { bar: { columnWidth: "70%", borderRadius: 2 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: MONTH_LABELS_12,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "10px", colors: Array(12).fill("#9ca3af") } },
    },
    yaxis: {
      min: 0,
      max: yMax,
      tickAmount: Math.max(1, yMax / 10),
      labels: {
        formatter: (v: number) => String(v),
        style: { fontSize: "10px", colors: ["#9ca3af"] },
        minWidth: 28,
        maxWidth: 28,
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontSize: "12px",
      fontFamily: "NanumSquare, sans-serif",
      fontWeight: 400,
      markers: { size: 8 },
    },
    grid: {
      borderColor: "#f3f4f6",
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: { left: 0, right: 8, top: 0, bottom: 0 },
    },
    tooltip: { y: { formatter: (v: number) => `${v}명` } },
  };
}

// ── 데이터 없음 공통 표시 ────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
          <svg className="text-gray-400 dark:text-gray-500" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2.5 2.1h-15V5h15v14.1zm0-16.1h-15c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">업로드된 데이터가 없습니다</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">먼저 가다실 엑셀 파일을 업로드해주세요</p>
        <Link
          to="/data/upload"
          className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600 transition-colors"
        >
          데이터 업로드로 이동
        </Link>
      </div>
    </div>
  );
}

// ── 이전 데이터 입력 모달 ────────────────────────────────────────────────
function DataInputModal({
  title,
  modalData,
  currentMonth,
  onChangeCell,
  onSave,
  onClose,
}: {
  title: string;
  modalData: { male: string; female: string }[];
  currentMonth: number | undefined;
  onChangeCell: (i: number, gender: "male" | "female", val: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              className="h-8 px-4 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition-colors"
            >
              저장
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <colgroup>
              <col style={{ width: "52px" }} />
              {Array(12).fill(null).map((_, i) => <col key={i} />)}
            </colgroup>
            <thead>
              <tr>
                <th className="border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 py-2.5 px-2" />
                {MONTH_LABELS_12.map((m, i) => (
                  <th
                    key={i}
                    className={`border border-gray-200 dark:border-gray-700 py-2.5 px-2 text-center font-semibold text-gray-600 dark:text-gray-300
                      ${currentMonth === i + 1
                        ? "bg-gray-200 dark:bg-gray-600"
                        : "bg-gray-100 dark:bg-gray-700"
                      }`}
                  >
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["female", "male"] as const).map((gender) => (
                <tr key={gender}>
                  <td className="border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 py-2.5 px-2 text-center font-semibold text-gray-600 dark:text-gray-300">
                    {gender === "female" ? "여성" : "남성"}
                  </td>
                  {modalData.map((entry, i) => (
                    <td key={i} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-1.5 px-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={entry[gender]}
                        onChange={(e) => onChangeCell(i, gender, e.target.value.replace(/\D/g, ""))}
                        className="w-full min-w-[32px] text-center text-xs text-gray-700 dark:text-gray-300 bg-transparent outline-none"
                        placeholder="0"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── 반응형 도넛: 컨테이너 크기에 맞춰 정사각형으로 스케일 ───────────────
function ResponsiveDonut({
  chartKey,
  options,
  series,
  label,
  centerText,
}: {
  chartKey: string;
  options: ApexOptions;
  series: number[];
  label: string;
  centerText: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(150);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      // 라벨이 차지하는 높이(약 24px)를 제외하고 도넛 크기를 계산해
      // 라벨을 도넛 바로 아래로 붙여도 도넛 크기가 변하지 않도록 한다.
      const avail = el.clientHeight - 24;
      const d = Math.floor(Math.min(el.clientWidth, avail) * 0.8) - 8;
      if (d > 0) setSize(Math.max(100, d));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="flex flex-col items-center flex-1 min-h-0 min-w-0">
      <div ref={wrapRef} className="flex-1 min-h-0 w-full min-w-0 overflow-hidden flex flex-col items-center justify-center">
        <div className="relative rounded-full bg-gray-50 p-1">
          <Chart
            key={chartKey}
            options={options}
            series={series}
            type="donut"
            width={size}
            height={size}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className="font-semibold leading-none"
              style={{ color: "#000000", fontSize: Math.max(9, Math.round(size * 0.14) - 4.5) }}
            >
              {centerText}
            </span>
          </div>
        </div>
        <span className="mt-2 text-[11px] font-normal text-gray-500 dark:text-gray-400">
          {label}
        </span>
      </div>
    </div>
  );
}

// ── 페이지 제목 ─────────────────────────────────────────────────────────
// 앞부분("기업체별 마케팅 현황")은 차트 제목(text-sm)보다 2pt 큰 Bold,
// dash 뒷부분은 차트 제목과 동일한 폰트(text-sm font-bold).
function PageTitle({ main, sub }: { main: string; sub?: string }) {
  return (
    <h2 className="shrink-0 text-gray-900 dark:text-white">
      <span className="text-base font-bold">{main}</span>
      {sub ? <span className="text-sm font-bold">{` - ${sub}`}</span> : null}
    </h2>
  );
}

// ── 섹션 공통: 차트 레이아웃 ─────────────────────────────────────────────
function SectionCharts({
  gadaMonth,
  themeName,
  stats,
  barOpts,
  barSeries,
  leftDonutOpts,
  rightDonutOpts,
  donutSeries,
  leftCenterText,
  rightCenterText,
  areaOpts,
  areaSeries,
  prefix,
  subTitle,
  onOpenModal,
}: {
  gadaMonth: number;
  themeName: string;
  stats: { maleSeries: number[]; femaleSeries: number[] };
  barOpts: ApexOptions;
  barSeries: { name: string; data: number[] }[];
  leftDonutOpts: ApexOptions;
  rightDonutOpts: ApexOptions;
  donutSeries: number[];
  leftCenterText: string;
  rightCenterText: string;
  areaOpts: ApexOptions;
  areaSeries: { name: string; data: number[] }[];
  prefix: string;
  subTitle: string;
  onOpenModal: () => void;
}) {
  return (
    <>
      {/* 페이지 제목 + 컨트롤 바 */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-700">
        <PageTitle main="기업체별 마케팅 현황" sub={subTitle} />
        <button
          onClick={onOpenModal}
          className="h-7 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          데이터 수정
        </button>
      </div>

      <div className="flex-1 flex min-h-0">

        {/* 왼쪽 절반: 막대그래프 + 예약자 수 표 */}
        <div className="w-1/2 flex flex-col px-6 pt-5 pb-4 border-r border-gray-100 dark:border-gray-700 min-h-0">
          <h2 className="shrink-0 mb-1 text-sm font-bold text-gray-800 dark:text-white">
            월별 남성/여성 통계
          </h2>
          <div className="flex-1 min-h-0">
            <Chart
              key={`${prefix}-bar-${gadaMonth}-${themeName}`}
              options={barOpts}
              series={barSeries}
              type="bar"
              height="100%"
            />
          </div>
          <div className="shrink-0 mt-0">
            <table className="w-full table-fixed border-collapse text-[11.67px] leading-none">
              <colgroup>
                <col style={{ width: "38px", minWidth: "38px", maxWidth: "38px" }} />
                {Array(13).fill(null).map((_, i) => <col key={i} />)}
              </colgroup>
              <thead>
                <tr>
                  <th className="border border-gray-200 bg-gray-100 dark:bg-gray-700 dark:border-gray-600 py-1" />
                  {MONTH_LABELS.map((m) => (
                    <th key={m} className="border border-gray-200 bg-gray-100 dark:bg-gray-700 dark:border-gray-600 py-1 text-center font-semibold text-gray-600 dark:text-gray-300">
                      {m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 bg-gray-100 dark:bg-gray-700 dark:border-gray-600 py-1 text-center font-semibold text-gray-600 dark:text-gray-300">여성</td>
                  {stats.femaleSeries.slice(0, 12).map((v, i) => (
                    <td key={i} className="border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-600 py-1 text-center text-gray-700 dark:text-gray-300">{v}</td>
                  ))}
                  <td className="border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-600 py-1 text-center font-semibold text-gray-700 dark:text-gray-300">{stats.femaleSeries[12]}</td>
                </tr>
                <tr>
                  <td className="border border-gray-200 bg-gray-100 dark:bg-gray-700 dark:border-gray-600 py-1 text-center font-semibold text-gray-600 dark:text-gray-300">남성</td>
                  {stats.maleSeries.slice(0, 12).map((v, i) => (
                    <td key={i} className="border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-600 py-1 text-center text-gray-700 dark:text-gray-300">{v}</td>
                  ))}
                  <td className="border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-600 py-1 text-center font-semibold text-gray-700 dark:text-gray-300">{stats.maleSeries[12]}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 오른쪽 절반: 도넛 + 면적 차트 */}
        <div className="w-1/2 flex flex-col min-h-0">

          {/* 상단: 도넛 두 개 */}
          <div className="flex-1 flex flex-col px-6 pt-5 pb-1 border-b border-gray-100 dark:border-gray-700">
            <h2 className="shrink-0 mb-4 text-sm font-bold text-gray-800 dark:text-white">
              해당월 성별 비율
            </h2>
            <div className="flex flex-1 items-stretch justify-center gap-8 min-h-0">
              <ResponsiveDonut
                chartKey={`${prefix}-donut-m-${gadaMonth}-${themeName}`}
                options={leftDonutOpts}
                series={donutSeries}
                label="해당월 남성 비율"
                centerText={leftCenterText}
              />
              <ResponsiveDonut
                chartKey={`${prefix}-donut-f-${gadaMonth}-${themeName}`}
                options={rightDonutOpts}
                series={donutSeries}
                label="해당월 여성 비율"
                centerText={rightCenterText}
              />
            </div>
          </div>

          {/* 하단: 면적 차트 */}
          <div className="flex-1 flex flex-col px-6 pt-2 pb-4 min-h-0">
            <h2 className="shrink-0 mb-1 text-sm font-bold text-gray-800 dark:text-white">
              월별 남성/여성 통계 추이
            </h2>
            <div className="flex-1 min-h-0">
              <Chart
                key={`${prefix}-area-${gadaMonth}-${themeName}`}
                options={areaOpts}
                series={areaSeries}
                type="area"
                height="100%"
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────
export default function CompanyMarketing() {
  const { currentTheme } = useColorTheme();
  const { gadaData, displayAdData } = useGadaData();

  // ── 섹션2: 검진유형 패키지 월별 남녀 ──────────────────────────────────
  // 우선순위: 디스플레이 광고 엑셀(표 c)이 12개월 전체를 채우고,
  // 가다실 파일이 있으면 '해당월' 한 칸만 가다실 값으로 유지(덮어씀).
  const [monthlyData, setMonthlyData] = useState<MonthlyEntry[]>(() =>
    Array(12).fill(null).map(() => ({ male: 0, female: 0 }))
  );
  useEffect(() => {
    setMonthlyData(prev => {
      const next = [...prev];
      if (displayAdData) {
        for (let i = 0; i < 12; i++) next[i] = { ...displayAdData.packageMonthly[i] };
      }
      if (gadaData?.genderStats && gadaData.month >= 1 && gadaData.month <= 12) {
        next[gadaData.month - 1] = {
          male: gadaData.genderStats.packageMale,
          female: gadaData.genderStats.packageFemale,
        };
      }
      return next;
    });
  }, [gadaData, displayAdData]);

  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{ male: string; female: string }[]>(() =>
    Array(12).fill(null).map(() => ({ male: "", female: "" }))
  );
  const openModal = () => {
    setModalData(monthlyData.map(e => ({ male: e.male > 0 ? String(e.male) : "", female: e.female > 0 ? String(e.female) : "" })));
    setShowModal(true);
  };
  const saveModal = () => {
    setMonthlyData(modalData.map(e => ({ male: parseInt(e.male, 10) || 0, female: parseInt(e.female, 10) || 0 })));
    setShowModal(false);
  };
  const handleModalCell = (i: number, gender: "male" | "female", val: string) => {
    setModalData(prev => { const next = [...prev]; next[i] = { ...next[i], [gender]: val }; return next; });
  };

  // ── 섹션3: 선택 추가항목 월별 남녀 ────────────────────────────────────
  // 우선순위: 디스플레이 광고 엑셀(표 d)이 12개월 전체를 채우고,
  // 가다실 파일이 있으면 '해당월' 한 칸만 가다실 값으로 유지(덮어씀).
  const [monthlyData3, setMonthlyData3] = useState<MonthlyEntry[]>(() =>
    Array(12).fill(null).map(() => ({ male: 0, female: 0 }))
  );
  useEffect(() => {
    setMonthlyData3(prev => {
      const next = [...prev];
      if (displayAdData) {
        for (let i = 0; i < 12; i++) next[i] = { ...displayAdData.additionalMonthly[i] };
      }
      if (gadaData?.genderStats && gadaData.month >= 1 && gadaData.month <= 12) {
        next[gadaData.month - 1] = {
          male: gadaData.genderStats.additionalMale,
          female: gadaData.genderStats.additionalFemale,
        };
      }
      return next;
    });
  }, [gadaData, displayAdData]);

  const [showModal3, setShowModal3] = useState(false);
  const [modalData3, setModalData3] = useState<{ male: string; female: string }[]>(() =>
    Array(12).fill(null).map(() => ({ male: "", female: "" }))
  );
  const openModal3 = () => {
    setModalData3(monthlyData3.map(e => ({ male: e.male > 0 ? String(e.male) : "", female: e.female > 0 ? String(e.female) : "" })));
    setShowModal3(true);
  };
  const saveModal3 = () => {
    setMonthlyData3(modalData3.map(e => ({ male: parseInt(e.male, 10) || 0, female: parseInt(e.female, 10) || 0 })));
    setShowModal3(false);
  };
  const handleModalCell3 = (i: number, gender: "male" | "female", val: string) => {
    setModalData3(prev => { const next = [...prev]; next[i] = { ...next[i], [gender]: val }; return next; });
  };

  // ── 섹션2 수치 계산 (a/b + packageMalePct) ──────────────────────────
  const stats = useMemo(() => {
    if (!gadaData?.genderStats) return null;
    const { packageMalePct } = gadaData.genderStats;
    const maleData   = monthlyData.map(e => e.male);
    const femaleData = monthlyData.map(e => e.female);
    const cumMale    = maleData.reduce((s, v) => s + v, 0);
    const cumFemale  = femaleData.reduce((s, v) => s + v, 0);
    const maleSeries:   number[] = [...maleData,   cumMale];
    const femaleSeries: number[] = [...femaleData, cumFemale];
    const maxTotal = Math.max(...maleSeries.map((m, i) => m + femaleSeries[i]), 40);
    const yMax = Math.ceil(maxTotal / 20) * 20;
    const aPct = packageMalePct;
    const bPct = parseFloat((100 - aPct).toFixed(1));
    return { maleSeries, femaleSeries, yMax, aPct, bPct };
  }, [gadaData, monthlyData]);

  // ── 섹션3 수치 계산 (c/d + additionalMalePct/additionalFemalePct) ───
  const stats3 = useMemo(() => {
    if (!gadaData?.genderStats) return null;
    const { additionalMalePct, additionalFemalePct } = gadaData.genderStats;
    const maleData   = monthlyData3.map(e => e.male);
    const femaleData = monthlyData3.map(e => e.female);
    const cumMale    = maleData.reduce((s, v) => s + v, 0);
    const cumFemale  = femaleData.reduce((s, v) => s + v, 0);
    const maleSeries:   number[] = [...maleData,   cumMale];
    const femaleSeries: number[] = [...femaleData, cumFemale];
    const maxTotal = Math.max(...maleSeries.map((m, i) => m + femaleSeries[i]), 40);
    const yMax = Math.ceil(maxTotal / 20) * 20;
    const cPct = additionalMalePct;
    const dPct = additionalFemalePct;
    return { maleSeries, femaleSeries, yMax, cPct, dPct };
  }, [gadaData, monthlyData3]);

  // ── 섹션2 차트 옵션 ──────────────────────────────────────────────────
  const barOptions = useMemo(
    () => stats ? makeBarOptions(stats.yMax, currentTheme.main, currentTheme.sub) : {},
    [stats, currentTheme.main, currentTheme.sub],
  );
  const barSeries = useMemo(
    () => stats ? [
      { name: "남성", data: [...stats.maleSeries.slice(0, 12), 0] },
      { name: "여성", data: [...stats.femaleSeries.slice(0, 12), 0] },
    ] : [],
    [stats],
  );
  const leftDonutOpts = useMemo(
    () => makeDonutOpts([currentTheme.main, "#FFFFFF"], currentTheme.main),
    [currentTheme.main],
  );
  const rightDonutOpts = useMemo(
    () => makeDonutOpts(["#FFFFFF", currentTheme.sub], currentTheme.sub),
    [currentTheme.sub],
  );
  const donutSeries = useMemo(
    () => stats && stats.aPct + stats.bPct > 0 ? [stats.aPct, stats.bPct] : [50, 50],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats?.aPct, stats?.bPct],
  );
  const areaOptions = useMemo(() => {
    if (!stats) return {};
    const allVals = [...stats.maleSeries.slice(0, 12), ...stats.femaleSeries.slice(0, 12)];
    const yMax = Math.ceil(Math.max(...allVals, 10) / 10) * 10;
    return makeAreaOptions(yMax, currentTheme.main, currentTheme.sub);
  }, [stats, currentTheme.main, currentTheme.sub]);
  const areaSeries = useMemo(
    () => stats ? [
      { name: "남성", data: stats.maleSeries.slice(0, 12) },
      { name: "여성", data: stats.femaleSeries.slice(0, 12) },
    ] : [],
    [stats],
  );

  // ── 섹션3 차트 옵션 ──────────────────────────────────────────────────
  const barOptions3 = useMemo(
    () => stats3 ? makeBarOptions(stats3.yMax, currentTheme.main, currentTheme.sub) : {},
    [stats3, currentTheme.main, currentTheme.sub],
  );
  const barSeries3 = useMemo(
    () => stats3 ? [
      { name: "남성", data: [...stats3.maleSeries.slice(0, 12), 0] },
      { name: "여성", data: [...stats3.femaleSeries.slice(0, 12), 0] },
    ] : [],
    [stats3],
  );
  const leftDonutOpts3 = useMemo(
    () => makeDonutOpts([currentTheme.main, "#FFFFFF"], currentTheme.main),
    [currentTheme.main],
  );
  const rightDonutOpts3 = useMemo(
    () => makeDonutOpts(["#FFFFFF", currentTheme.sub], currentTheme.sub),
    [currentTheme.sub],
  );
  const donutSeries3 = useMemo(
    () => stats3 && stats3.cPct + stats3.dPct > 0 ? [stats3.cPct, stats3.dPct] : [50, 50],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats3?.cPct, stats3?.dPct],
  );
  const areaOptions3 = useMemo(() => {
    if (!stats3) return {};
    const allVals = [...stats3.maleSeries.slice(0, 12), ...stats3.femaleSeries.slice(0, 12)];
    const yMax = Math.ceil(Math.max(...allVals, 10) / 10) * 10;
    return makeAreaOptions(yMax, currentTheme.main, currentTheme.sub);
  }, [stats3, currentTheme.main, currentTheme.sub]);
  const areaSeries3 = useMemo(
    () => stats3 ? [
      { name: "남성", data: stats3.maleSeries.slice(0, 12) },
      { name: "여성", data: stats3.femaleSeries.slice(0, 12) },
    ] : [],
    [stats3],
  );

  // ── 통합 통계 페이지: 기간별 예약 신청 꺾은선 ─────────────────────────
  // 리포트 대상 월(M) — 가다실 데이터 월 기준(없으면 달력 월). 주차 라벨 생성에 사용.
  const reportMonth = gadaData?.month ?? new Date().getMonth() + 1;
  const weekLabels = useMemo(() => makeWeekLabels(reportMonth), [reportMonth]);

  // 검진유형 예약 = 검진유형 패키지(남+여), 본인부담 예약 = 선택 추가항목(남+여).
  // (가다실 예약 엑셀 genderStats 기준 — 통계정보(회원) 엔 해당 항목이 없음)
  const examCount = gadaData?.genderStats
    ? gadaData.genderStats.packageMale + gadaData.genderStats.packageFemale
    : 0;
  const selfCount = gadaData?.genderStats
    ? gadaData.genderStats.additionalMale + gadaData.genderStats.additionalFemale
    : 0;
  const legendTotal = examCount + selfCount;
  // 비율 = 두 항목 합 대비(%). 합이 0이면 0.
  const examPct = legendTotal > 0 ? parseFloat(((examCount / legendTotal) * 100).toFixed(1)) : 0;
  const selfPct = legendTotal > 0 ? parseFloat(((selfCount / legendTotal) * 100).toFixed(1)) : 0;

  // 주차별 수치 — 추후 사람이 수기 입력. 임시 기본값: 검진유형 50, 본인부담 20.
  const [weeklyExam] = useState<number[]>(() => Array(5).fill(50));
  const [weeklySelf] = useState<number[]>(() => Array(5).fill(20));

  // Y축 최상단 기준선 = 검진유형 예약 건수를 100단위로 반올림.
  // 단, 주차별 데이터가 그 값을 넘으면 데이터가 잘리지 않도록 데이터 최대(10단위 올림)까지 확장.
  const lineYMax = useMemo(() => {
    const dataMax = Math.max(0, ...weeklyExam, ...weeklySelf);
    return Math.max(10, roundToHundred(examCount), Math.ceil(dataMax / 10) * 10);
  }, [examCount, weeklyExam, weeklySelf]);
  const lineOptions = useMemo(
    () => makeWeeklyLineOptions(weekLabels, lineYMax, currentTheme.main, currentTheme.sub),
    [weekLabels, lineYMax, currentTheme.main, currentTheme.sub],
  );
  const lineSeries = useMemo(
    () => [
      { name: "검진유형 예약", data: weeklyExam },
      { name: "본인부담 예약", data: weeklySelf },
    ],
    [weeklyExam, weeklySelf],
  );

  // ── 통합 통계 페이지: 우측 세로막대 (검진유형 패키지·선택 추가항목 월별 총 인원) ──
  // 섹션2·3의 면적그래프와 동일 데이터(monthlyData/monthlyData3)를 남+여 합산 총 인원수로 표현.
  const examBar = useMemo(() => {
    const total = monthlyData.map((e) => e.male + e.female);
    const yMax = Math.max(10, Math.ceil(Math.max(...total, 10) / 10) * 10);
    return { total, yMax };
  }, [monthlyData]);
  const selfBar = useMemo(() => {
    const total = monthlyData3.map((e) => e.male + e.female);
    const yMax = Math.max(10, Math.ceil(Math.max(...total, 10) / 10) * 10);
    return { total, yMax };
  }, [monthlyData3]);

  // 위(검진유형 패키지)=메인컬러 / 아래(선택 추가항목)=서브컬러.
  // 단일 시리즈라 colors[0]만 사용되므로 self 는 서브컬러를 첫 인자로 전달.
  const examBarOptions = useMemo(
    () => makeGroupedBarOptions(examBar.yMax, currentTheme.main, currentTheme.sub),
    [examBar.yMax, currentTheme.main, currentTheme.sub],
  );
  const examBarSeries = useMemo(
    () => [{ name: "검진유형 패키지", data: examBar.total }],
    [examBar],
  );
  const selfBarOptions = useMemo(
    () => makeGroupedBarOptions(selfBar.yMax, currentTheme.sub, currentTheme.main),
    [selfBar.yMax, currentTheme.sub, currentTheme.main],
  );
  const selfBarSeries = useMemo(
    () => [{ name: "선택 추가항목", data: selfBar.total }],
    [selfBar],
  );

  const tableScale = useTableScale();

  // ── 렌더 ────────────────────────────────────────────────────────────
  return (
    <>
      <PageMeta title="기업체별 마케팅 현황" description="기업체별 마케팅 현황" />
      <div className="h-full flex flex-col">

        {/* ── 페이지 헤더 ───────────────────────────────────────────── */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            기업체별 마케팅 현황
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              기업체·병원별 마케팅 현황
            </span>
          </h1>
        </div>

        {/* ── 스크롤 영역 ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto font-nanum">

          {/* ══ 페이지 1: 기업체별 마케팅 현황 (표) ═══════════════════════ */}
          <div className="min-h-full flex flex-col bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="shrink-0 px-6 py-3 border-b border-gray-100 dark:border-gray-700">
              <PageTitle main="기업체별 마케팅 현황" />
            </div>
            <div className="flex-1 min-h-0 p-12 flex flex-col items-center">
              {/* PvUvOverview 표와 동일한 크기로 그린 뒤 균일 스케일 (비율 변형 없음) */}
              <div style={{ width: TBL_BASE_W * tableScale, height: TBL_BASE_H * tableScale }}>
                <div
                  style={{
                    width: TBL_BASE_W,
                    height: TBL_BASE_H,
                    transform: `scale(${tableScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <CompanyMarketingTable main={currentTheme.main} />
                </div>
              </div>
            </div>
          </div>

          {/* ══ 페이지 2: 통합 통계 ═══════════════════════════════════════ */}
          <div className="min-h-full flex flex-col bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="shrink-0 px-6 py-3 border-b border-gray-100 dark:border-gray-700">
              <PageTitle main="통합 통계" />
            </div>
            {!gadaData ? (
              <EmptyState />
            ) : (
              <div className="flex-1 flex min-h-0">

                {/* 왼쪽 절반: 기간별 예약 신청통계 꺾은선 */}
                <div className="w-1/2 flex flex-col px-6 pt-5 pb-4 border-r border-gray-100 dark:border-gray-700 min-h-0">
                  <h2 className="shrink-0 mb-1 text-sm font-bold text-gray-800 dark:text-white">
                    기간별 예약 신청통계
                  </h2>
                  <div className="relative flex-1 min-h-0">
                    {/* 범례: 그래프 우상단 — 기호 없이 볼드 컬러 제목 + 건수/비율(검정) */}
                    <div className="absolute right-2 top-0 z-10 flex gap-6">
                      <div className="text-center leading-tight">
                        <div className="text-xs font-bold" style={{ color: currentTheme.main }}>
                          검진유형 예약
                        </div>
                        <div className="text-[10px]" style={{ color: "#000000" }}>
                          {examCount.toLocaleString("ko-KR")}건 ({examPct}%)
                        </div>
                      </div>
                      <div className="text-center leading-tight">
                        <div className="text-xs font-bold" style={{ color: currentTheme.sub }}>
                          본인부담 예약
                        </div>
                        <div className="text-[10px]" style={{ color: "#000000" }}>
                          {selfCount.toLocaleString("ko-KR")}건 ({selfPct}%)
                        </div>
                      </div>
                    </div>
                    <Chart
                      key={`integ-line-${reportMonth}-${currentTheme.name}`}
                      options={lineOptions}
                      series={lineSeries}
                      type="line"
                      height="100%"
                    />
                  </div>
                </div>

                {/* 오른쪽 절반: 위(검진유형 패키지) / 아래(선택 추가항목) 세로막대 */}
                <div className="w-1/2 flex flex-col min-h-0">
                  <div className="flex-1 flex flex-col px-6 pt-5 pb-1 border-b border-gray-100 dark:border-gray-700 min-h-0">
                    <h2 className="shrink-0 mb-1 text-sm font-bold text-gray-800 dark:text-white">
                      검진유형 패키지 월별 추이
                    </h2>
                    <div className="flex-1 min-h-0">
                      <Chart
                        key={`integ-bar-exam-${gadaData.month}-${currentTheme.name}`}
                        options={examBarOptions}
                        series={examBarSeries}
                        type="bar"
                        height="100%"
                      />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col px-6 pt-2 pb-4 min-h-0">
                    <h2 className="shrink-0 mb-1 text-sm font-bold text-gray-800 dark:text-white">
                      선택 추가항목 월별 추이
                    </h2>
                    <div className="flex-1 min-h-0">
                      <Chart
                        key={`integ-bar-self-${gadaData.month}-${currentTheme.name}`}
                        options={selfBarOptions}
                        series={selfBarSeries}
                        type="bar"
                        height="100%"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* ══ 페이지 3: (빈 페이지 — 추후 작업 예정) ════════════════════ */}
          <div className="min-h-full flex flex-col bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" />

          {/* ══ 섹션 2: a/b 성별 통계 (패키지) ════════════════════════════ */}
          <div className="min-h-full flex flex-col bg-white dark:bg-gray-800">
            {!gadaData || !stats ? (
              <EmptyState />
            ) : (
              <SectionCharts
                gadaMonth={gadaData.month}
                themeName={currentTheme.name}
                stats={stats}
                barOpts={barOptions}
                barSeries={barSeries}
                leftDonutOpts={leftDonutOpts}
                rightDonutOpts={rightDonutOpts}
                donutSeries={donutSeries}
                leftCenterText={`${stats.aPct}%`}
                rightCenterText={`${stats.bPct}%`}
                areaOpts={areaOptions}
                areaSeries={areaSeries}
                prefix="s2"
                subTitle="검진유형 패키지 성별 통계내역"
                onOpenModal={openModal}
              />
            )}
          </div>

          {/* ══ 섹션 3: c/d 성별 통계 (추가항목) ══════════════════════════ */}
          <div className="min-h-full flex flex-col bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            {!gadaData || !stats3 ? (
              <EmptyState />
            ) : (
              <SectionCharts
                gadaMonth={gadaData.month}
                themeName={currentTheme.name}
                stats={stats3}
                barOpts={barOptions3}
                barSeries={barSeries3}
                leftDonutOpts={leftDonutOpts3}
                rightDonutOpts={rightDonutOpts3}
                donutSeries={donutSeries3}
                leftCenterText={`${stats3.cPct}%`}
                rightCenterText={`${stats3.dPct}%`}
                areaOpts={areaOptions3}
                areaSeries={areaSeries3}
                prefix="s3"
                subTitle="선택 추가항목 성별 통계내역"
                onOpenModal={openModal3}
              />
            )}
          </div>

        </div>
      </div>

      {/* ── 섹션2 이전 데이터 입력 모달 ──────────────────────────────── */}
      {showModal && (
        <DataInputModal
          title="데이터 수정"
          modalData={modalData}
          currentMonth={gadaData?.month}
          onChangeCell={handleModalCell}
          onSave={saveModal}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* ── 섹션3 이전 데이터 입력 모달 ──────────────────────────────── */}
      {showModal3 && (
        <DataInputModal
          title="데이터 수정"
          modalData={modalData3}
          currentMonth={gadaData?.month}
          onChangeCell={handleModalCell3}
          onSave={saveModal3}
          onClose={() => setShowModal3(false)}
        />
      )}
    </>
  );
}
