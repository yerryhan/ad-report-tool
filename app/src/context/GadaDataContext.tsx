import { createContext, useContext, useState } from 'react';
import type { GadaExcelData, UploadLogEntry, UploadStatus } from '../types/gada';

// ── sessionStorage 헬퍼 (탭/브라우저 닫으면 자동 소멸) ──────────────
const SS_KEY_DATA     = 'gada_data';
const SS_KEY_DATAFILE = 'gada_data_file';
const SS_KEY_HISTORY  = 'gada_history';

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

  const [uploadHistory, setUploadHistory] = useState<UploadLogEntry[]>(
    () => ssGet<UploadLogEntry[]>(SS_KEY_HISTORY) ?? []
  );

  const setGadaData = (data: GadaExcelData | null, filename: string | null = null) => {
    setGadaDataState(data);
    ssSet(SS_KEY_DATA, data);
    setDataFilename(filename);
    ssSet(SS_KEY_DATAFILE, filename);
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

    // 삭제 파일이 현재 시각화에 연결된 파일이면 시각화 데이터 초기화
    if (dataFilename && removed.some((e) => e.filename === dataFilename)) {
      setGadaData(null);
    }
  };

  const clearHistory = () => {
    setUploadHistory([]);
    sessionStorage.removeItem(SS_KEY_HISTORY);
  };

  return (
    <GadaDataContext.Provider
      value={{
        gadaData,
        setGadaData,
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
