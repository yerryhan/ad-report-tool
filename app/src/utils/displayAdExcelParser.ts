import * as XLSX from 'xlsx';
import type {
  DisplayAdData,
  VisitStatsTable,
  VisitPlacementRow,
  GenderMonthly,
} from '../types/gada';

// 파일명에 "디스플레이 광고 현황 데이터" 가 포함된 .xlsx 를 이 형식으로 간주
// (예: 2026_한국MSD_디스플레이 광고 현황 데이터_v1.0.xlsx) — 연도/버전 변경에 견고하게.
export function isDisplayAdFile(filename: string): boolean {
  return filename.includes('디스플레이 광고 현황 데이터') && /\.xlsx$/i.test(filename);
}

const MONTH_RE = /^(1[0-2]|[1-9])월$/;

function toNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function cell(row: unknown[] | undefined, idx: number): unknown {
  return row ? row[idx] : undefined;
}

// sheet_to_json(header:1) 은 시트 범위(!ref) 시작 열 기준 상대 인덱스를 쓰므로
// 열 위치를 하드코딩하지 않고 "1월~12월" 헤더 셀 위치를 찾아 데이터 열을 결정한다.
function monthColIndices(row: unknown[] | undefined): number[] {
  if (!row) return [];
  const idxs: number[] = [];
  for (let c = 0; c < row.length; c++) {
    if (MONTH_RE.test(String(row[c] ?? '').trim())) idxs.push(c);
  }
  return idxs;
}

// 행에서 첫 번째 비어있지 않은 셀(=표 제목/행 레이블)을 반환
function firstLabel(row: unknown[] | undefined): string {
  if (!row) return '';
  for (const c of row) {
    const s = String(c ?? '').trim();
    if (s) return s;
  }
  return '';
}

function emptyVisit(): VisitStatsTable {
  return { rows: [], pvTotal: new Array(12).fill(0), uvTotal: new Array(12).fill(0) };
}

// 방문통계 표(a/b) 파싱.
// 레이아웃: 제목행 → 월 헤더행(1~12월이 PV·UV 두 번 반복) → 지면 행들 → "합계" 행.
function parseVisitTable(rows: unknown[][], titleIdx: number): VisitStatsTable {
  const mcols = monthColIndices(rows[titleIdx + 1]); // 월 헤더행 (PV 12 + UV 12)
  const pvCols = mcols.slice(0, 12);
  const uvCols = mcols.slice(12, 24);
  if (pvCols.length === 0) return emptyVisit();
  const labelCol = pvCols[0] - 1;

  const read = (row: unknown[] | undefined, cols: number[]) =>
    cols.map((c) => toNum(cell(row, c)));

  const placementRows: VisitPlacementRow[] = [];
  let pvTotal = new Array(12).fill(0);
  let uvTotal = new Array(12).fill(0);

  for (let i = titleIdx + 2; i < rows.length; i++) {
    const label = String(cell(rows[i], labelCol) ?? '').trim();
    if (!label) break;
    if (label === '합계') {
      pvTotal = read(rows[i], pvCols);
      uvTotal = read(rows[i], uvCols);
      break;
    }
    placementRows.push({
      placement: label,
      pv: read(rows[i], pvCols),
      uv: read(rows[i], uvCols),
    });
  }
  return { rows: placementRows, pvTotal, uvTotal };
}

// 월별 남성/여성 표(c/d) 파싱.
// 이 표는 제목행에 1~12월 헤더가 함께 들어있고, 다음 두 행이 '여성','남성'.
function parseGenderMonthly(rows: unknown[][], titleIdx: number): GenderMonthly[] {
  const mcols = monthColIndices(rows[titleIdx]).slice(0, 12);
  const labelCol = mcols.length ? mcols[0] - 1 : 0;

  let female = new Array(12).fill(0);
  let male = new Array(12).fill(0);
  for (let i = titleIdx + 1; i <= titleIdx + 4 && i < rows.length; i++) {
    const label = String(cell(rows[i], labelCol) ?? '').trim();
    if (label === '여성') female = mcols.map((c) => toNum(cell(rows[i], c)));
    else if (label === '남성') male = mcols.map((c) => toNum(cell(rows[i], c)));
  }
  return Array.from({ length: 12 }, (_, i) => ({
    male: male[i] ?? 0,
    female: female[i] ?? 0,
  }));
}

export function parseDisplayAdExcel(file: File): Promise<DisplayAdData> {
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

        const findIdx = (pred: (label: string) => boolean) =>
          rows.findIndex((r) => pred(firstLabel(r)));

        // 제목 셀에는 줄바꿈이 포함될 수 있어 포함(includes) 매칭 사용
        const aIdx = findIdx((l) => l === '전체 방문통계');
        const bIdx = findIdx((l) => l === '로그인 회원 방문통계');
        const cIdx = findIdx((l) => l.includes('검진유형'));
        const dIdx = findIdx((l) => l.includes('선택 추가항목'));

        if (cIdx < 0 || dIdx < 0) {
          throw new Error('월별 남성/여성 예약자수 표(검진유형 패키지/선택 추가항목)를 찾을 수 없습니다.');
        }

        resolve({
          totalVisit: aIdx >= 0 ? parseVisitTable(rows, aIdx) : emptyVisit(),
          memberVisit: bIdx >= 0 ? parseVisitTable(rows, bIdx) : emptyVisit(),
          packageMonthly: parseGenderMonthly(rows, cIdx),
          additionalMonthly: parseGenderMonthly(rows, dIdx),
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다.'));
    reader.readAsArrayBuffer(file);
  });
}
