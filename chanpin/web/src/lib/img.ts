/** 原型图片统一走 picsum seed，气质靠统一裁切与轻微降饱和（见 globals.css .photo） */
export function pic(seed: string, w: number, h: number): string {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

let regenSeq = 0;
/** 后台「换一批示例图」：换 seed 就换图 */
export function regenSeed(base: string): string {
  regenSeq += 1;
  return `${base}-${Date.now().toString(36)}-${regenSeq}`;
}
