import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import PageMeta from "../../components/common/PageMeta";
import { isGadaFile, parseGadaExcel } from "../../utils/gadaExcelParser";
import { isDisplayAdFile, parseDisplayAdExcel } from "../../utils/displayAdExcelParser";
import { useGadaData } from "../../context/GadaDataContext";
import type { GadaExcelData, DisplayAdData } from "../../types/gada";

type ItemStatus = "대기" | "성공" | "실패";

type PendingItem = {
  id: string;
  file: File;
  isGada: boolean;
  isDisplay: boolean;
  isParsing: boolean;
  parsed: GadaExcelData | null;
  parsedDisplay: DisplayAdData | null;
  parseError: string | null;
  status: ItemStatus;
};

// 파싱 결과 미리보기 카드
function GadaParsePreview({ data }: { data: GadaExcelData }) {
  const totalReservations = data.reservations.length;
  const totalCompanies = data.companyStats.length;
  const totalHospitals =
    data.mainHospitals.length + (data.otherHospitals.length > 0 ? 1 : 0);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M10 3L5 9L2 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
          가다실 {data.month}월 통계 파싱 완료
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "예약 건수", value: `${totalReservations}건` },
          { label: "고객사 수", value: `${totalCompanies}개` },
          { label: "예약 병원", value: `${totalHospitals}개` },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 text-center"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
            <p className="mt-0.5 text-base font-bold text-gray-800 dark:text-white">
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        * 성명은 가운데 글자 마스킹, 생년월일은 연도만 보존 처리 완료
      </p>
    </div>
  );
}

// 디스플레이 광고 데이터 파싱 결과 미리보기 카드
function DisplayAdParsePreview({ data }: { data: DisplayAdData }) {
  const sum = (arr: { male: number; female: number }[]) =>
    arr.reduce(
      (acc, e) => ({ male: acc.male + e.male, female: acc.female + e.female }),
      { male: 0, female: 0 }
    );
  const pkg = sum(data.packageMonthly);
  const add = sum(data.additionalMonthly);
  const placements = data.totalVisit.rows.length;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M10 3L5 9L2 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
          디스플레이 광고 현황 데이터 파싱 완료
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "광고 지면", value: `${placements}개` },
          { label: "패키지 누적(남/여)", value: `${pkg.male}/${pkg.female}` },
          { label: "추가항목 누적(남/여)", value: `${add.male}/${add.female}` },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 text-center"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
            <p className="mt-0.5 text-base font-bold text-gray-800 dark:text-white">
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        * 월별 남성/여성(검진유형 패키지·선택 추가항목) 수치가 기업체별 마케팅 현황 표에 자동 입력됩니다
      </p>
    </div>
  );
}

function statusColor(status: ItemStatus): string {
  if (status === "성공") return "text-green-500";
  if (status === "실패") return "text-red-500";
  return "text-amber-500";
}

export default function DataUpload() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const { setGadaData, setDisplayAdData, addUploadLog } = useGadaData();

  // ── 드롭존: xlsx 허용, 드롭 즉시 인식 가능한 파일은 브라우저 메모리에서 파싱 ──
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const newItems: PendingItem[] = acceptedFiles.map((file) => {
      const gada = isGadaFile(file.name);
      const display = !gada && isDisplayAdFile(file.name);
      return {
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        isGada: gada,
        isDisplay: display,
        isParsing: gada || display,
        parsed: null,
        parsedDisplay: null,
        parseError: null,
        status: "대기" as ItemStatus,
      };
    });

    setItems((prev) => [...prev, ...newItems]);

    const onParseError = (id: string) => (err: unknown) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                parseError:
                  "파싱 실패: " +
                  (err instanceof Error ? err.message : String(err)),
                isParsing: false,
              }
            : it
        )
      );
    };

    // 인식된 파일은 비동기 파싱 후 해당 항목만 갱신
    for (const item of newItems) {
      if (item.isGada) {
        parseGadaExcel(item.file)
          .then((parsed) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === item.id ? { ...it, parsed, isParsing: false } : it
              )
            );
          })
          .catch(onParseError(item.id));
      } else if (item.isDisplay) {
        parseDisplayAdExcel(item.file)
          .then((parsedDisplay) => {
            setItems((prev) =>
              prev.map((it) =>
                it.id === item.id ? { ...it, parsedDisplay, isParsing: false } : it
              )
            );
          })
          .catch(onParseError(item.id));
      }
    }
  }, []);

  const handleUploadSave = () => {
    const pending = items.filter((it) => it.status === "대기" && !it.isParsing);
    if (pending.length === 0) return;

    let lastGada: GadaExcelData | null = null;
    let lastGadaName: string | null = null;
    let lastDisplay: DisplayAdData | null = null;
    const result = new Map<string, ItemStatus>();

    for (const it of pending) {
      if (it.isGada) {
        if (it.parsed) {
          lastGada = it.parsed;
          lastGadaName = it.file.name;
          addUploadLog(it.file.name, "success", "admin");
          result.set(it.id, "성공");
        } else {
          addUploadLog(it.file.name, "fail", "admin");
          result.set(it.id, "실패");
        }
      } else if (it.isDisplay) {
        if (it.parsedDisplay) {
          lastDisplay = it.parsedDisplay;
          addUploadLog(it.file.name, "success", "admin");
          result.set(it.id, "성공");
        } else {
          addUploadLog(it.file.name, "fail", "admin");
          result.set(it.id, "실패");
        }
      } else {
        // 인식 못 한 파일: 현재 파서 미구현 → 업로드 자체는 성공 처리
        addUploadLog(it.file.name, "success", "admin");
        result.set(it.id, "성공");
      }
    }

    if (lastGada) setGadaData(lastGada, lastGadaName);
    if (lastDisplay) setDisplayAdData(lastDisplay);
    setItems((prev) =>
      prev.map((it) => (result.has(it.id) ? { ...it, status: result.get(it.id)! } : it))
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: true,
  });

  // 박스에는 가장 최근 인식 파일(가다실/디스플레이)의 파싱 상태/통계를 표시
  const latestParsable =
    [...items].reverse().find((it) => it.isGada || it.isDisplay) ?? null;
  const hasActionable = items.some((it) => it.status === "대기" && !it.isParsing);

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
                disabled={!hasActionable}
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
            >
              <input {...getInputProps()} />
              <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 px-6 py-5">
                {latestParsable?.isParsing ? (
                  <>
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      파일 분석 중…
                    </span>
                  </>
                ) : latestParsable?.parsed ? (
                  <GadaParsePreview data={latestParsable.parsed} />
                ) : latestParsable?.parsedDisplay ? (
                  <DisplayAdParsePreview data={latestParsable.parsedDisplay} />
                ) : latestParsable?.parseError ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-red-500">
                      {latestParsable.parseError}
                    </span>
                    <span className="text-xs text-gray-400">
                      다시 파일을 드래그하거나 클릭해서 선택하세요
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 29 28"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="fill-current"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M14.5019 3.91699C14.2852 3.91699 14.0899 4.00891 13.953 4.15589L8.57363 9.53186C8.28065 9.82466 8.2805 10.2995 8.5733 10.5925C8.8661 10.8855 9.34097 10.8857 9.63396 10.5929L13.7519 6.47752V18.667C13.7519 19.0812 14.0877 19.417 14.5019 19.417C14.9161 19.417 15.2519 19.0812 15.2519 18.667V6.48234L19.3653 10.5929C19.6583 10.8857 20.1332 10.8855 20.426 10.5925C20.7188 10.2995 20.7186 9.82463 20.4256 9.53184L15.0838 4.19378C14.9463 4.02488 14.7367 3.91699 14.5019 3.91699ZM5.91626 18.667C5.91626 18.2528 5.58047 17.917 5.16626 17.917C4.75205 17.917 4.41626 18.2528 4.41626 18.667V21.8337C4.41626 23.0763 5.42362 24.0837 6.66626 24.0837H22.3339C23.5766 24.0837 24.5839 23.0763 24.5839 21.8337V18.667C24.5839 18.2528 24.2482 17.917 23.8339 17.917C23.4197 17.917 23.0839 18.2528 23.0839 18.667V21.8337C23.0839 22.2479 22.7482 22.5837 22.3339 22.5837H6.66626C6.25205 22.5837 5.91626 22.2479 5.91626 21.8337V18.667Z"
                        />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        엑셀 파일 업로드 (드래그 앤 드롭 · 여러 개 가능)
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                        지원 형식: .xlsx, .xls
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 업로드 대기 파일 리스트 */}
            {items.length > 0 && (
              <>
                <hr className="border-gray-200 dark:border-gray-700" />
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    업로드 대기
                  </span>
                  <ul className="flex flex-col gap-1.5">
                    {items.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          className="shrink-0 text-gray-400"
                        >
                          <path
                            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M14 2v6h6"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {it.file.name}
                        </span>
                        <span
                          className={`ml-auto shrink-0 text-[11px] font-medium ${statusColor(it.status)}`}
                        >
                          {it.isParsing ? "분석 중" : it.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
