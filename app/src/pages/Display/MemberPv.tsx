import PageMeta from "../../components/common/PageMeta";
import { useColorTheme } from "../../context/ColorThemeContext";
import { useGadaData } from "../../context/GadaDataContext";
import type { MemberRegion, MemberStatsData } from "../../types/gada";
import koreaMapUrl from "../../assets/korea-map.svg";

// 색상 (PvUvOverview 와 동일 팔레트 기준)
const GREY_100 = "#F3F4F6"; // 2~8행 1열
const GREY_200 = "#E5E7EB"; // 9행
const WHITE = "#FFFFFF";
const BORDER = "#D1D5DB";

// ── 페이지 제목 (CompanyMarketing / PvUvOverview 와 동일 폰트 규격) ──────
// main: text-base font-bold, sub: text-sm font-bold
function PageTitle({ main, sub }: { main: string; sub?: string }) {
  return (
    <h2 className="shrink-0 text-gray-900 dark:text-white">
      <span className="text-base font-bold">{main}</span>
      {sub ? <span className="text-sm font-bold">{` - ${sub}`}</span> : null}
    </h2>
  );
}

// 표 1열(2~8행) 지역 행: 표시 라벨 ↔ 집계 키. 순서는 사용자 지정.
const REGION_ROWS: { label: string; key: MemberRegion }[] = [
  { label: "서울", key: "서울" },
  { label: "경기(인천)", key: "경기(인천)" },
  { label: "충청", key: "충청" },
  { label: "경상", key: "경상" },
  { label: "전라", key: "전라" },
  { label: "*지역 미기재", key: "지역 미기재" },
  { label: "강원", key: "강원" },
];

const HEADERS = ["지역", "PV", "비율", "순위"];

// 행 높이(px): 기존 약 30px → 1.4배 = 42px (표 전체 높이 1.4배)
const ROW_H = 42;

// 표 하단 주석 (사용자 제공 문구, 개행하여 표시)
const TABLE_NOTES = [
  "* 추후 지역별 순 방문자를 확인하여, 순방문자 대비 PV 분석 예정(분석 가능 여부 확인 필요)",
  "* 상기정보는 회원 가입 당시 기입한 “거주지정보”를 기반으로 산출 > 거주지역 기반",
];

function fmtNum(v: number): string {
  return v.toLocaleString("ko-KR");
}

// ── 지역별 PV/비율/순위 표 (가로 4열 × 세로 9행) ─────────────────────────
function RegionTable({ data }: { data: MemberStatsData | null }) {
  const { currentTheme } = useColorTheme();
  const main = currentTheme.main;
  const total = data?.totalPv ?? 0;

  // 순위: PV 많은 순 1~7 (동점은 같은 순위). 데이터 없으면 미산출.
  const rankOf = (key: MemberRegion): number => {
    const pv = data!.regionPv[key];
    return 1 + REGION_ROWS.filter((r) => data!.regionPv[r.key] > pv).length;
  };

  // 공통 셀 스타일
  const td = (
    bg: string,
    color: string,
    bold: boolean
  ): React.CSSProperties => ({
    backgroundColor: bg,
    color,
    fontWeight: bold ? 700 : 400,
    border: `1px solid ${BORDER}`,
    textAlign: "center",
    verticalAlign: "middle",
    padding: "6px 8px",
    fontSize: "12px",
    lineHeight: 1.3,
  });

  return (
    <table className="table-fixed border-collapse" style={{ width: 480 }}>
      <colgroup>
        <col style={{ width: 150 }} />
        <col style={{ width: 120 }} />
        <col style={{ width: 110 }} />
        <col style={{ width: 100 }} />
      </colgroup>
      <tbody>
        {/* 1행: 헤더 (메인컬러, 흰색 볼드) */}
        <tr style={{ height: ROW_H }}>
          {HEADERS.map((h) => (
            <td key={h} style={td(main, WHITE, true)}>
              {h}
            </td>
          ))}
        </tr>

        {/* 2~8행: 지역별 */}
        {REGION_ROWS.map(({ label, key }) => {
          const pv = data?.regionPv[key] ?? 0;
          const hasData = data !== null;
          return (
            <tr key={key} style={{ height: ROW_H }}>
              {/* 1열: 그레이100, 검정 볼드 */}
              <td style={td(GREY_100, "#000000", true)}>{label}</td>
              {/* 2열: PV */}
              <td style={td(WHITE, "#000000", false)}>
                {hasData ? fmtNum(pv) : ""}
              </td>
              {/* 3열: 비율(소수점 1자리) */}
              <td style={td(WHITE, "#000000", false)}>
                {hasData && total > 0 ? `${((pv / total) * 100).toFixed(1)}%` : ""}
              </td>
              {/* 4열: 순위 */}
              <td style={td(WHITE, "#000000", false)}>
                {hasData ? rankOf(key) : ""}
              </td>
            </tr>
          );
        })}

        {/* 9행: 전체 (그레이200, 검정 볼드) */}
        <tr style={{ height: ROW_H }}>
          <td style={td(GREY_200, "#000000", true)}>전체</td>
          <td style={td(GREY_200, "#000000", true)}>
            {data ? fmtNum(total) : ""}
          </td>
          <td style={td(GREY_200, "#000000", true)}>
            {data && total > 0 ? "100.0%" : ""}
          </td>
          <td style={td(GREY_200, "#000000", true)}>-</td>
        </tr>
      </tbody>
    </table>
  );
}

// ── 대한민국 지도 (그레이100 실루엣 + 약한 드롭섀도우 + 지역 라벨) ────────
// 원본 korea-map.svg 는 색칠된 PNG(배경 투명)라 알파를 마스크로 써서
// 회색 사각형을 땅 모양으로 오려낸다. 색은 지역 위치 마커 → 라벨 좌표로 사용.
// 좌표계: 원본 PNG 픽셀(2370×3449) 기준. (색 중심좌표는 픽셀 분석으로 산출)
const MAP_W = 2370;
const MAP_H = 3449;

// 지역 라벨: 칩 위치(좌/우) + 연결 대상 좌표(ax, ay).
type LabelDef = {
  text: string;
  side: "left" | "right";
  y: number; // 칩 top
  ax: number; // 리더선이 가리키는 지점 (해당 색 위치)
  ay: number;
};
const REGION_LABELS: LabelDef[] = [
  { text: "서울", side: "left", y: 420, ax: 615, ay: 752 }, // 빨강
  { text: "경기(인천)", side: "left", y: 980, ax: 940, ay: 1040 }, // 노랑
  { text: "충청", side: "left", y: 1520, ax: 824, ay: 1430 }, // 그린
  { text: "전라", side: "left", y: 2380, ax: 607, ay: 2459 }, // 시안
  { text: "강원", side: "right", y: 420, ax: 1347, ay: 628 }, // 마젠타
  { text: "경상", side: "right", y: 1640, ax: 1539, ay: 1876 }, // 블루
];
const CHIP_W = 700;
const CHIP_H = 210;
const LEFT_X = -800;
const RIGHT_X = 2470;

function KoreaMap() {
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <svg
        viewBox="-840 -160 4050 3849"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* 불투명 픽셀(땅)을 흰색으로: 휘도/알파 어느 마스크 모드에서도
              동일하게 깔끔한 실루엣이 되도록(어두운 색의 구멍 방지). */}
          <filter id="toWhite" x="0%" y="0%" width="100%" height="100%">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"
            />
          </filter>
          {/* 흰색화한 PNG를 마스크로 사용 */}
          <mask id="koreaMask" style={{ maskType: "alpha" }}>
            <image
              href={koreaMapUrl}
              x={0}
              y={0}
              width={MAP_W}
              height={MAP_H}
              preserveAspectRatio="none"
              filter="url(#toWhite)"
            />
          </mask>
          {/* 연한 드롭섀도우 (지도 모양 기준) */}
          <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="40"
              stdDeviation="45"
              floodColor="#000000"
              floodOpacity="0.15"
            />
          </filter>
        </defs>

        {/* 그레이100 실루엣 */}
        <g filter="url(#mapShadow)">
          <rect
            x={0}
            y={0}
            width={MAP_W}
            height={MAP_H}
            fill={GREY_200}
            mask="url(#koreaMask)"
          />
        </g>

        {/* 지역 라벨 (둥근 네모 + 리더선) */}
        {REGION_LABELS.map((l) => {
          const x = l.side === "left" ? LEFT_X : RIGHT_X;
          const innerEdgeX = l.side === "left" ? x + CHIP_W : x;
          const midY = l.y + CHIP_H / 2;
          return (
            <g key={l.text}>
              <line
                x1={innerEdgeX}
                y1={midY}
                x2={l.ax}
                y2={l.ay}
                stroke="#9CA3AF"
                strokeWidth={4}
              />
              <circle cx={l.ax} cy={l.ay} r={14} fill="#9CA3AF" />
              <rect
                x={x}
                y={l.y}
                width={CHIP_W}
                height={CHIP_H}
                rx={40}
                fill="#FFFFFF"
                stroke="#D1D5DB"
                strokeWidth={4}
              />
              <text
                x={x + CHIP_W / 2}
                y={midY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={120}
                fontWeight={600}
                fill="#111827"
              >
                {l.text}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────
export default function MemberPv() {
  const { memberStatsData } = useGadaData();

  return (
    <>
      <PageMeta
        title="로그인 회원 PV"
        description="디스플레이 광고 현황 - 로그인 회원 PV"
      />
      <div className="h-full flex flex-col">
        {/* ── 페이지 헤더 (메뉴명) ───────────────────────────────────── */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            로그인 회원 PV
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              디스플레이 광고 현황
            </span>
          </h1>
        </div>

        {/* ── 스크롤 영역: 1920×1080(16:9) 슬라이드 ─────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="min-h-full flex flex-col bg-white dark:bg-gray-800">
            {/* 슬라이드 제목 */}
            <div className="shrink-0 px-6 py-3 border-b border-gray-100 dark:border-gray-700">
              <PageTitle main="로그인 회원 전국 지역별 기준" sub="PV 현황" />
            </div>

            {/* 본문: 왼쪽 지역별 표 + 오른쪽 대한민국 지도 */}
            <div className="flex-1 min-h-0 flex gap-8 items-stretch p-12">
              <div className="shrink-0 flex flex-col">
                <RegionTable data={memberStatsData} />
                <div
                  className="mt-3 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400"
                  style={{ width: 480 }}
                >
                  {TABLE_NOTES.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <KoreaMap />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
