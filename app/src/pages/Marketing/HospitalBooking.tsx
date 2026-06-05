import { useMemo } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import PageMeta from "../../components/common/PageMeta";
import { useColorTheme } from "../../context/ColorThemeContext";
import { useGadaData } from "../../context/GadaDataContext";
import { PageTitle, FitScaleBox, EmptyState } from "../../components/report/SlideKit";
import { SlideFrame } from "../../report/SlideFrame";

// 슬라이드 본문 기준 크기(px) — FitScaleBox가 16:9 박스에 맞춰 균일 스케일.
const BASE_W = 1544;
const BASE_H = 720;
const LIST_FRAME_H = 600; // 차트 높이(px)
const LIST_TWO_COL_MIN = 18; // 이 개수 이상이면 기타 병원 목록 2단

// ── 슬라이드 묶음 (메뉴 페이지 / 대시보드 미리보기 공용) ──────────────────
export function HospitalDeck() {
  const { currentTheme } = useColorTheme();
  const { gadaData } = useGadaData();

  // 데이터 없을 때도 hook 순서가 바뀌지 않도록 모든 계산을 가드와 함께 무조건 수행.
  const mainHospitals = gadaData?.mainHospitals ?? [];
  const otherHospitals = gadaData?.otherHospitals ?? [];
  const month = gadaData?.month ?? 0;

  const otherCount = otherHospitals.reduce((acc, h) => acc + h.count, 0);
  const totalCount =
    mainHospitals.reduce((acc, h) => acc + h.count, 0) + otherCount;
  const otherPct =
    totalCount > 0 ? Math.round((otherCount / totalCount) * 1000) / 10 : 0;

  // 차트 데이터: 주요 병원만 — 예약 비율(%)로 표시
  const categories = mainHospitals.map((h) => h.hospital);
  const pctValues = mainHospitals.map((h) =>
    totalCount > 0 ? parseFloat(((h.count / totalCount) * 100).toFixed(1)) : 0
  );
  const barColors = categories.map(() => currentTheme.main);

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
        style: { fontSize: "11px", fontWeight: "600", colors: ["#fff"] },
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
        // 오른쪽 끝은 고정한 채 플롯 영역을 왼쪽에서 안쪽으로 줄여(left 패딩)
        // 가장 왼쪽 X축 병원명이 차트 경계에 잘리지 않게 한다.
        padding: { left: 48, bottom: 20 },
      },
      tooltip: { y: { formatter: (val: number) => `${val}%` } },
    }),
    // 테마 변경 시 차트를 완전 재생성
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentTheme.main, currentTheme.sub, JSON.stringify(categories)]
  );

  const series = [{ name: "예약 비율", data: pctValues }];

  // 기타 병원이 LIST_TWO_COL_MIN개 이상이면 2단으로 분할.
  const twoCols = otherHospitals.length >= LIST_TWO_COL_MIN;

  if (!gadaData) {
    return (
      <SlideFrame title="병원별 예약 현황">
        <div className="shrink-0 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <PageTitle main="병원별 예약 현황" />
        </div>
        <EmptyState />
      </SlideFrame>
    );
  }

  return (
    <SlideFrame title="병원별 예약 현황">
      {/* 페이지 제목 — 다른 페이지와 동일 형식 */}
      <div className="shrink-0 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
        <PageTitle main="병원별 예약 현황" />
      </div>

      {/* 본문을 한 덩어리로 16:9 박스에 맞춰 균일 스케일 (p-8이 사방 여백) */}
      <FitScaleBox baseW={BASE_W} baseH={BASE_H}>
        <div className="w-full h-full flex flex-col">
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

          {/* 메인 레이아웃: 1단 = 차트 65% + 여백 5% + 기타목록 30%,
              2단 = 차트 60% + 여백 5% + 기타목록 35% (차트가 줄어 리스트 폭/여백 확보) */}
          <div className="flex gap-0">
            {/* ── 왼쪽: 바 차트 (1단 65% / 2단 60%) ─────────────────── */}
            <div style={{ flex: twoCols ? "0 0 60%" : "0 0 65%" }} className="min-w-0">
              <Chart
                key={`${currentTheme.name}-${month}`}
                options={options}
                series={series}
                type="bar"
                height={LIST_FRAME_H}
              />
            </div>

            {/* ── 중간 여백 (5%) ────────────────────────────────────── */}
            <div style={{ flex: "0 0 5%" }} />

            {/* ── 오른쪽: 기타 병원 목록 (1단 30% / 2단 35%) ────────── */}
            <div style={{ flex: twoCols ? "0 0 35%" : "0 0 30%" }} className="flex flex-col pt-2">
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
                  {/* 2단일 때만 CSS 멀티컬럼(세로 우선 분할) + 단 사이 여백 10px */}
                  <div style={twoCols ? { columnCount: 2, columnGap: 10 } : undefined}>
                    {otherHospitals.map((h, i) => (
                      <div key={i} className="py-px" style={{ breakInside: "avoid" }}>
                        <span className="text-[11.33px] leading-none text-gray-700 dark:text-gray-300">
                          {h.hospital}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-400">기타 병원 없음</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </FitScaleBox>
    </SlideFrame>
  );
}

export default function HospitalBooking() {
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

        {/* 컨텐츠 — 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto font-nanum">
          <HospitalDeck />
        </div>
      </div>
    </>
  );
}
