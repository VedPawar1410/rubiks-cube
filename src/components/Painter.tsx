"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { COLOR_NAME, type Color, type Sticker } from "@/cube/model";
import type { ValidationError } from "@/cube/validate";
import Net from "./Net";
import { COLOR_KEYS, HEX } from "./palette";

// three.js needs the browser, so the 3D cube is client-only.
const Cube3D = dynamic(() => import("./Cube3D"), { ssr: false });

interface Props {
  stickers: Sticker[];
  brush: Color;
  errors: ValidationError[];
  onBrush: (c: Color) => void;
  onPaint: (index: number) => void;
  onRandom: () => void;
  onClear: () => void;
  onSolve: () => void;
}

export default function Painter({ stickers, brush, errors, onBrush, onPaint, onRandom, onClear, onSolve }: Props) {
  // Keys 1–6 pick a colour.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const c = COLOR_KEYS[Number(e.key) - 1];
      if (c) onBrush(c);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBrush]);

  const counts = Object.fromEntries(COLOR_KEYS.map((c) => [c, stickers.filter((s) => s === c).length]));
  const blanks = stickers.filter((s) => !s).length;
  // Centres are fixed, so never flag them as something to fix.
  const highlight = new Set(errors.flatMap((e) => e.stickers).filter((i) => i % 9 !== 4));

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="chunky p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl">Paint your cube</h2>
          <p className="text-sm text-ink-soft">
            {blanks ? <><b className="text-ink">{blanks}</b> stickers to go</> : "All painted — ready to solve!"}
          </p>
        </div>

        {/* Palette */}
        <div className="mb-5 flex flex-wrap gap-2.5" role="radiogroup" aria-label="Paint colour">
          {COLOR_KEYS.map((c, k) => {
            const active = brush === c;
            const full = counts[c] === 9;
            return (
              <button
                key={c}
                role="radio"
                aria-checked={active}
                onClick={() => onBrush(c)}
                className={`toy-btn relative flex items-center gap-2 py-1.5 pr-3 pl-1.5 text-sm ${active ? "-translate-y-1" : ""}`}
                style={{ background: active ? HEX[c] : "var(--card)" }}
              >
                <span className="size-7 rounded-lg border-[2.5px] border-ink" style={{ background: HEX[c] }} />
                <span className="capitalize">{COLOR_NAME[c]}</span>
                <span className={`font-notation text-xs ${counts[c] > 9 ? "text-cube-red" : "text-ink-soft"}`}>
                  {full ? "✓" : `${counts[c]}/9`}
                </span>
                <kbd className="absolute -top-2.5 -right-2 rounded-md border-2 border-ink bg-ink px-1 font-notation text-[10px] text-white">{k + 1}</kbd>
              </button>
            );
          })}
        </div>

        {/* Container units: stickers scale with this card, not the viewport. */}
        <div className="flex justify-center pb-2 [container-type:inline-size]">
          <Net stickers={stickers} size="clamp(14px, 6.2cqw, 40px)" onPaint={onPaint} highlight={highlight} showHints />
        </div>

        {errors.length > 0 && (
          <div className="mt-5 rounded-2xl border-[3px] border-ink bg-pink/40 p-4" role="alert">
            <p className="font-display text-lg">Hmm, that cube can&apos;t exist yet</p>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {errors.map((e) => <li key={e.message}>{e.message}</li>)}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={onSolve} className="toy-btn bg-cube-green px-6 py-3 text-lg">Solve it →</button>
          <button onClick={onRandom} className="toy-btn bg-cube-yellow px-4 py-3">🎲 Random scramble</button>
          <button onClick={onClear} className="toy-btn bg-card px-4 py-3">Clear</button>
        </div>
      </div>

      <aside className="flex flex-col gap-6">
        <div className="chunky relative aspect-square overflow-hidden bg-paper-deep">
          <span className="absolute top-3 left-3 z-10 rounded-full border-2 border-ink bg-card px-2.5 py-0.5 text-xs font-bold">LIVE PREVIEW · drag me</span>
          <Cube3D stickers={stickers} autoRotate />
        </div>
        <div className="chunky bg-cube-blue/15 p-5 text-sm">
          <p className="font-display text-lg">How to paint each face</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-soft">
            <li>Hold the cube so the <b className="text-ink">centre colour</b> of that face looks at you.</li>
            <li>Keep the colour shown under the face <b className="text-ink">on top</b> (e.g. white on top for green).</li>
            <li>Copy the 9 stickers exactly as you see them. Centres never move, so they&apos;re pre-filled.</li>
          </ol>
        </div>
      </aside>
    </section>
  );
}
