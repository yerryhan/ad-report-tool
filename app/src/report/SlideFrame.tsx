import { SlideScaler } from "../components/cover/ReportCovers";
import { useSlideVariant } from "./SlideContext";

// 콘텐츠 슬라이드 1장의 공통 프레임.
// 같은 자식(제목 블록 + 본문)을 두 가지 맥락에서 동일하게 렌더한다.
//  - page   : w-full + aspectRatio 16:9 (메뉴 페이지 스크롤 영역에 쌓임)
//  - preview : SlideScaler 안의 1920×1080 고정 박스(미리보기/캡처). data-export-slide
//              속성으로 표시해 PPTX 내보내기 시 html-to-image 대상이 된다.
export function SlideFrame({
  title,
  border = "b",
  children,
}: {
  /** PPTX/미리보기 식별용 제목 */
  title: string;
  /** page 변형에서 슬라이드 구분선 위치 */
  border?: "b" | "t" | "none";
  children: React.ReactNode;
}) {
  const variant = useSlideVariant();

  if (variant === "preview") {
    return (
      <SlideScaler>
        <div
          data-export-slide=""
          data-export-title={title}
          className="flex flex-col p-24 bg-white font-nanum"
          style={{ width: 1920, height: 1080 }}
        >
          {children}
        </div>
      </SlideScaler>
    );
  }

  const borderClass =
    border === "b"
      ? "border-b border-gray-200 dark:border-gray-700"
      : border === "t"
      ? "border-t border-gray-200 dark:border-gray-700"
      : "";

  return (
    <div
      className={`w-full flex flex-col p-8 bg-white dark:bg-gray-800 ${borderClass}`}
      style={{ aspectRatio: "16 / 9" }}
    >
      {children}
    </div>
  );
}

// 표지/장표지/종표지 등 자체적으로 1920×1080을 그리는 슬라이드를 미리보기 카드 +
// 캡처 대상으로 감싸는 프레임.
export function CoverFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <SlideScaler>
      <div
        data-export-slide=""
        data-export-title={title}
        style={{ width: 1920, height: 1080 }}
      >
        {children}
      </div>
    </SlideScaler>
  );
}
