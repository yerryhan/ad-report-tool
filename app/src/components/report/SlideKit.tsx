import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useSlideVariant } from "../../report/SlideContext";

// ── 페이지 제목 ─────────────────────────────────────────────────────────
// 모든 시각화 페이지 공통 규칙: 앞부분(main)은 큰 Bold(text-base),
// 하이픈 뒤(sub)는 조금 작은 Bold(text-sm).
// 미리보기/PPTX(preview) 맥락에서는 헤더 제목을 4pt(=최종 슬라이드 기준, 1920px 베이스 +8px)
// 키워 슬라이드 가독성을 높인다.
export function PageTitle({ main, sub }: { main: string; sub?: string }) {
  const variant = useSlideVariant();
  if (variant === "preview") {
    return (
      <h2 className="shrink-0 text-gray-900">
        <span style={{ fontWeight: 700, fontSize: 24 }}>{main}</span>
        {sub ? (
          <span style={{ fontWeight: 700, fontSize: 22 }}>{` - ${sub}`}</span>
        ) : null}
      </h2>
    );
  }
  return (
    <h2 className="shrink-0 text-gray-900 dark:text-white">
      <span className="text-base font-bold">{main}</span>
      {sub ? <span className="text-sm font-bold">{` - ${sub}`}</span> : null}
    </h2>
  );
}

// ── 고정 비율 콘텐츠를 박스에 맞춰 균일 스케일 ──────────────────────────
// 부모(16:9 슬라이드)에서 받은 영역을 ResizeObserver로 측정해, baseW×baseH
// 콘텐츠를 가로/세로 모두 넘치지 않는 최대 배율로 균일 축소(비율 변형 없음).
// 부모(p-8 등)의 패딩이 그대로 사방 여백으로 남는다.
//  - fill=false(기본): 1배를 넘겨 확대하지 않음(원본 크기 유지 후 중앙 배치).
//  - fill=true: 영역을 채우도록 1배 이상으로도 확대.
export function FitScaleBox({
  baseW,
  baseH,
  fill = false,
  children,
}: {
  baseW: number;
  baseH: number;
  fill?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const s = Math.min(el.clientWidth / baseW, el.clientHeight / baseH);
      if (s > 0) setScale(fill ? s : Math.min(1, s));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseW, baseH, fill]);
  return (
    <div ref={ref} className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
      <div style={{ width: baseW * scale, height: baseH * scale }}>
        <div
          style={{
            width: baseW,
            height: baseH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ── 데이터 없음 공통 표시 ────────────────────────────────────────────────
export function EmptyState({
  title = "업로드된 데이터가 없습니다",
  desc = "먼저 가다실 엑셀 파일을 업로드해주세요",
}: {
  title?: string;
  desc?: string;
}) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
          <svg className="text-gray-400 dark:text-gray-500" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4zm2.5 2.1h-15V5h15v14.1zm0-16.1h-15c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{desc}</p>
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
