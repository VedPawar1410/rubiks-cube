"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CubeState } from "@/cube/model";
import { applyMove, invertMove, type Move } from "@/cube/moves";
import type { Solution } from "@/solver/beginner";
import type { CubeAnimation } from "./Cube3D";
import Net from "./Net";

const Cube3D = dynamic(() => import("./Cube3D"), { ssr: false });

/** One accent colour per stage for the timeline chips. */
const STAGE_COLORS = ["var(--white)", "var(--green)", "var(--red)", "var(--blue)", "var(--yellow)", "var(--orange)", "var(--pink)", "var(--green)"];
const SPEEDS = [0.2, 0.5, 1, 1.5, 2];
const BASE_TURN_MS = 800;
const BASE_PAUSE_MS = 400;

const FACE_NAME: Record<string, string> = { U: "top", D: "bottom", R: "right", L: "left", F: "front", B: "back" };
/** "R'" → "Turn the right face counter-clockwise". */
export function describeMove(m: Move): string {
  const dir = m.endsWith("2") ? "twice (half turn)" : m.endsWith("'") ? "counter-clockwise" : "clockwise";
  const rotation = { x: "like R", y: "like U", z: "like F" }[m[0]];
  if (rotation) return `Rotate the whole cube ${dir}, ${rotation}`;
  return `Turn the ${FACE_NAME[m[0]]} face ${dir}`;
}

interface FlatMove {
  move: Move;
  stage: number;
  step: number;
  index: number; // position within the step
}

export default function SolutionView({ solution, onEdit }: { solution: Solution; onEdit: () => void }) {
  const { stages } = solution;

  // Flatten to one list of moves, and precompute the cube after each one.
  const flat = useMemo<FlatMove[]>(
    () => stages.flatMap((st, si) => st.steps.flatMap((step, pi) => step.moves.map((move, index) => ({ move, stage: si, step: pi, index })))),
    [stages],
  );
  const states = useMemo(() => {
    const out: CubeState[] = [solution.initial];
    for (const f of flat) out.push(applyMove(out[out.length - 1], f.move));
    return out;
  }, [flat, solution.initial]);
  const total = flat.length;

  const [pos, setPos] = useState(0); // moves applied so far
  const [anim, setAnim] = useState<(CubeAnimation & { dir: 1 | -1 }) | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [view, setView] = useState<"player" | "list">("player");
  const nextId = useRef(0);
  // At 1×: each turn takes 800ms, then a 400ms breather before the next one
  // while playing, so every move is easy to follow. Speed scales both.
  const duration = BASE_TURN_MS / speed;
  const pause = BASE_PAUSE_MS / speed;
  const done = pos === total && !anim;

  // The pending "start the next turn" timer while playing.
  const gapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelGap = () => {
    if (gapTimer.current) clearTimeout(gapTimer.current);
    gapTimer.current = null;
  };
  useEffect(() => cancelGap, []);

  const forward = useCallback(() => {
    if (anim || pos >= total) return;
    cancelGap();
    setAnim({ move: flat[pos].move, duration, id: ++nextId.current, dir: 1 });
  }, [anim, pos, total, flat, duration]);

  const back = useCallback(() => {
    if (anim || pos <= 0) return;
    cancelGap();
    setPlaying(false);
    setAnim({ move: invertMove(flat[pos - 1].move), duration, id: ++nextId.current, dir: -1 });
  }, [anim, pos, flat, duration]);

  const jump = (to: number) => {
    cancelGap();
    setPlaying(false);
    setAnim(null);
    setPos(to);
  };

  // When a turn lands, commit it — and while playing, queue the next one after a short pause.
  const onAnimationEnd = () => {
    if (!anim) return;
    const next = pos + anim.dir;
    setPos(next);
    setAnim(null);
    if (playing && anim.dir === 1 && next < total) {
      gapTimer.current = setTimeout(() => {
        gapTimer.current = null;
        setAnim({ move: flat[next].move, duration, id: ++nextId.current, dir: 1 });
      }, pause);
    } else if (next >= total) {
      setPlaying(false);
    }
  };

  const togglePlay = useCallback(() => {
    if (playing) {
      cancelGap(); // the turn in flight finishes, then it stops
      return setPlaying(false);
    }
    setPlaying(true);
    forward();
  }, [playing, forward]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (view !== "player") return;
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      if (e.key === "ArrowRight") { setPlaying(false); forward(); }
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, forward, back, togglePlay]);

  // What to describe: the move in flight, else the next one to play.
  const focusIndex = anim ? (anim.dir === 1 ? pos : pos - 1) : Math.min(pos, total - 1);
  const focus = flat[focusIndex];
  const stage = stages[focus.stage];
  const step = stage.steps[focus.step];
  const stageStart = (si: number) => flat.findIndex((f) => f.stage === si);

  return (
    <section className="flex flex-col gap-6">
      {/* Stage timeline */}
      <div className="chunky flex flex-wrap items-center gap-2 p-3">
        {stages.map((st, si) => {
          const start = stageStart(si);
          const len = flat.filter((f) => f.stage === si).length;
          const fill = Math.max(0, Math.min(1, (pos - start) / len));
          const active = si === focus.stage && !done;
          return (
            <button
              key={st.id}
              onClick={() => jump(start)}
              className={`toy-btn relative overflow-hidden px-3 py-1.5 text-left text-xs sm:text-sm ${active ? "-translate-y-1" : ""}`}
              style={{ background: "var(--card)" }}
              title={`Jump to: ${st.name}`}
            >
              <span className="absolute inset-y-0 left-0 transition-[width] duration-300" style={{ width: `${fill * 100}%`, background: STAGE_COLORS[st.id] }} />
              <span className="relative">
                <b className="font-notation">{st.id}</b> {st.name}
              </span>
            </button>
          );
        })}
        <div className="ml-auto flex gap-2">
          <ViewToggle view={view} onChange={setView} />
          <button onClick={onEdit} className="toy-btn bg-card px-3 py-1.5 text-sm">✎ Edit cube</button>
        </div>
      </div>

      {view === "player" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="chunky relative aspect-square overflow-hidden bg-paper-deep">
            <Cube3D stickers={states[pos]} animation={anim} onAnimationEnd={onAnimationEnd} />
            <div className="pointer-events-none absolute top-3 left-3 rounded-full border-2 border-ink bg-card px-2.5 py-0.5 font-notation text-xs">
              move {pos} / {total}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-2 bg-ink/10">
              <div className="h-full bg-cube-green transition-[width] duration-300" style={{ width: `${(pos / total) * 100}%` }} />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={done ? "done" : `${focus.stage}-${focus.step}`}
                initial={{ opacity: 0, y: 14, rotate: -1 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                className="chunky flex-1 p-5 sm:p-6"
              >
                {done ? (
                  <div className="flex h-full flex-col items-start justify-center gap-3">
                    <p className="font-display text-4xl">Solved! 🎉</p>
                    <p className="text-ink-soft">That&apos;s the whole beginner method — {solution.moveCount} turns, layer by layer. Do it again and it gets faster every time.</p>
                    <div className="flex gap-3">
                      <button onClick={() => jump(0)} className="toy-btn bg-cube-yellow px-4 py-2">↺ Watch again</button>
                      <button onClick={onEdit} className="toy-btn bg-card px-4 py-2">Solve another</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-bold tracking-widest text-ink-soft uppercase">
                      Stage {stage.id} · {stage.name}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">{stage.goal}</p>
                    <h3 className="mt-4 font-display text-2xl leading-tight">{step.label}</h3>
                    {step.alg && (
                      <p className="mt-1 text-sm">
                        Algorithm: <span className="font-notation font-medium">{step.alg}</span>
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {step.moves.map((m, i) => {
                        const state = i < focus.index ? "done" : i === focus.index ? "now" : "todo";
                        return (
                          <span
                            key={i}
                            className={`keycap px-2 py-0.5 text-sm transition-all ${state === "done" ? "opacity-35" : ""} ${state === "now" ? "-translate-y-1 bg-cube-yellow" : ""}`}
                          >
                            {m}
                          </span>
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {!done && (
              <div className="chunky flex items-center gap-4 bg-cube-yellow/30 p-4">
                <motion.span key={focusIndex} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 14 }} className="keycap min-w-16 px-3 py-2 text-center text-3xl">
                  {focus.move}
                </motion.span>
                <p className="text-sm font-semibold">{describeMove(focus.move)}</p>
              </div>
            )}

            {/* Controls */}
            <div className="chunky flex flex-wrap items-center justify-center gap-2.5 p-3">
              <button onClick={() => jump(0)} className="toy-btn bg-card px-3 py-2" aria-label="Restart">⏮</button>
              <button onClick={back} disabled={pos === 0} className="toy-btn bg-card px-3 py-2" aria-label="Previous move">◀</button>
              <button onClick={togglePlay} disabled={done} className="toy-btn min-w-28 bg-cube-green px-5 py-2 text-lg">
                {playing ? "❚❚ Pause" : "▶ Play"}
              </button>
              <button onClick={() => { setPlaying(false); forward(); }} disabled={pos >= total} className="toy-btn bg-card px-3 py-2" aria-label="Next move">▶</button>

              {/* Speed: every option visible, so slowing right down is one tap. */}
              <div className="flex w-full items-center justify-center gap-2 pt-1">
                <span className="text-xs font-bold tracking-widest text-ink-soft uppercase">Speed</span>
                <div className="flex rounded-2xl border-[3px] border-ink bg-card p-0.5" role="radiogroup" aria-label="Playback speed">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      role="radio"
                      aria-checked={speed === s}
                      onClick={() => setSpeed(s)}
                      className={`rounded-xl px-2.5 py-1 font-notation text-sm transition-colors ${speed === s ? "bg-ink text-white" : "hover:bg-paper-deep"}`}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-ink-soft">Space = play/pause · ← → = step · drag the cube to look around</p>
          </div>
        </div>
      ) : (
        <StepList solution={solution} states={states} flat={flat} onPlayFrom={(i) => { jump(i); setView("player"); }} />
      )}

      {done && <Confetti />}
    </section>
  );
}

function ViewToggle({ view, onChange }: { view: "player" | "list"; onChange: (v: "player" | "list") => void }) {
  return (
    <div className="flex rounded-2xl border-[3px] border-ink bg-card p-0.5 text-sm font-bold" role="tablist">
      {(["player", "list"] as const).map((v) => (
        <button
          key={v}
          role="tab"
          aria-selected={view === v}
          onClick={() => onChange(v)}
          className={`rounded-xl px-3 py-1 transition-colors ${view === v ? "bg-ink text-white" : ""}`}
        >
          {v === "player" ? "3D player" : "Step list"}
        </button>
      ))}
    </div>
  );
}

/** Every stage and step on one page, with a snapshot of the cube after each step. */
function StepList({ solution, states, flat, onPlayFrom }: { solution: Solution; states: CubeState[]; flat: FlatMove[]; onPlayFrom: (i: number) => void }) {
  return (
    <div className="flex flex-col gap-6">
      {solution.stages.map((st, si) => (
        <div key={st.id} className="chunky overflow-hidden">
          <div className="border-b-[3px] border-ink p-4" style={{ background: STAGE_COLORS[st.id] }}>
            <p className="font-display text-xl">
              <span className="font-notation">{st.id}.</span> {st.name}
            </p>
            <p className="text-sm">{st.goal}</p>
          </div>
          <ol className="divide-y-2 divide-dashed divide-ink/20">
            {st.steps.map((step, pi) => {
              const start = flat.findIndex((f) => f.stage === si && f.step === pi);
              const after = states[start + step.moves.length];
              return (
                <li key={pi} className="flex flex-wrap items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{step.label}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {step.moves.map((m, i) => <span key={i} className="keycap px-1.5 text-sm">{m}</span>)}
                    </div>
                    <button onClick={() => onPlayFrom(start)} className="mt-3 text-sm font-bold underline decoration-2 underline-offset-4 hover:text-cube-blue">
                      ▶ Play from here
                    </button>
                  </div>
                  <Net stickers={after} size="9px" />
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}

/** A little burst of cube-coloured confetti. */
function Confetti() {
  // Deterministic scatter (golden-ratio steps) — looks random, renders pure.
  const pieces = Array.from({ length: 70 }, (_, i) => ({
    left: ((i * 61.8) % 100),
    delay: ((i * 0.382) % 0.6),
    spin: ((i * 137) % 720) - 360,
    color: ["var(--red)", "var(--yellow)", "var(--green)", "var(--blue)", "var(--orange)", "var(--pink)"][i % 6],
  }));
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-0 size-3 rounded-[3px] border-2 border-ink"
          style={{ left: `${p.left}%`, background: p.color }}
          initial={{ y: -40, rotate: 0, opacity: 1 }}
          animate={{ y: "105vh", rotate: p.spin, opacity: [1, 1, 0] }}
          transition={{ duration: 2.4, delay: p.delay, ease: "easeIn" }}
        />
      ))}
    </div>
  );
}
