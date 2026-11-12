import { useCallback, useEffect, useRef, useState } from 'react'
import {
  SORTERS,
  SORT_META,
  randomArray,
  type SortAlgo,
  type SortFrame,
} from '../algorithms/sorting'

const ALGOS = Object.keys(SORT_META) as SortAlgo[]

export default function SortingView() {
  const [algo, setAlgo] = useState<SortAlgo>('quick')
  const [size, setSize] = useState(40)
  const [speed, setSpeed] = useState(60) // frames per second
  const [base, setBase] = useState(() => randomArray(40))
  const [frame, setFrame] = useState<SortFrame>({ array: base })
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const [stats, setStats] = useState({ compares: 0, writes: 0, ms: 0 })
  const [stepNo, setStepNo] = useState(0)
  const stepCount = useRef(0)
  const gen = useRef<Generator<SortFrame> | null>(null)
  const raf = useRef(0)
  const last = useRef(0)
  const t0 = useRef(0)
  const counts = useRef({ compares: 0, writes: 0 })

  const reset = useCallback(
    (n = size) => {
      cancelAnimationFrame(raf.current)
      gen.current = null
      setRunning(false)
      setStarted(false)
      const a = randomArray(n)
      setBase(a)
      setFrame({ array: a })
      setStats({ compares: 0, writes: 0, ms: 0 })
      counts.current = { compares: 0, writes: 0 }
      stepCount.current = 0
      setStepNo(0)
    },
    [size]
  )

  const step = useCallback(
    function step(now: number) {
      if (!gen.current) return
      const interval = 1000 / speed
      if (now - last.current >= interval) {
        last.current = now
        const batch = speed > 60 ? Math.ceil(speed / 60) : 1 // run several steps per frame at high speed
        let f: IteratorResult<SortFrame> | undefined
        let lastFrame: SortFrame | undefined
        for (let i = 0; i < batch; i++) {
          f = gen.current.next()
          if (f.done) break
          lastFrame = f.value
          stepCount.current++
          if (f.value.compare) counts.current.compares++
          if (f.value.swap || f.value.write !== undefined) counts.current.writes++
        }
        // Always show the newest frame, including the final "sorted" one that may
        // arrive in the same batch as the generator finishing.
        if (lastFrame) {
          setFrame(lastFrame)
          setStepNo(stepCount.current)
        }
        setStats({ ...counts.current, ms: Math.round(performance.now() - t0.current) })
        if (!f || f.done) {
          gen.current = null
          setRunning(false)
          setStarted(false)
          return
        }
      }
      raf.current = requestAnimationFrame(step)
    },
    [speed]
  )

  const play = () => {
    if (running) {
      cancelAnimationFrame(raf.current)
      setRunning(false)
      return
    }
    if (!gen.current) {
      gen.current = SORTERS[algo](base)
      counts.current = { compares: 0, writes: 0 }
      stepCount.current = 0
      t0.current = performance.now()
    }
    setStarted(true)
    setRunning(true)
    last.current = 0
    raf.current = requestAnimationFrame(step)
  }
  const stepOnce = () => {
    if (!gen.current) {
      gen.current = SORTERS[algo](base)
      counts.current = { compares: 0, writes: 0 }
      stepCount.current = 0
      t0.current = performance.now()
      setStarted(true)
    }
    const f = gen.current.next()
    if (!f.done) {
      stepCount.current++
      setStepNo(stepCount.current)
      if (f.value.compare) counts.current.compares++
      if (f.value.swap || f.value.write !== undefined) counts.current.writes++
      setFrame(f.value)
      setStats({ ...counts.current, ms: stats.ms })
    } else {
      gen.current = null
      setStarted(false)
    }
  }

  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  useEffect(() => {
    if (running) {
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(step)
    }
  }, [speed, running, step])

  const meta = SORT_META[algo]
  const max = Math.max(...frame.array)
  const sortedSet = new Set(frame.sorted ?? [])

  return (
    <div className="view">
      <div className="controls">
        <label>
          Algorithm
          <select
            value={algo}
            onChange={(e) => {
              setAlgo(e.target.value as SortAlgo)
              gen.current = null
              setFrame({ array: base })
              setRunning(false)
              setStarted(false)
              stepCount.current = 0
              setStepNo(0)
              cancelAnimationFrame(raf.current)
            }}
          >
            {ALGOS.map((k) => (
              <option key={k} value={k}>
                {SORT_META[k].name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Size <span className="val">{size}</span>
          <input
            type="range"
            min={8}
            max={150}
            value={size}
            disabled={running}
            onChange={(e) => {
              const n = +e.target.value
              setSize(n)
              reset(n)
            }}
          />
        </label>
        <label>
          Speed <span className="val">{speed} steps/s</span>
          <input
            type="range"
            min={2}
            max={600}
            value={speed}
            onChange={(e) => setSpeed(+e.target.value)}
          />
        </label>
        <div className="buttons">
          <button className="primary" onClick={play}>
            {running ? 'Pause' : started ? 'Resume' : 'Sort'}
          </button>
          <button onClick={stepOnce} disabled={running}>
            Step
          </button>
          <button onClick={() => reset()}>Shuffle</button>
        </div>
      </div>

      <div
        className={`bars${frame.array.length <= 32 ? ' labelled' : ''}`}
        role="img"
        aria-label={`${meta.name} visualisation`}
      >
        {frame.array.map((v, i) => {
          const isGap = frame.held?.index === i
          let cls = 'bar'
          if (sortedSet.has(i)) cls += ' sorted'
          if (frame.compare?.includes(i)) cls += ' compare'
          if (frame.swap?.includes(i)) cls += ' swap'
          if (frame.write === i) cls += ' write'
          if (frame.pivot === i) cls += ' pivot'
          if (isGap) cls += ' gap'
          const out = frame.range && (i < frame.range[0] || i > frame.range[1])
          const mark = frame.mark?.index === i ? frame.mark.name : null
          return (
            <div key={i} className={`col${out ? ' out' : ''}`}>
              {mark && <span className="mark">{mark}</span>}
              {isGap && frame.held && (
                <div className="bar held" style={{ height: `${(frame.held.value / max) * 100}%` }}>
                  <span className="tag">key</span>
                  <span className="v">{frame.held.value}</span>
                </div>
              )}
              <div className={cls} style={{ height: `${(v / max) * 100}%` }}>
                {!isGap && <span className="v">{v}</span>}
              </div>
            </div>
          )
        })}
      </div>

      <p className="caption" aria-live="polite">
        <span className="step-no">Step {stepNo}</span>
        {frame.label ?? (started ? '' : 'Press Sort, or Step to go one operation at a time')}
      </p>

      <div className="legend">
        <span>
          <i className="sw compare" /> comparing
        </span>
        <span>
          <i className="sw swap" /> swapped
        </span>
        <span>
          <i className="sw write" /> written
        </span>
        <span>
          <i className="sw held" /> key being inserted
        </span>
        <span>
          <i className="sw pivot" /> pivot
        </span>
        <span>
          <i className="sw sorted" /> final position
        </span>
        <span>
          <i className="sw out" /> outside current range
        </span>
      </div>

      <div className="info">
        <div>
          <h3>{meta.name}</h3>
          <p>{meta.note}</p>
        </div>
        <dl>
          <div>
            <dt>Time</dt>
            <dd>{meta.time}</dd>
          </div>
          <div>
            <dt>Space</dt>
            <dd>{meta.space}</dd>
          </div>
          <div>
            <dt>Stable</dt>
            <dd>{meta.stable ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt>Comparisons</dt>
            <dd>{stats.compares}</dd>
          </div>
          <div>
            <dt>Writes</dt>
            <dd>{stats.writes}</dd>
          </div>
          <div>
            <dt>Elapsed</dt>
            <dd>{stats.ms} ms</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
