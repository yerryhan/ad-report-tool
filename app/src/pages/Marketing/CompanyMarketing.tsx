import { useMemo } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { useGadaData } from "../../context/GadaDataContext";

// ── 상수 ────────────────────────────────────────────────────────────────
const MONTH_LABELS = [
  "1월","2월","3월","4월","5월","6월",
  "7월","8월","9월","10월","11월","12월","누적합계",
];
const MALE_COLOR   = "#3B9189";
const FEMALE_COLOR = "#7DCAC3";

// ── 도넛 옵션 팩토리 ────────────────────────────────────────────────────
function makeDonutOpts(
  fillColors: [string, string],
  strokeColor: string,
  centerText: string,
  centerColor: string,
): ApexOptions {
  return {
    chart: {
      type: "donut",
      fontFamily: "Outfit, sans-serif",
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
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: true,
              label: "",
              fontSize: "22px",
              fontWeight: 700,
              color: centerColor,
              formatter: () => centerText,
            },
          },
        },
      },
    },
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

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────
export default function CompanyMarketing() {
  const { gadaData } = useGadaData();

  // ── 차트 수치 계산 ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!gadaData?.genderStats) return null;

    const { genderStats, month } = gadaData;
    const { totalMale, totalFemale, packageMalePct } = genderStats;

    const maleData:   number[] = Array(12).fill(0);
    const femaleData: number[] = Array(12).fill(0);
    if (month >= 1 && month <= 12) {
      maleData[month - 1]   = totalMale;
      femaleData[month - 1] = totalFemale;
    }

    const cumMale   = maleData.reduce((s, v) => s + v, 0);
    const cumFemale = femaleData.reduce((s, v) => s + v, 0);
    const maleSeries:   number[] = [...maleData,   cumMale];
    const femaleSeries: number[] = [...femaleData, cumFemale];

    const maxTotal = Math.max(...maleSeries.map((m, i) => m + femaleSeries[i]), 40);
    const yMax = Math.ceil(maxTotal / 20) * 20;

    const aPct = packageMalePct;
    const bPct = parseFloat((100 - aPct).toFixed(1));

    return { maleSeries, femaleSeries, yMax, aPct, bPct };
  }, [gadaData]);

  // ── 막대 그래프 옵션 (12개월 + 누적합계 슬롯, X축 레이블 숨김) ──────
  const barOptions = useMemo((): ApexOptions => {
    if (!stats) return {};
    return {
      chart: {
        type: "bar",
        stacked: true,
        toolbar: { show: false },
        fontFamily: "Outfit, sans-serif",
        animations: { enabled: false },
        background: "transparent",
        offsetX: 0,
        offsetY: 0,
      },
      colors: [MALE_COLOR, FEMALE_COLOR],
      plotOptions: {
        bar: {
          columnWidth: "52%",
          dataLabels: { total: { enabled: false } },
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: MONTH_LABELS, // 1월~12월 + 누적합계 (13개)
        axisBorder: { show: false },
        axisTicks:  { show: false },
        labels: { show: false }, // 아래 표의 헤더 행이 X축 역할
      },
      yaxis: {
        tickAmount: stats.yMax / 20, // 20 단위로 기준선 표시
        max: stats.yMax,             // 최대값을 20 단위로 반올림한 값
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
        fontFamily: "Outfit, sans-serif",
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
  }, [stats]);

  // 차트 시리즈: 12개월 + 누적합계 자리는 0 (투명 슬롯, X축 정렬용)
  const barSeries = useMemo(
    () => stats
      ? [
          { name: "남성", data: [...stats.maleSeries.slice(0, 12), 0] },
          { name: "여성", data: [...stats.femaleSeries.slice(0, 12), 0] },
        ]
      : [],
    [stats],
  );

  // ── 도넛 옵션 ───────────────────────────────────────────────────────
  const leftDonutOpts = useMemo(
    () => makeDonutOpts([MALE_COLOR, "#FFFFFF"], MALE_COLOR, `${stats?.aPct ?? 0}%`, MALE_COLOR),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats?.aPct],
  );
  const rightDonutOpts = useMemo(
    () => makeDonutOpts(["#FFFFFF", FEMALE_COLOR], FEMALE_COLOR, `${stats?.bPct ?? 0}%`, FEMALE_COLOR),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats?.bPct],
  );
  const donutSeries = useMemo(
    () => stats && stats.aPct + stats.bPct > 0 ? [stats.aPct, stats.bPct] : [50, 50],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats?.aPct, stats?.bPct],
  );

  // ── 렌더 ────────────────────────────────────────────────────────────
  return (
    <>
      <PageMeta title="기업체별 마케팅 현황" description="기업체별 마케팅 현황" />
      <div className="h-full flex flex-col">

        {/* ── 페이지 헤더 ───────────────────────────────────────────── */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            기업체별 마케팅 현황
            {gadaData && gadaData.month > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                {gadaData.month}월 한국(MSD) 가다실
              </span>
            )}
          </h1>
        </div>

        {/* ── 스크롤 영역: 섹션 1 + 섹션 2 세로 배치 ─────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ══ 섹션 1: 통합 통계 (준비 중) — 전체 높이 ══════════════════ */}
          <div className="min-h-full flex items-center justify-center bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {!gadaData ? (
              <EmptyState />
            ) : (
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700">
                  <svg className="text-gray-300 dark:text-gray-500" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">통합 통계</p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">준비 중입니다</p>
              </div>
            )}
          </div>

          {/* ══ 섹션 2: 성별 통계 차트 — 전체 높이 ════════════════════════ */}
          <div className="min-h-full flex flex-col bg-white dark:bg-gray-800">
            {!gadaData || !stats ? (
              <EmptyState />
            ) : (
              <div className="flex-1 flex min-h-0">

                {/* 왼쪽 절반: 월별 막대그래프 + 예약자 수 표 */}
                <div className="w-1/2 flex flex-col px-6 pt-5 pb-4 border-r border-gray-100 dark:border-gray-700 min-h-0">
                  <h2 className="shrink-0 mb-1 text-sm font-bold text-gray-800 dark:text-white">
                    월별 남성/여성 통계
                  </h2>

                  {/* 막대그래프: 남은 공간 모두 차지 */}
                  <div className="flex-1 min-h-0">
                    <Chart
                      key={`bar-${gadaData.month}`}
                      options={barOptions}
                      series={barSeries}
                      type="bar"
                      height="100%"
                    />
                  </div>

                  {/* 예약자 수 표 — 헤더가 막대그래프 X축 역할 */}
                  <div className="shrink-0 mt-0">
                    <table className="w-full table-fixed border-collapse text-[9px] leading-none">
                      <colgroup>
                        {/* 레이블 열: 차트 Y축 너비(38px)와 일치 */}
                        <col style={{ width: "38px", minWidth: "38px", maxWidth: "38px" }} />
                        {/* 13개 데이터 열(1월~12월+누적합계): 나머지 너비 균등 분배 */}
                        {Array(13).fill(null).map((_, i) => (
                          <col key={i} />
                        ))}
                      </colgroup>
                      <thead>
                        <tr>
                          {/* 빈 레이블 헤더 (Y축 너비 확보) */}
                          <th className="border border-gray-200 bg-gray-100 dark:bg-gray-700 dark:border-gray-600 py-1" />
                          {/* 1월~12월 + 누적합계 */}
                          {MONTH_LABELS.map((m) => (
                            <th
                              key={m}
                              className="border border-gray-200 bg-gray-100 dark:bg-gray-700 dark:border-gray-600 py-1 text-center font-semibold text-gray-600 dark:text-gray-300"
                            >
                              {m}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* 여성 행 */}
                        <tr>
                          <td className="border border-gray-200 bg-gray-100 dark:bg-gray-700 dark:border-gray-600 py-1 text-center font-semibold text-gray-600 dark:text-gray-300">
                            여성
                          </td>
                          {stats.femaleSeries.slice(0, 12).map((v, i) => (
                            <td
                              key={i}
                              className="border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-600 py-1 text-center text-gray-700 dark:text-gray-300"
                            >
                              {v}
                            </td>
                          ))}
                          {/* 누적합계 */}
                          <td className="border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-600 py-1 text-center font-semibold text-gray-700 dark:text-gray-300">
                            {stats.femaleSeries[12]}
                          </td>
                        </tr>
                        {/* 남성 행 */}
                        <tr>
                          <td className="border border-gray-200 bg-gray-100 dark:bg-gray-700 dark:border-gray-600 py-1 text-center font-semibold text-gray-600 dark:text-gray-300">
                            남성
                          </td>
                          {stats.maleSeries.slice(0, 12).map((v, i) => (
                            <td
                              key={i}
                              className="border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-600 py-1 text-center text-gray-700 dark:text-gray-300"
                            >
                              {v}
                            </td>
                          ))}
                          {/* 누적합계 */}
                          <td className="border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-600 py-1 text-center font-semibold text-gray-700 dark:text-gray-300">
                            {stats.maleSeries[12]}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 오른쪽 절반: 도넛 + 꺾은선 (상하 분할) */}
                <div className="w-1/2 flex flex-col min-h-0">

                  {/* 상단: 도넛 두 개 */}
                  <div className="flex-1 flex flex-col px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="shrink-0 mb-4 text-sm font-bold text-gray-800 dark:text-white">
                      해당월 성별 비율
                    </h2>
                    <div className="flex flex-1 items-center justify-center gap-20">

                      {/* 왼쪽 도넛 — 남성 */}
                      <div className="flex flex-col items-center">
                        <div className="rounded-full bg-gray-50 p-1">
                          <Chart
                            key={`donut-m-${gadaData.month}`}
                            options={leftDonutOpts}
                            series={donutSeries}
                            type="donut"
                            width={190}
                            height={190}
                          />
                        </div>
                        <span className="mt-3 text-[10px] font-normal text-gray-500 dark:text-gray-400">
                          해당월 남성 비율
                        </span>
                      </div>

                      {/* 오른쪽 도넛 — 여성 */}
                      <div className="flex flex-col items-center">
                        <div className="rounded-full bg-gray-50 p-1">
                          <Chart
                            key={`donut-f-${gadaData.month}`}
                            options={rightDonutOpts}
                            series={donutSeries}
                            type="donut"
                            width={190}
                            height={190}
                          />
                        </div>
                        <span className="mt-3 text-[10px] font-normal text-gray-500 dark:text-gray-400">
                          해당월 여성 비율
                        </span>
                      </div>

                    </div>
                  </div>

                  {/* 하단: 꺾은선 그래프 (다음 작업) */}
                  <div className="flex-1 flex items-center justify-center px-6">
                    <p className="text-xs text-gray-300 dark:text-gray-600 select-none">
                      월별 남성/여성 통계 추이 (준비 중)
                    </p>
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* ══ 섹션 3: 빈 페이지 — 전체 높이 ═══════════════════════════════ */}
          <div className="min-h-full flex items-center justify-center bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-700">
                <svg className="text-gray-300 dark:text-gray-500" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">세 번째 페이지</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">준비 중입니다</p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
