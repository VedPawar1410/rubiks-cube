import { COLOR_NAME, CORNERS, EDGES, idx, inPlace, type Color, type Face } from "@/cube/model";
import { DEST, FACE_MOVES, type Move } from "@/cube/moves";
import { D_TURNS, SolveContext, Y_TURNS } from "../context";

/** Stage 0 — hold the cube with the white centre on top. */
export function orient(ctx: SolveContext) {
  ctx.beginStage(0, "Hold the cube", "Hold the cube with the white centre on top.");
  const whiteFace = (["U", "F", "B", "R", "L", "D"] as Face[]).find((f) => ctx.center(f) === "W")!;
  const turn: Record<Face, string> = { U: "", F: "x", B: "x'", R: "z'", L: "z", D: "x2" };
  ctx.step("Turn the whole cube so white is on top", turn[whiteFace]);
}

// ── Stage 1: the white cross ──────────────────────────────────────────────

const CROSS_TARGET: [Face, number][] = [["F", 7], ["R", 5], ["B", 1], ["L", 3]]; // side face → U sticker

/** Sticker index of the white sticker on the white-`side` edge. */
function whiteStickerOf(ctx: SolveContext, side: Color): number {
  for (const [a, b] of EDGES) {
    const [ca, cb] = [ctx.state[a], ctx.state[b]];
    if (ca === "W" && cb === side) return a;
    if (cb === "W" && ca === side) return b;
  }
  throw new Error(`White-${side} edge not found`);
}

/**
 * Breadth-first search over just the white stickers we care about. The state
 * is "where is each tracked white sticker" — at most 24·22·20·18 ≈ 190k
 * states, so the search is instant and finds the shortest way to place the
 * new edge without disturbing the ones already placed.
 */
function shortestPath(start: number[], goal: number[]): Move[] {
  const encode = (a: number[]) => a.reduce((k, v) => k * 54 + v, 0);
  const goalKey = encode(goal);
  if (encode(start) === goalKey) return [];
  const prev = new Map<number, [number, Move]>([[encode(start), [-1, ""]]]);
  let frontier = [start];
  while (frontier.length) {
    const next: number[][] = [];
    for (const s of frontier) {
      const sk = encode(s);
      for (const m of FACE_MOVES) {
        const t = s.map((i) => DEST[m][i]);
        const tk = encode(t);
        if (prev.has(tk)) continue;
        prev.set(tk, [sk, m]);
        if (tk === goalKey) {
          const path: Move[] = [];
          for (let k = tk; prev.get(k)![0] !== -1; k = prev.get(k)![0]) path.unshift(prev.get(k)![1]);
          return path;
        }
        next.push(t);
      }
    }
    frontier = next;
  }
  throw new Error("Cross search failed");
}

export function whiteCross(ctx: SolveContext) {
  ctx.beginStage(
    1,
    "The white cross",
    "Make a white cross on top. Each white edge's other colour must also match the centre next to it.",
  );
  // White-sticker targets of edges already placed (they stay put between searches).
  const placed: number[] = [];
  let todo = CROSS_TARGET.map(([face, u]) => ({ color: ctx.center(face), target: idx("U", u) }));

  while (todo.length) {
    // Greedy: place whichever remaining edge is quickest to place next.
    const options = todo.map((e) => ({
      e,
      path: shortestPath([...placed, whiteStickerOf(ctx, e.color)], [...placed, e.target]),
    }));
    options.sort((a, b) => a.path.length - b.path.length);
    const { e, path } = options[0];
    const name = COLOR_NAME[e.color];
    ctx.step(
      path.length ? `Bring the white–${name} edge up so white is on top and ${name} meets the ${name} centre` : `The white–${name} edge is already in place`,
      path,
    );
    placed.push(e.target);
    todo = todo.filter((t) => t !== e);
  }
}

// ── Stage 2: the white corners ────────────────────────────────────────────

const URF = 0;
const DFR = 4;
const POP_OUT: Record<number, string> = { 0: "R' D' R", 1: "L D L'", 2: "L' D L", 3: "R D R'" };

const sameSet = (a: Color[], b: Color[]) => a.every((x) => b.includes(x));
const colorsAt = (ctx: SolveContext, slot: number) => CORNERS[slot].map((i) => ctx.state[i]);
const cornerSlotOf = (ctx: SolveContext, colors: Color[]) =>
  CORNERS.findIndex((_, k) => sameSet(colors, colorsAt(ctx, k)));

export function whiteCorners(ctx: SolveContext) {
  ctx.beginStage(
    2,
    "The white corners",
    "Fill in the four white corners so the whole top layer is solved — white on top and every side colour lining up.",
  );

  for (let n = 0; ; n++) {
    ctx.guard(n, "white corners");
    // The white corners not yet solved, as their colours (e.g. W, G, R).
    const todo = [0, 1, 2, 3]
      .filter((k) => !inPlace(ctx.state, CORNERS[k]))
      .map((k) => ["W", ...CORNERS[k].slice(1).map((i) => ctx.state[Math.floor(i / 9) * 9 + 4])] as Color[]);
    if (!todo.length) return;
    // Prefer a corner that is already down in the bottom layer.
    todo.sort((a, b) => Number(cornerSlotOf(ctx, a) < 4) - Number(cornerSlotOf(ctx, b) < 4));
    const colors = todo[0];
    const label = colors.slice(1).map((c) => COLOR_NAME[c]).join("–");

    // 1. Turn the cube so this corner's home is at front-right-top.
    const yTurn = ctx.find(Y_TURNS, (s) => sameSet(colors, [s[idx("U", 4)], s[idx("F", 4)], s[idx("R", 4)]]))!;
    ctx.step(`Turn the cube so the white–${label} corner's home is at the front-right`, yTurn);

    // 2. If the corner is stuck in the top layer, kick it down to the bottom.
    const slot = cornerSlotOf(ctx, colors);
    if (slot < 4) {
      ctx.step(
        slot === URF ? "It's in the right spot but twisted — kick it down first" : "It's stuck in the wrong top slot — kick it down first",
        POP_OUT[slot],
      );
    }

    // 3. Turn the bottom until the corner sits right under its home.
    const dTurn = ctx.find(D_TURNS, (s) => sameSet(colors, CORNERS[DFR].map((i) => s[i])))!;
    ctx.step("Turn the bottom so the corner is right under its slot", dTurn);

    // 4. Insert it — which algorithm depends on where the white sticker faces.
    if (ctx.at("F", 8) === "W") ctx.step("White faces front", "F D F'", "F D F'");
    else if (ctx.at("R", 6) === "W") ctx.step("White faces right", "R' D' R", "R' D' R");
    else ctx.step("White faces down", "R' D R F D2 F'", "R' D R F D2 F'");
  }
}
