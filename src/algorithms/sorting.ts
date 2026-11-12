/** Sorting algorithms as generators. Each yielded frame describes one visual step. */
export type SortFrame = {
  array: number[]
  /** indices being compared */
  compare?: [number, number]
  /** indices just swapped */
  swap?: [number, number]
  /** index just written */
  write?: number
  /** indices that are in their final place */
  sorted?: number[]
  pivot?: number
  /** the sub-array the algorithm is currently working on (inclusive) */
  range?: [number, number]
  /** an element temporarily lifted out of the array (insertion key); index = the gap it sits over */
  held?: { value: number; index: number }
  /** a named pointer such as the current minimum or the partition boundary */
  mark?: { index: number; name: string }
  /** plain-language description of this step */
  label?: string
}

export type SortAlgo = 'bubble' | 'insertion' | 'selection' | 'merge' | 'quick' | 'heap'

export const SORT_META: Record<
  SortAlgo,
  { name: string; time: string; space: string; stable: boolean; note: string }
> = {
  bubble: {
    name: 'Bubble Sort',
    time: 'O(n²)',
    space: 'O(1)',
    stable: true,
    note: 'Repeatedly swaps adjacent out-of-order pairs. Simple, slow.',
  },
  insertion: {
    name: 'Insertion Sort',
    time: 'O(n²)',
    space: 'O(1)',
    stable: true,
    note: 'Builds the sorted prefix one element at a time. Great on nearly sorted data.',
  },
  selection: {
    name: 'Selection Sort',
    time: 'O(n²)',
    space: 'O(1)',
    stable: false,
    note: 'Finds the minimum of the unsorted part and swaps it into place.',
  },
  merge: {
    name: 'Merge Sort',
    time: 'O(n log n)',
    space: 'O(n)',
    stable: true,
    note: 'Divide and conquer: split, sort halves, merge. Predictable performance.',
  },
  quick: {
    name: 'Quick Sort',
    time: 'O(n log n) avg',
    space: 'O(log n)',
    stable: false,
    note: 'Partitions around a pivot. Fast in practice, O(n²) worst case.',
  },
  heap: {
    name: 'Heap Sort',
    time: 'O(n log n)',
    space: 'O(1)',
    stable: false,
    note: 'Builds a max-heap and repeatedly extracts the largest element.',
  },
}

const all = (arr: number[]) => arr.map((_, i) => i)

export function* bubbleSort(a: number[]): Generator<SortFrame> {
  const arr = [...a]
  const n = arr.length
  const sorted: number[] = []
  for (let i = 0; i < n - 1; i++) {
    let swapped = false
    const range: [number, number] = [0, n - i - 1]
    for (let j = 0; j < n - i - 1; j++) {
      yield {
        array: [...arr],
        compare: [j, j + 1],
        sorted: [...sorted],
        range,
        label: `Compare ${arr[j]} and ${arr[j + 1]}`,
      }
      if (arr[j] > arr[j + 1]) {
        ;[arr[j], arr[j + 1]] = [arr[j + 1], arr[j]]
        swapped = true
        yield {
          array: [...arr],
          swap: [j, j + 1],
          sorted: [...sorted],
          range,
          label: `${arr[j + 1]} > ${arr[j]}, so swap them`,
        }
      }
    }
    sorted.unshift(n - i - 1)
    yield {
      array: [...arr],
      sorted: [...sorted],
      range,
      label: `${arr[n - i - 1]} has bubbled to position ${n - i - 1} and is final`,
    }
    if (!swapped) break
  }
  yield { array: [...arr], sorted: all(arr), label: 'Sorted' }
}

export function* insertionSort(a: number[]): Generator<SortFrame> {
  const arr = [...a]
  for (let i = 1; i < arr.length; i++) {
    const key = arr[i]
    let j = i - 1
    const sorted = range(0, i)
    yield {
      array: [...arr],
      held: { value: key, index: i },
      compare: [j, i],
      sorted,
      range: [0, i],
      label: `Lift ${key} out as the key and compare it with ${arr[j]}`,
    }
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j]
      yield {
        array: [...arr],
        write: j + 1,
        held: { value: key, index: j },
        sorted,
        range: [0, i],
        label: `${arr[j]} > ${key}, so shift ${arr[j]} one place right`,
      }
      j--
      if (j >= 0)
        yield {
          array: [...arr],
          compare: [j, j + 1],
          held: { value: key, index: j + 1 },
          sorted,
          range: [0, i],
          label: `Compare ${arr[j]} with the key ${key}`,
        }
    }
    arr[j + 1] = key
    yield {
      array: [...arr],
      write: j + 1,
      sorted: range(0, i + 1),
      range: [0, i],
      label: `Drop the key ${key} into the gap at position ${j + 1}`,
    }
  }
  yield { array: [...arr], sorted: all(arr), label: 'Sorted' }
}

export function* selectionSort(a: number[]): Generator<SortFrame> {
  const arr = [...a]
  const n = arr.length
  for (let i = 0; i < n - 1; i++) {
    let min = i
    const rng: [number, number] = [i, n - 1]
    for (let j = i + 1; j < n; j++) {
      yield {
        array: [...arr],
        compare: [min, j],
        mark: { index: min, name: 'min' },
        sorted: range(0, i),
        range: rng,
        label: `Is ${arr[j]} smaller than the current minimum ${arr[min]}?`,
      }
      if (arr[j] < arr[min]) {
        min = j
        yield {
          array: [...arr],
          mark: { index: min, name: 'min' },
          sorted: range(0, i),
          range: rng,
          label: `Yes, ${arr[min]} is the new minimum`,
        }
      }
    }
    if (min !== i) {
      ;[arr[i], arr[min]] = [arr[min], arr[i]]
      yield {
        array: [...arr],
        swap: [i, min],
        sorted: range(0, i),
        range: rng,
        label: `Swap the minimum ${arr[i]} into position ${i}`,
      }
    } else {
      yield {
        array: [...arr],
        sorted: range(0, i + 1),
        range: rng,
        label: `${arr[i]} is already the minimum, it stays at position ${i}`,
      }
    }
  }
  yield { array: [...arr], sorted: all(arr), label: 'Sorted' }
}

export function* mergeSort(a: number[]): Generator<SortFrame> {
  const arr = [...a]
  function* sort(lo: number, hi: number): Generator<SortFrame> {
    if (hi - lo < 1) return
    const mid = (lo + hi) >> 1
    yield {
      array: [...arr],
      range: [lo, hi],
      mark: { index: mid, name: 'split' },
      label: `Split positions ${lo}–${hi} into ${lo}–${mid} and ${mid + 1}–${hi}`,
    }
    yield* sort(lo, mid)
    yield* sort(mid + 1, hi)
    const merged: number[] = []
    let i = lo,
      j = mid + 1
    while (i <= mid && j <= hi) {
      yield {
        array: [...arr],
        compare: [i, j],
        range: [lo, hi],
        mark: { index: mid, name: 'split' },
        label: `Merge: take the smaller of ${arr[i]} (left) and ${arr[j]} (right)`,
      }
      merged.push(arr[i] <= arr[j] ? arr[i++] : arr[j++])
    }
    while (i <= mid) merged.push(arr[i++])
    while (j <= hi) merged.push(arr[j++])
    for (let k = 0; k < merged.length; k++) {
      arr[lo + k] = merged[k]
      yield {
        array: [...arr],
        write: lo + k,
        range: [lo, hi],
        label: `Write ${merged[k]} back to position ${lo + k}`,
      }
    }
    yield {
      array: [...arr],
      range: [lo, hi],
      label: `Positions ${lo}–${hi} are now merged in order`,
    }
  }
  yield* sort(0, arr.length - 1)
  yield { array: [...arr], sorted: all(arr), label: 'Sorted' }
}

export function* quickSort(a: number[]): Generator<SortFrame> {
  const arr = [...a]
  const sorted: number[] = []
  function* sort(lo: number, hi: number): Generator<SortFrame> {
    if (lo >= hi) {
      if (lo === hi) {
        sorted.push(lo)
        yield {
          array: [...arr],
          sorted: [...sorted],
          label: `Single element ${arr[lo]} at position ${lo} is in place`,
        }
      }
      return
    }
    const pivot = arr[hi]
    let i = lo
    yield {
      array: [...arr],
      pivot: hi,
      range: [lo, hi],
      mark: { index: i, name: 'boundary' },
      sorted: [...sorted],
      label: `Choose ${pivot} as the pivot for positions ${lo}–${hi}`,
    }
    for (let j = lo; j < hi; j++) {
      yield {
        array: [...arr],
        compare: [j, hi],
        pivot: hi,
        range: [lo, hi],
        mark: { index: i, name: 'boundary' },
        sorted: [...sorted],
        label: `Is ${arr[j]} smaller than the pivot ${pivot}?`,
      }
      if (arr[j] < pivot) {
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
        yield {
          array: [...arr],
          swap: [i, j],
          pivot: hi,
          range: [lo, hi],
          mark: { index: i, name: 'boundary' },
          sorted: [...sorted],
          label:
            i === j
              ? `Yes, ${arr[i]} already sits in the small side`
              : `Yes, move ${arr[i]} to the small side (swap with ${arr[j]})`,
        }
        i++
      }
    }
    ;[arr[i], arr[hi]] = [arr[hi], arr[i]]
    sorted.push(i)
    yield {
      array: [...arr],
      swap: [i, hi],
      range: [lo, hi],
      sorted: [...sorted],
      label: `Place the pivot ${pivot} at position ${i}: everything left is smaller, right is larger`,
    }
    yield* sort(lo, i - 1)
    yield* sort(i + 1, hi)
  }
  yield* sort(0, arr.length - 1)
  yield { array: [...arr], sorted: all(arr), label: 'Sorted' }
}

export function* heapSort(a: number[]): Generator<SortFrame> {
  const arr = [...a]
  const n = arr.length
  const sorted: number[] = []
  function* heapify(size: number, i: number, phase: string): Generator<SortFrame> {
    let largest = i
    const l = 2 * i + 1,
      r = 2 * i + 2
    if (l < size) {
      yield {
        array: [...arr],
        compare: [l, largest],
        mark: { index: i, name: 'parent' },
        range: [0, size - 1],
        sorted: [...sorted],
        label: `${phase}: compare left child ${arr[l]} with ${arr[largest]}`,
      }
      if (arr[l] > arr[largest]) largest = l
    }
    if (r < size) {
      yield {
        array: [...arr],
        compare: [r, largest],
        mark: { index: i, name: 'parent' },
        range: [0, size - 1],
        sorted: [...sorted],
        label: `${phase}: compare right child ${arr[r]} with ${arr[largest]}`,
      }
      if (arr[r] > arr[largest]) largest = r
    }
    if (largest !== i) {
      ;[arr[i], arr[largest]] = [arr[largest], arr[i]]
      yield {
        array: [...arr],
        swap: [i, largest],
        range: [0, size - 1],
        sorted: [...sorted],
        label: `${phase}: child ${arr[i]} is larger than parent ${arr[largest]}, swap them`,
      }
      yield* heapify(size, largest, phase)
    }
  }
  for (let i = (n >> 1) - 1; i >= 0; i--) yield* heapify(n, i, 'Build heap')
  yield {
    array: [...arr],
    range: [0, n - 1],
    mark: { index: 0, name: 'max' },
    label: `Max-heap built: the largest value ${arr[0]} is at the root`,
  }
  for (let i = n - 1; i > 0; i--) {
    ;[arr[0], arr[i]] = [arr[i], arr[0]]
    sorted.unshift(i)
    yield {
      array: [...arr],
      swap: [0, i],
      range: [0, i - 1],
      sorted: [...sorted],
      label: `Move the root ${arr[i]} to position ${i}, then restore the heap`,
    }
    yield* heapify(i, 0, 'Sift down')
  }
  yield { array: [...arr], sorted: all(arr), label: 'Sorted' }
}

export const SORTERS: Record<SortAlgo, (a: number[]) => Generator<SortFrame>> = {
  bubble: bubbleSort,
  insertion: insertionSort,
  selection: selectionSort,
  merge: mergeSort,
  quick: quickSort,
  heap: heapSort,
}

function range(a: number, b: number) {
  const out: number[] = []
  for (let i = a; i < b; i++) out.push(i)
  return out
}

export function randomArray(n: number, max = 100): number[] {
  return Array.from({ length: n }, () => 5 + Math.floor(Math.random() * (max - 5)))
}
