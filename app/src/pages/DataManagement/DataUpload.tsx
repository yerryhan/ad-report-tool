import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import PageMeta from "../../components/common/PageMeta";

const HEADERS = ["영역", "PV", "UV", "클릭수"];
const ROW_LABELS = [
  "메인 페이지",
  "모음페이지",
  "팝업(메인페이지)",
  "검진 예약 페이지",
  "예약정보 및 변경 페이지",
  "병원 둘러보기 페이지",
];

const DATA_COLS = 3;
const initialCellData = () =>
  Array.from({ length: ROW_LABELS.length }, () => Array(DATA_COLS).fill(""));

type CellData = string[][];

function DataTable({
  title,
  isEditing,
  cellData,
  onCellChange,
}: {
  title: string;
  isEditing: boolean;
  cellData: CellData;
  onCellChange: (row: number, col: number, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {title}
      </span>
      <div className="overflow-hidden rounded-xl bg-white dark:bg-white/[0.03]">
        <div className="w-full overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col style={{ width: "24%" }} />
              <col />
              <col />
              <col />
            </colgroup>
            <tbody>
              {Array.from({ length: ROW_LABELS.length + 1 }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {HEADERS.map((header, colIdx) => {
                    const isHeaderCell = rowIdx === 0 || colIdx === 0;
                    const isDataCell = rowIdx > 0 && colIdx > 0;
                    return (
                      <td
                        key={colIdx}
                        className={`border border-gray-100 dark:border-white/[0.05] px-3 py-2 text-center
                          ${isHeaderCell
                            ? "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold"
                            : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-400"
                          }
                        `}
                      >
                        {rowIdx === 0 ? (
                          header
                        ) : colIdx === 0 ? (
                          ROW_LABELS[rowIdx - 1]
                        ) : isDataCell && isEditing ? (
                          <input
                            type="text"
                            value={cellData[rowIdx - 1][colIdx - 1]}
                            onChange={(e) =>
                              onCellChange(rowIdx - 1, colIdx - 1, e.target.value)
                            }
                            className="w-full bg-transparent text-center text-gray-700 dark:text-gray-300 outline-none"
                          />
                        ) : (
                          cellData[rowIdx - 1][colIdx - 1]
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function DataUpload() {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [rawDigits, setRawDigits] = useState("");
  const [cellDataLeft, setCellDataLeft] = useState<CellData>(initialCellData);
  const [cellDataRight, setCellDataRight] = useState<CellData>(initialCellData);

  // Ghost text 포맷 계산
  const year = rawDigits.slice(0, 4);
  const month = rawDigits.slice(4, 6);
  let typedStr: string;
  let ghostStr: string;
  if (year.length < 4) {
    typedStr = year;
    ghostStr = "YYYY".slice(year.length) + "-MM 데이터";
  } else if (month.length < 2) {
    typedStr = year + "-" + month;
    ghostStr = "MM".slice(month.length) + " 데이터";
  } else {
    typedStr = year + "-" + month + " 데이터";
    ghostStr = "";
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    setRawDigits(digits);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      setRawDigits((prev) => prev.slice(0, -1));
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    console.log("저장:", typedStr, cellDataLeft, cellDataRight);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setPendingFile(acceptedFiles[0]);
  }, []);

  const handleUploadSave = () => {
    if (!pendingFile) return;
    console.log("서버 업로드:", pendingFile);
    setPendingFile(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const makeCellHandler =
    (setter: React.Dispatch<React.SetStateAction<CellData>>) =>
    (row: number, col: number, value: string) => {
      setter((prev) => {
        const updated = prev.map((r) => [...r]);
        updated[row][col] = value;
        return updated;
      });
    };

  return (
    <>
      <PageMeta
        title="데이터 업로드"
        description="데이터 관리 - 데이터 업로드"
      />
      <div className="h-full flex flex-col">
        {/* Page Top Bar */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            데이터 업로드
          </h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-6 flex flex-col gap-4">

          {/* 엑셀 업로드 섹션 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                엑셀 업로드
              </span>
              <button
                onClick={handleUploadSave}
                disabled={!pendingFile}
                className="h-7 px-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                업로드 저장
              </button>
            </div>
            <div
              {...getRootProps()}
              className={`w-full cursor-pointer rounded-xl border-2 border-dashed transition-colors duration-200
                ${isDragActive
                  ? "border-brand-500 bg-brand-50 dark:bg-gray-700"
                  : "border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900 hover:border-brand-500 dark:hover:border-brand-500"
                }
              `}
              style={{ aspectRatio: "1920 / 320" }}
            >
              <input {...getInputProps()} />
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <svg width="32" height="32" viewBox="0 0 29 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="fill-current">
                    <path fillRule="evenodd" clipRule="evenodd" d="M14.5019 3.91699C14.2852 3.91699 14.0899 4.00891 13.953 4.15589L8.57363 9.53186C8.28065 9.82466 8.2805 10.2995 8.5733 10.5925C8.8661 10.8855 9.34097 10.8857 9.63396 10.5929L13.7519 6.47752V18.667C13.7519 19.0812 14.0877 19.417 14.5019 19.417C14.9161 19.417 15.2519 19.0812 15.2519 18.667V6.48234L19.3653 10.5929C19.6583 10.8857 20.1332 10.8855 20.426 10.5925C20.7188 10.2995 20.7186 9.82463 20.4256 9.53184L15.0838 4.19378C14.9463 4.02488 14.7367 3.91699 14.5019 3.91699ZM5.91626 18.667C5.91626 18.2528 5.58047 17.917 5.16626 17.917C4.75205 17.917 4.41626 18.2528 4.41626 18.667V21.8337C4.41626 23.0763 5.42362 24.0837 6.66626 24.0837H22.3339C23.5766 24.0837 24.5839 23.0763 24.5839 21.8337V18.667C24.5839 18.2528 24.2482 17.917 23.8339 17.917C23.4197 17.917 23.0839 18.2528 23.0839 18.667V21.8337C23.0839 22.2479 22.7482 22.5837 22.3339 22.5837H6.66626C6.25205 22.5837 5.91626 22.2479 5.91626 21.8337V18.667Z" />
                  </svg>
                </div>
                {pendingFile ? (
                  <span className="text-sm font-medium text-brand-500">{pendingFile.name}</span>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">엑셀 파일 업로드(드래그 앤 드롭)</span>
                )}
              </div>
            </div>
          </div>

          {/* 구분선 */}
          <hr className="border-gray-200 dark:border-gray-700" />

          {/* 데이터 입력 섹션 */}
          <div className="flex flex-col gap-3">
            {/* 섹션 헤더: 레이블(좌) + 제목 입력·수정·저장(우) */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                데이터 입력
              </span>
              <div className="flex items-center gap-1.5">
                {/* Ghost placeholder 제목 입력 */}
                <div
                  className={`relative h-7 w-40 rounded-lg border transition-colors duration-200 overflow-hidden
                    ${isEditing
                      ? "border-brand-500 bg-white dark:bg-gray-900"
                      : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                    }
                  `}
                >
                  <div
                    className="absolute inset-0 flex items-center px-3 text-xs pointer-events-none select-none whitespace-pre"
                    aria-hidden
                  >
                    <span className="invisible">{typedStr}</span>
                    <span className="text-gray-300 dark:text-gray-600">{ghostStr}</span>
                  </div>
                  <input
                    type="text"
                    value={typedStr}
                    onChange={handleTitleChange}
                    onKeyDown={handleTitleKeyDown}
                    disabled={!isEditing}
                    className="absolute inset-0 w-full h-full bg-transparent text-xs text-gray-900 dark:text-white px-3 outline-none disabled:cursor-default"
                  />
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={isEditing}
                  className="h-7 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  수정
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isEditing}
                  className="h-7 px-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  저장
                </button>
              </div>
            </div>

            {/* 표 2단 */}
            <div className="grid grid-cols-2 gap-4">
              <DataTable
                title="전체 결과(로그인 무관)"
                isEditing={isEditing}
                cellData={cellDataLeft}
                onCellChange={makeCellHandler(setCellDataLeft)}
              />
              <DataTable
                title="세부 결과(로그인 이후)"
                isEditing={isEditing}
                cellData={cellDataRight}
                onCellChange={makeCellHandler(setCellDataRight)}
              />
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
