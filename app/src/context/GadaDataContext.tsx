import { createContext, useContext, useState } from 'react';
import type { GadaExcelData, DisplayAdData, MemberStatsData, UploadLogEntry, UploadStatus } from '../types/gada';

// ── sessionStorage 헬퍼 (탭/브라우저 닫으면 자동 소멸) ──────────────
const SS_KEY_DATA        = 'gada_data';
const SS_KEY_DATAFILE    = 'gada_data_file';
const SS_KEY_HISTORY     = 'gada_history';
const SS_KEY_DISPLAY     = 'display_ad_data';
const SS_KEY_DISPLAYFILE = 'display_ad_data_file';
// 회원통계는 월별로 보관 (현재월/전월 비교용). key = 데이터 대상 월(1~12)
const SS_KEY_MEMBER_MAP  = 'member_stats_map';

/** 월별 회원통계 1건 (데이터 + 출처 파일명) */
type MemberEntry = { data: MemberStatsData; filename: string };
type MemberMap = Record<number, MemberEntry>;

function ssGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function ssSet(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sessionStorage 용량 초과 등 무시
  }
}

// ── Context 타입 ────────────────────────────────────────────────────
type GadaDataContextType = {
  gadaData: GadaExcelData | null;
  /** filename: 이 데이터가 어떤 업로드 파일에서 왔는지(시각화-파일 연결용) */
  setGadaData: (data: GadaExcelData | null, filename?: string | null) => void;

  /** 디스플레이 광고 현황 데이터 (방문통계 a/b, 월별 남녀 c/d) */
  displayAdData: DisplayAdData | null;
  /** filename: 이 데이터가 어떤 업로드 파일에서 왔는지(시각화-파일 연결용) */
  setDisplayAdData: (data: DisplayAdData | null, filename?: string | null) => void;

  /** 통계정보(회원) 집계 데이터 — 가장 최근(최대) 월. 지역별 PV 등 */
  memberStatsData: MemberStatsData | null;
  /** 데이터 대상 월(1~12) → 회원통계. 현재월/전월 비교(연령대 클릭률 등)에 사용 */
  memberStatsByMonth: Record<number, MemberStatsData>;
  /**
   * 회원통계 저장. data.month(데이터 대상 월) 기준으로 월별 누적 병합.
   * data=null 이면 전체 초기화. filename 은 시각화-파일 연결용.
   */
  setMemberStatsData: (data: MemberStatsData | null, filename?: string | null) => void;

  uploadHistory: UploadLogEntry[];
  addUploadLog: (
    filename: string,
    status: UploadStatus,
    uploaderId: string
  ) => void;
  /** 선택한 로그를 메모리에서 삭제. 현재 시각화에 연결된 파일이면 시각화도 초기화 */
  removeUploadLogs: (ids: string[]) => void;
  clearHistory: () => void;
};

const GadaDataContext = createContext<GadaDataContextType | undefined>(
  undefined
);

export const GadaDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [gadaData, setGadaDataState] = useState<GadaExcelData | null>(
    () => ssGet<GadaExcelData>(SS_KEY_DATA)
  );

  // 현재 시각화가 어떤 업로드 파일에서 왔는지 (선택 삭제 시 연결 판단용)
  const [dataFilename, setDataFilename] = useState<string | null>(
    () => ssGet<string>(SS_KEY_DATAFILE)
  );

  const [displayAdData, setDisplayAdDataState] = useState<DisplayAdData | null>(
    () => ssGet<DisplayAdData>(SS_KEY_DISPLAY)
  );
  const [displayFilename, setDisplayFilename] = useState<string | null>(
    () => ssGet<string>(SS_KEY_DISPLAYFILE)
  );

  const [memberMap, setMemberMap] = useState<MemberMap>(
    () => ssGet<MemberMap>(SS_KEY_MEMBER_MAP) ?? {}
  );

  // 월 키 목록 / 가장 최근(최대) 월 = 현재 리포트 대상 월
  const memberMonths = Object.keys(memberMap).map(Number);
  const currentMemberMonth = memberMonths.length ? Math.max(...memberMonths) : null;
  const memberStatsData: MemberStatsData | null =
    currentMemberMonth != null ? memberMap[currentMemberMonth].data : null;
  // 페이지에서 쓰기 쉽도록 month → data 형태로 노출 (파일명 제외)
  const memberStatsByMonth: Record<number, MemberStatsData> = {};
  for (const [m, entry] of Object.entries(memberMap)) {
    memberStatsByMonth[Number(m)] = entry.data;
  }

  const [uploadHistory, setUploadHistory] = useState<UploadLogEntry[]>(
    () => ssGet<UploadLogEntry[]>(SS_KEY_HISTORY) ?? []
  );

  const setGadaData = (data: GadaExcelData | null, filename: string | null = null) => {
    setGadaDataState(data);
    ssSet(SS_KEY_DATA, data);
    setDataFilename(filename);
    ssSet(SS_KEY_DATAFILE, filename);
  };

  const setDisplayAdData = (data: DisplayAdData | null, filename: string | null = null) => {
    setDisplayAdDataState(data);
    ssSet(SS_KEY_DISPLAY, data);
    setDisplayFilename(filename);
    ssSet(SS_KEY_DISPLAYFILE, filename);
  };

  const setMemberStatsData = (data: MemberStatsData | null, filename: string | null = null) => {
    setMemberMap((prev) => {
      let next: MemberMap;
      if (data == null) {
        next = {}; // 전체 초기화
      } else {
        // 데이터 대상 월 기준 병합(같은 월 재업로드 시 최신으로 교체)
        next = { ...prev, [data.month]: { data, filename: filename ?? '' } };
      }
      ssSet(SS_KEY_MEMBER_MAP, next);
      return next;
    });
  };

  const addUploadLog = (
    filename: string,
    status: UploadStatus,
    uploaderId: string
  ) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const uploadedAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const entry: UploadLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename,
      status,
      uploadedAt,
      uploaderId,
    };

    setUploadHistory((prev) => {
      const next = [entry, ...prev];
      ssSet(SS_KEY_HISTORY, next);
      return next;
    });
  };

  const removeUploadLogs = (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const removed = uploadHistory.filter((e) => idSet.has(e.id));
    const next = uploadHistory.filter((e) => !idSet.has(e.id));
    setUploadHistory(next);
    ssSet(SS_KEY_HISTORY, next);

    // 삭제 파일이 현재 시각화에 연결된 파일이면 해당 시각화 데이터만 초기화
    const removedNames = new Set(removed.map((e) => e.filename));
    if (dataFilename && removedNames.has(dataFilename)) {
      setGadaData(null);
    }
    if (displayFilename && removedNames.has(displayFilename)) {
      setDisplayAdData(null);
    }
    // 회원통계: 삭제 파일에 연결된 '월'만 골라 제거
    const memberHit = Object.values(memberMap).some((e) =>
      removedNames.has(e.filename)
    );
    if (memberHit) {
      const nextMember: MemberMap = {};
      for (const [m, entry] of Object.entries(memberMap)) {
        if (!removedNames.has(entry.filename)) nextMember[Number(m)] = entry;
      }
      setMemberMap(nextMember);
      ssSet(SS_KEY_MEMBER_MAP, nextMember);
    }
  };

  const clearHistory = () => {
    setUploadHistory([]);
    sessionStorage.removeItem(SS_KEY_HISTORY);
    // 전체 삭제 시 모든 시각화 데이터 초기화
    setGadaData(null);
    setDisplayAdData(null);
    setMemberStatsData(null);
  };

  return (
    <GadaDataContext.Provider
      value={{
        gadaData,
        setGadaData,
        displayAdData,
        setDisplayAdData,
        memberStatsData,
        memberStatsByMonth,
        setMemberStatsData,
        uploadHistory,
        addUploadLog,
        removeUploadLogs,
        clearHistory,
      }}
    >
      {children}
    </GadaDataContext.Provider>
  );
};

export const useGadaData = () => {
  const ctx = useContext(GadaDataContext);
  if (!ctx) throw new Error('useGadaData must be used within GadaDataProvider');
  return ctx;
};
