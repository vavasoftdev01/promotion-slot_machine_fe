import { create } from 'zustand'

const COMMON_SYMBOLS = ['cherry','cherry','cherry','cherry','lemon','lemon','orange','seven','star','grape','watermelon','diamond']
const JACKPOT_LETTERS = ['K', 'B', 'C', 'G', 'A', 'M', 'E']
const CYLINDER_N = 14
const COLS = 7

function buildCylinderSegments(top, mid, bot, reelIndex) {
  const pool = [...COMMON_SYMBOLS, JACKPOT_LETTERS[reelIndex]]
  const segs = []
  for (let i = 0; i < CYLINDER_N; i++) {
    if (i === 0) segs.push(top)
    else if (i === 1) segs.push(mid)
    else if (i === 2) segs.push(bot)
    else segs.push(pool[Math.floor(Math.random() * pool.length)])
  }
  return segs
}

function getCellSize() {
  const w = window.innerWidth
  if (w < 640) return { w: 38, h: 43 }
  if (w < 768) return { w: 52, h: 58 }
  if (w < 1024) return { w: 66, h: 74 }
  return { w: 80, h: 90 }
}

const useGameStore = create((set) => ({
  spinning: false,
  winData: null,
  freeSpins: 0,
  miniGameActive: false,
  winningCells: new Set(),
  cellSize: getCellSize(),
  spinKey: 0,
  strips: Array.from({ length: COLS }, (_, c) =>
    buildCylinderSegments(
      COMMON_SYMBOLS[Math.floor(Math.random() * COMMON_SYMBOLS.length)],
      JACKPOT_LETTERS[c],
      COMMON_SYMBOLS[Math.floor(Math.random() * COMMON_SYMBOLS.length)],
      c
    )
  ),

  setSpinning: (val) => set({ spinning: val }),
  setWinData: (data) => set({ winData: data }),
  setFreeSpins: (fn) => set((s) => ({ freeSpins: typeof fn === 'function' ? fn(s.freeSpins) : fn })),
  setMiniGameActive: (val) => set({ miniGameActive: val }),
  setWinningCells: (cells) => set({ winningCells: cells }),
  setCellSize: (size) => set({ cellSize: size }),
  setStrips: (strips) => set({ strips }),
  incrementSpinKey: () => set((s) => ({ spinKey: s.spinKey + 1 })),
  resetSpinState: () => set({
    spinning: false,
    winData: null,
    winningCells: new Set(),
  }),
}))

export default useGameStore
