import { COLOR_NAME, EDGES, idx, inPlace } from "@/cube/model";
import { combos, SolveContext, U_TURNS, Y_TURNS } from "../context";

const TO_RIGHT = "U R U' R' U' F' U F";
const TO_LEFT = "U' L' U L U F U' F'";
const MIDDLE_EDGES = EDGES.slice(8); // FR, FL, BL, BR
const TOP_EDGES = EDGES.slice(0, 4); // UR, UF, UL, UB

/** Stage 3 — flip the cube over, then slot in the four middle-layer edges. */
export function secondLayer(ctx: SolveContext) {
  ctx.beginStage(
    3,
    "The second layer",
    "Turn the cube upside down (white on the bottom) and slot the four middle-layer edges in between the centres.",
  );
  ctx.step("Flip the cube upside down — white goes to the bottom, yellow is now on top", "x2");

  for (let n = 0; ; n++) {
    ctx.guard(n, "second layer");
    if (MIDDLE_EDGES.every((e) => inPlace(ctx.state, e))) return;
    const yellow = ctx.center("U");

    // Is there a middle-layer edge (no yellow on it) waiting in the top layer?
    const waiting = TOP_EDGES.some(([a, b]) => ctx.state[a] !== yellow && ctx.state[b] !== yellow);
    if (waiting) {
      // Line its front colour up with the matching centre, facing us.
      const setup = ctx.find(combos(U_TURNS, Y_TURNS), (s) => {
        const top = s[idx("U", 7)];
        return s[idx("F", 1)] === s[idx("F", 4)] && top !== yellow &&
          (top === s[idx("R", 4)] || top === s[idx("L", 4)]);
      })!;
      ctx.step("Turn the top until an edge's front colour matches its centre, then face that centre", setup);

      const front = COLOR_NAME[ctx.at("F", 1)];
      const top = COLOR_NAME[ctx.at("U", 7)];
      if (ctx.at("U", 7) === ctx.center("R")) {
        ctx.step(`The ${front}–${top} edge belongs on the right — move it right`, TO_RIGHT, TO_RIGHT);
      } else {
        ctx.step(`The ${front}–${top} edge belongs on the left — move it left`, TO_LEFT, TO_LEFT);
      }
    } else {
      // All remaining edges are in the middle layer but in the wrong slot or
      // flipped: swap one out with a yellow edge, then it'll be in the top layer.
      const setup = ctx.find(Y_TURNS, (s) => !inPlace(s, MIDDLE_EDGES[0]))!;
      ctx.step("Turn the cube so the wrong edge is at front-right", setup);
      ctx.step("An edge is stuck in the wrong slot — knock it out with a yellow edge", TO_RIGHT, TO_RIGHT);
    }
  }
}
