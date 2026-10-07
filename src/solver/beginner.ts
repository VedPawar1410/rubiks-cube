import { isSolved, type CubeState } from "@/cube/model";
import { SolveContext, type Stage } from "./context";
import { orient, whiteCorners, whiteCross } from "./stages/firstLayer";
import { orientCorners, positionCorners, yellowCross, yellowEdges } from "./stages/lastLayer";
import { secondLayer } from "./stages/secondLayer";

export type { Stage, Step } from "./context";

export interface Solution {
  initial: CubeState;
  stages: Stage[];
  /** Face turns only — whole-cube rotations (x, y, z) aren't counted. */
  moveCount: number;
}

const isRotation = (m: string) => /^[xyz]/.test(m);

/**
 * Solves a (validated) cube with the beginner layer-by-layer method from
 * solvethecube.com. Pure function: state in, explained stages out.
 */
export function solveBeginner(initial: CubeState): Solution {
  const ctx = new SolveContext(initial);
  for (const stage of [orient, whiteCross, whiteCorners, secondLayer, yellowCross, yellowEdges, positionCorners, orientCorners]) {
    stage(ctx);
  }
  if (!isSolved(ctx.state)) throw new Error("Solver finished but the cube isn't solved");

  // Drop stages that needed nothing (e.g. "hold the cube" when white is already up).
  const stages = ctx.stages.filter((s) => s.steps.length > 0);
  const moveCount = stages
    .flatMap((s) => s.steps.flatMap((st) => st.moves))
    .filter((m) => !isRotation(m)).length;
  return { initial: [...initial], stages, moveCount };
}
