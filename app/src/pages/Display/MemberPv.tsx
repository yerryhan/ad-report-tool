import PageMeta from "../../components/common/PageMeta";
import { useColorTheme } from "../../context/ColorThemeContext";
import { useGadaData } from "../../context/GadaDataContext";
import { PageTitle, FitScaleBox } from "../../components/report/SlideKit";
import { SlideFrame } from "../../report/SlideFrame";
import type {
  MemberAgeCounts,
  MemberGenderKey,
  MemberRegion,
  MemberStatsData,
} from "../../types/gada";
import { MEMBER_AREA_LABELS } from "../../types/gada";
import koreaMapUrl from "../../assets/korea-map.svg";

// 색상 (PvUvOverview 와 동일 팔레트 기준)
const GREY_100 = "#F3F4F6"; // 2~8행 1열
const GREY_200 = "#E5E7EB"; // 9행
const WHITE = "#FFFFFF";
const BORDER = "#D1D5DB";

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

// ── 대한민국 지도 (그레이300 실루엣 + 드롭섀도우 + 라벨) ─────────────────
// 원본 korea-map.svg 는 지역별로 다른 색으로 채워진 PNG(배경 투명).
// 알파를 마스크로 써서 회색 사각형을 땅 모양으로 오려낸다(실루엣).
// 좌표계: 원본 PNG 픽셀(2370×3449) 기준. (색 중심좌표는 픽셀 분석으로 산출)
const MAP_W = 2370;
const MAP_H = 3449;

const GREY_300 = "#D1D5DB"; // 지도 fill 색

// 지역 라벨: 칩 위치(좌/우) + 연결 대상 좌표(ax, ay) + 집계 키(key).
type LabelDef = {
  key: MemberRegion;
  side: "left" | "right";
  y: number; // 칩 top
  ax: number; // 리더선이 가리키는 지점 (해당 색 위치)
  ay: number;
};
const REGION_LABELS: LabelDef[] = [
  { key: "서울", side: "left", y: 420, ax: 615, ay: 752 }, // 빨강
  { key: "경기(인천)", side: "left", y: 980, ax: 940, ay: 1040 }, // 노랑
  { key: "충청", side: "left", y: 1520, ax: 824, ay: 1430 }, // 그린
  { key: "전라", side: "left", y: 2380, ax: 607, ay: 2459 }, // 시안
  { key: "강원", side: "right", y: 420, ax: 1347, ay: 628 }, // 마젠타
  { key: "경상", side: "right", y: 1640, ax: 1539, ay: 1876 }, // 블루
];
const CHIP_W = 900;
const CHIP_H = 300; // 상하 패딩을 좌우 패딩의 절반(≈50px)이 되도록 칩 높이 확대
const LEFT_X = -1020; // 좌측 칩: 오른쪽 모서리 ≈ -120
const RIGHT_X = 2490; // 우측 칩: 왼쪽 모서리

function KoreaMap({ data }: { data: MemberStatsData | null }) {
  const total = data?.totalPv ?? 0;
  return (
    <div
      data-export-image="korea-map"
      className="flex h-full w-full items-center justify-center p-4"
    >
      <svg
        viewBox="-1120 -180 4630 3729"
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
          {/* 드롭섀도우: 오른쪽 아래 45°로 떨어지게(왼쪽 위에는 그림자 없음) */}
          <filter id="mapShadow" x="-10%" y="-10%" width="140%" height="140%">
            <feDropShadow
              dx="50"
              dy="50"
              stdDeviation="16"
              floodColor="#000000"
              floodOpacity="0.2"
            />
          </filter>
        </defs>

        {/* 그레이300 실루엣 (+드롭섀도우) */}
        <g filter="url(#mapShadow)">
          <rect
            x={0}
            y={0}
            width={MAP_W}
            height={MAP_H}
            fill={GREY_300}
            mask="url(#koreaMask)"
          />
        </g>

        {/* 지역 라벨 (둥근 네모 + 리더선): 1행 지역명 + 2행 "PV n (p%)" */}
        {REGION_LABELS.map((l) => {
          const x = l.side === "left" ? LEFT_X : RIGHT_X;
          const innerEdgeX = l.side === "left" ? x + CHIP_W : x;
          const midY = l.y + CHIP_H / 2;
          const pv = data?.regionPv[l.key] ?? 0;
          const ratio = total > 0 ? ((pv / total) * 100).toFixed(1) : "0.0";
          const cx = x + CHIP_W / 2;
          return (
            <g key={l.key}>
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
                stroke={GREY_300}
                strokeWidth={4}
              />
              {/* 1행: 지역명 (디자인 규칙 유지) */}
              <text
                x={cx}
                y={l.y + 110}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={94}
                fontWeight={600}
                fill="#111827"
              >
                {l.key}
              </text>
              {/* 2행: PV 수치 (왼쪽 표 수치와 동일한 크기/두께/색) */}
              {data && (
                <text
                  x={cx}
                  y={l.y + 210}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={84}
                  fontWeight={400}
                  fill="#000000"
                >
                  {`PV ${fmtNum(pv)} (${ratio}%)`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── 슬라이드2(표+지도) 합성 블록 기준 크기 ──────────────────────────────
// 표+지도 묶음을 본래 크기로 그린 뒤 FitScaleBox가 16:9 박스에 맞춰 균일 확대/축소.
const TABLE_BLOCK_W = 480; // 왼쪽 표 폭
const GAP = 32; // 표↔지도 간격 (gap-8)
const MAP_BASE_W = 620; // 지도 폭 (현재 비율 유지 기준)
const MAP_ASPECT = 4630 / 3729; // KoreaMap viewBox 비율 (w/h)
const COMPOSITE_W = TABLE_BLOCK_W + GAP + MAP_BASE_W; // 1132
const COMPOSITE_H = MAP_BASE_W / MAP_ASPECT; // ≈ 499 (지도 높이가 가장 큼)

// 슬라이드 1(성별/연령대 표)의 기준 크기(px). 가로폭은 PV/UV 표와 동일(1544),
// 세로폭 576. 하단 주석을 포함한 콘텐츠 블록 높이는 636.
const TABLE_BASE_W = 1544;
const TABLE_CONTENT_H = 636;

// ── 광고 영역별 성별/연령대별 통합 통계 표 ───────────────────────────────
// 3단 복합 헤더(광고영역 / 기간 / 합계) × 성별(남/여/미기재) × 연령대(20~60대·기타·소계).
// 데이터: 통계정보(회원) 엑셀의 영역(A)×성별(C)×나이(D) 집계(MemberStatsData.areaStats).

// 1행 기간 라벨: 업로드 파일의 데이터 대상 연·월(year/month) 기준 자동 생성.
//   "{year}. {MM}. 01. ~ {year}. {MM}. {말일}." (데이터 없으면 "—")
function periodLabel(data: MemberStatsData | null): string {
  if (!data || !data.year || data.month < 1 || data.month > 12) return "—";
  const mm = String(data.month).padStart(2, "0");
  const lastDay = new Date(data.year, data.month, 0).getDate();
  return `${data.year}. ${mm}. 01. ~ ${data.year}. ${mm}. ${String(
    lastDay
  ).padStart(2, "0")}.`;
}

// 연령대 열(소계 제외) 키/라벨
const AGE_KEYS: (keyof MemberAgeCounts)[] = [
  "age20",
  "age30",
  "age40",
  "age50",
  "age60",
  "etc",
];
const AGE_LABELS = ["20대", "30대", "40대", "50대", "60대", "기타"];

// 성별 구획 (라벨 + 데이터 키). 순서대로 좌→우 배치.
const GENDER_DEFS: { key: MemberGenderKey; label: string }[] = [
  { key: "male", label: "남성" },
  { key: "female", label: "여성" },
  { key: "unknown", label: "* 성별 미기재" },
];

const EMPTY_AGE: MemberAgeCounts = {
  age20: 0,
  age30: 0,
  age40: 0,
  age50: 0,
  age60: 0,
  etc: 0,
};

function GenderAgeTable({ data }: { data: MemberStatsData | null }) {
  const { currentTheme } = useColorTheme();
  const main = currentTheme.main;
  const hasData = data !== null;

  // 영역 라벨 + 성별 → 연령대 카운트 (데이터 없으면 0)
  const countsOf = (label: string, key: MemberGenderKey): MemberAgeCounts =>
    data?.areaStats?.[label]?.[key] ?? EMPTY_AGE;

  // 집계 헬퍼 (소계/합계는 모두 계산)
  const sumAge = (g: MemberAgeCounts) => AGE_KEYS.reduce((s, k) => s + g[k], 0);
  const rowTotal = (label: string) =>
    GENDER_DEFS.reduce((s, g) => s + sumAge(countsOf(label, g.key)), 0);
  const colTotal = (key: MemberGenderKey, ageKey: keyof MemberAgeCounts) =>
    MEMBER_AREA_LABELS.reduce((s, l) => s + countsOf(l, key)[ageKey], 0);
  const genderTotal = (key: MemberGenderKey) =>
    MEMBER_AREA_LABELS.reduce((s, l) => s + sumAge(countsOf(l, key)), 0);
  const grandTotal = MEMBER_AREA_LABELS.reduce((s, l) => s + rowTotal(l), 0);

  // 데이터 없으면 빈 칸, 0 은 "-", 그 외 천단위 콤마
  const num = (v: number) => (!hasData ? "" : v === 0 ? "-" : fmtNum(v));
  const period = periodLabel(data);

  // 공통 셀 스타일 (모든 셀 중앙 정렬). wrap=true 인 셀(1열)만 줄바꿈 허용.
  const cell = (
    bg: string,
    white: boolean,
    bold: boolean,
    wrap = false
  ): React.CSSProperties => ({
    backgroundColor: bg,
    color: white ? "#FFFFFF" : "#000000",
    fontWeight: bold ? 700 : 400,
    border: `1px solid ${BORDER}`,
    textAlign: "center",
    verticalAlign: "middle",
    padding: "6px 4px",
    fontSize: "15.33px",
    lineHeight: 1.3,
    whiteSpace: wrap ? "normal" : "nowrap",
    wordBreak: wrap ? "keep-all" : "normal", // 한글은 어절(공백) 단위로 줄바꿈
  });

  // zebra(성별 구획): 남성=화이트, 여성=그레이100, 미기재=화이트
  const sectionBg = (gi: number) => (gi % 2 === 0 ? WHITE : GREY_100);
  const head = cell(main, true, true); // 1~3행 헤더: 메인컬러 + 화이트 + 볼드

  return (
    <table className="table-fixed border-collapse" style={{ width: "100%", height: "100%" }}>
      <colgroup>
        {/* 1열: 광고 영역 */}
        <col style={{ width: 150 }} />
        {/* 2~22열: 성별 3구획 × (연령 6 + 소계 1) = 21열 */}
        {GENDER_DEFS.map((g) =>
          [...AGE_LABELS, "소계"].map((_, i) => (
            <col key={`${g.key}-c${i}`} style={{ width: 55 }} />
          ))
        )}
        {/* 23열: 합계 */}
        <col style={{ width: 95 }} />
      </colgroup>

      <thead>
        {/* 1단 헤더 */}
        <tr>
          <th rowSpan={3} style={cell(main, true, true, true)}>
            광고 영역
          </th>
          <th colSpan={21} style={head}>
            {period}
          </th>
          <th rowSpan={3} style={head}>
            합계
          </th>
        </tr>
        {/* 2단 헤더: 성별 */}
        <tr>
          {GENDER_DEFS.map((g) => (
            <th key={g.key} colSpan={7} style={head}>
              {g.label}
            </th>
          ))}
        </tr>
        {/* 3단 헤더: 연령대 + 소계 */}
        <tr>
          {GENDER_DEFS.map((g) =>
            [...AGE_LABELS, "소계"].map((lbl, i) => (
              <th key={`${g.key}-h${i}`} style={head}>
                {lbl}
              </th>
            ))
          )}
        </tr>
      </thead>

      <tbody>
        {/* 데이터 행 (광고 영역 5개, 순서 고정) */}
        {MEMBER_AREA_LABELS.map((label) => (
          <tr key={label}>
            {/* 1열: 광고 영역 (그레이100, 볼드, 줄바꿈 허용) */}
            <td style={cell(GREY_100, false, true, true)}>{label}</td>
            {GENDER_DEFS.map((g, gi) => {
              const bg = sectionBg(gi);
              const c = countsOf(label, g.key);
              return [
                ...AGE_KEYS.map((k) => (
                  <td key={`${g.key}-${k}`} style={cell(bg, false, false)}>
                    {num(c[k])}
                  </td>
                )),
                <td key={`${g.key}-sub`} style={cell(bg, false, false)}>
                  {num(sumAge(c))}
                </td>,
              ];
            })}
            {/* 23열: 합계 (그레이100) */}
            <td style={cell(GREY_100, false, false)}>{num(rowTotal(label))}</td>
          </tr>
        ))}

        {/* 최하단 합계 행 (그레이200 + 볼드) */}
        <tr>
          <td style={cell(GREY_200, false, true, true)}>합 계</td>
          {GENDER_DEFS.map((g) => [
            ...AGE_KEYS.map((k) => (
              <td key={`tot-${g.key}-${k}`} style={cell(GREY_200, false, true)}>
                {num(colTotal(g.key, k))}
              </td>
            )),
            <td key={`tot-${g.key}-sub`} style={cell(GREY_200, false, true)}>
              {num(genderTotal(g.key))}
            </td>,
          ])}
          <td style={cell(GREY_200, false, true)}>{num(grandTotal)}</td>
        </tr>
      </tbody>
    </table>
  );
}

// ── 슬라이드 묶음 (메뉴 페이지 / 대시보드 미리보기 공용) ──────────────────
export function MemberPvDeck() {
  const { memberStatsData } = useGadaData();

  return (
    <>
      {/* 슬라이드 1: 성별/연령대 기준 — 16:9 + 사방 32px(p-8) */}
      <SlideFrame title="로그인 회원 성별/연령대 기준 - PV 현황" border="b">
        <div className="shrink-0 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <PageTitle main="로그인 회원 성별/연령대 기준" sub="PV 현황" />
        </div>
        {/* 표 + 하단 주석을 한 덩어리로 16:9 박스에 맞춰 균일 스케일 */}
        <FitScaleBox baseW={TABLE_BASE_W} baseH={TABLE_CONTENT_H}>
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 min-h-0">
              <GenderAgeTable data={memberStatsData} />
            </div>
            {/* 주석 폰트 15px: 이 표 블록은 폭 1544 기준 축소, 2번째 페이지
                주석(폭 1132 기준)과 화면상 같은 크기로 보이려면 11×(1544/1132)≈15px. */}
            <div className="shrink-0 mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
              <p>
                * 기타 / 성별 미 기재 : 기업체 정책으로 인해 성별 정보 또는 연령
                정보를 제공하지 않는 경우
              </p>
            </div>
          </div>
        </FitScaleBox>
      </SlideFrame>

      {/* 슬라이드 2: 전국 지역별 기준 (표 + 지도) — 16:9 + 사방 32px(p-8) */}
      <SlideFrame title="로그인 회원 전국 지역별 기준 - PV 현황" border="t">
        <div className="shrink-0 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <PageTitle main="로그인 회원 전국 지역별 기준" sub="PV 현황" />
        </div>
        {/* 표:지도 비율을 고정한 합성 블록을 16:9 박스에 맞춰 채움(fill) */}
        <FitScaleBox baseW={COMPOSITE_W} baseH={COMPOSITE_H} fill>
          <div className="w-full h-full flex items-center" style={{ columnGap: GAP }}>
            <div className="shrink-0 flex flex-col" style={{ width: TABLE_BLOCK_W }}>
              <RegionTable data={memberStatsData} />
              <div
                className="mt-3 text-[11px] leading-relaxed text-gray-600 dark:text-gray-400"
                style={{ width: TABLE_BLOCK_W }}
              >
                {TABLE_NOTES.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
            <div
              className="shrink-0"
              style={{ width: MAP_BASE_W, aspectRatio: "4630 / 3729" }}
            >
              <KoreaMap data={memberStatsData} />
            </div>
          </div>
        </FitScaleBox>
      </SlideFrame>
    </>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────
export default function MemberPv() {
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

        {/* ── 스크롤 영역: 1920×1080(16:9) 슬라이드를 위→아래로 스크롤 ── */}
        <div className="flex-1 overflow-y-auto font-nanum">
          <MemberPvDeck />
        </div>
      </div>
    </>
  );
}
