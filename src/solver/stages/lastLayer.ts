import { CORNERS, idx, isSolved, type Color, type CubeState, type Face } from "@/cube/model";
import { applyMoves, type Move } from "@/cube/moves";
import { combos, SolveContext, U_TURNS, Y_TURNS } from "../context";

// The algorithms from solvethecube.com, step by step.
const LINE = "F R U R' U' F'";
const ELL = "F U R U' R' F'";
const SUNE = "U R U R' U R U2 R'";
const CORNER_CYCLE = "U R U' L' U R' U' L";
const TWIST = "R' D' R D";

const SIDES: Face[] = ["F", "R", "B", "L"];
const SIDE_NAME: Record<Face, string> = { F: "front", R: "right", B: "back", L: "left", U: "top", D: "bottom" };
const topIs = (s: CubeState, i: number) => s[idx("U", i)] === s[idx("U", 4)];

/** Stage 4 — yellow cross on top (side colours don't matter yet). */
export function yellowCross(ctx: SolveContext) {
  ctx.beginStage(4, "The yellow cross", "Make a yellow cross on top. Don't worry about the side colours yet.");
  for (let n = 0; ; n++) {
    ctx.guard(n, "yellow cross");
    const count = [1, 3, 5, 7].filter((i) => topIs(ctx.state, i)).length;
    if (count === 4) return;
    if (count === 0) {
      ctx.step("Just a yellow dot — do this and you'll get an L or a line", LINE, LINE);
    } else if ((topIs(ctx.state, 3) && topIs(ctx.state, 5)) || (topIs(ctx.state, 1) && topIs(ctx.state, 7))) {
      ctx.step("Turn the top so the line is horizontal", ctx.find(U_TURNS, (s) => topIs(s, 3) && topIs(s, 5))!);
      ctx.step("Horizontal line", LINE, LINE);
    } else {
      ctx.step("Turn the top so the L points to the back and left", ctx.find(U_TURNS, (s) => topIs(s, 1) && topIs(s, 3))!);
      ctx.step("Backwards L shape", ELL, ELL);
    }
  }
}

/** Which side faces have their top edge matching the centre. */
const edgeMatches = (s: CubeState) => SIDES.filter((f) => s[idx(f, 1)] === s[idx(f, 4)]);

/** Stage 5 — line the yellow edges up with the side centres. */
export function yellowEdges(ctx: SolveContext) {
  ctx.beginStage(5, "The yellow edges", "Swap the top edges around so each one's side colour matches its centre.");
  for (let n = 0; ; n++) {
    ctx.guard(n, "yellow edges");
    const aligned = ctx.find(U_TURNS, (s) => edgeMatches(s).length === 4);
    if (aligned) {
      ctx.step("Turn the top so every edge matches its centre", aligned);
      return;
    }
    // Two neighbouring edges match: hold them where one algorithm fixes the rest.
    const setup = ctx.find(combos(U_TURNS, Y_TURNS), (s) =>
      edgeMatches(s).length === 2 &&
      U_TURNS.some((u) => edgeMatches(applyMoves(s, `${SUNE} ${u.join(" ")}`)).length === 4),
    );
    if (setup) {
      const held = edgeMatches(applyMoves(ctx.state, setup)).map((f) => SIDE_NAME[f]);
      ctx.step(`Two neighbouring edges match — hold them at the ${held.join(" and ")}`, setup);
      ctx.step("Swap the other two edges", SUNE, SUNE);
    } else {
      // Two opposite edges match: one algorithm turns this into the neighbour case.
      ctx.step("Turn the top so two opposite edges match", ctx.find(U_TURNS, (s) => edgeMatches(s).length >= 2)!);
      ctx.step("Opposite edges match — do the algorithm once, then you'll have neighbours", SUNE, SUNE);
    }
  }
}

const faceCenter = (s: CubeState, sticker: number) => s[Math.floor(sticker / 9) * 9 + 4];
/** Corner slot k holds the right piece (ignoring which way it's twisted). */
const cornerHome = (s: CubeState, k: number) => {
  const want = CORNERS[k].map((i) => faceCenter(s, i));
  return CORNERS[k].every((i) => want.includes(s[i] as Color));
};

/** Stage 6 — move the yellow corners to the right spots (twist doesn't matter yet). */
export function positionCorners(ctx: SolveContext) {
  ctx.beginStage(6, "Position the yellow corners", "Move each top corner to its correct spot, between its three colours. It may still be twisted.");
  for (let n = 0; ; n++) {
    ctx.guard(n, "position corners");
    const home = [0, 1, 2, 3].filter((k) => cornerHome(ctx.state, k));
    if (home.length === 4) return;
    if (home.length === 0) {
      ctx.step("No corner is in its spot yet — do this once from any side", CORNER_CYCLE, CORNER_CYCLE);
    } else {
      ctx.step(
        "Turn the cube so the corner that's already in its spot is at front-right-top",
        ctx.find(Y_TURNS, (s) => cornerHome(s, 0))!,
      );
      ctx.step("Cycle the other three corners", CORNER_CYCLE, CORNER_CYCLE);
    }
  }
}

/** Stage 7 — twist each corner until yellow faces up. */
export function orientCorners(ctx: SolveContext) {
  ctx.beginStage(
    7,
    "Twist the yellow corners",
    "Twist each corner until yellow faces up. The lower layers look scrambled mid-way — that's expected, keep going and only turn the top between corners.",
  );
  for (let n = 0; ; n++) {
    ctx.guard(n, "twist corners");
    const twisted = ctx.find(U_TURNS, (s) => !topIs(s, 8));
    if (!twisted) break;
    ctx.step("Turn the top to bring a twisted corner to the front-right", twisted);

    const facing = ctx.at("R", 0) === ctx.center("U") ? "right" : "front";
    const moves: Move[] = [];
    while (!topIs(applyMoves(ctx.state, moves), 8)) {
      if (moves.length >= 24) throw new Error("Solver stuck twisting a corner");
      moves.push(...TWIST.split(" "));
    }
    const reps = moves.length / 4;
    ctx.step(`Yellow faces ${facing} — repeat R' D' R D ${reps} times`, moves, `(${TWIST}) ×${reps}`);
  }
  ctx.step("Turn the top layer to finish", ctx.find(U_TURNS, isSolved)!);
}
