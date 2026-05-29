export type AgeGroupData = {
  age20: number;
  age30: number;
  age40: number;
  age50: number;
  age60: number;
  etc: number;
  total: number;
};

export type ReservationRow = {
  maskedName: string;
  company: string;
  birthYear: string;
  gender: string;
  reservationTime: string;
  hospital: string;
  status: string;
};

export type CompanyStatRow = {
  companyName: string;
  reservationRate: string | number;
  examTypeCount: number;
  selfPayCount: number;
  total: number;
};

export type HospitalBookingStat = {
  hospital: string;
  count: number;
  percentage: number;
};

// ── 연령대별 성별 그룹 ────────────────────────────────────────────────
export type AgeGenderGroup = {
  male: number;
  female: number;
};

// ── 성별 통계 (기업체별 마케팅 현황용) ──────────────────────────────────
export type GenderStats = {
  /** 전체 남성 예약 수 */
  totalMale: number;
  /** 전체 여성 예약 수 */
  totalFemale: number;

  /** a: 검진유형 패키지 남성 */
  packageMale: number;
  /** b: 검진유형 패키지 여성 */
  packageFemale: number;
  /** c: 선택 추가항목 남성 */
  additionalMale: number;
  /** d: 선택 추가항목 여성 */
  additionalFemale: number;

  /** a% (패키지 기준 남성 비율) */
  packageMalePct: number;
  /** b% (패키지 기준 여성 비율) */
  packageFemalePct: number;
  /** c% (추가항목 기준 남성 비율) */
  additionalMalePct: number;
  /** d% (추가항목 기준 여성 비율) */
  additionalFemalePct: number;

  /** 연령대별 남/여 인원 */
  ageGroups: {
    age20: AgeGenderGroup;
    age30: AgeGenderGroup;
    age40: AgeGenderGroup;
    age50: AgeGenderGroup;
    age60plus: AgeGenderGroup;
  };
};

export type GadaExcelData = {
  month: number;
  ageClickMale: AgeGroupData;
  ageClickFemale: AgeGroupData;
  ageVisitorMale: AgeGroupData;
  ageVisitorFemale: AgeGroupData;
  reservations: ReservationRow[];
  companyStats: CompanyStatRow[];
  mainHospitals: HospitalBookingStat[];
  otherHospitals: HospitalBookingStat[];
  genderStats: GenderStats;
};

// ── 디스플레이 광고 현황 데이터 (가다실 파일과 별개의 엑셀) ──────────────
/** 방문통계 표(a/b)의 광고 지면별 행: PV/UV 각 1~12월 */
export type VisitPlacementRow = {
  /** 광고 지면명 */
  placement: string;
  /** 월별 PV (길이 12, 1~12월) */
  pv: number[];
  /** 월별 UV (길이 12, 1~12월) */
  uv: number[];
};

/** 방문통계 표 (a: 전체 방문통계 / b: 로그인 회원 방문통계) */
export type VisitStatsTable = {
  /** 광고 지면 행 (5개) */
  rows: VisitPlacementRow[];
  /** 월별 PV 합계 (길이 12) */
  pvTotal: number[];
  /** 월별 UV 합계 (길이 12) */
  uvTotal: number[];
};

/** 월별 남성/여성 예약자수 한 달치 (c/d 표) */
export type GenderMonthly = { male: number; female: number };

/** 디스플레이 광고 현황 데이터 엑셀 파싱 결과 */
export type DisplayAdData = {
  /** a: 전체 방문통계 (추후 시각화용) */
  totalVisit: VisitStatsTable;
  /** b: 로그인 회원 방문통계 (추후 시각화용) */
  memberVisit: VisitStatsTable;
  /** c: 월별 남성/여성 예약자수 (검진유형 패키지), 길이 12 */
  packageMonthly: GenderMonthly[];
  /** d: 월별 남성/여성 예약자수 (선택 추가항목), 길이 12 */
  additionalMonthly: GenderMonthly[];
};

// ── 통계정보(회원) 엑셀 (로그인 회원 노출 raw 데이터) ──────────────
/** 회원 통계 지역 그룹 키 (분류 결과) */
export type MemberRegion =
  | "서울"
  | "경기(인천)"
  | "충청"
  | "경상"
  | "전라"
  | "강원"
  | "지역 미기재";

/**
 * 회원 통계 집계 결과. raw 17만 행을 지역 등으로 집계한 요약만 보관
 * (원본은 sessionStorage 용량 초과라 저장하지 않음).
 */
export type MemberStatsData = {
  /** 파일명에서 계산한 데이터 대상 월 (1~12). 미상이면 0 */
  month: number;
  /** 전체 노출(행) 수 = 전체 PV */
  totalPv: number;
  /** 지역 그룹별 PV(노출 행 수) */
  regionPv: Record<MemberRegion, number>;
};

export type UploadStatus = "success" | "fail" | "pending";

export type UploadLogEntry = {
  id: string;
  filename: string;
  status: UploadStatus;
  uploadedAt: string;
  uploaderId: string;
};
