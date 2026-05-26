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
};

export type UploadStatus = "success" | "fail" | "pending";

export type UploadLogEntry = {
  id: string;
  filename: string;
  status: UploadStatus;
  uploadedAt: string;
  uploaderId: string;
};
