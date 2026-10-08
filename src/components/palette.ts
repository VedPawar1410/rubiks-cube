import type { Color } from "@/cube/model";

/** Sticker colours — punchy, toy-like versions of the real cube colours. */
export const HEX: Record<Color, string> = {
  W: "#FFFDF4",
  Y: "#FFD23F",
  R: "#FF4F5E",
  O: "#FF9B3D",
  G: "#2FD38A",
  B: "#3D7BFF",
};

export const BLANK_HEX = "#E7DCCB";

/** Order of the colours in the palette; keys 1–6 pick them. */
export const COLOR_KEYS: Color[] = ["W", "Y", "G", "B", "R", "O"];
