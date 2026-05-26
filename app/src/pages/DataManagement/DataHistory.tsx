import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useGadaData } from "../../context/GadaDataContext";
import type { UploadStatus } from "../../types/gada";

const STATUS_CONFIG: Record<
  UploadStatus,
  { label: string; className: string }
> = {
  success: {
    label: "성공",
    className:
      "inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400",
  },
  fail: {
    label: "실패",
    className:
      "inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400",
  },
  pending: {
    label: "대기",
    className:
      "inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-500",
  },
};

const STATUS_DOT: Record<UploadStatus, string> = {
  success: "bg-green-500",
  fail: "bg-red-500",
  pending: "bg-yellow-400",
};

export default function DataHistory() {
  const { uploadHistory, clearHistory } = useGadaData();
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const allChecked =
    uploadHistory.length > 0 && checkedIds.size === uploadHistory.length;

  const toggleAll = () => {
    if (allChecked) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(uploadHistory.map((e) => e.id)));
    }
  };

  const toggleOne = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <PageMeta title="히스토리" description="데이터 관리 - 업로드 히스토리" />
      <div className="h-full flex flex-col">
        {/* 페이지 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            히스토리
          </h1>
          {uploadHistory.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="h-7 px-3 rounded-lg border border-red-200 dark:border-red-800 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              전체 삭제
            </button>
          )}
        </div>

        {/* 삭제 확인 모달 */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-80 rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                히스토리 전체 삭제
              </h3>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                업로드 히스토리 {uploadHistory.length}건을 모두 삭제합니다.
                이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="mt-5 flex gap-2 justify-end">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="h-8 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    clearHistory();
                    setCheckedIds(new Set());
                    setShowClearConfirm(false);
                  }}
                  className="h-8 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-6">
          <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            {/* 테이블 헤더 바 */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                업로드 로그
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                총 {uploadHistory.length}건
                {checkedIds.size > 0 && (
                  <span className="ml-2 text-brand-500 font-medium">
                    {checkedIds.size}건 선택됨
                  </span>
                )}
              </span>
            </div>

            {uploadHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                  <svg
                    className="text-gray-400 dark:text-gray-500"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M13 9h-2V7h2m0 10h-2v-6h2m-1-9A10 10 0 0 0 2 12a10 10 0 0 0 10 10 10 10 0 0 0 10-10A10 10 0 0 0 12 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  업로드 기록이 없습니다
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  데이터를 업로드하면 여기에 로그가 쌓입니다
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <th className="w-10 px-5 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={toggleAll}
                          className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        데이터 파일명
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        상태
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        업로드 일시
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        업로더 ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {uploadHistory.map((entry) => {
                      const isChecked = checkedIds.has(entry.id);
                      const sc = STATUS_CONFIG[entry.status];
                      return (
                        <tr
                          key={entry.id}
                          className={`transition-colors ${
                            isChecked
                              ? "bg-brand-50 dark:bg-brand-900/10"
                              : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          }`}
                        >
                          {/* 체크박스 */}
                          <td className="px-5 py-3.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleOne(entry.id)}
                              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                            />
                          </td>

                          {/* 파일명 */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/20">
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  className="text-green-600 dark:text-green-400"
                                >
                                  <path
                                    d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"
                                    fill="currentColor"
                                    fillOpacity="0.2"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                  />
                                  <path
                                    d="M14 2V8H20"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </span>
                              <span className="text-sm font-medium text-gray-800 dark:text-white max-w-xs truncate">
                                {entry.filename}
                              </span>
                            </div>
                          </td>

                          {/* 상태 뱃지 */}
                          <td className="px-4 py-3.5">
                            <span className={sc.className}>
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[entry.status]}`}
                              />
                              {sc.label}
                            </span>
                          </td>

                          {/* 업로드 일시 */}
                          <td className="px-4 py-3.5">
                            <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
                              {entry.uploadedAt}
                            </span>
                          </td>

                          {/* 업로더 ID */}
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300">
                                {entry.uploaderId[0]?.toUpperCase()}
                              </span>
                              {entry.uploaderId}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
