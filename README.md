# Cubey — Rubik's Cube Solver

Paint your scrambled Rubik's cube and get friendly, step-by-step instructions to solve it with the **beginner layer-by-layer method**, played out on an animated 3D cube.

**Live:** https://rubiks-cube-wine.vercel.app

## Features

- **Paint your cube:** click or drag to colour the stickers on a flat net (works on touch screens). Keys `1`–`6` pick a colour, a counter tracks each colour out of 9, a hint under each face says how to hold the cube, and a 3D preview updates as you paint.
- **Catches impossible cubes:** before solving, the cube is checked for wrong colour counts, pieces that can't exist, twisted corners, flipped edges and swapped pieces. Problems are explained in plain English and the stickers to check wiggle.
- **3D solution player:** every turn animates on a 3D cube. You get play/pause, step back and forward, restart, speeds from **0.2× to 2×**, and keyboard shortcuts (`Space`, `←`, `→`).
- **Learn as you go:** a 7-stage timeline, a plain-English explanation of every step, the algorithm used, and what each move means ("Turn the right face counter-clockwise").
- **Step list view:** the whole solution on one page, with a picture of the cube after each step and a "Play from here" button.

## The method

The solver follows the beginner method from [solvethecube.com](https://solvethecube.com/), using the same stages and algorithms:

| # | Stage | Algorithms |
|---|-------|------------|
| 1 | White cross | Shortest moves for each edge (the site treats this step as intuitive) |
| 2 | White corners | `F D F'` · `R' D' R` · `R' D R F D2 F'` |
| 3 | Second layer | `U R U' R' U' F' U F` (right) · `U' L' U L U F U' F'` (left) |
| 4 | Yellow cross | `F R U R' U' F'` (line) · `F U R U' R' F'` (L shape) |
| 5 | Yellow edges | `U R U R' U R U2 R'` |
| 6 | Position yellow corners | `U R U' L' U R' U' L` |
| 7 | Twist yellow corners | `(R' D' R D)` ×2 or ×4 per corner |

Solutions average about 127 turns, which is normal for the beginner method.

## How it works

```
Paint UI ─▶ 54 stickers ─▶ validate() ─▶ solveBeginner() ─▶ stages [{ name, goal, steps: [{ label, moves, alg }] }]
                                                                     │
                                       3D player (animates turns) ◀──┴──▶ Step list (cube after each step)
```

- **Cube model** ([`src/cube/model.ts`](src/cube/model.ts)): the cube is a flat array of 54 stickers in `U R F D L B` order, using the standard colour scheme (white top, green front).
- **Move engine** ([`src/cube/moves.ts`](src/cube/moves.ts)): each sticker gets a 3D position and a direction it faces. A move rotates every sticker in its layer by 90°. The move tables for all face turns and the `x`/`y`/`z` cube rotations are worked out this way, not typed by hand, and the 3D animation reuses the same geometry.
- **Validation** ([`src/cube/validate.ts`](src/cube/validate.ts)): having 9 of each colour isn't enough. A real cube also follows three rules that no sequence of turns can break: corner twists add up to a multiple of 3, edge flips add up to a multiple of 2, and the corner and edge arrangements have the same parity. A painted cube that breaks one is a painting mistake, and the solver would never finish on it.
- **Solver** ([`src/solver/`](src/solver/)): a pure function from cube state to explained stages. Each stage reads the stickers, works out which case it's looking at, and applies that case's algorithm. The white cross uses a small breadth-first search over just the cross edges (about 190k states, instant).
- **Player** ([`src/components/SolutionView.tsx`](src/components/SolutionView.tsx)): the cube state after every move is computed in advance, so stepping, jumping and rewinding always match the solver. Only the turning layer animates; when the turn finishes, the next state is swapped in.

## Tech stack

- [Next.js](https://nextjs.org/) 16 (App Router), React 19, TypeScript
- [Tailwind CSS](https://tailwindcss.com/) v4
- [three.js](https://threejs.org/) via [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber) and [drei](https://github.com/pmndrs/drei) for the 3D cube
- [Framer Motion](https://motion.dev/) for UI animation
- [Vitest](https://vitest.dev/) for tests

Everything runs in the browser and there's no backend. The production build is a single static page.

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build locally |
| `npm test` | Run the test suite |
| `npm run lint` | Lint with ESLint |

## Testing

```bash
npm test
```

- **Move engine:** each turn goes the right way, four quarter turns get back to the start, `(R U)` repeated 105 times returns to solved, and a move followed by its inverse changes nothing.
- **Validation:** solved and scrambled cubes pass; blank stickers, wrong colour counts, a flipped edge, a twisted corner and two swapped edges are each rejected.
- **Solver:** 5,000 seeded random scrambles. After every stage, the test checks what that stage promises (e.g. "the white cross is complete"), and every scramble must end solved.

## Project structure

```
src/
├── app/            # Next.js page, layout, global styles (toy-box theme)
├── components/     # Painter, Net, Cube3D, SolutionView, colour palette
├── cube/           # Cube model, move engine, validation (+ tests)
└── solver/         # Beginner-method solver and its stages (+ tests)
```

## Deployment

The app is deployed on [Vercel](https://vercel.com/). It needs no settings or environment variables:

```bash
vercel --prod
```

## Roadmap

- Harder difficulties (e.g. CFOP)
- Scanning faces with the camera or photo upload, with manual correction
- Editable centre colours for cubes that don't use the standard colour scheme

## Credits

The solving method and algorithms are from the beginner guide at [solvethecube.com](https://solvethecube.com/).
