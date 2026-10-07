/**
 * Cube model: 54 stickers ("facelets") stored in one flat array.
 *
 * Faces are stored in the order U R F D L B, 9 stickers each, row by row
 * as you look straight at that face:
 *   - U is viewed from above with the B face at the top edge
 *   - D is viewed from below with the F face at the top edge
 *   - R, F, L, B are viewed from outside with U at the top edge
 *
 *              U0 U1 U2
 *              U3 U4 U5
 *              U6 U7 U8
 *   L0 L1 L2   F0 F1 F2   R0 R1 R2   B0 B1 B2
 *   L3 L4 L5   F3 F4 F5   R3 R4 R5   B3 B4 B5
 *   L6 L7 L8   F6 F7 F8   R6 R7 R8   B6 B7 B8
 *              D0 D1 D2
 *              D3 D4 D5
 *              D6 D7 D8
 */

export type Color = "W" | "Y" | "R" | "O" | "G" | "B";
export type Face = "U" | "R" | "F" | "D" | "L" | "B";
/** A sticker can be blank while the user is still painting. */
export type Sticker = Color | null;
export type CubeState = Color[];

export const FACES: Face[] = ["U", "R", "F", "D", "L", "B"];
export const COLORS: Color[] = ["W", "Y", "G", "B", "R", "O"];

export const faceOffset = (face: Face) => FACES.indexOf(face) * 9;
export const idx = (face: Face, i: number) => faceOffset(face) + i;

/** Standard (Western) colour scheme: white top, green front, red right. */
export const CENTER_COLOR: Record<Face, Color> = {
  U: "W",
  R: "R",
  F: "G",
  D: "Y",
  L: "O",
  B: "B",
};

export const COLOR_NAME: Record<Color, string> = {
  W: "white",
  Y: "yellow",
  R: "red",
  O: "orange",
  G: "green",
  B: "blue",
};

export const SOLVED: CubeState = FACES.flatMap((f) =>
  Array<Color>(9).fill(CENTER_COLOR[f]),
);

/**
 * Sticker indices of each corner, listed clockwise starting from its
 * U/D sticker. This ordering is what lets us measure corner "twist".
 */
export const CORNERS: [number, number, number][] = [
  [idx("U", 8), idx("R", 0), idx("F", 2)], // URF
  [idx("U", 6), idx("F", 0), idx("L", 2)], // UFL
  [idx("U", 0), idx("L", 0), idx("B", 2)], // ULB
  [idx("U", 2), idx("B", 0), idx("R", 2)], // UBR
  [idx("D", 2), idx("F", 8), idx("R", 6)], // DFR
  [idx("D", 0), idx("L", 8), idx("F", 6)], // DLF
  [idx("D", 6), idx("B", 8), idx("L", 6)], // DBL
  [idx("D", 8), idx("R", 8), idx("B", 6)], // DRB
];

/** Sticker indices of each edge; the first sticker is the U/D (or F/B) one. */
export const EDGES: [number, number][] = [
  [idx("U", 5), idx("R", 1)], // UR
  [idx("U", 7), idx("F", 1)], // UF
  [idx("U", 3), idx("L", 1)], // UL
  [idx("U", 1), idx("B", 1)], // UB
  [idx("D", 5), idx("R", 7)], // DR
  [idx("D", 1), idx("F", 7)], // DF
  [idx("D", 3), idx("L", 7)], // DL
  [idx("D", 7), idx("B", 7)], // DB
  [idx("F", 5), idx("R", 3)], // FR
  [idx("F", 3), idx("L", 5)], // FL
  [idx("B", 5), idx("L", 3)], // BL
  [idx("B", 3), idx("R", 5)], // BR
];

export const centerOf = (state: readonly Sticker[], face: Face) =>
  state[idx(face, 4)];

export const isSolved = (state: readonly Sticker[]) =>
  FACES.every((f) => {
    const c = centerOf(state, f);
    return state.slice(faceOffset(f), faceOffset(f) + 9).every((s) => s === c);
  });

/** True when every listed sticker matches the centre of its own face. */
export const inPlace = (state: readonly Sticker[], stickers: readonly number[]) =>
  stickers.every((i) => state[i] === state[Math.floor(i / 9) * 9 + 4]);

/** The other sticker(s) on the same physical piece as sticker `i`. */
export function pieceOf(i: number): number[] {
  for (const c of CORNERS) if (c.includes(i)) return c;
  for (const e of EDGES) if (e.includes(i)) return e;
  return [i];
}
