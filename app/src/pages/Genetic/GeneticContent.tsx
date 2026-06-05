import React from "react";
import PageMeta from "../../components/common/PageMeta";
import { PageTitle, FitScaleBox } from "../../components/report/SlideKit";
import { SlideFrame } from "../../report/SlideFrame";
import { getReportDateRange } from "../../components/cover/ReportCovers";
import { useColorTheme } from "../../context/ColorThemeContext";

// 디자인 기준: "로그인 회원 성별/연령대 기준 - PV 현황" 표(GenderAgeTable)
const BORDER = "#D1D5DB";
const GREY_300 = "#D1D5DB";
const GREY_100 = "#F3F4F6";
const WHITE = "#FFFFFF";
const RED = "#f04438"; // 테일어드민 error-500

// 2행 / 6행 질병 구분 (왼쪽→오른쪽 순서). "/" 가 들어간 항목은 셀 안에서 개행.
const DISEASES_1 = ["간암", "갑상선암", "고혈압", "고환암", "골관절염", "골다공증", "관상동맥/질환", "난소암", "뇌동맥류", "뇌졸중", "담낭암", "대장암", "류마티스/관절염", "만성폐쇄성/폐질환", "방광암", "비만"];
const DISEASES_2 = ["식도암", "신장암", "심근/경색증", "심방세동", "위암", "자궁/경부암", "자궁/내막암", "유방암", "전립선암", "제2형/당뇨병", "천식", "췌장암", "치매", "파킨슨병", "편두통/황반변성", "폐암"];

// 표 + 주석을 한 덩어리로 16:9 박스에 맞춰 균일 스케일하기 위한 기준 크기.
const TABLE_BASE_W = 1544;
// 행 높이(px): 모든 행 동일.
const ROW_H = 60;
// 표 높이(9행) + 주석 영역(≈ 70).
const TABLE_CONTENT_H = ROW_H * 9 + 70;

// "/" 기준 개행 렌더링
function diseaseLabel(s: string): React.ReactNode {
  return s.split("/").map((p, i) => (
    <React.Fragment key={i}>
      {i > 0 && <br />}
      {p}
    </React.Fragment>
  ));
}

function GeneticTable() {
  const { currentTheme } = useColorTheme();
  const main = currentTheme.main;
  const period = getReportDateRange();

  const cell = (bg: string, color: string, weight: number): React.CSSProperties => ({
    backgroundColor: bg,
    color,
    fontWeight: weight,
    border: `1px solid ${BORDER}`,
    textAlign: "center",
    verticalAlign: "middle",
    padding: "6px 4px",
    fontSize: "15.33px",
    lineHeight: 1.3,
    whiteSpace: "nowrap",
  });
  const headCell = cell(main, "#FFFFFF", 800); // 1행: 메인컬러 + 화이트 ExtraBold
  const groupCell = cell(GREY_300, "#000000", 800); // 2·6행: 그레이300 + ExtraBold
  const labelCell = cell(GREY_100, "#000000", 800); // 1열 데이터행: 그레이100 + ExtraBold
  const dataCell = cell(WHITE, "#000000", 400); // 나머지: 화이트 + Regular

  const dataRow = (label: string) => (
    <tr style={{ height: ROW_H }}>
      <td style={labelCell}>{label}</td>
      {Array.from({ length: 16 }).map((_, i) => (
        <td key={i} style={dataCell}>1,000</td>
      ))}
    </tr>
  );

  return (
    <table className="table-fixed border-collapse" style={{ width: "100%" }}>
      <colgroup>
        <col style={{ width: 130 }} />
        {Array.from({ length: 16 }).map((_, i) => (
          <col key={i} style={{ width: (TABLE_BASE_W - 130) / 16 }} />
        ))}
      </colgroup>
      <tbody>
        {/* 1행: 기간 + 리포트 기간(2~17열 병합) */}
        <tr style={{ height: ROW_H }}>
          <td style={headCell}>기간</td>
          <td colSpan={16} style={headCell}>{period}</td>
        </tr>
        {/* 2행: 구분 + 질병 16종 */}
        <tr style={{ height: ROW_H }}>
          <td style={groupCell}>구분</td>
          {DISEASES_1.map((d, i) => (
            <td key={i} style={groupCell}>{diseaseLabel(d)}</td>
          ))}
        </tr>
        {/* 3~5행 */}
        {dataRow("총수량")}
        {dataRow("남성")}
        {dataRow("여성")}
        {/* 6행: 구분 + 질병 16종 */}
        <tr style={{ height: ROW_H }}>
          <td style={groupCell}>구분</td>
          {DISEASES_2.map((d, i) => (
            <td key={i} style={groupCell}>{diseaseLabel(d)}</td>
          ))}
        </tr>
        {/* 7~9행 */}
        {dataRow("총수량")}
        {dataRow("남성")}
        {dataRow("여성")}
      </tbody>
    </table>
  );
}

// ── 슬라이드(메뉴 페이지 / 대시보드 미리보기 공용) ──────────────────────────
export function GeneticDeck() {
  return (
    <SlideFrame title="유전자 검사 콘텐츠 현황">
      <div className="shrink-0 pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
        <PageTitle main="한컴Gx 유전자 검사 결과지 컨텐츠 현황" />
      </div>
      <FitScaleBox baseW={TABLE_BASE_W} baseH={TABLE_CONTENT_H}>
        <div className="w-full flex flex-col">
          <div className="shrink-0">
            <GeneticTable />
          </div>
          <div className="shrink-0 mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">
            <p>* 한컴Gx 유전자 검사 25년 05월 신청건수: 20,403건( 남성 11,982 / 여성 8,421 )  </p>
            <p>
              * 한컴Gx 유전자 검사 신청고객에 대해 건강정보 발송 시{" "}
              <span style={{ color: RED }}>“폐렴구균 예방접종”</span> 안내( ※ 자궁경부(내막)암 신청하신 고객은{" "}
              <span style={{ color: RED }}>“가다실9가”</span>  별도 추가 안내 )
            </p>
          </div>
        </div>
      </FitScaleBox>
    </SlideFrame>
  );
}

export default function GeneticContent() {
  return (
    <>
      <PageMeta
        title="유전자 검사 콘텐츠 현황"
        description="유전자 검사 콘텐츠 현황"
      />
      <div className="h-full flex flex-col">
        {/* ── 페이지 헤더 ───────────────────────────────────────────── */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            유전자 검사 콘텐츠 현황
          </h1>
        </div>

        {/* ── 스크롤 영역 ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto font-nanum">
          <GeneticDeck />
        </div>
      </div>
    </>
  );
}
