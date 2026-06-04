import { useCallback, useEffect, useRef, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import PageMeta from "../../components/common/PageMeta";
import { useColorTheme } from "../../context/ColorThemeContext";
import { useGadaData } from "../../context/GadaDataContext";
import { PageTitle, EmptyState } from "../../components/report/SlideKit";
import type { MemberAgeCounts } from "../../types/gada";
import {
  GroupIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "../../icons";

// ── 연령대 키/라벨 (도넛·막대 공통, 순서 고정: 12시부터 20대→기타) ─────────
const AGE_KEYS: (keyof MemberAgeCounts)[] = [
  "age20",
  "age30",
  "age40",
  "age50",
  "age60",
  "etc",
];
const AGE_LABELS = ["20대", "30대", "40대", "50대", "60대", "기타"];

// 고정 그레이 (Tailwind gray-400/300/200)
const GREY_400 = "#9CA3AF";
const GREY_200 = "#E5E7EB";
const GREY_300 = "#D1D5DB";

// hex 를 흰색과 ratio(0~1) 만큼 섞어 밝게 (tinted 메인컬러용)
function tint(hex: string, ratio: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * ratio);
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(mix(r))}${to2(mix(g))}${to2(mix(b))}`;
}

// 배경색 밝기에 따라 가독성 좋은 글자색(밝으면 검정, 어두우면 흰색)
function contrastText(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#111827" : "#ffffff";
}

const sumAge = (g: MemberAgeCounts) => AGE_KEYS.reduce((s, k) => s + g[k], 0);
const fmt = (n: number) => n.toLocaleString("ko-KR");

// ── 반응형 도넛: 컨테이너에 맞춰 정사각형으로 ────────────────────────────
function ResponsiveDonut({
  chartKey,
  options,
  series,
  centerMain,
  centerSub,
}: {
  chartKey: string;
  options: ApexOptions;
  series: number[];
  centerMain: string;
  centerSub: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(220);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const d = Math.floor(Math.min(el.clientWidth, el.clientHeight)) - 8;
      if (d > 0) setSize(Math.max(140, d));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="flex-1 min-h-0 w-full flex items-center justify-center">
      <div className="ctr-donut relative" style={{ width: size, height: size }}>
        <Chart key={chartKey} options={options} series={series} type="donut" width={size} height={size} />
        {/* 가운데 원 여백 텍스트 */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
          style={{ padding: size * 0.18 }}
        >
          <span
            className="font-bold leading-tight text-gray-800 dark:text-white"
            style={{ fontSize: Math.min(14, Math.max(12, Math.round(size * 0.064))) }}
          >
            {centerMain}
          </span>
          <span
            className="font-bold leading-tight text-gray-500 dark:text-gray-400"
            style={{ fontSize: Math.min(12, Math.max(10, Math.round(size * 0.05))), wordBreak: "keep-all" }}
          >
            {centerSub}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 막대그래프 + 최대 막대 위 말풍선 라벨("최대 접속 연령") ──────────────
function BarChartWithMaxLabel({
  chartKey,
  options,
  series,
  maxIndex,
  subColor,
}: {
  chartKey: string;
  options: ApexOptions;
  series: { name: string; data: number[] }[];
  maxIndex: number;
  subColor: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; top: number } | null>(null);

  // 최대값 막대의 화면상 위치(상단 중앙)를 읽어 말풍선을 그 위에 띄운다.
  const place = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap || maxIndex < 0) {
      setPos(null);
      return;
    }
    const bars = wrap.querySelectorAll<SVGGraphicsElement>(".apexcharts-bar-area");
    const bar = bars[maxIndex];
    if (!bar) {
      setPos(null);
      return;
    }
    const wr = wrap.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    setPos({ x: br.left - wr.left + br.width / 2, top: br.top - wr.top });
  }, [maxIndex]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const run = () => requestAnimationFrame(place);
    run();
    const t = setTimeout(run, 150); // 초기 렌더 직후 재배치
    const ro = new ResizeObserver(run);
    ro.observe(wrap);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, [place, chartKey, series]);

  return (
    <div ref={wrapRef} className="relative w-full h-full">
      <Chart key={chartKey} options={options} series={series} type="bar" height="100%" />
      {pos && (
        <div
          className="pointer-events-none absolute flex flex-col items-center"
          style={{ left: pos.x, top: pos.top, transform: "translate(-50%, calc(-100% - 34px))" }}
        >
          {/* 말풍선 몸체 (서브컬러 배경 + 검정 글씨) */}
          <div
            className="whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-bold shadow-sm"
            style={{ background: subColor, color: "#000000" }}
          >
            최대 접속 연령
          </div>
          {/* 아래로 향한 꼬리 */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: `7px solid ${subColor}`,
            }}
          />
        </div>
      )}
    </div>
  );
}

type Gender = "male" | "female";

// ── 한 페이지(슬라이드): 성별별 연령대 클릭률 현황 ────────────────────────
function AgeCtrSlide({ gender, border }: { gender: Gender; border: "b" | "t" }) {
  const { currentTheme } = useColorTheme();
  const { gadaData, memberStatsData, memberStatsByMonth } = useGadaData();

  const genderLabel = gender === "male" ? "남성" : "여성";

  // 강조색(아이콘·증감율): 남성=메인컬러, 여성=서브컬러
  const accent = gender === "male" ? currentTheme.main : currentTheme.sub;

  // 연령대 색(20대→기타, 도넛·막대·범례 공통).
  //  - 남성: tinted 메인 / 메인 / 서브 / 그레이400 / 그레이200 / 그레이300
  //  - 여성: tinted 서브(70% 밝게) / 서브 / 서브 50% 밝게 / 그레이400 / 그레이200 / 그레이300 (50·60·기타는 남성과 동일)
  const SLICE_COLORS =
    gender === "male"
      ? [
          tint(currentTheme.main, 0.5),
          currentTheme.main,
          currentTheme.sub,
          GREY_400,
          GREY_200,
          GREY_300,
        ]
      : [
          tint(currentTheme.sub, 0.7),
          currentTheme.sub,
          tint(currentTheme.sub, 0.4),
          GREY_400,
          GREY_200,
          GREY_300,
        ];

  // 도넛(클릭률)·총PV·막대는 가다실(클릭수)+회원통계(PV) 둘 다 필요
  if (!gadaData || !memberStatsData) {
    return (
      <div
        className={`w-full flex flex-col p-8 bg-white dark:bg-gray-800 ${
          border === "b"
            ? "border-b border-gray-200 dark:border-gray-700"
            : "border-t border-gray-200 dark:border-gray-700"
        }`}
        style={{ aspectRatio: "16 / 9" }}
      >
        <div className="shrink-0 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <PageTitle main="로그인 회원 연령대 기준" sub={`광고 클릭률 현황(${genderLabel})`} />
        </div>
        <EmptyState
          title="필요한 데이터가 없습니다"
          desc="가다실 통계와 통계정보(회원) 파일을 업로드해주세요"
        />
      </div>
    );
  }

  // ── 현재월(M) / 전월(M-1) 회원통계 ──────────────────────────────────────
  const M = memberStatsData.month;
  const prevM = M <= 1 ? 12 : M - 1;
  const prevMember = memberStatsByMonth[prevM] ?? null;
  const mm = (n: number) => String(n).padStart(2, "0");

  const curGA = memberStatsData.genderAge[gender];
  const prevGA = prevMember ? prevMember.genderAge[gender] : null;

  const curTotal = sumAge(curGA);
  const prevTotal = prevGA ? sumAge(prevGA) : null;
  const growth =
    prevTotal != null && prevTotal > 0
      ? Math.round(((curTotal - prevTotal) / prevTotal) * 100)
      : null;
  const up = growth != null && growth >= 0;

  // ── 연령대별 디스플레이 광고 관심도 (도넛 표시값) ───────────────────────
  // ratio_g = 연령대별 (남성 총 PV ÷ 남성 순방문자수). PV=회원통계, 순방문자수=가다실.
  // a = Σ ratio_g, 도넛 표시값 = ratio_g × 100 / a  (전체 합 = 100%)
  const visitors = gender === "male" ? gadaData.ageVisitorMale : gadaData.ageVisitorFemale;
  const ratio = AGE_KEYS.map((k) => (visitors[k] > 0 ? curGA[k] / visitors[k] : 0));
  const ratioSum = ratio.reduce((s, v) => s + v, 0);
  const donutPct = ratio.map((r) => (ratioSum > 0 ? (r * 100) / ratioSum : 0));

  // ── 연령별 접속자 수(PV) 막대값 + 최대 막대 ─────────────────────────────
  const barValues = AGE_KEYS.map((k) => curGA[k]);
  const maxValue = Math.max(...barValues);
  const maxIndex = maxValue > 0 ? barValues.indexOf(maxValue) : -1;

  const chartKey = `${gender}-${currentTheme.name}-${M}`;

  // ── 도넛 옵션 (기업체별 마케팅 도넛과 동일 두께 52%, 12시부터 시계방향) ──
  const donutOptions: ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "NanumSquare, sans-serif",
      animations: { enabled: false },
      background: "transparent",
    },
    labels: AGE_LABELS,
    colors: SLICE_COLORS,
    stroke: { show: true, width: 2, colors: ["#ffffff"] },
    dataLabels: {
      enabled: true,
      // 슬라이스 위에 해당 연령대 클릭률(%) 표시
      formatter: (_val, opts) =>
        `${Number(opts.w.config.series[opts.seriesIndex]).toFixed(1)}%`,
      style: { fontSize: "11px", fontWeight: 700, colors: SLICE_COLORS.map(contrastText) },
      dropShadow: { enabled: false },
    },
    legend: { show: false },
    plotOptions: {
      // 두께 20% 축소: 기존 hole 52% → 62% (링 두께 ≈ 0.48R → 0.38R)
      pie: { startAngle: 0, endAngle: 360, donut: { size: "62%" } },
    },
    tooltip: {
      enabled: true,
      // 그레이100 배경 + 검정 글씨로 가독성 확보 (연령대 + 클릭률%)
      custom: (opts) => {
        const { seriesIndex, w } = opts;
        const label = w.config.labels[seriesIndex];
        const val = Number(w.config.series[seriesIndex]).toFixed(1);
        return `<div style="background:#F3F4F6;color:#111827;padding:6px 10px;font-size:12px;font-weight:600;border-radius:6px;">${label} ${val}%</div>`;
      },
    },
    states: { active: { filter: { type: "none" } } },
  };

  // ── 막대 옵션 (연령대별 분포 색상, 막대 위 수치) ─────────────────────────
  const barOptions: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "NanumSquare, sans-serif",
      animations: { enabled: false },
      background: "transparent",
    },
    colors: SLICE_COLORS,
    // 막대를 완전 불투명(1)으로 고정: 도넛과 같은 SLICE_COLORS여도 기본 막대 투명도 탓에 더 옅어 보이는 것 방지
    fill: { opacity: 1 },
    plotOptions: {
      bar: {
        distributed: true,
        columnWidth: "55%",
        borderRadius: 4,
        borderRadiusApplication: "end",
        dataLabels: { position: "top" },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (v: number) => (v > 0 ? fmt(v) : ""),
      offsetY: -18,
      style: { fontSize: "11px", fontWeight: "700", colors: ["#374151"] },
    },
    xaxis: {
      categories: AGE_LABELS,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "12px", colors: Array(6).fill("#6b7280"), fontWeight: 600 } },
    },
    yaxis: {
      labels: { formatter: (v: number) => fmt(v), style: { fontSize: "10px", colors: ["#9ca3af"] } },
    },
    legend: { show: false },
    grid: {
      borderColor: "#f3f4f6",
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: { top: 12, right: 8, bottom: 0, left: 0 },
    },
    tooltip: { y: { formatter: (v: number) => `${fmt(v)}명` } },
  };

  return (
    <div
      className={`w-full flex flex-col p-8 bg-white dark:bg-gray-800 ${
        border === "b"
          ? "border-b border-gray-200 dark:border-gray-700"
          : "border-t border-gray-200 dark:border-gray-700"
      }`}
      style={{ aspectRatio: "16 / 9" }}
    >
      {/* 슬라이드 제목 */}
      <div className="shrink-0 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
        <PageTitle main="로그인 회원 연령대 기준" sub={`광고 클릭률 현황(${genderLabel})`} />
      </div>

      {/* 본문: 왼쪽 도넛 / 오른쪽(상단 30% 요약, 하단 70% 막대).
          프레임 p-8(32px)이 사방 여백 → 안쪽 컬럼은 가운데 거터(pr-6/pl-6)만 둔다. */}
      <div className="flex-1 flex min-h-0">

        {/* ── 왼쪽: 연령대별 클릭률 도넛 ─────────────────────────────── */}
        <div className="w-[40%] min-h-0 flex flex-col pr-6 pt-5 border-r border-gray-100 dark:border-gray-700">
          <h2 className="shrink-0 text-sm font-bold text-gray-800 dark:text-white">
            연령대별 클릭률
          </h2>
          <ResponsiveDonut
            chartKey={`donut-${chartKey}`}
            options={donutOptions}
            series={donutPct}
            centerMain={`${genderLabel} 연령대별`}
            centerSub="디스플레이 광고 관심도"
          />
          {/* 도넛 범례: 연령대 + 클릭률(%) */}
          <div className="shrink-0 mt-3 grid grid-cols-3 gap-x-4 gap-y-1.5">
            {AGE_LABELS.map((lbl, i) => (
              <div key={lbl} className="flex items-center gap-1.5 text-[11px]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: SLICE_COLORS[i] }} />
                <span className="text-gray-600 dark:text-gray-300">{lbl}</span>
                <span className="ml-auto font-bold tabular-nums text-gray-800 dark:text-white">
                  {donutPct[i].toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 오른쪽 (가운데 거터 pl-6) ──────────────────────────────── */}
        <div className="w-[60%] min-h-0 flex flex-col pl-6">

          {/* 상단 30%: 총 접속자 수 요약 (드롭섀도우 흰 박스) */}
          <div className="flex-[3] min-h-0 pt-5 flex items-center">
            <div
              className="w-full rounded-xl bg-white dark:bg-gray-900 px-6 py-4 flex items-center justify-between"
              style={{ boxShadow: "0 2px 14px rgba(0,0,0,0.08)" }}
            >
              {/* 아이콘 (남성=메인컬러, 여성=서브컬러) */}
              <span className="shrink-0" style={{ color: accent }}>
                <GroupIcon className="w-7 h-7" />
              </span>
              {/* 라벨 */}
              <span className="shrink-0 text-sm font-bold text-gray-800 dark:text-white">
                {genderLabel} 총 접속자 수
              </span>
              {/* 전월 → 당월 (가운데 화살표는 Regular 두께·검정) */}
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-black dark:text-white">{mm(prevM)}월:</span>{" "}
                  <span className="font-bold tabular-nums">
                    {prevTotal != null ? fmt(prevTotal) : "—"}
                  </span>
                </span>
                {/* 아이콘 path가 fill="" 라 루트 fill을 직접 지정해야 보임 (svgr이 className으로 fill-current를 덮어씀) */}
                <ArrowRightIcon className="w-4 h-4 shrink-0" style={{ fill: "#000000" }} />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-black dark:text-white">{mm(M)}월:</span>{" "}
                  <span className="font-bold tabular-nums">{fmt(curTotal)}</span>
                </span>
              </div>
              {/* 증감율: 위/아래 화살표 + 숫자 + % (남성=메인·여성=서브, 기존보다 1pt 작게) */}
              <span
                className="flex shrink-0 items-center gap-1 font-extrabold tabular-nums"
                style={{ color: growth == null ? "#9ca3af" : accent, fontSize: "17pt" }}
              >
                {growth != null &&
                  (up ? (
                    <ArrowUpIcon className="w-5 h-5" style={{ fill: accent }} />
                  ) : (
                    <ArrowDownIcon className="w-5 h-5" style={{ fill: accent }} />
                  ))}
                {growth != null ? `${Math.abs(growth)}%` : "—"}
              </span>
            </div>
          </div>

          {/* 하단 70%: 연령별 접속자 수 막대그래프 */}
          <div className="flex-[7] min-h-0 flex flex-col pt-2">
            <h2 className="shrink-0 text-sm font-bold text-gray-800 dark:text-white">
              연령별 접속자 수
            </h2>
            <p className="shrink-0 mt-0.5 text-xs font-bold text-gray-500 dark:text-gray-400">
              Total: {fmt(curTotal)}
            </p>
            <div className="flex-1 min-h-0 mt-1">
              <BarChartWithMaxLabel
                chartKey={`bar-${chartKey}`}
                options={barOptions}
                series={[{ name: "접속자 수", data: barValues }]}
                maxIndex={maxIndex}
                subColor={currentTheme.sub}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────
export default function AgeCtr() {
  return (
    <>
      <PageMeta title="연령대 기준 클릭률" description="디스플레이 광고 현황 - 연령대 기준 클릭률" />
      <div className="h-full flex flex-col">
        {/* 페이지 헤더 (메뉴명) */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            연령대 기준 클릭률
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              디스플레이 광고 현황
            </span>
          </h1>
        </div>

        {/* 스크롤 영역: 남성/여성 두 슬라이드 (1920×1080) */}
        <div className="flex-1 overflow-y-auto font-nanum">
          <AgeCtrSlide gender="male" border="b" />
          <AgeCtrSlide gender="female" border="t" />
        </div>
      </div>
    </>
  );
}
