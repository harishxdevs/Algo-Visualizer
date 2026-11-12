/** Grid pathfinding algorithms as generators yielding visited cells, then the final path. */
export type Cell = { r: number; c: number }
export type Grid = { rows: number; cols: number; walls: Set<string>; weights: Map<string, number> }
export type PathFrame = {
  visited?: Cell
  frontier?: Cell[]
  path?: Cell[]
  done?: boolean
  found?: boolean
}
export type PathAlgo = 'bfs' | 'dfs' | 'dijkstra' | 'astar' | 'greedy'

export const PATH_META: Record<PathAlgo, { name: string; optimal: string; note: string }> = {
  bfs: {
    name: 'Breadth-First Search',
    optimal: 'Shortest path (unweighted)',
    note: 'Explores in rings from the start. Guarantees the fewest steps when all moves cost the same.',
  },
  dfs: {
    name: 'Depth-First Search',
    optimal: 'Not optimal',
    note: 'Dives down one branch as far as it can. Finds a path, rarely a short one.',
  },
  dijkstra: {
    name: "Dijkstra's Algorithm",
    optimal: 'Shortest path (weighted)',
    note: 'Always expands the cheapest known cell. Optimal with weights, but explores widely.',
  },
  astar: {
    name: 'A* Search',
    optimal: 'Shortest path (weighted)',
    note: 'Dijkstra plus a heuristic (Manhattan distance) that pulls the search toward the goal.',
  },
  greedy: {
    name: 'Greedy Best-First',
    optimal: 'Not optimal',
    note: 'Follows the heuristic only. Very fast, can be fooled by walls.',
  },
}

export const key = (r: number, c: number) => `${r},${c}`
const DIRS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
]

function neighbours(g: Grid, { r, c }: Cell): Cell[] {
  const out: Cell[] = []
  for (const [dr, dc] of DIRS) {
    const nr = r + dr,
      nc = c + dc
    if (nr >= 0 && nc >= 0 && nr < g.rows && nc < g.cols && !g.walls.has(key(nr, nc)))
      out.push({ r: nr, c: nc })
  }
  return out
}
function cost(g: Grid, cell: Cell) {
  return g.weights.get(key(cell.r, cell.c)) ?? 1
}
function manhattan(a: Cell, b: Cell) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c)
}
function rebuild(parent: Map<string, Cell | null>, end: Cell): Cell[] {
  const path: Cell[] = []
  let cur: Cell | null = end
  while (cur) {
    path.push(cur)
    cur = parent.get(key(cur.r, cur.c)) ?? null
  }
  return path.reverse()
}

export function* bfs(g: Grid, start: Cell, end: Cell): Generator<PathFrame> {
  const q: Cell[] = [start]
  const parent = new Map<string, Cell | null>([[key(start.r, start.c), null]])
  while (q.length) {
    const cur = q.shift()!
    yield { visited: cur, frontier: [...q] }
    if (cur.r === end.r && cur.c === end.c) {
      yield { path: rebuild(parent, end), done: true, found: true }
      return
    }
    for (const n of neighbours(g, cur)) {
      const k = key(n.r, n.c)
      if (!parent.has(k)) {
        parent.set(k, cur)
        q.push(n)
      }
    }
  }
  yield { done: true, found: false }
}

export function* dfs(g: Grid, start: Cell, end: Cell): Generator<PathFrame> {
  const stack: Cell[] = [start]
  const parent = new Map<string, Cell | null>([[key(start.r, start.c), null]])
  const seen = new Set<string>()
  while (stack.length) {
    const cur = stack.pop()!
    const k = key(cur.r, cur.c)
    if (seen.has(k)) continue
    seen.add(k)
    yield { visited: cur, frontier: [...stack] }
    if (cur.r === end.r && cur.c === end.c) {
      yield { path: rebuild(parent, end), done: true, found: true }
      return
    }
    for (const n of neighbours(g, cur).reverse()) {
      const nk = key(n.r, n.c)
      if (!seen.has(nk)) {
        if (!parent.has(nk)) parent.set(nk, cur)
        stack.push(n)
      }
    }
  }
  yield { done: true, found: false }
}

/** Shared priority-queue search: Dijkstra (h=0), A* (g+h), Greedy (h only). */
function* best(
  g: Grid,
  start: Cell,
  end: Cell,
  mode: 'dijkstra' | 'astar' | 'greedy'
): Generator<PathFrame> {
  const dist = new Map<string, number>([[key(start.r, start.c), 0]])
  const parent = new Map<string, Cell | null>([[key(start.r, start.c), null]])
  const closed = new Set<string>()
  const open: { cell: Cell; f: number }[] = [{ cell: start, f: 0 }]
  const priority = (gc: number, cell: Cell) =>
    mode === 'dijkstra' ? gc : mode === 'astar' ? gc + manhattan(cell, end) : manhattan(cell, end)
  while (open.length) {
    open.sort((a, b) => a.f - b.f)
    const { cell: cur } = open.shift()!
    const k = key(cur.r, cur.c)
    if (closed.has(k)) continue
    closed.add(k)
    yield { visited: cur, frontier: open.map((o) => o.cell) }
    if (cur.r === end.r && cur.c === end.c) {
      yield { path: rebuild(parent, end), done: true, found: true }
      return
    }
    for (const n of neighbours(g, cur)) {
      const nk = key(n.r, n.c)
      if (closed.has(nk)) continue
      const nd = (dist.get(k) ?? 0) + cost(g, n)
      if (nd < (dist.get(nk) ?? Infinity)) {
        dist.set(nk, nd)
        parent.set(nk, cur)
        open.push({ cell: n, f: priority(nd, n) })
      }
    }
  }
  yield { done: true, found: false }
}

export const PATHFINDERS: Record<PathAlgo, (g: Grid, s: Cell, e: Cell) => Generator<PathFrame>> = {
  bfs,
  dfs,
  dijkstra: (g, s, e) => best(g, s, e, 'dijkstra'),
  astar: (g, s, e) => best(g, s, e, 'astar'),
  greedy: (g, s, e) => best(g, s, e, 'greedy'),
}

/** Recursive-division maze generator: returns wall keys. */
export function generateMaze(rows: number, cols: number, start: Cell, end: Cell): Set<string> {
  const walls = new Set<string>()
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) walls.add(key(r, c))
  const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
  function divide(r0: number, c0: number, r1: number, c1: number) {
    const h = r1 - r0,
      w = c1 - c0
    if (h < 3 || w < 3) return
    const horizontal = h > w ? true : h < w ? false : Math.random() < 0.5
    if (horizontal) {
      const r = r0 + 2 * rnd(1, (h - 1) >> 1)
      const gap = c0 + 2 * rnd(0, (w - 2) >> 1) + 1 // odd offset, strictly inside the region
      for (let c = c0; c <= c1; c++) if (c !== gap) walls.add(key(r, c))
      divide(r0, c0, r, c1)
      divide(r, c0, r1, c1)
    } else {
      const c = c0 + 2 * rnd(1, (w - 1) >> 1)
      const gap = r0 + 2 * rnd(0, (h - 2) >> 1) + 1
      for (let r = r0; r <= r1; r++) if (r !== gap) walls.add(key(r, c))
      divide(r0, c0, r1, c)
      divide(r0, c, r1, c1)
    }
  }
  divide(0, 0, rows - 1, cols - 1)
  walls.delete(key(start.r, start.c))
  walls.delete(key(end.r, end.c))
  for (const [dr, dc] of DIRS) {
    walls.delete(key(start.r + dr, start.c + dc))
    walls.delete(key(end.r + dr, end.c + dc))
  }
  return walls
}
