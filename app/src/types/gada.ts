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

export type UploadStatus = "success" | "fail" | "pending";

export type UploadLogEntry = {
  id: string;
  filename: string;
  status: UploadStatus;
  uploadedAt: string;
  uploaderId: string;
};
