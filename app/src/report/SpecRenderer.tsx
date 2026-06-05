import { useEffect, useRef, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import {
  SLIDE_W,
  SLIDE_H,
  PX_PER_IN,
  type SlideSpec,
  type El,
  type Run,
  type ChartSpec,
  type Align,
  type VAlign,
} from "./reportSpec";
import { KoreaMap } from "../pages/Display/MemberPv";
import { GroupIcon } from "../icons";

// HTML 미리보기 렌더러 — spec 을 1280×720(px) 캔버스에 절대배치.
// inch → px(×96), pt → px(×96/72). 차트는 ApexCharts(근사), 지도/아이콘은 실제 컴포넌트.

const PX = PX_PER_IN; // inch → px
const PT = PX_PER_IN / 72; // pt → px
const BASE_W = SLIDE_W * PX; // 1280
const BASE_H = SLIDE_H * PX; // 720

const c = (hexNo: string) => `#${hexNo}`;

function fontInfo(fontFace?: string): { family: string; base: number } {
  if (fontFace && fontFace.includes("ExtraBold")) return { family: "NanumSquare", base: 800 };
  return { family: fontFace || "NanumSquare", base: 400 };
}
const justify: Record<Align, string> = { left: "flex-start", center: "center", right: "flex-end" };
const items: Record<VAlign, string> = { top: "flex-start", middle: "center", bottom: "flex-end" };

function TextEl({ el }: { el: Extract<El, { kind: "text" }> }) {
  const f = fontInfo(el.fontFace);
  const defColor = el.color ?? "000000";
  const defSize = el.size ?? 12;
  return (
    <div
      style={{
        position: "absolute", left: el.x * PX, top: el.y * PX, width: el.w * PX, height: el.h * PX,
        display: "flex", justifyContent: justify[el.align ?? "left"], alignItems: items[el.valign ?? "top"],
        background: el.fill ? c(el.fill) : undefined,
        fontFamily: f.family, fontWeight: f.base,
        textAlign: el.align ?? "left", lineHeight: el.lineSpacingMultiple ? el.lineSpacingMultiple : 1.2,
        padding: el.fill ? 6 : 0, boxSizing: "border-box", overflow: "hidden",
      }}
    >
      <div style={{ whiteSpace: "pre-wrap", width: "100%" }}>
        {el.runs.map((r: Run, i) => (
          <span
            key={i}
            style={{
              color: c(r.color ?? defColor),
              fontWeight: r.bold ? (f.base >= 800 ? 800 : 700) : f.base,
              fontSize: (r.size ?? defSize) * PT,
              fontStyle: r.italic ? "italic" : undefined,
            }}
          >
            {r.text}
          </span>
        ))}
      </div>
    </div>
  );
}

function TableEl({ el }: { el: Extract<El, { kind: "table" }> }) {
  const f = fontInfo(el.fontFace);
  const border = `1px solid ${c(el.borderColor ?? "D1D5DB")}`;
  return (
    <div style={{ position: "absolute", left: el.x * PX, top: el.y * PX, width: el.w * PX, height: el.h * PX }}>
      <table style={{ width: "100%", height: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontFamily: f.family }}>
        <colgroup>
          {el.colW.map((w, i) => (
            <col key={i} style={{ width: w * PX }} />
          ))}
        </colgroup>
        <tbody>
          {el.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  colSpan={cell.colspan}
                  rowSpan={cell.rowspan}
                  style={{
                    background: cell.fill ? c(cell.fill) : "#FFFFFF",
                    color: c(cell.color ?? "000000"),
                    fontWeight: cell.bold ? 700 : 400,
                    textAlign: cell.align ?? "center",
                    verticalAlign: cell.valign ?? "middle",
                    border,
                    fontSize: (cell.size ?? 9) * PT,
                    padding: "2px 4px",
                    lineHeight: 1.25,
                    overflow: "hidden",
                    wordBreak: "keep-all",
                  }}
                >
                  {cell.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── ChartSpec → ApexCharts ───────────────────────────────────────────────
function ChartEl({ el }: { el: Extract<El, { kind: "chart" }> }) {
  const spec = el.chart;
  const wPx = el.w * PX;
  const hPx = el.h * PX;
  return (
    <div style={{ position: "absolute", left: el.x * PX, top: el.y * PX, width: wPx, height: hPx }}>
      <ApexFromSpec spec={spec} wPx={wPx} hPx={hPx} />
    </div>
  );
}

function ApexFromSpec({ spec, wPx, hPx }: { spec: ChartSpec; wPx: number; hPx: number }) {
  const colors = spec.colors.map(c);
  const lightGridOpts: ApexOptions["grid"] = {
    borderColor: "#F3F4F6",
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
  };
  const axisLabel = { style: { fontSize: "9px", colors: "#9CA3AF" } };
  const lightAxis = { axisBorder: { show: true, color: "#F3F4F6" }, axisTicks: { show: false } };

  const legend: ApexOptions["legend"] =
    spec.legend === "none"
      ? { show: false }
      : { show: true, position: spec.legend === "bottom" ? "bottom" : "top", horizontalAlign: "right", fontSize: "11px", fontFamily: "NanumSquare" };

  if (spec.kind === "doughnut") {
    const series = spec.series[0].values;
    const options: ApexOptions = {
      chart: { type: "donut", fontFamily: "NanumSquare", animations: { enabled: false }, background: "transparent" },
      labels: spec.labels,
      colors,
      stroke: { show: true, width: 2, colors: ["#ffffff"] },
      dataLabels: {
        enabled: !!spec.showValue,
        formatter: (_v, opts) => `${Number(opts.w.config.series[opts.seriesIndex]).toFixed(1)}%`,
        style: { fontSize: "9px", fontWeight: 700 },
        dropShadow: { enabled: false },
      },
      legend: spec.legend === "none" ? { show: false } : legend,
      plotOptions: { pie: { donut: { size: `${spec.holeSize ?? 55}%`, labels: { show: false } } } },
      tooltip: { enabled: false },
      states: { active: { filter: { type: "none" } } },
    };
    return (
      <div style={{ position: "relative", width: wPx, height: hPx, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Chart options={options} series={series} type="donut" width={Math.min(wPx, hPx)} height={Math.min(wPx, hPx)} />
        {spec.centerText && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", pointerEvents: "none" }}>
            {spec.centerText.map((r, i) => (
              <span key={i} style={{ color: c(r.color ?? "101828"), fontWeight: r.bold ? 700 : 400, fontSize: (r.size ?? 11) * PT, lineHeight: 1.2 }}>
                {r.text.replace(/\n$/, "")}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  const distributed = spec.series.length === 1 && spec.colors.length === spec.labels.length;
  const fmt = (v: number) => (spec.valueSuffix ? `${v}${spec.valueSuffix}` : `${v}`);

  const common: ApexOptions = {
    chart: { fontFamily: "NanumSquare", animations: { enabled: false }, background: "transparent", toolbar: { show: false }, stacked: !!spec.stacked },
    colors,
    dataLabels: { enabled: !!spec.showValue, formatter: (v: number) => (v > 0 ? fmt(v) : ""), offsetY: spec.kind === "bar" ? -16 : 0, style: { fontSize: "9px", fontWeight: 700, colors: ["#374151"] } },
    legend,
    grid: lightGridOpts,
    xaxis: { categories: spec.labels, ...lightAxis, labels: { ...axisLabel, rotate: spec.labels.some((l) => l.length > 4) ? -30 : 0, trim: false } },
    yaxis: { labels: axisLabel, ...lightAxis },
    tooltip: { enabled: false },
  };

  if (spec.kind === "bar") {
    const options: ApexOptions = {
      ...common,
      chart: { ...common.chart, type: "bar" },
      plotOptions: { bar: { distributed, columnWidth: "55%", borderRadius: 3, dataLabels: { position: "top" } } },
    };
    const series = distributed
      ? [{ name: spec.series[0].name, data: spec.series[0].values }]
      : spec.series.map((s) => ({ name: s.name, data: s.values }));
    return <Chart options={options} series={series} type="bar" width={wPx} height={hPx} />;
  }
  if (spec.kind === "line") {
    const options: ApexOptions = {
      ...common,
      chart: { ...common.chart, type: "line" },
      stroke: { curve: "straight", width: 2 },
      markers: { size: 4 },
    };
    return <Chart options={options} series={spec.series.map((s) => ({ name: s.name, data: s.values }))} type="line" width={wPx} height={hPx} />;
  }
  // area (그라데이션)
  const options: ApexOptions = {
    ...common,
    chart: { ...common.chart, type: "area" },
    stroke: { curve: "smooth", width: 2 },
    fill: spec.areaGradient
      ? { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.04, stops: [0, 100] } }
      : { opacity: (spec.fillOpacity ?? 40) / 100 },
  };
  return <Chart options={options} series={spec.series.map((s) => ({ name: s.name, data: s.values }))} type="area" width={wPx} height={hPx} />;
}

// ── 슬라이드 1장 ─────────────────────────────────────────────────────────
function SlideEls({ spec }: { spec: SlideSpec }) {
  return (
    <>
      {spec.els.map((el, i) => {
        const box = { position: "absolute" as const, left: el.x * PX, top: el.y * PX, width: el.w * PX, height: el.h * PX };
        switch (el.kind) {
          case "rect":
            return <div key={i} style={{ ...box, background: el.fill ? c(el.fill) : undefined, borderRadius: el.radius ? el.radius * PX : 0, border: el.line ? `1px solid ${c(el.line)}` : undefined }} />;
          case "line":
            return <div key={i} style={{ ...box, height: Math.max(1, el.h * PX), background: c(el.color) }} />;
          case "text":
            return <TextEl key={i} el={el} />;
          case "image":
            return <img key={i} src={el.src} alt="" style={{ ...box, objectFit: el.contain ? "contain" : "fill" }} draggable={false} />;
          case "asset":
            if (el.asset === "map")
              return (
                <div key={i} data-export-image={el.tag} style={box}>
                  <KoreaMap data={el.mapData ?? null} />
                </div>
              );
            return (
              <div key={i} data-export-image={el.tag} style={{ ...box, color: c(el.color ?? "101828"), display: "flex", alignItems: "center", justifyContent: "center" }}>
                <GroupIcon style={{ width: "100%", height: "100%" }} />
              </div>
            );
          case "table":
            return <TableEl key={i} el={el} />;
          case "chart":
            return <ChartEl key={i} el={el} />;
          default:
            return null;
        }
      })}
    </>
  );
}

/** spec 1장을 16:9 카드(컨테이너 폭에 맞춰 1280×720을 균일 축소)로 렌더. */
export function SpecSlideCard({ spec }: { spec: SlideSpec }) {
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
  const bgStyle: React.CSSProperties = spec.bg?.src
    ? { backgroundImage: `url(${spec.bg.src})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: spec.bg?.color ? c(spec.bg.color) : "#fff" };
  return (
    <div ref={ref} className="w-full overflow-hidden rounded shadow-md bg-white" style={{ aspectRatio: "16 / 9" }}>
      <div style={{ width: BASE_W, height: BASE_H, transformOrigin: "top left", transform: `scale(${scale})`, position: "relative", ...bgStyle }}>
        <SlideEls spec={spec} />
      </div>
    </div>
  );
}

export { BASE_W, BASE_H, SlideEls };
