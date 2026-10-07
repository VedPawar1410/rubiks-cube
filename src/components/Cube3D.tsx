"use client";

import { OrbitControls, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Sticker } from "@/cube/model";
import { STICKERS, turnInfo, type Move, type Vec } from "@/cube/moves";
import { BLANK_HEX, HEX } from "./palette";

export interface CubeAnimation {
  move: Move;
  /** Milliseconds for this turn. */
  duration: number;
  /** Changes for every new animation, even when the same move repeats. */
  id: number;
}

interface Props {
  stickers: readonly Sticker[];
  animation?: CubeAnimation | null;
  onAnimationEnd?: () => void;
  autoRotate?: boolean;
}

// The 26 visible cubies (every position except the hidden core).
const CUBIES: Vec[] = [];
for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) {
  if (x || y || z) CUBIES.push([x, y, z]);
}

const Z = new THREE.Vector3(0, 0, 1);
const STICKER_PLACEMENT = STICKERS.map(({ pos, normal }) => ({
  pos,
  position: pos.map((p, k) => p + normal[k] * 0.505) as Vec,
  quaternion: new THREE.Quaternion().setFromUnitVectors(Z, new THREE.Vector3(...normal)),
}));

/** Ease out with a little overshoot, so turns land with a toy-like "clack". */
const easeOutBack = (t: number) => {
  const c1 = 1.3;
  return 1 + (c1 + 1) * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

function CubeModel({ stickers, animation, onAnimationEnd }: Props) {
  const spin = useRef<THREE.Group>(null);
  const progress = useRef(1);
  const turn = useMemo(() => (animation ? turnInfo(animation.move) : null), [animation]);
  const axis = useMemo(() => (turn ? new THREE.Vector3(...turn.axis) : null), [turn]);

  // Reset before the frame paints, so swapping in the new sticker state
  // and un-rotating the layer happen together — no visible jump.
  useLayoutEffect(() => {
    progress.current = animation ? 0 : 1;
    spin.current?.quaternion.identity();
  }, [animation]);

  useFrame((_, dt) => {
    if (!animation || !turn || !axis || !spin.current || progress.current >= 1) return;
    progress.current = Math.min(1, progress.current + (dt * 1000) / animation.duration);
    spin.current.quaternion.setFromAxisAngle(axis, turn.angle * easeOutBack(progress.current));
    if (progress.current >= 1) onAnimationEnd?.();
  });

  const turning = (p: Vec) => !!turn && turn.inLayer(p);
  const cubie = (p: Vec) => (
    <RoundedBox key={`c${p}`} args={[0.98, 0.98, 0.98]} radius={0.1} smoothness={3} position={p}>
      <meshStandardMaterial color="#1B1530" roughness={0.55} />
    </RoundedBox>
  );
  const sticker = (i: number) => {
    const s = STICKER_PLACEMENT[i];
    const color = stickers[i];
    return (
      <RoundedBox key={`s${i}`} args={[0.84, 0.84, 0.03]} radius={0.012} smoothness={2} position={s.position} quaternion={s.quaternion}>
        <meshStandardMaterial color={color ? HEX[color] : BLANK_HEX} roughness={0.32} />
      </RoundedBox>
    );
  };
  const indices = STICKER_PLACEMENT.map((_, i) => i);

  return (
    <group>
      <group>
        {CUBIES.filter((p) => !turning(p)).map(cubie)}
        {indices.filter((i) => !turning(STICKER_PLACEMENT[i].pos)).map(sticker)}
      </group>
      <group ref={spin}>
        {CUBIES.filter(turning).map(cubie)}
        {indices.filter((i) => turning(STICKER_PLACEMENT[i].pos)).map(sticker)}
      </group>
    </group>
  );
}

/** Interactive 3D cube. Drag to look around; pass `animation` to play a turn. */
export default function Cube3D({ autoRotate = false, ...props }: Props) {
  return (
    <Canvas camera={{ position: [6.4, 5.2, 7.8], fov: 30 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={1.6} />
      <directionalLight position={[5, 8, 6]} intensity={1.6} />
      <directionalLight position={[-6, -3, -4]} intensity={0.5} />
      <CubeModel {...props} />
      <OrbitControls enablePan={false} enableZoom={false} autoRotate={autoRotate} autoRotateSpeed={1.6} />
    </Canvas>
  );
}
