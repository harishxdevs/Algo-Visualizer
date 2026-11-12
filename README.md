# AlgoLab — Algorithm Visualizer

Interactive, step-by-step visualisation of classic algorithms. Pick an algorithm, tune the speed,
and watch exactly what it does, with live comparison and write counts.

**Live:** https://algo-visualizer1.vercel.app/

## What's inside

**Sorting** (6 algorithms): Bubble, Insertion, Selection, Merge, Quick, Heap.
Bars colour-code comparisons, swaps, writes, pivots and the sorted region. Step through one operation at a time or run at up to 600 steps/s.

**Pathfinding** (5 algorithms): BFS, DFS, Dijkstra, A*, Greedy Best-First.
Draw walls and weighted cells, move the start and target, generate a recursive-division maze, and compare how many cells each algorithm visits and the cost of the path it finds.

## How it works

Every algorithm is written as a plain TypeScript **generator function** that yields a frame after each
meaningful operation. The UI pulls frames with `requestAnimationFrame`, so the same code runs the
visualisation and could be unit-tested step by step. No animation or algorithm libraries are used.

```
src/algorithms/sorting.ts      generators + Big-O metadata
src/algorithms/pathfinding.ts  grid search generators + maze generator
src/components/SortingView.tsx
src/components/PathfindingView.tsx
```

**Stack:** React 19 · TypeScript · Vite

## Run locally

```bash
npm install
npm run dev
```

## Deploy

### Vercel (recommended, free)

1. Push this folder to a GitHub repo.
2. On vercel.com, **Add New → Project**, import the repo. Vercel detects Vite: build `npm run build`, output `dist`.
3. Deploy. The app is served from the domain root, which is the default `base` in `vite.config.ts`.

### GitHub Pages

```bash
npm run deploy:pages   # builds with base=/algo-visualizer/ and pushes dist/ to gh-pages
```

## Checks

```bash
npm run lint
npm run format:check
```
