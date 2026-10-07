import { describe, expect, it } from "vitest";
import { CORNERS, EDGES, idx, inPlace, isSolved, SOLVED, type CubeState } from "@/cube/model";
import { applyMoves, applyMove, randomScramble } from "@/cube/moves";
import { validate } from "@/cube/validate";
import { solveBeginner } from "./beginner";

/** Small seeded RNG so failures are reproducible. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const all = (s: CubeState, pieces: number[][]) => pieces.every((p) => inPlace(s, p));

/** What must be true once each stage finishes. */
const INVARIANT: Record<number, (s: CubeState) => boolean> = {
  1: (s) => all(s, EDGES.slice(0, 4)),
  2: (s) => all(s, [...EDGES.slice(0, 4), ...CORNERS.slice(0, 4)]),
  3: (s) => all(s, [...EDGES.slice(4), ...CORNERS.slice(4)]), // white layer now on D
  4: (s) => [1, 3, 5, 7].every((i) => s[idx("U", i)] === s[idx("U", 4)]),
  5: (s) => all(s, EDGES),
  7: isSolved,
};

describe("beginner solver", () => {
  it("handles an already solved cube", () => {
    expect(solveBeginner(SOLVED).moveCount).toBe(0);
  });

  it("solves 5,000 random scrambles, every stage keeping its promise", () => {
    const rand = mulberry32(42);
    let longest = 0;
    let total = 0;
    for (let n = 0; n < 5000; n++) {
      const scrambled = applyMoves(SOLVED, randomScramble(25, rand));
      const solution = solveBeginner(scrambled);

      let state = scrambled;
      for (const stage of solution.stages) {
        for (const step of stage.steps) state = step.moves.reduce(applyMove, state);
        const check = INVARIANT[stage.id];
        if (check && !check(state)) throw new Error(`Stage ${stage.id} broke on scramble #${n}`);
      }
      expect(isSolved(state)).toBe(true);
      longest = Math.max(longest, solution.moveCount);
      total += solution.moveCount;
    }
    console.log(`avg ${Math.round(total / 5000)} moves, longest ${longest}`);
  }, 60_000);
});

describe("validation", () => {
  const swap = (s: CubeState, a: number, b: number) => {
    const t = [...s];
    [t[a], t[b]] = [t[b], t[a]];
    return t;
  };

  it("accepts solved and scrambled cubes", () => {
    expect(validate(SOLVED).ok).toBe(true);
    expect(validate(applyMoves(SOLVED, randomScramble())).ok).toBe(true);
  });

  it("rejects blanks and wrong colour counts", () => {
    expect(validate([...SOLVED.slice(0, 53), null]).ok).toBe(false);
    expect(validate(["R", ...SOLVED.slice(1)]).ok).toBe(false);
  });

  it("rejects a flipped edge", () => {
    const [a, b] = EDGES[1];
    expect(validate(swap(SOLVED, a, b)).ok).toBe(false);
  });

  it("rejects a twisted corner", () => {
    const [a, b, c] = CORNERS[0];
    const t = [...SOLVED];
    [t[a], t[b], t[c]] = [SOLVED[c], SOLVED[a], SOLVED[b]];
    expect(validate(t).ok).toBe(false);
  });

  it("rejects two swapped edges (parity)", () => {
    let s = SOLVED;
    for (const k of [0, 1]) s = swap(s, EDGES[0][k], EDGES[1][k]);
    const result = validate(s);
    expect(result.ok).toBe(false);
  });
});
