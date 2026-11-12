import { useEffect, useState } from 'react'
import SortingView from './components/SortingView'
import PathfindingView from './components/PathfindingView'

type Tab = 'sorting' | 'pathfinding'

export default function App() {
  const [tab, setTab] = useState<Tab>(() =>
    location.hash === '#pathfinding' ? 'pathfinding' : 'sorting'
  )
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('algolab-theme') === 'dark'
    } catch {
      return true
    }
  })
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    try {
      localStorage.setItem('algolab-theme', dark ? 'dark' : 'light')
    } catch {
      /* ignore */
    }
  }, [dark])
  useEffect(() => {
    location.hash = tab
  }, [tab])

  return (
    <>
      <header className="top">
        <div className="brand">
          <span className="logo">{'{}'}</span> AlgoLab
        </div>
        <nav className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'sorting'}
            className={tab === 'sorting' ? 'on' : ''}
            onClick={() => setTab('sorting')}
          >
            Sorting
          </button>
          <button
            role="tab"
            aria-selected={tab === 'pathfinding'}
            className={tab === 'pathfinding' ? 'on' : ''}
            onClick={() => setTab('pathfinding')}
          >
            Pathfinding
          </button>
        </nav>
        <div className="right">
          <a href="https://github.com/harishxdevs/algo-visualizer" target="_blank" rel="noreferrer">
            Source
          </a>
          <button className="icon" aria-label="Toggle theme" onClick={() => setDark((d) => !d)}>
            {dark ? '☀' : '☾'}
          </button>
        </div>
      </header>
      <main>
        <p className="intro">
          {tab === 'sorting'
            ? 'Watch six sorting algorithms work through the same data. Compare their shapes, counts and speed.'
            : 'Draw walls and weights, then watch five search algorithms explore the grid and find a route.'}
        </p>
        {tab === 'sorting' ? <SortingView /> : <PathfindingView />}
      </main>
      <footer>
        Built by{' '}
        <a href="https://harishxdevs.github.io/portfolio/" target="_blank" rel="noreferrer">
          M Harish Babu
        </a>{' '}
        with React, TypeScript and Vite. No libraries for the algorithms, just generators and
        requestAnimationFrame.
      </footer>
    </>
  )
}
