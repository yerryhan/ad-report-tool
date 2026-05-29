import * as XLSX from 'xlsx';
import type { MemberRegion, MemberStatsData } from '../types/gada';

// 파일명에 "통계정보(회원)" 이 포함된 .xls/.xlsx 를 이 형식으로 간주.
// (예: 통계정보(회원)2026-05-04.xls) — 보통 .xls(구형 BIFF) 로 들어옴.
export function isMemberStatsFile(filename: string): boolean {
  return filename.includes('통계정보(회원)') && /\.xlsx?$/i.test(filename);
}

// 파일명 날짜(YYYY-MM-DD) = 다운로드 시점이고, 그 시점은 직전 달 리포트 작업 시점.
// ⇒ 데이터 대상 월 = 파일명 월 − 1 (1월이면 전년 12월). 못 찾으면 0.
export function memberDataMonth(filename: string): number {
  const m = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return 0;
  const mm = parseInt(m[2], 10);
  if (mm < 1 || mm > 12) return 0;
  return mm === 1 ? 12 : mm - 1;
}

// 지역 분류: "포함" 매칭, 시/도(앞 토큰) 우선.
// 예) "경기 광주시" 는 경기·광주 둘 다 포함되지만 앞 토큰(경기)이 우선 → 경기(인천).
const REGION_GROUPS: [MemberRegion, string[]][] = [
  ['서울', ['서울']],
  ['경기(인천)', ['경기', '인천']],
  ['충청', ['충북', '충남', '대전', '세종']],
  ['경상', ['경북', '경남', '부산', '대구', '울산', '경상']],
  ['전라', ['전라', '전북', '전남', '광주', '제주']],
  ['강원', ['강원']],
];

export function classifyRegion(raw: unknown): MemberRegion {
  const v = String(raw ?? '').trim();
  if (!v) return '지역 미기재';
  // 앞쪽 시/도 토큰 우선 매칭 (중복 키워드 충돌 해소)
  const head = v.split(/\s+/)[0];
  for (const [group, kws] of REGION_GROUPS) {
    if (kws.some((k) => head.includes(k))) return group;
  }
  // 앞 토큰으로 못 찾으면 전체 문자열로 재시도(안전망)
  for (const [group, kws] of REGION_GROUPS) {
    if (kws.some((k) => v.includes(k))) return group;
  }
  // 어떤 키워드에도 안 맞으면 미기재로 분류 (현재 샘플엔 0건)
  return '지역 미기재';
}

function emptyRegionPv(): Record<MemberRegion, number> {
  return {
    서울: 0,
    '경기(인천)': 0,
    충청: 0,
    경상: 0,
    전라: 0,
    강원: 0,
    '지역 미기재': 0,
  };
}

export function parseMemberStatsExcel(file: File): Promise<MemberStatsData> {
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
        if (rows.length < 2) throw new Error('데이터가 비어 있습니다.');

        // 헤더행에서 "영역"/"지역" 열 인덱스를 찾는다(열 위치 하드코딩 금지).
        const header = rows[0].map((c) => String(c ?? '').trim());
        const areaCol = header.indexOf('영역');
        const regionCol = header.indexOf('지역');
        if (areaCol < 0 || regionCol < 0) {
          throw new Error('헤더에서 "영역"/"지역" 열을 찾을 수 없습니다.');
        }

        const regionPv = emptyRegionPv();
        let totalPv = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row) continue;
          // 영역 셀이 비어 있으면 유효 레코드가 아님(빈 행)
          const area = String(row[areaCol] ?? '').trim();
          if (!area) continue;
          totalPv++;
          regionPv[classifyRegion(row[regionCol])]++;
        }

        resolve({ month: memberDataMonth(file.name), totalPv, regionPv });
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };

    reader.onerror = () => reject(new Error('파일 읽기에 실패했습니다.'));
    reader.readAsArrayBuffer(file);
  });
}
