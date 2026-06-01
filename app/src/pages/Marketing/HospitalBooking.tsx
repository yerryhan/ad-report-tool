import { useMemo } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { useColorTheme } from "../../context/ColorThemeContext";
import { useGadaData } from "../../context/GadaDataContext";

// ── 페이지 제목 (다른 시각화 페이지와 동일 형식) ──────────────────────
function PageTitle({ main, sub }: { main: string; sub?: string }) {
  return (
    <h2 className="shrink-0 text-gray-900 dark:text-white">
      <span className="text-base font-bold">{main}</span>
      {sub ? <span className="text-sm font-bold">{` - ${sub}`}</span> : null}
    </h2>
  );
}

export default function HospitalBooking() {
  const { currentTheme } = useColorTheme();
  const { gadaData } = useGadaData();

  // 데이터 없을 때 빈 화면
  if (!gadaData) {
    return (
      <>
        <PageMeta title="병원별 예약 현황" description="병원별 예약 현황" />
        <div className="h-full flex flex-col">
          <div className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              병원별 예약 현황
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                기업체·병원별 마케팅 현황
              </span>
            </h1>
          </div>
          <div className="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
                <svg
                  className="text-gray-400 dark:text-gray-500"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2.5 2.1h-15V5h15v14.1zm0-16.1h-15c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                업로드된 데이터가 없습니다
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                먼저 가다실 엑셀 파일을 업로드해주세요
              </p>
              <Link
                to="/data/upload"
                className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-500 px-4 text-xs font-medium text-white hover:bg-brand-600 transition-colors"
              >
                데이터 업로드로 이동
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const { mainHospitals, otherHospitals, month } = gadaData;

  // 기타 병원 합산
  const otherCount = otherHospitals.reduce((acc, h) => acc + h.count, 0);
  const totalCount =
    mainHospitals.reduce((acc, h) => acc + h.count, 0) + otherCount;

  const otherPct =
    totalCount > 0 ? Math.round((otherCount / totalCount) * 1000) / 10 : 0;

  // 차트 데이터: 주요 병원만 — 예약 비율(%)로 표시
  const categories = mainHospitals.map((h) => h.hospital);
  const pctValues = mainHospitals.map((h) =>
    totalCount > 0
      ? parseFloat(((h.count / totalCount) * 100).toFixed(1))
      : 0
  );
  const barColors = categories.map(() => currentTheme.main);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        toolbar: { show: false },
        fontFamily: "NanumSquare, sans-serif",
        animations: { enabled: true, speed: 400 },
        background: "transparent",
      },
      colors: barColors,
      plotOptions: {
        bar: {
          distributed: true,
          columnWidth: "52%",
          borderRadius: 5,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${val}%`,
        style: {
          fontSize: "11px",
          fontWeight: "600",
          colors: ["#fff"],
        },
        dropShadow: { enabled: false },
      },
      xaxis: {
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: {
            fontSize: "11.33px",
            colors: Array(categories.length).fill("#9ca3af"),
          },
          rotate: -35,
          trim: false,
          maxHeight: 100,
        },
      },
      yaxis: {
        title: {
          text: "예약 비율 (%)",
          style: { fontSize: "12px", color: "#9ca3af" },
        },
        labels: {
          formatter: (v: number) => `${v}%`,
          style: { fontSize: "11px", colors: ["#9ca3af"] },
        },
        min: 0,
      },
      legend: { show: false },
      grid: {
        borderColor: "#f3f4f6",
        yaxis: { lines: { show: true } },
        xaxis: { lines: { show: false } },
        padding: { bottom: 20 },
      },
      tooltip: {
        y: {
          formatter: (val: number) => `${val}%`,
        },
      },
    }),
    // 테마 변경 시 차트를 완전 재생성
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentTheme.main, currentTheme.sub, JSON.stringify(categories)]
  );

  const series = [{ name: "예약 비율", data: pctValues }];

  return (
    <>
      <PageMeta title="병원별 예약 현황" description="병원별 예약 현황" />
      <div className="h-full flex flex-col">
        {/* 페이지 헤더 */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            병원별 예약 현황
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              기업체·병원별 마케팅 현황
            </span>
          </h1>
        </div>

        {/* 컨텐츠 — 전체 흰색 배경 */}
        <div className="flex-1 overflow-auto bg-white dark:bg-gray-800 font-nanum">
          {/* 페이지 제목 — 다른 페이지와 동일 형식 */}
          <div className="shrink-0 px-6 py-3 border-b border-gray-100 dark:border-gray-700">
            <PageTitle main="병원별 예약 현황" />
          </div>
          <div className="mx-6 mt-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm px-6 pt-6 pb-0">

            {/* 요약 배지 */}
            <div className="mb-5 flex items-center gap-3">
              <span
                className="rounded-full px-3 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: currentTheme.main }}
              >
                주요 병원 {mainHospitals.length}개
              </span>
              {otherHospitals.length > 0 && (
                <span
                  className="rounded-full px-3 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: currentTheme.sub }}
                >
                  기타 {otherHospitals.length}개 병원
                </span>
              )}
            </div>

            {/* 메인 레이아웃: 차트 65% + 여백 5% + 기타목록 30% */}
            <div className="flex gap-0">

              {/* ── 왼쪽: 바 차트 (65%) ──────────────────────────────── */}
              <div style={{ flex: "0 0 65%" }} className="min-w-0">
                <Chart
                  key={`${currentTheme.name}-${month}`}
                  options={options}
                  series={series}
                  type="bar"
                  height={500}
                />
              </div>

              {/* ── 중간 여백 (5%) ────────────────────────────────────── */}
              <div style={{ flex: "0 0 5%" }} />

              {/* ── 오른쪽: 기타 병원 목록 (30%) ─────────────────────── */}
              <div style={{ flex: "0 0 30%" }} className="flex flex-col pt-2">
                {/* 기타 병원 헤더 */}
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: currentTheme.sub }}
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    기타 병원
                  </span>
                  {otherCount > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {otherPct}%
                    </span>
                  )}
                </div>

                {otherHospitals.length > 0 ? (
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                    {otherHospitals.map((h, i) => (
                      <div key={i} className="py-px">
                        <span className="text-[11.33px] leading-none text-gray-700 dark:text-gray-300">
                          {h.hospital}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs text-gray-400">기타 병원 없음</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
