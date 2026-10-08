"use client";

import { useEffect, useRef } from "react";
import { COLOR_NAME, faceOffset, type Face, type Sticker } from "@/cube/model";
import { BLANK_HEX, HEX } from "./palette";

/** Where each face sits in the unfolded "cross" net (column, row). */
const LAYOUT: [Face, number, number][] = [
  ["U", 2, 1],
  ["L", 1, 2],
  ["F", 2, 2],
  ["R", 3, 2],
  ["B", 4, 2],
  ["D", 2, 3],
];

/** How to hold the cube so the face on screen matches the face in your hand. */
export const HOLD_HINT: Record<Face, string> = {
  U: "blue on top",
  D: "green on top",
  F: "white on top",
  R: "white on top",
  B: "white on top",
  L: "white on top",
};

interface Props {
  stickers: readonly Sticker[];
  /** Sticker edge length in CSS (e.g. "clamp(18px, 5vw, 38px)"). */
  size: string;
  onPaint?: (index: number) => void;
  highlight?: ReadonlySet<number>;
  showHints?: boolean;
}

export default function Net({ stickers, size, onPaint, highlight, showHints }: Props) {
  const painting = useRef(false);

  useEffect(() => {
    const stop = () => (painting.current = false);
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  // Works for mouse and touch: find the sticker under the pointer ourselves.
  const paintAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-sticker]");
    if (el) onPaint?.(Number(el.dataset.sticker));
  };

  const gap = `calc(${size} * 0.12)`;
  return (
    <div
      className="grid w-fit select-none"
      style={{ gridTemplateColumns: "repeat(4, auto)", gap: `calc(${size} * 0.3)`, touchAction: onPaint ? "none" : undefined }}
      onPointerDown={(e) => {
        if (!onPaint) return;
        painting.current = true;
        paintAt(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => painting.current && paintAt(e.clientX, e.clientY)}
    >
      {LAYOUT.map(([face, col, row]) => {
        const center = stickers[faceOffset(face) + 4];
        return (
          <div key={face} style={{ gridColumn: col, gridRow: row }} className="flex flex-col items-center">
            <div className="grid grid-cols-3 rounded-[10px] bg-ink p-[3px]" style={{ gap }}>
              {Array.from({ length: 9 }, (_, i) => {
                const index = faceOffset(face) + i;
                const color = stickers[index];
                const isCenter = i === 4;
                const flagged = highlight?.has(index);
                return (
                  <div
                    key={i}
                    data-sticker={onPaint && !isCenter ? index : undefined}
                    title={isCenter && color ? `${COLOR_NAME[color]} centre (fixed)` : undefined}
                    className={`relative rounded-[22%] transition-transform duration-150 ${onPaint && !isCenter ? "cursor-pointer hover:scale-110" : ""} ${flagged ? "wiggle z-10" : ""}`}
                    style={{
                      width: size,
                      height: size,
                      background: color ? HEX[color] : BLANK_HEX,
                      boxShadow: flagged ? "0 0 0 3px var(--pink), 0 0 0 5px var(--ink)" : "inset 0 -3px 0 rgb(0 0 0 / 0.14)",
                    }}
                  >
                    {isCenter && onPaint && (
                      <span className="absolute inset-[34%] rounded-full bg-ink/25" aria-hidden />
                    )}
                  </div>
                );
              })}
            </div>
            {showHints && center && (
              <p className="mt-1.5 text-center text-[11px] leading-tight text-ink-soft">
                <b className="uppercase tracking-wide text-ink">{COLOR_NAME[center]}</b>
                <br />
                {HOLD_HINT[face]}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
