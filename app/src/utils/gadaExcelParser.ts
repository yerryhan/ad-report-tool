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
// - 남/여 각각을 검진유형 패키지:선택 추가항목 = 1:(1.5~2) 임의 비율로 분할
//   (같은 비율 r을 적용 → a:c = b:d = 1:r)
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

  // 검진유형 패키지 : 선택 추가항목 = 1 : (1.5~2) 임의 비율로 분할.
  // 같은 비율 r을 남/여에 동일하게 적용 → a:c = b:d = 1:r.
  const r = 1.5 + Math.random() * 0.5;

  const packageMale      = Math.round(totalMale   / (1 + r)); // a
  const additionalMale   = totalMale - packageMale;           // c
  const packageFemale    = Math.round(totalFemale / (1 + r)); // b
  const additionalFemale = totalFemale - packageFemale;       // d

  const pct = (n: number, total: number) =>
    total > 0 ? Math.round((n / total) * 1000) / 10 : 0;

  const pkgTotal = packageMale + packageFemale;       // a + b
  const addTotal = additionalMale + additionalFemale; // c + d

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

// ── 연령대 행 파싱: 레이블("가다실") 열 다음부터 7칸이 20대~합계 ──
// labelCol = "가다실"이 있는 열. 그 우측으로 1~7칸이 연령대·합계.
function parseAgeRow(row: unknown[], labelCol: number): AgeGroupData {
  return {
    age20: toNum(row[labelCol + 1]),
    age30: toNum(row[labelCol + 2]),
    age40: toNum(row[labelCol + 3]),
    age50: toNum(row[labelCol + 4]),
    age60: toNum(row[labelCol + 5]),
    etc:   toNum(row[labelCol + 6]),
    total: toNum(row[labelCol + 7]),
  };
}

// ── 헤더 라벨의 (행, 열) 좌표를 시트 전체에서 탐지 ─────────────────────
// 열 위치를 하드코딩하지 않고 라벨로 앵커를 찾는다(파일이 몇 칸 밀려 들어와도 견딤).
// 못 찾으면 { row: -1, col: -1 }.
function findLabel(
  rows: unknown[][],
  label: string
): { row: number; col: number } {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    for (let c = 0; c < r.length; c++) {
      if (String(r[c] ?? '').trim() === label) return { row: i, col: c };
    }
  }
  return { row: -1, col: -1 };
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
        // "가다실"이 있는 열(gadaCol)을 먼저 찾고, 그 열에 "가다실"이 든
        // 행 4개를 순서대로 사용: [0]=남성클릭 [1]=여성클릭 [2]=남성방문자 [3]=여성방문자.
        // 연령대·합계는 gadaCol 우측 1~7칸(parseAgeRow가 오프셋으로 읽음).
        const gadaAnchor = findLabel(rows, '가다실');
        const gadaCol = gadaAnchor.col;
        const gadaRows =
          gadaCol >= 0
            ? rows.filter((r) => String(r[gadaCol] ?? '').trim() === '가다실')
            : [];

        const ageClickMale    = parseAgeRow(gadaRows[0] ?? [], gadaCol);
        const ageClickFemale  = parseAgeRow(gadaRows[1] ?? [], gadaCol);
        const ageVisitorMale  = parseAgeRow(gadaRows[2] ?? [], gadaCol);
        const ageVisitorFemale = parseAgeRow(gadaRows[3] ?? [], gadaCol);

        // ── 데이터 영역 2: 기예약자 목록 ─────────────────────────────────
        // "이름" 헤더 셀을 동적 탐지. 헤더 우측 0~6칸이 각 필드:
        //   +0 이름  +1 기업  +2 생년월일(YYYY)  +3 성별(F/M)
        //   +4 예약시간  +5 예약병원  +6 예약현황
        const nameHeader = findLabel(rows, '이름');
        const reservations: ReservationRow[] = [];
        if (nameHeader.row >= 0) {
          const c = nameHeader.col;
          for (let i = nameHeader.row + 1; i < rows.length; i++) {
            const name = String(rows[i][c] ?? '').trim();
            if (!name) continue; // 빈 행 건너뜀(side-by-side 구조)
            reservations.push({
              maskedName:      maskName(name),
              company:         String(rows[i][c + 1] ?? ''),
              birthYear:       maskBirth(rows[i][c + 2]),
              gender:          String(rows[i][c + 3] ?? ''),
              reservationTime: excelSerialToDateStr(rows[i][c + 4]),
              hospital:        String(rows[i][c + 5] ?? '').trim(),
              status:          String(rows[i][c + 6] ?? ''),
            });
          }
        }

        // ── 데이터 영역 3: 고객사별 검진 예약율 ──────────────────────────
        // "고객사명" 헤더 셀을 동적 탐지. 헤더 우측 0~4칸이 각 필드:
        //   +0 고객사명  +1 검진예약율  +2 검진유형 예약건수
        //   +3 본인부담 예약건수  +4 합계
        const companyHeader = findLabel(rows, '고객사명');
        const companyStats: CompanyStatRow[] = [];
        if (companyHeader.row >= 0) {
          const c = companyHeader.col;
          for (let i = companyHeader.row + 1; i < rows.length; i++) {
            const company = String(rows[i][c] ?? '').trim();
            if (!company) continue;
            companyStats.push({
              companyName:     company,
              reservationRate: rows[i][c + 1] as string | number,
              examTypeCount:   toNum(rows[i][c + 2]),
              selfPayCount:    toNum(rows[i][c + 3]),
              total:           toNum(rows[i][c + 4]),
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
