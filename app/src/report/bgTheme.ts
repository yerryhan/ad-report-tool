// 표지/장표지/종표지의 메시 그라데이션 배경(PNG)을 컬러 테마에 맞춰 재색.
// 원본 PNG는 한국MSD 청록(#009484) 기준으로 제작됨. 선택된 테마 main 색상의
// 색상(hue)과 원본 청록 hue의 차이만큼 hue-rotate 시켜 배경을 물들인다.
// - 미리보기(HTML): CSS filter: hue-rotate
// - PPTX: canvas ctx.filter = hue-rotate 로 데이터URL 재생성
// 두 경로 모두 동일한 SVG hue-rotate 매트릭스를 쓰므로 결과가 일치한다.

// 원본 배경 PNG가 제작된 기준 색(한국MSD 청록).
const BASE_HEX = "009484";

/** hex(#유무 무관) → HSL 색상값(0~360). 무채색이면 0. */
export function hueOf(hexInput: string): number {
  const h = hexInput.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let hue: number;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue *= 60;
  return hue < 0 ? hue + 360 : hue;
}

/** 테마 main 색상에 맞춰 배경 PNG에 적용할 hue-rotate 각도(도, -180~180). */
export function bgHueRotateDeg(themeMain: string): number {
  let deg = hueOf(themeMain) - hueOf(BASE_HEX);
  // -180~180 범위로 정규화(최단 회전).
  deg = ((deg % 360) + 540) % 360 - 180;
  return Math.round(deg);
}

/** 배경 PNG 데이터URL을 hue-rotate 시켜 재색된 데이터URL을 반환(canvas). */
export function recolorBgDataUrl(dataUrl: string, deg: number): Promise<string> {
  if (!deg) return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.filter = `hue-rotate(${deg}deg)`;
      ctx.drawImage(img, 0, 0);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
