import {
  COLOR_NAME,
  COLORS,
  CORNERS,
  EDGES,
  FACES,
  type Color,
  type CubeState,
  type Sticker,
} from "./model";

/**
 * Checks a painted cube is a real, solvable cube.
 *
 * Having 9 of each colour is not enough. A real cube also obeys three
 * invariants that no sequence of turns can break:
 *   1. corner twists add up to a multiple of 3
 *   2. edge flips add up to a multiple of 2
 *   3. corner and edge permutations have the same parity
 * If a painted cube breaks one, it's a painting mistake (or the cube was
 * taken apart), and the solver would never finish.
 */

export interface ValidationError {
  message: string;
  /** Sticker indices to highlight in the painter. */
  stickers: number[];
}

export type ValidationResult =
  | { ok: true; state: CubeState }
  | { ok: false; errors: ValidationError[] };

const faceOf = (i: number) => FACES[Math.floor(i / 9)];
const names = (cs: Color[]) => cs.map((c) => COLOR_NAME[c]).join("-");

/** Parity of a permutation: 0 = even, 1 = odd. */
function parity(perm: number[]): number {
  const seen = new Array(perm.length).fill(false);
  let swaps = 0;
  for (let i = 0; i < perm.length; i++) {
    let len = 0;
    for (let j = i; !seen[j]; j = perm[j]) {
      seen[j] = true;
      len++;
    }
    if (len) swaps += len - 1;
  }
  return swaps % 2;
}

export function validate(stickers: readonly Sticker[]): ValidationResult {
  const errors: ValidationError[] = [];

  const blanks = stickers.flatMap((s, i) => (s ? [] : [i]));
  if (blanks.length) {
    return {
      ok: false,
      errors: [{
        message: `${blanks.length} sticker${blanks.length > 1 ? "s are" : " is"} still blank.`,
        stickers: blanks,
      }],
    };
  }
  const state = stickers as Color[];

  for (const c of COLORS) {
    const where = state.flatMap((s, i) => (s === c ? [i] : []));
    if (where.length !== 9) {
      errors.push({
        message: `There are ${where.length} ${COLOR_NAME[c]} stickers — a cube has exactly 9.`,
        stickers: where.length > 9 ? where : [],
      });
    }
  }
  if (errors.length) return { ok: false, errors };

  // Which colour belongs to which face, taken from the centres.
  const center = Object.fromEntries(FACES.map((f, k) => [f, state[k * 9 + 4]]));
  if (new Set(Object.values(center)).size !== 6) {
    return {
      ok: false,
      errors: [{ message: "Two centres have the same colour.", stickers: FACES.map((_, k) => k * 9 + 4) }],
    };
  }

  // The colours each corner/edge *should* have, in sticker order.
  const cornerRef = CORNERS.map((c) => c.map((i) => center[faceOf(i)]));
  const edgeRef = EDGES.map((e) => e.map((i) => center[faceOf(i)]));
  const sameSet = (a: Color[], b: Color[]) =>
    a.length === b.length && a.every((x) => b.includes(x));

  // Corners: which piece sits in each slot, and how it's twisted.
  const cornerPerm: number[] = [];
  let twist = 0;
  for (const slot of CORNERS) {
    const cols = slot.map((i) => state[i]);
    const piece = cornerRef.findIndex((ref) => sameSet(ref, cols));
    if (piece < 0) {
      errors.push({ message: `A ${names(cols)} corner can't exist on a real cube.`, stickers: slot });
      continue;
    }
    // Twist = how far round the U/D colour has turned (0, 1 or 2).
    const ori = cols.findIndex((c) => c === center.U || c === center.D);
    const rotated = [0, 1, 2].map((n) => cols[(n + ori) % 3]);
    if (rotated.join() !== cornerRef[piece].join()) {
      errors.push({ message: `The ${names(cols)} corner looks mirrored — two of its stickers are swapped.`, stickers: slot });
      continue;
    }
    cornerPerm.push(piece);
    twist += ori;
  }

  // Edges: which piece sits in each slot, and whether it's flipped.
  const edgePerm: number[] = [];
  let flip = 0;
  for (const slot of EDGES) {
    const cols = slot.map((i) => state[i]);
    const piece = edgeRef.findIndex((ref) => sameSet(ref, cols));
    if (piece < 0) {
      errors.push({ message: `A ${names(cols)} edge can't exist on a real cube.`, stickers: slot });
      continue;
    }
    edgePerm.push(piece);
    flip += cols[0] === edgeRef[piece][0] ? 0 : 1;
  }
  if (errors.length) return { ok: false, errors };

  const dupes = (perm: number[], slots: number[][]) =>
    perm.flatMap((p, k) => (perm.indexOf(p) !== k ? [slots[k]] : []));
  for (const slot of dupes(cornerPerm, CORNERS)) {
    errors.push({ message: `The ${names(slot.map((i) => state[i]))} corner appears twice.`, stickers: slot });
  }
  for (const slot of dupes(edgePerm, EDGES)) {
    errors.push({ message: `The ${names(slot.map((i) => state[i]))} edge appears twice.`, stickers: slot });
  }
  if (errors.length) return { ok: false, errors };

  if (twist % 3 !== 0) {
    errors.push({
      message: "One corner looks twisted in place. Re-check the corner stickers — this can't happen by turning.",
      stickers: [],
    });
  }
  if (flip % 2 !== 0) {
    errors.push({
      message: "One edge looks flipped in place. Re-check the edge stickers — this can't happen by turning.",
      stickers: [],
    });
  }
  if (parity(cornerPerm) !== parity(edgePerm)) {
    errors.push({
      message: "Two pieces look swapped. Re-check that each face was painted the right way up.",
      stickers: [],
    });
  }

  return errors.length ? { ok: false, errors } : { ok: true, state };
}
