import * as XLSX from 'xlsx';
import type {
  AgeGroupData,
  AgeGenderGroup,
  GenderStats,
  GadaExcelData,
  ReservationRow,
  CompanyStatRow,
  HospitalBookingStat,
} from '../types/gada';

// "M월"(샘플 파일) 과 실제 "1~12월" 모두 허용
export const GADA_FILE_PATTERN = /^한국\(MSD\) 가다실 (M|\d{1,2})월 통계\.xlsx$/;

export function isGadaFile(filename: string): boolean {
  return GADA_FILE_PATTERN.test(filename);
}

function extractMonth(filename: string): number {
  const match = filename.match(GADA_FILE_PATTERN);
  if (!match) return 0;
  return match[1] === 'M' ? 0 : parseInt(match[1], 10);
}

// ── 이름 가운데 글자 마스킹 ──────────────────────────────────────────
function maskName(name: string): string {
  const s = name.trim();
  if (s.length <= 1) return s;
  if (s.length === 2) return s[0] + '*';
  return s[0] + '*'.repeat(s.length - 2) + s[s.length - 1];
}

// ── 생년월일 → 연도(YYYY)만 추출 ─────────────────────────────────────
function maskBirth(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  return String(value).replace(/\D/g, '').slice(0, 4);
}

// ── Excel 날짜 시리얼 → "YYYY-MM-DD HH:mm" 문자열 ───────────────────
function excelSerialToDateStr(val: unknown): string {
  if (typeof val !== 'number' || isNaN(val)) return String(val ?? '');
  const intPart = Math.floor(val);
  const fracPart = val - intPart;
  const utcMs = (intPart - 25569) * 86400000;
  const d = new Date(utcMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const totalMins = Math.round(fracPart * 1440);
  const hh = String(Math.floor(totalMins / 60)).padStart(2, '0');
  const min = String(totalMins % 60).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function toNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// ── 예약자 목록 → 성별·연령대 통계 계산 ─────────────────────────────────
// - O열(birthYear=YYYY)로 나이 계산, P열(gender=F/M)로 성별 구분
// - 패키지:추가항목 = 1:1.75 (1.5~2 중간값)으로 임의 분할
function computeGenderStats(reservations: ReservationRow[]): GenderStats {
  const currentYear = new Date().getFullYear();

  const ageGroups: {
    age20: AgeGenderGroup;
    age30: AgeGenderGroup;
    age40: AgeGenderGroup;
    age50: AgeGenderGroup;
    age60plus: AgeGenderGroup;
  } = {
    age20:    { male: 0, female: 0 },
    age30:    { male: 0, female: 0 },
    age40:    { male: 0, female: 0 },
    age50:    { male: 0, female: 0 },
    age60plus:{ male: 0, female: 0 },
  };

  let totalMale = 0;
  let totalFemale = 0;

  for (const r of reservations) {
    const birthYearNum = parseInt(r.birthYear, 10);
    if (isNaN(birthYearNum) || birthYearNum === 0) continue;

    const age = currentYear - birthYearNum;
    const genderCode = r.gender.trim().toUpperCase();
    const isMale   = genderCode === 'M';
    const isFemale = genderCode === 'F';
    if (!isMale && !isFemale) continue;

    if (isMale)   totalMale++;
    else          totalFemale++;

    let group: keyof typeof ageGroups | null = null;
    if      (age >= 20 && age < 30) group = 'age20';
    else if (age >= 30 && age < 40) group = 'age30';
    else if (age >= 40 && age < 50) group = 'age40';
    else if (age >= 50 && age < 60) group = 'age50';
    else if (age >= 60)             group = 'age60plus';

    if (group) {
      if (isMale) ageGroups[group].male++;
      else        ageGroups[group].female++;
    }
  }

  const totalPeople = totalMale + totalFemale;
  const ratio = 1.75; // 패키지:추가항목 = 1:1.75

  const totalPackage    = totalPeople > 0 ? Math.round(totalPeople / (1 + ratio)) : 0;
  const totalAdditional = totalPeople - totalPackage;

  // 패키지/추가항목 각각 남녀 비율은 전체 비율 그대로 유지
  const packageMale    = totalPeople > 0 ? Math.round(totalPackage * totalMale / totalPeople) : 0;
  const packageFemale  = totalPackage - packageMale;
  const additionalMale = totalPeople > 0 ? Math.round(totalAdditional * totalMale / totalPeople) : 0;
  const additionalFemale = totalAdditional - additionalMale;

  const pct = (n: number, total: number) =>
    total > 0 ? Math.round((n / total) * 1000) / 10 : 0;

  const pkgTotal = packageMale + packageFemale;
  const addTotal = additionalMale + additionalFemale;

  return {
    totalMale,
    totalFemale,
    packageMale,
    packageFemale,
    additionalMale,
    additionalFemale,
    packageMalePct:      pct(packageMale,    pkgTotal),
    packageFemalePct:    pct(packageFemale,  pkgTotal),
    additionalMalePct:   pct(additionalMale,   addTotal),
    additionalFemalePct: pct(additionalFemale, addTotal),
    ageGroups,
  };
}

// ── 실제 파일 기준 연령대 열 위치: idx 1-7 (A열=레이블, B-H=연령대) ──
function parseAgeRow(row: unknown[]): AgeGroupData {
  return {
    age20: toNum(row[1]),
    age30: toNum(row[2]),
    age40: toNum(row[3]),
    age50: toNum(row[4]),
    age60: toNum(row[5]),
    etc:   toNum(row[6]),
    total: toNum(row[7]),
  };
}

export function parseGadaExcel(file: File): Promise<GadaExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const ab = e.target!.result as ArrayBuffer;
        const wb = XLSX.read(new Uint8Array(ab), { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: '',
        });

        const month = extractMonth(file.name);

        // ── 데이터 영역 1: "가다실" 레이블 행을 동적 탐지 ───────────────
        // 실제 파일: A열(idx 0)이 "가다실"인 행이 4개 순서대로 존재
        // [0]=남성클릭, [1]=여성클릭, [2]=남성방문자, [3]=여성방문자
        const gadaRows = rows.filter(
          (r) => String(r[0] ?? '').trim() === '가다실'
        );

        const ageClickMale    = parseAgeRow(gadaRows[0] ?? []);
        const ageClickFemale  = parseAgeRow(gadaRows[1] ?? []);
        const ageVisitorMale  = parseAgeRow(gadaRows[2] ?? []);
        const ageVisitorFemale = parseAgeRow(gadaRows[3] ?? []);

        // ── 데이터 영역 2: 기예약자 목록 ─────────────────────────────────
        // 실제 열 위치 (0-based):
        //   L(11)=이름  M(12)=기업  N(13)=생년월일(YYYY)  O(14)=성별(F/M)
        //   P(15)=예약시간  Q(16)=예약병원  R(17)=예약현황
        let area2DataStart = -1;
        for (let i = 0; i < rows.length; i++) {
          if (String(rows[i][11] ?? '').trim() === '이름') {
            area2DataStart = i + 1;
            break;
          }
        }

        const reservations: ReservationRow[] = [];
        if (area2DataStart > 0) {
          for (let i = area2DataStart; i < rows.length; i++) {
            const name = String(rows[i][11] ?? '').trim();
            if (!name) continue; // 빈 행 건너뜀(side-by-side 구조)
            reservations.push({
              maskedName:      maskName(name),
              company:         String(rows[i][12] ?? ''),
              birthYear:       maskBirth(rows[i][13]),    // N열
              gender:          String(rows[i][14] ?? ''), // O열
              reservationTime: excelSerialToDateStr(rows[i][15]),
              hospital:        String(rows[i][16] ?? '').trim(),
              status:          String(rows[i][17] ?? ''),
            });
          }
        }

        // ── 데이터 영역 3: 고객사별 검진 예약율 ──────────────────────────
        // 실제 열 위치:
        //   T(19)=고객사명  U(20)=검진예약율  V(21)=검진유형 예약건수
        //   W(22)=본인부담 예약건수  X(23)=합계
        let area3DataStart = -1;
        for (let i = 0; i < rows.length; i++) {
          if (String(rows[i][19] ?? '').trim() === '고객사명') {
            area3DataStart = i + 1;
            break;
          }
        }

        const companyStats: CompanyStatRow[] = [];
        if (area3DataStart > 0) {
          for (let i = area3DataStart; i < rows.length; i++) {
            const company = String(rows[i][19] ?? '').trim();
            if (!company) continue;
            companyStats.push({
              companyName:     company,
              reservationRate: rows[i][20] as string | number,
              examTypeCount:   toNum(rows[i][21]),
              selfPayCount:    toNum(rows[i][22]),
              total:           toNum(rows[i][23]),
            });
          }
        }

        // ── 병원별 예약 통계 계산 ──────────────────────────────────────────
        const countMap: Record<string, number> = {};
        for (const r of reservations) {
          if (r.hospital) countMap[r.hospital] = (countMap[r.hospital] ?? 0) + 1;
        }

        const totalCount = reservations.length;
        const allHospitals: HospitalBookingStat[] = Object.entries(countMap)
          .map(([hospital, count]) => ({
            hospital,
            count,
            percentage:
              totalCount > 0
                ? Math.round((count / totalCount) * 1000) / 10
                : 0,
          }))
          .sort((a, b) => b.count - a.count);

        const mainHospitals  = allHospitals.filter((h) => h.count > 1);
        const otherHospitals = allHospitals.filter((h) => h.count === 1);

        resolve({
          month,
          ageClickMale,
          ageClickFemale,
          ageVisitorMale,
          ageVisitorFemale,
          reservations,
          companyStats,
          mainHospitals,
          otherHospitals,
          genderStats: computeGenderStats(reservations),
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다.'));
    reader.readAsArrayBuffer(file);
  });
}
