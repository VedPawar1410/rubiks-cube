"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import Painter from "@/components/Painter";
import SolutionView from "@/components/SolutionView";
import { SOLVED, type Color, type Sticker } from "@/cube/model";
import { applyMoves, randomScramble } from "@/cube/moves";
import { validate, type ValidationError } from "@/cube/validate";
import { solveBeginner, type Solution } from "@/solver/beginner";

/** Blank cube: only the six fixed centres are filled in. */
const BLANK: Sticker[] = SOLVED.map((c, i) => (i % 9 === 4 ? c : null));

const LOGO: [string, string][] = [["C", "var(--red)"], ["u", "var(--blue)"], ["b", "var(--yellow)"], ["e", "var(--green)"], ["y", "var(--orange)"]];

export default function Home() {
  const [stickers, setStickers] = useState<Sticker[]>(BLANK);
  const [brush, setBrush] = useState<Color>("W");
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [solution, setSolution] = useState<Solution | null>(null);

  const paint = useCallback(
    (i: number) => {
      setStickers((s) => (s[i] === brush ? s : s.map((c, k) => (k === i ? brush : c))));
      setErrors([]);
    },
    [brush],
  );

  const solve = () => {
    const result = validate(stickers);
    if (!result.ok) return setErrors(result.errors);
    setSolution(solveBeginner(result.state));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-6xl leading-none sm:text-7xl" aria-label="Cubey">
            {LOGO.map(([ch, color], i) => (
              <motion.span
                key={i}
                className="inline-block"
                style={{ color, WebkitTextStroke: "3px var(--ink)", paintOrder: "stroke fill", textShadow: "4px 4px 0 var(--ink)" }}
                initial={{ y: -40, opacity: 0, rotate: -12 }}
                animate={{ y: 0, opacity: 1, rotate: i % 2 ? 4 : -4 }}
                transition={{ type: "spring", stiffness: 420, damping: 12, delay: i * 0.07 }}
                whileHover={{ y: -6, rotate: 0 }}
              >
                {ch}
              </motion.span>
            ))}
          </h1>
          <p className="mt-3 max-w-md text-lg text-ink-soft">
            Paint your scrambled cube, then follow friendly steps to solve it — <b className="text-ink">one layer at a time</b>.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-end">
          <span className="rounded-full border-[3px] border-ink bg-cube-green px-3 py-1 text-sm font-bold shadow-[3px_3px_0_var(--ink)]">Easy · Beginner method</span>
          <span className="rounded-full border-[3px] border-dashed border-ink/40 px-3 py-1 text-sm text-ink-soft">More soon</span>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={solution ? "solution" : "paint"}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
        >
          {solution ? (
            <SolutionView solution={solution} onEdit={() => setSolution(null)} />
          ) : (
            <Painter
              stickers={stickers}
              brush={brush}
              errors={errors}
              onBrush={setBrush}
              onPaint={paint}
              onRandom={() => {
                setStickers(applyMoves(SOLVED, randomScramble()));
                setErrors([]);
              }}
              onClear={() => {
                setStickers(BLANK);
                setErrors([]);
              }}
              onSolve={solve}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <footer className="pt-4 text-center text-xs text-ink-soft">
        Method based on the beginner guide at{" "}
        <a href="https://solvethecube.com/" className="font-bold underline" target="_blank" rel="noreferrer">solvethecube.com</a>
      </footer>
    </main>
  );
}
