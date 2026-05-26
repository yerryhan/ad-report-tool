import { createContext, useContext, useState } from 'react';
import type { GadaExcelData, UploadLogEntry, UploadStatus } from '../types/gada';

// ── sessionStorage 헬퍼 (탭/브라우저 닫으면 자동 소멸) ──────────────
const SS_KEY_DATA    = 'gada_data';
const SS_KEY_HISTORY = 'gada_history';

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
  setGadaData: (data: GadaExcelData | null) => void;

  uploadHistory: UploadLogEntry[];
  addUploadLog: (
    filename: string,
    status: UploadStatus,
    uploaderId: string
  ) => void;
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

  const [uploadHistory, setUploadHistory] = useState<UploadLogEntry[]>(
    () => ssGet<UploadLogEntry[]>(SS_KEY_HISTORY) ?? []
  );

  const setGadaData = (data: GadaExcelData | null) => {
    setGadaDataState(data);
    ssSet(SS_KEY_DATA, data);
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

  const clearHistory = () => {
    setUploadHistory([]);
    sessionStorage.removeItem(SS_KEY_HISTORY);
  };

  return (
    <GadaDataContext.Provider
      value={{ gadaData, setGadaData, uploadHistory, addUploadLog, clearHistory }}
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
