import PageMeta from "../../components/common/PageMeta";

const formattedDate = (() => {
  const now = new Date();
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}`;
})();

export default function Home() {
  return (
    <>
      <PageMeta
        title="광고 리포트 대시보드"
        description="광고 리포트 자동 생성 대시보드"
      />
      <div className="h-full flex flex-col">
        {/* Page Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {formattedDate}
          </h1>
          <button
            onClick={() => {
              /* PDF download logic will be added later */
            }}
            className="flex items-center gap-2 h-8 px-4 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
            aria-label="PDF 다운로드"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 16L7 11H10V4H14V11H17L12 16Z" fill="currentColor" />
              <path d="M20 18H4V20H20V18Z" fill="currentColor" />
            </svg>
            다운로드
          </button>
        </div>

        {/* PDF Preview Area */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800">
          <div className="flex flex-col items-center py-8 px-4 gap-6">

            {[1, 2, 3].map((page) => (
              <div
                key={page}
                className="w-full bg-white dark:bg-gray-900 shadow-md rounded"
                style={{ aspectRatio: "16 / 9" }}
              >
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <svg
                      className="mx-auto mb-3 text-gray-200 dark:text-gray-700"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M7 18H17V16H7V18ZM7 14H17V12H7V14ZM5 22C4.45 22 3.979 21.804 3.587 21.412C3.195 21.02 2.99933 20.5493 3 20V4C3 3.45 3.196 2.979 3.588 2.587C3.98 2.195 4.45067 1.99933 5 2H15L21 8V20C21 20.55 20.804 21.021 20.412 21.413C20.02 21.805 19.5493 22.0007 19 22H5ZM14 9V4H5V20H19V9H14Z" />
                    </svg>
                    <p className="text-sm text-gray-400 dark:text-gray-600">
                      {formattedDate} 광고 리포트 · {page}페이지
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
