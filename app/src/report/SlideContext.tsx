import { createContext, useContext } from "react";

// 슬라이드를 렌더하는 맥락.
//  - "page"   : 각 메뉴 페이지의 스크롤 영역(16:9 반응형, 편집 컨트롤 노출)
//  - "preview": 메인홈 대시보드 미리보기 / PPTX 캡처용(1920×1080 고정, 편집 컨트롤 숨김)
export type SlideVariant = "page" | "preview";

const SlideVariantContext = createContext<SlideVariant>("page");

export const useSlideVariant = (): SlideVariant =>
  useContext(SlideVariantContext);

/** 자식 슬라이드들을 미리보기(캡처) 모드로 렌더한다. */
export function PreviewVariant({ children }: { children: React.ReactNode }) {
  return (
    <SlideVariantContext.Provider value="preview">
      {children}
    </SlideVariantContext.Provider>
  );
}
