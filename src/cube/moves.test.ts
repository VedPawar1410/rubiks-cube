import { describe, expect, it } from "vitest";
import { idx, isSolved, SOLVED } from "./model";
import { applyMoves, FACE_MOVES, invert, MOVES, randomScramble } from "./moves";

describe("move engine", () => {
  it("every move is a permutation of 54 stickers", () => {
    for (const from of Object.values(MOVES)) {
      expect(new Set(from).size).toBe(54);
    }
  });

  it("four quarter turns are the identity", () => {
    for (const m of ["U", "R", "F", "D", "L", "B", "x", "y", "z"]) {
      expect(applyMoves(SOLVED, [m, m, m, m])).toEqual(SOLVED);
    }
  });

  it("a move followed by its inverse is the identity", () => {
    for (const m of FACE_MOVES) {
      expect(applyMoves(SOLVED, [m, ...invert([m])])).toEqual(SOLVED);
    }
  });

  it("(R U) has order 105 and the sexy move has order 6", () => {
    const ru = Array(105).fill("R U").join(" ");
    expect(applyMoves(SOLVED, ru)).toEqual(SOLVED);
    expect(isSolved(applyMoves(SOLVED, "R U"))).toBe(false);
    expect(applyMoves(SOLVED, Array(6).fill("R U R' U'").join(" "))).toEqual(SOLVED);
  });

  it("turns go in the conventional clockwise direction", () => {
    // F: the bottom row of U gets the colour from L (orange)
    const f = applyMoves(SOLVED, "F");
    expect([6, 7, 8].map((i) => f[idx("U", i)])).toEqual(["O", "O", "O"]);
    // R: the right column of U gets the colour from F (green)
    const r = applyMoves(SOLVED, "R");
    expect([2, 5, 8].map((i) => r[idx("U", i)])).toEqual(["G", "G", "G"]);
    // U: the top row of F gets the colour from R (red)
    const u = applyMoves(SOLVED, "U");
    expect([0, 1, 2].map((i) => u[idx("F", i)])).toEqual(["R", "R", "R"]);
    // D: the bottom row of F gets the colour from L (orange)
    const d = applyMoves(SOLVED, "D");
    expect([6, 7, 8].map((i) => d[idx("F", i)])).toEqual(["O", "O", "O"]);
  });

  it("whole-cube rotations move the centres", () => {
    const y = applyMoves(SOLVED, "y"); // like U: front gets right's centre
    expect(y[idx("F", 4)]).toBe("R");
    const x = applyMoves(SOLVED, "x"); // like R: top gets front's centre
    expect(x[idx("U", 4)]).toBe("G");
  });

  it("scrambles followed by their inverse return to solved", () => {
    for (let n = 0; n < 50; n++) {
      const s = randomScramble();
      expect(applyMoves(SOLVED, [...s, ...invert(s)])).toEqual(SOLVED);
    }
  });
});
