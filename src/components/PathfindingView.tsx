import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  PATHFINDERS,
  PATH_META,
  generateMaze,
  key,
  type Cell,
  type Grid,
  type PathAlgo,
  type PathFrame,
} from '../algorithms/pathfinding'

const ALGOS = Object.keys(PATH_META) as PathAlgo[]
type Tool = 'wall' | 'weight' | 'start' | 'end'

export default function PathfindingView() {
  // Remounting on resize resets every piece of grid state in one go.
  const [rows, cols] = useGridSize()
  return <Board key={`${rows}x${cols}`} rows={rows} cols={cols} />
}

function Board({ rows, cols }: { rows: number; cols: number }) {
  const [algo, setAlgo] = useState<PathAlgo>('astar')
  const [walls, setWalls] = useState<Set<string>>(new Set())
  const [weights, setWeights] = useState<Map<string, number>>(new Map())
  const [start, setStart] = useState<Cell>({ r: Math.floor(rows / 2), c: Math.floor(cols / 5) })
  const [end, setEnd] = useState<Cell>({ r: Math.floor(rows / 2), c: Math.floor((cols * 4) / 5) })
  const [tool, setTool] = useState<Tool>('wall')
  const [visited, setVisited] = useState<Set<string>>(new Set())
  const [frontier, setFrontier] = useState<Set<string>>(new Set())
  const [path, setPath] = useState<Set<string>>(new Set())
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [result, setResult] = useState<{
    found: boolean
    visited: number
    length: number
    cost: number
  } | null>(null)
  const [speed, setSpeed] = useState(120)
  const gen = useRef<Generator<PathFrame> | null>(null)
  const raf = useRef(0)
  const last = useRef(0)
  const drawing = useRef<boolean | null>(null)

  const grid: Grid = useMemo(() => ({ rows, cols, walls, weights }), [rows, cols, walls, weights])

  const clearSearch = () => {
    cancelAnimationFrame(raf.current)
    gen.current = null
    setRunning(false)
    setPaused(false)
    setVisited(new Set())
    setFrontier(new Set())
    setPath(new Set())
    setResult(null)
  }
  const clearAll = () => {
    clearSearch()
    setWalls(new Set())
    setWeights(new Map())
  }

  const step = useCallback(
    function step(now: number) {
      if (!gen.current) return
      if (now - last.current >= 1000 / speed) {
        last.current = now
        const batch = speed > 60 ? Math.ceil(speed / 60) : 1
        for (let i = 0; i < batch; i++) {
          const f = gen.current.next()
          if (f.done) {
            gen.current = null
            setRunning(false)
            setPaused(false)
            return
          }
          const v = f.value
          if (v.visited) {
            const k = key(v.visited.r, v.visited.c)
            setVisited((s) => new Set(s).add(k))
          }
          if (v.frontier) setFrontier(new Set(v.frontier.map((c) => key(c.r, c.c))))
          if (v.done) {
            const p = v.path ?? []
            setPath(new Set(p.map((c) => key(c.r, c.c))))
            setFrontier(new Set())
            setVisited((s) => {
              setResult({
                found: !!v.found,
                visited: s.size,
                length: Math.max(p.length - 1, 0),
                cost: p.slice(1).reduce((a, c) => a + (weights.get(key(c.r, c.c)) ?? 1), 0),
              })
              return s
            })
            gen.current = null
            setRunning(false)
            setPaused(false)
            return
          }
        }
      }
      raf.current = requestAnimationFrame(step)
    },
    [speed, weights]
  )

  const run = () => {
    if (running) {
      cancelAnimationFrame(raf.current)
      setRunning(false)
      setPaused(true)
      return
    }
    if (!gen.current) {
      setVisited(new Set())
      setFrontier(new Set())
      setPath(new Set())
      setResult(null)
      gen.current = PATHFINDERS[algo](grid, start, end)
    }
    setRunning(true)
    setPaused(false)
    last.current = 0
    raf.current = requestAnimationFrame(step)
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  useEffect(() => {
    if (running) {
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(step)
    }
  }, [speed, running, step])

  const paint = (r: number, c: number, add: boolean) => {
    const k = key(r, c)
    if ((r === start.r && c === start.c) || (r === end.r && c === end.c)) return
    if (tool === 'wall')
      setWalls((w) => {
        const n = new Set(w)
        if (add) n.add(k)
        else n.delete(k)
        return n
      })
    if (tool === 'weight') {
      setWeights((w) => {
        const n = new Map(w)
        if (add) n.set(k, 5)
        else n.delete(k)
        return n
      })
      setWalls((w) => {
        const n = new Set(w)
        n.delete(k)
        return n
      })
    }
  }
  const onDown = (r: number, c: number) => {
    if (running) return
    if (tool === 'start' || tool === 'end') {
      if (tool === 'start') setStart({ r, c })
      else setEnd({ r, c })
      // a start/target cell must be passable: clear any wall or weight under it
      const k = key(r, c)
      setWalls((w) => {
        if (!w.has(k)) return w
        const n = new Set(w)
        n.delete(k)
        return n
      })
      setWeights((w) => {
        if (!w.has(k)) return w
        const n = new Map(w)
        n.delete(k)
        return n
      })
      clearSearch()
      return
    }
    const k = key(r, c)
    const has = tool === 'wall' ? walls.has(k) : weights.has(k)
    drawing.current = !has
    paint(r, c, !has)
    if (path.size) clearSearch()
  }
  const onEnter = (r: number, c: number) => {
    if (drawing.current !== null && !running) paint(r, c, drawing.current)
  }
  useEffect(() => {
    const up = () => {
      drawing.current = null
    }
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  const maze = () => {
    clearSearch()
    setWeights(new Map())
    setWalls(generateMaze(rows, cols, start, end))
  }
  const meta = PATH_META[algo]

  return (
    <div className="view">
      <div className="controls">
        <label>
          Algorithm
          <select
            value={algo}
            onChange={(e) => {
              setAlgo(e.target.value as PathAlgo)
              clearSearch()
            }}
          >
            {ALGOS.map((k) => (
              <option key={k} value={k}>
                {PATH_META[k].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Draw
          <div className="seg">
            {(['wall', 'weight', 'start', 'end'] as Tool[]).map((t) => (
              <button key={t} className={tool === t ? 'on' : ''} onClick={() => setTool(t)}>
                {t}
              </button>
            ))}
          </div>
        </label>
        <label>
          Speed <span className="val">{speed} cells/s</span>
          <input
            type="range"
            min={5}
            max={1000}
            value={speed}
            onChange={(e) => setSpeed(+e.target.value)}
          />
        </label>
        <div className="buttons">
          <button className="primary" onClick={run}>
            {running ? 'Pause' : paused ? 'Resume' : 'Find path'}
          </button>
          <button onClick={maze} disabled={running}>
            Maze
          </button>
          <button onClick={clearSearch} disabled={running}>
            Clear path
          </button>
          <button onClick={clearAll} disabled={running}>
            Clear all
          </button>
        </div>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        onPointerLeave={() => {
          drawing.current = null
        }}
      >
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols),
            c = i % cols,
            k = key(r, c)
          let cls = 'cell'
          if (walls.has(k)) cls += ' wall'
          else if (weights.has(k)) cls += ' weight'
          if (visited.has(k)) cls += ' visited'
          if (frontier.has(k)) cls += ' frontier'
          if (path.has(k)) cls += ' path'
          if (r === start.r && c === start.c) cls += ' start'
          if (r === end.r && c === end.c) cls += ' end'
          return (
            <div
              key={k}
              className={cls}
              onPointerDown={(e) => {
                e.preventDefault()
                onDown(r, c)
              }}
              onPointerEnter={() => onEnter(r, c)}
            />
          )
        })}
      </div>

      <div className="legend">
        <span>
          <i className="sw start" /> start
        </span>
        <span>
          <i className="sw end" /> target
        </span>
        <span>
          <i className="sw wall" /> wall
        </span>
        <span>
          <i className="sw weight" /> weight (cost 5)
        </span>
        <span>
          <i className="sw frontier" /> frontier
        </span>
        <span>
          <i className="sw visited" /> visited
        </span>
        <span>
          <i className="sw path" /> path
        </span>
      </div>

      <div className="info">
        <div>
          <h3>{meta.name}</h3>
          <p>{meta.note}</p>
          <p className="muted">
            Click and drag on the grid to draw. Pick a tool to move the start or target.
          </p>
        </div>
        <dl>
          <div>
            <dt>Guarantee</dt>
            <dd>{meta.optimal}</dd>
          </div>
          <div>
            <dt>Result</dt>
            <dd>{result ? (result.found ? 'Path found' : 'No path') : '—'}</dd>
          </div>
          <div>
            <dt>Visited</dt>
            <dd>{result?.visited ?? visited.size}</dd>
          </div>
          <div>
            <dt>Path length</dt>
            <dd>{result?.length ?? '—'}</dd>
          </div>
          <div>
            <dt>Path cost</dt>
            <dd>{result?.cost ?? '—'}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

/** Grid dimensions that fit the viewport. */
function useGridSize(): [number, number] {
  const calc = () => {
    const w = Math.min(window.innerWidth - 48, 1100)
    const cols = Math.max(15, Math.min(55, Math.floor(w / 20)))
    const rows = Math.max(11, Math.min(27, Math.floor(cols * 0.5)))
    return [rows | 1, cols | 1] as [number, number]
  }
  const [size, setSize] = useState<[number, number]>(calc)
  useEffect(() => {
    let t = 0
    const on = () => {
      clearTimeout(t)
      t = window.setTimeout(
        () =>
          setSize((s) => {
            const n = calc()
            return n[0] === s[0] && n[1] === s[1] ? s : n
          }),
        200
      )
    }
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return size
}
