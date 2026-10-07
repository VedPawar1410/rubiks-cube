import { centerOf, idx, type Color, type CubeState, type Face } from "@/cube/model";
import { applyMoves, parse, type Move } from "@/cube/moves";

export interface Step {
  /** Plain-English instruction, e.g. "White facing right". */
  label: string;
  moves: Move[];
  /** The named algorithm from the method, if this step uses one. */
  alg?: string;
}

export interface Stage {
  id: number;
  name: string;
  goal: string;
  steps: Step[];
}

/**
 * Records a solve as it happens. Each stage reads the cube, decides what
 * case it's looking at, and calls `step()`, which applies the moves to the
 * working state and logs them with an explanation.
 */
export class SolveContext {
  state: CubeState;
  stages: Stage[] = [];

  constructor(state: CubeState) {
    this.state = [...state];
  }

  beginStage(id: number, name: string, goal: string) {
    this.stages.push({ id, name, goal, steps: [] });
  }

  step(label: string, moves: Move[] | string, alg?: string) {
    const list = typeof moves === "string" ? parse(moves) : moves;
    if (!list.length) return;
    this.state = applyMoves(this.state, list);
    this.stages[this.stages.length - 1].steps.push({ label, moves: list, alg });
  }

  /** Colour of sticker `i` on `face`. */
  at(face: Face, i: number): Color {
    return this.state[idx(face, i)];
  }

  center(face: Face): Color {
    return centerOf(this.state, face) as Color;
  }

  /** Try move sequences on a copy; return the first one that satisfies `ok`. */
  find(options: Move[][], ok: (s: CubeState) => boolean): Move[] | undefined {
    return options.find((m) => ok(applyMoves(this.state, m)));
  }

  /** Throws if a stage loops without making progress (a solver bug, never user error). */
  guard(n: number, stage: string) {
    if (n > 20) throw new Error(`Solver stuck in stage: ${stage}`);
  }
}

/** Top-layer turns, whole-cube rotations and bottom turns, shortest first. */
export const U_TURNS: Move[][] = [[], ["U"], ["U'"], ["U2"]];
export const Y_TURNS: Move[][] = [[], ["y"], ["y'"], ["y2"]];
export const D_TURNS: Move[][] = [[], ["D"], ["D'"], ["D2"]];

/** Every combination of one option from each list, fewest moves first. */
export const combos = (...lists: Move[][][]): Move[][] =>
  lists
    .reduce<Move[][]>((acc, list) => acc.flatMap((a) => list.map((b) => [...a, ...b])), [[]])
    .sort((a, b) => a.length - b.length);
