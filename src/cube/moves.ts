import { FACES, type Face } from "./model";

/**
 * Move engine.
 *
 * Every sticker gets a 3D position (the cubie it sits on, each coordinate
 * in -1..1) and an outward normal. Axes: x → R, y → U, z → F.
 * A move rotates every sticker in a layer by 90° about that layer's axis;
 * we then look up which sticker index landed where. That produces a
 * permutation per move without hand-typing any tables.
 */

export type Vec = [number, number, number];

export const NORMAL: Record<Face, Vec> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  R: [1, 0, 0],
  L: [-1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
};

/** Cubie position of sticker (row r, col c) on a face — see model.ts diagram. */
function stickerPos(face: Face, r: number, c: number): Vec {
  switch (face) {
    case "U": return [c - 1, 1, r - 1];
    case "D": return [c - 1, -1, 1 - r];
    case "F": return [c - 1, 1 - r, 1];
    case "B": return [1 - c, 1 - r, -1];
    case "R": return [1, 1 - r, 1 - c];
    case "L": return [-1, 1 - r, c - 1];
  }
}

export interface StickerGeom {
  pos: Vec;
  normal: Vec;
}

/** 3D placement of all 54 stickers, indexed like the cube state. */
export const STICKERS: StickerGeom[] = FACES.flatMap((face) =>
  Array.from({ length: 9 }, (_, i) => ({
    pos: stickerPos(face, Math.floor(i / 3), i % 3),
    normal: NORMAL[face],
  })),
);

const key = (p: Vec, n: Vec) => `${p}|${n}`;
const LOOKUP = new Map(STICKERS.map((s, i) => [key(s.pos, s.normal), i]));

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/**
 * Rotate v by -90° about unit axis a: a clockwise quarter turn when
 * looking at the face from outside (Rodrigues' formula with cos=0, sin=-1).
 */
function turnCW(v: Vec, a: Vec): Vec {
  const c = cross(a, v);
  const d = dot(a, v);
  return [-c[0] + d * a[0], -c[1] + d * a[1], -c[2] + d * a[2]];
}

/**
 * `from` table: after the move, sticker j shows what sticker from[j] showed.
 * `inLayer` decides which stickers turn (one face layer, or the whole cube).
 */
function buildQuarterTurn(axis: Vec, inLayer: (p: Vec) => boolean): number[] {
  const from = new Array<number>(54);
  STICKERS.forEach((s, i) => {
    if (!inLayer(s.pos)) {
      from[i] = i;
      return;
    }
    const j = LOOKUP.get(key(turnCW(s.pos, axis), turnCW(s.normal, axis)))!;
    from[j] = i;
  });
  return from;
}

const compose = (a: number[], b: number[]) => b.map((k) => a[k]); // a then b

/** Base clockwise quarter turns: 6 faces + whole-cube rotations x, y, z. */
const BASE: Record<string, number[]> = {};
for (const f of FACES) {
  BASE[f] = buildQuarterTurn(NORMAL[f], (p) => dot(p, NORMAL[f]) === 1);
}
BASE.x = buildQuarterTurn(NORMAL.R, () => true); // turns like R
BASE.y = buildQuarterTurn(NORMAL.U, () => true); // turns like U
BASE.z = buildQuarterTurn(NORMAL.F, () => true); // turns like F

/** Full move table: "R", "R'", "R2", "y", "y'", "x2", ... */
export const MOVES: Record<string, number[]> = {};
for (const [name, q] of Object.entries(BASE)) {
  const half = compose(q, q);
  MOVES[name] = q;
  MOVES[name + "2"] = half;
  MOVES[name + "'"] = compose(half, q);
}

export const FACE_MOVES = FACES.flatMap((f) => [f, f + "'", f + "2"]);

export type Move = string;

/** "R U R' U'" → ["R","U","R'","U'"]. */
export const parse = (alg: string): Move[] =>
  alg
    .replace(/[()]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

export function applyMove<T>(state: readonly T[], move: Move): T[] {
  const from = MOVES[move];
  if (!from) throw new Error(`Unknown move: ${move}`);
  return from.map((k) => state[k]);
}

export const applyMoves = <T>(state: readonly T[], moves: Move[] | string) =>
  (typeof moves === "string" ? parse(moves) : moves).reduce<T[]>(
    (s, m) => applyMove(s, m),
    [...state],
  );

/** Where does sticker `i` end up after `move`? (inverse of the `from` table) */
export const DEST: Record<string, number[]> = Object.fromEntries(
  Object.entries(MOVES).map(([m, from]) => {
    const dest = new Array<number>(54);
    from.forEach((src, j) => (dest[src] = j));
    return [m, dest];
  }),
);

export function invertMove(m: Move): Move {
  if (m.endsWith("2")) return m;
  if (m.endsWith("'")) return m.slice(0, -1);
  return m + "'";
}

export const invert = (moves: Move[]) => [...moves].reverse().map(invertMove);

/** Scramble of face turns, never the same face twice in a row. */
export function randomScramble(length = 25, rand = Math.random): Move[] {
  const out: Move[] = [];
  while (out.length < length) {
    const m = FACE_MOVES[Math.floor(rand() * FACE_MOVES.length)];
    if (out.length && out[out.length - 1][0] === m[0]) continue;
    out.push(m);
  }
  return out;
}
