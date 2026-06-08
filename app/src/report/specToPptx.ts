import pptxgen from "pptxgenjs";
import { toPng } from "html-to-image";
import {
  buildReportSpec,
  SLIDE_W,
  SLIDE_H,
  type ReportData,
  type SlideSpec,
  type Run,
  type ChartSpec,
} from "./reportSpec";

// ════════════════════════════════════════════════════════════════════════
//  공유 사양(SlideSpec[]) → 편집 가능한 네이티브 PPTX
// ════════════════════════════════════════════════════════════════════════

const GREY_100 = "F3F4F6";

// 기준선·X/Y축: 연한 그레이 + X격자 없음
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const GRID: any = {
  valGridLine: { color: GREY_100, size: 1 },
  catGridLine: { style: "none" },
  catAxisLineColor: GREY_100,
  valAxisLineColor: GREY_100,
};

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

async function captureNode(selector: string): Promise<string | null> {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return null;
  try {
    return await toPng(el, { cacheBust: true });
  } catch {
    return null;
  }
}

// 지도(KoreaMap)·아이콘(GroupIcon)은 SVG <mask>/외부 <image href>/필터/`currentColor` 로
// 구성돼 html-to-image가 캡처하지 못한다(빈 이미지). 실제 <svg>를 직렬화하고 외부 이미지를
// dataURL로 인라인 + currentColor 를 실제 색으로 고정한 뒤 <img>→canvas 로 래스터화하면
// 마스크/필터/아이콘 색까지 정확히 그려진다.
async function captureSvgNode(selector: string, scale = 3): Promise<string | null> {
  const container = document.querySelector<HTMLElement>(selector);
  const svg = container?.querySelector("svg");
  if (!svg) return null;
  const rect = svg.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * scale));
  const h = Math.max(1, Math.round(rect.height * scale));

  const clone = svg.cloneNode(true) as SVGSVGElement;
  // currentColor(아이콘 fill) 를 실제 계산색으로 고정 — 단독 SVG에는 상속 컨텍스트가 없으므로.
  const color = getComputedStyle(svg).color;
  if (color) clone.style.color = color;
  // 외부 리소스(href)를 dataURL로 인라인 — <img> 로드 SVG는 외부 fetch가 금지되기 때문.
  const images = Array.from(clone.querySelectorAll("image"));
  await Promise.all(
    images.map(async (im) => {
      const href = im.getAttribute("href") || im.getAttribute("xlink:href");
      if (!href || href.startsWith("data:")) return;
      const d = await fetchDataUrl(href.startsWith("http") ? href : window.location.origin + href);
      if (d) {
        im.setAttribute("href", d);
        im.removeAttribute("xlink:href");
      }
    })
  );
  // width/height 를 픽셀로 고정(속성+스타일 모두) — 인라인 style 의 100% 가 단독 SVG에서
  // 0/순환 크기가 되는 것을 방지.
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  clone.style.width = `${w}px`;
  clone.style.height = `${h}px`;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const xml = new XMLSerializer().serializeToString(clone);
  const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);

  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = svgUrl;
  });
}

function runsToProps(runs: Run[], def: { size?: number; color?: string }): pptxgen.TextProps[] {
  return runs.map((r) => ({
    text: r.text,
    options: {
      bold: r.bold,
      italic: r.italic,
      color: r.color ?? def.color,
      fontSize: r.size ?? def.size,
    },
  }));
}

function legendOpts(legend?: "none" | "top" | "bottom") {
  if (legend === "top") return { showLegend: true, legendPos: "t" as const };
  if (legend === "bottom") return { showLegend: true, legendPos: "b" as const };
  return { showLegend: false };
}

function addChart(slide: pptxgen.Slide, c: ChartSpec, box: { x: number; y: number; w: number; h: number }) {
  const colors = c.colors.map((x) => x);
  const data = c.series.map((s) => ({ name: s.name, labels: c.labels, values: s.values }));
  const fmt = c.valueSuffix === "%" ? '0.0"%"' : undefined;

  if (c.kind === "doughnut") {
    slide.addChart("doughnut", [{ name: c.series[0].name, labels: c.labels, values: c.series[0].values }], {
      ...box, chartColors: colors, ...legendOpts(c.legend), showValue: !!c.showValue,
      dataLabelFontSize: 9, holeSize: c.holeSize ?? 55,
      ...(c.strokeColor ? { dataBorder: { pt: 1, color: c.strokeColor } } : {}),
      ...(fmt ? { dataLabelFormatCode: fmt } : {}),
    });
    if (c.centerText) {
      slide.addText(runsToProps(c.centerText, {}), { ...box, align: "center", valign: "middle", fontFace: "NanumSquare" });
    }
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: any = {
    ...box, chartColors: colors, ...legendOpts(c.legend),
    catAxisLabelFontSize: 8, valAxisLabelFontSize: 8,
    showValue: !!c.showValue, dataLabelFontSize: 8,
    ...(fmt ? { dataLabelFormatCode: fmt } : {}),
    ...(c.lightGrid ? GRID : {}),
    ...(c.hideValAxis ? { valAxisHidden: true, valGridLine: { style: "none" } } : {}),
    ...(c.valAxisSuffix ? { valAxisLabelFormatCode: `0"${c.valAxisSuffix}"` } : {}),
    ...(c.valAxisTitle ? { showValAxisTitle: true, valAxisTitle: c.valAxisTitle, valAxisTitleFontSize: 9 } : {}),
  };
  if (c.kind === "bar") {
    if (c.stacked) opts.barGrouping = "stacked";
    if (c.valuePosition === "bottom") opts.dataLabelPosition = "inBase";
    slide.addChart("bar", data, opts);
  } else if (c.kind === "line") {
    opts.lineSize = 2;
    opts.lineSmooth = false;
    slide.addChart("line", data, opts);
  } else {
    // area
    if (c.fillOpacity != null) opts.chartColorsOpacity = c.series.map(() => c.fillOpacity);
    slide.addChart("area", data, opts);
  }
}

async function renderSlide(
  pptx: pptxgen,
  spec: SlideSpec,
  imgMap: Map<string, string>,
  assetMap: Map<string, string>
) {
  const slide = pptx.addSlide();
  if (spec.bg) {
    if (spec.bg.src) {
      const d = imgMap.get(spec.bg.src);
      slide.background = d ? { data: d } : { color: "FFFFFF" };
    } else if (spec.bg.color) {
      slide.background = { color: spec.bg.color };
    }
  }

  for (const el of spec.els) {
    const box = { x: el.x, y: el.y, w: el.w, h: el.h };
    switch (el.kind) {
      case "rect":
        slide.addShape(el.radius ? "roundRect" : "rect", {
          ...box,
          fill: el.fill ? { color: el.fill } : { type: "none" },
          line: el.line ? { color: el.line, width: 1 } : { type: "none" },
          ...(el.radius ? { rectRadius: el.radius } : {}),
        });
        break;
      case "line":
        slide.addShape("line", { ...box, line: { color: el.color, width: 1 } });
        break;
      case "tri":
        // 정삼각형(기본 위쪽). dir:"down"이면 180° 회전해 아래로 향함(말풍선 꼬리).
        slide.addShape("triangle", {
          ...box,
          fill: { color: el.fill },
          line: { type: "none" },
          ...(el.dir === "down" ? { rotate: 180 } : {}),
        });
        break;
      case "text":
        slide.addText(runsToProps(el.runs, { size: el.size, color: el.color }), {
          ...box, align: el.align ?? "left", valign: el.valign ?? "top",
          fontFace: el.fontFace ?? "NanumSquare",
          ...(el.fill ? { fill: { color: el.fill } } : {}),
          ...(el.lineSpacingMultiple ? { lineSpacingMultiple: el.lineSpacingMultiple } : {}),
        });
        break;
      case "image": {
        const d = imgMap.get(el.src);
        if (d) slide.addImage({ data: d, ...box, ...(el.contain ? { sizing: { type: "contain", w: el.w, h: el.h } } : {}) });
        break;
      }
      case "asset": {
        const d = assetMap.get(el.tag);
        if (d) slide.addImage({ data: d, ...box, sizing: { type: "contain", w: el.w, h: el.h } });
        break;
      }
      case "table": {
        const rows: pptxgen.TableRow[] = el.rows.map((row) =>
          row.map((c) => ({
            text: c.text,
            options: {
              fill: c.fill ? { color: c.fill } : undefined,
              color: c.color, bold: c.bold || c.extraBold,
              align: c.align ?? "center", valign: c.valign ?? "middle",
              fontSize: c.size, colspan: c.colspan, rowspan: c.rowspan,
              ...(c.extraBold ? { fontFace: "NanumSquare ExtraBold" } : {}),
            },
          }))
        );
        slide.addTable(rows, {
          ...box, colW: el.colW, ...(el.rowH ? { rowH: el.rowH } : {}), fontFace: el.fontFace ?? "NanumSquare", valign: "middle",
          ...(el.tightCells ? { margin: 1 } : {}),
          border: { type: "solid", pt: 0.5, color: el.borderColor ?? "D1D5DB" },
        });
        break;
      }
      case "chart":
        addChart(slide, el.chart, box);
        break;
    }
  }
}

export async function exportReportPptx(data: ReportData, fileName: string): Promise<void> {
  if (document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* noop */ }
  }
  const slides = buildReportSpec(data);

  // 이미지 src 수집 → dataURL
  const srcs = new Set<string>();
  const assetKind = new Map<string, "map" | "icon">();
  for (const s of slides) {
    if (s.bg?.src) srcs.add(s.bg.src);
    for (const el of s.els) {
      if (el.kind === "image") srcs.add(el.src);
      if (el.kind === "asset") assetKind.set(el.tag, el.asset);
    }
  }
  const origin = window.location.origin;
  const imgMap = new Map<string, string>();
  await Promise.all(
    [...srcs].map(async (src) => {
      const d = await fetchDataUrl(src.startsWith("http") ? src : origin + src);
      if (d) imgMap.set(src, d);
    })
  );
  const assetMap = new Map<string, string>();
  await Promise.all(
    [...assetKind].map(async ([tag]) => {
      const selector = `[data-export-image="${tag}"]`;
      // map·icon 모두 SVG라서 네이티브 래스터화로 캡처(아이콘 currentColor 포함). 실패 시 html-to-image 폴백.
      const d = (await captureSvgNode(selector)) ?? (await captureNode(selector));
      if (d) assetMap.set(tag, d);
    })
  );

  const pptx = new pptxgen();
  pptx.defineLayout({ name: "HC_16x9", width: SLIDE_W, height: SLIDE_H });
  pptx.layout = "HC_16x9";

  for (const s of slides) await renderSlide(pptx, s, imgMap, assetMap);

  await pptx.writeFile({ fileName });
}
