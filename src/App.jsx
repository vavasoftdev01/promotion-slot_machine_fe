import { useState, useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'

const ASSET_MAP = {
  cherry: '\u{1F352}',
  lemon: '\u{1F34B}',
  orange: '\u{1F34A}',
  plum: '\u{1FAD0}',
  bell: '\u{1F514}',
  seven: '7\uFE0F\u20E3',
  bar: '\u{1F4B5}',
  star: '\u{2B50}',
  grape: '\u{1F347}',
  watermelon: '\u{1F349}',
  diamond: '\u{1F48E}',
  K: 'K', B: 'B', C: 'C', G: 'G', A: 'A', M: 'M', E: 'E',
}

function getCellSize() {
  const w = window.innerWidth
  if (w < 640) return { w: 38, h: 43 }
  if (w < 768) return { w: 52, h: 58 }
  if (w < 1024) return { w: 66, h: 74 }
  return { w: 80, h: 90 }
}

const JACKPOT_LETTERS = ['K', 'B', 'C', 'G', 'A', 'M', 'E']
const ROWS = 3
const COLS = 7
const STRIP_LEN = 60
const TARGET_POS = 40
const SPIN_DURATION = 5.5
const STAGGER = 0.12

const ALL_SYMBOLS = [
  'cherry','cherry','cherry','cherry','lemon','lemon','orange',
  'seven','star','grape','watermelon','diamond',
  'K','B','C','G','A','M','E',
]

const INITIAL_GRID = [
  ['cherry','lemon','orange','star','bell','seven','diamond'],
  ['grape','bell','cherry','watermelon','orange','bar','seven'],
  ['seven','lemon','diamond','cherry','star','grape','watermelon'],
]

function buildStrip(top, mid, bot) {
  const strip = []
  for (let i = 0; i < STRIP_LEN; i++) {
    if (i === TARGET_POS) strip.push(top)
    else if (i === TARGET_POS + 1) strip.push(mid)
    else if (i === TARGET_POS + 2) strip.push(bot)
    else strip.push(ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)])
  }
  return strip
}

export default function App() {
  const [grid, setGrid] = useState(INITIAL_GRID.map(r => [...r]))
  const [showStrips, setShowStrips] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [winData, setWinData] = useState(null)
  const [freeSpins, setFreeSpins] = useState(0)
  const [miniGameActive, setMiniGameActive] = useState(false)
  const [winningCells, setWinningCells] = useState(new Set())
  const [cellSize, setCellSize] = useState(getCellSize)
  const [strips, setStrips] = useState(() =>
    Array.from({ length: COLS }, (_, c) => buildStrip('cherry', 'lemon', 'orange'))
  )

  const spinLock = useRef(false)
  const stripRefs = useRef([])
  const tlRef = useRef(null)
  const pendingMiniGame = useRef(false)

  const renderSymbol = (symbol) => ASSET_MAP[symbol] ?? symbol

  useEffect(() => {
    const onResize = () => setCellSize(getCellSize())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleSpin = useCallback(async () => {
    if (spinLock.current) return
    spinLock.current = true
    pendingMiniGame.current = false

    setSpinning(true)
    setWinData(null)
    setWinningCells(new Set())

    try {
      const res = await fetch('/api/spin')
      const data = await res.json()

      // Build strips with target symbols at position 40, 41, 42
      const newStrips = Array.from({ length: COLS }, (_, c) =>
        buildStrip(data.grid[0][c], data.grid[1][c], data.grid[2][c])
      )
      setStrips(newStrips)

      // Set grid data immediately (hidden under strips while they animate)
      setGrid(data.grid.map(r => [...r]))
      setWinData(data)

      const cells = new Set()
      for (const line of data.winningLines) {
        for (const [r, c] of line.positions) {
          cells.add(`${r}-${c}`)
        }
      }
      setWinningCells(cells)

      if (data.freeSpinsAwarded > 0) {
        setFreeSpins(prev => prev + data.freeSpinsAwarded)
      }

      if (data.miniGameTriggered) {
        pendingMiniGame.current = true
      }

      setShowStrips(true)
    } catch {
      setSpinning(false)
      spinLock.current = false
    }
  }, [])

  // Run GSAP animation when strips are shown
  useEffect(() => {
    if (!showStrips) return

    const targetY = -(TARGET_POS * cellSize.h)

    if (tlRef.current) tlRef.current.kill()

    // Randomize starting positions
    stripRefs.current.forEach((ref) => {
      if (!ref) return
      gsap.set(ref, { y: Math.random() * -cellSize.h })
    })

    const tl = gsap.timeline({
      onComplete: () => {
        setShowStrips(false)
        setSpinning(false)
        spinLock.current = false

        if (pendingMiniGame.current) {
          setTimeout(() => setMiniGameActive(true), 600)
        }
      },
    })

    stripRefs.current.forEach((ref, i) => {
      if (!ref) return
      tl.to(ref, {
        y: targetY,
        duration: SPIN_DURATION,
        ease: 'power4.out',
      }, i * STAGGER)
    })

    tlRef.current = tl

    return () => {
      if (tlRef.current) tlRef.current.kill()
    }
  }, [showStrips, cellSize])

  const jackpotLine = winData?.winningLines?.find(l => l.name === 'Jackpot')
  const payableLines = winData?.winningLines?.filter(l => l.multiplier > 0)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d0d2b] to-[#1a1a3e] font-['Inter',sans-serif] p-2 sm:p-4">
      <div className="bg-gradient-to-b from-wood-dark via-wood-darker to-wood-dark border-3 border-gold rounded-3xl px-3 sm:px-5 md:px-8 lg:px-10 pb-4 sm:pb-6 md:pb-8 lg:pb-10 pt-3 sm:pt-5 md:pt-6 lg:pt-8 shadow-[0_0_30px_rgba(212,160,23,0.3),_inset_0_0_60px_rgba(0,0,0,0.5)] text-center w-full max-w-[48rem]">
        {/* Screen */}
        <div className="bg-gradient-to-b from-[#0a0a1a] to-[#111128] border-2 sm:border-4 border-gray-500 rounded-2xl p-2 sm:p-3 md:p-4 lg:p-5 mb-3 sm:mb-5 shadow-[inset_0_0_40px_rgba(0,0,0,0.9)] relative"
          style={{ clipPath: 'inset(0 round 16px)' }}>
          {/* GSAP Strips with 3D perspective (shown during spin, then hide to reveal grid) */}
          {showStrips ? (
            <div className="grid grid-cols-7 gap-x-[3px] sm:gap-x-[4px] md:gap-x-[5px] lg:gap-x-[6px]">
              {strips.map((strip, c) => (
                <div
                  key={`s-${c}`}
                  className="relative overflow-hidden"
                  style={{ height: cellSize.h * 3 }}
                >
                  {/* 3D cylinder illusion gradient overlay */}
                  <div className="absolute inset-0 z-10 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.85) 100%)',
                    }}
                  />
                  <div
                    ref={el => { stripRefs.current[c] = el }}
                    className="will-change-transform"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {strip.map((symbol, i) => {
                      const isJackpot = JACKPOT_LETTERS.includes(symbol)
                      const tiltAngles = [12, 0, -12]
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-center bg-gradient-to-br from-cell-bg to-cell-bg-alt border-b border-gray-300"
                          style={{
                            width: '100%',
                            height: cellSize.h,
                            fontSize: `${Math.round(cellSize.w * 0.35)}px`,
                            color: isJackpot ? '#111' : '#444',
                            fontWeight: isJackpot ? 'bold' : 'normal',
                            textShadow: isJackpot ? '0 0 6px rgba(0,0,0,0.2)' : 'none',
                            transform: `rotateX(${tiltAngles[i % 3]}deg)`,
                          }}
                        >
                          {renderSymbol(symbol)}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative">
              {/* 3D cylinder illusion gradient overlay */}
              <div className="absolute inset-0 z-10 pointer-events-none"
                style={{
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 25%, transparent 75%, rgba(0,0,0,0.85) 100%)',
                }}
              />
              <div className="grid grid-cols-7 gap-x-[3px] sm:gap-x-[4px] md:gap-x-[5px] lg:gap-x-[6px]">
              {grid.flat().map((symbol, i) => {
                const r = Math.floor(i / COLS)
                const c = i % COLS
                const isJackpot = JACKPOT_LETTERS.includes(symbol)
                const isWinner = winningCells.has(`${r}-${c}`)
                return (
                  <div
                    key={`g-${r}-${c}`}
                    className={`flex items-center justify-center select-none transition-all duration-300
                      bg-gradient-to-br from-cell-bg to-cell-bg-alt border-2 border-gray-300
                      shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]
                      ${isJackpot ? 'text-jackpot font-bold' : 'text-gray-600'}
                      ${isWinner ? 'border-gold-light shadow-[0_0_15px_#ffd700,0_0_30px_rgba(255,215,0,0.4)] animate-[pulseGlow_0.8s_ease-in-out_infinite_alternate]' : ''}
                    `}
                    style={{ width: '100%', height: cellSize.h, fontSize: `${Math.round(cellSize.w * 0.35)}px` }}
                  >
                    {renderSymbol(symbol)}
                  </div>
                )
              })}
            </div>
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="mb-4 space-y-2">
          {freeSpins > 0 && (
            <div className="text-cyan font-bold text-xs sm:text-sm md:text-base px-2 sm:px-3 py-1 sm:py-1.5 bg-[rgba(0,229,255,0.1)] border border-[rgba(0,229,255,0.3)] rounded-lg animate-[pulseCyan_1s_ease-in-out_infinite_alternate]">
              {'\u{1F300}'} Free Spins: {freeSpins}
            </div>
          )}
          <div className="min-h-10 text-gold-light font-bold text-sm sm:text-base md:text-lg">
            {jackpotLine ? (
              <div className="text-[#ff1744] text-lg sm:text-xl md:text-2xl animate-[jackpotPulse_0.5s_ease-in-out_infinite_alternate] [text-shadow:0_0_20px_rgba(255,23,68,0.6)]">
                {'\u{1F3C6}'} JACKPOT!!! Pot: {jackpotLine.potAmount}
              </div>
            ) : payableLines?.length > 0 ? (
              <>
                <div className="text-xs sm:text-sm md:text-base">{'\u{1F3C6}'} WINNER! Total Multiplier: x{winData.totalMultiplier}</div>
                <div className="text-[10px] sm:text-xs md:text-sm text-gray-300 mt-1 leading-tight">
                  {payableLines.map(l => `${l.name}: ${renderSymbol(l.symbol)} x${l.multiplier}`).join(' \u00B7 ')}
                </div>
              </>
            ) : winData && !winData.isWinner ? null : (
              <span>{spinning ? 'Spinning...' : 'Press SPIN to play!'}</span>
            )}
          </div>
        </div>

        {/* Spin button */}
        <button
          onClick={handleSpin}
          disabled={spinning || miniGameActive}
          className="px-8 sm:px-10 md:px-15 py-3 sm:py-4 text-lg sm:text-xl md:text-2xl font-bold uppercase tracking-widest text-wood-darker
            bg-gradient-to-b from-gold-light to-gold-dark border-2 border-gold rounded-full
            cursor-pointer transition-all duration-200 shadow-[0_4px_15px_rgba(212,160,23,0.4)]
            hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(212,160,23,0.6)]
            active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          SPIN
        </button>
      </div>

      {miniGameActive && (
        <MiniGameModal onClose={() => { setMiniGameActive(false); spinLock.current = false }} />
      )}

      <style>{`
        @keyframes pulseGlow {
          from { box-shadow: 0 0 10px #ffd700, 0 0 20px rgba(255, 215, 0, 0.3); }
          to   { box-shadow: 0 0 20px #ffd700, 0 0 40px rgba(255, 215, 0, 0.6); }
        }
        @keyframes pulseCyan {
          from { box-shadow: 0 0 4px rgba(0, 229, 255, 0.2); }
          to   { box-shadow: 0 0 12px rgba(0, 229, 255, 0.5); }
        }
        @keyframes jackpotPulse {
          from { transform: scale(1); }
          to   { transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}

function MiniGameModal({ onClose }) {
  const [wheelRotation, setWheelRotation] = useState(0)
  const [segments, setSegments] = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    fetch('/api/minigame')
      .then(r => r.json())
      .then(data => setSegments(data))
  }, [])

  const handleSpinWheel = () => {
    if (!segments || spinning) return
    setSpinning(true)
    const num = segments.segments.length
    const segAngle = 360 / num
    const segmentCenter = segments.winningIndex * segAngle + segAngle / 2
    const fullSpins = 5 + Math.floor(Math.random() * 3)
    const targetRotation = fullSpins * 360 + (360 - segmentCenter)
    setWheelRotation(targetRotation)
  }

  const handleTransitionEnd = () => {
    if (!segments) return
    setResult(segments.segments[segments.winningIndex])
  }

  if (!segments) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d1b4e] border-3 border-gold-light rounded-2xl p-4 sm:p-6 md:p-8 text-center">
          <p className="text-gold-light text-base sm:text-lg md:text-xl">Loading...</p>
        </div>
      </div>
    )
  }

  const num = segments.segments.length
  const segAngle = 360 / num
  const gradient = segments.segments
    .map((s, i) => `${s.color} ${(i / num) * 100}% ${((i + 1) / num) * 100}%`)
    .join(', ')

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity duration-300 p-2 sm:p-4">
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d1b4e] border-3 border-gold-light rounded-2xl p-4 sm:p-6 md:p-8 text-center max-w-sm sm:max-w-md w-full shadow-[0_0_40px_rgba(255,215,0,0.3)]">
        <h2 className="text-gold-light text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">{'\u{2B50}'} Roulette Bonus {'\u{2B50}'}</h2>
        <div className="relative w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] md:w-[300px] md:h-[300px] mx-auto mb-4 sm:mb-5">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl sm:text-3xl text-gold-light z-10 drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]">{'\u{25BC}'}</div>
          <div
            className="w-full h-full rounded-full border-4 border-gold-light relative shadow-[0_0_20px_rgba(255,215,0,0.3),_inset_0_0_15px_rgba(0,0,0,0.3)]"
            style={{
              background: `conic-gradient(${gradient})`,
              transform: `rotate(${wheelRotation}deg)`,
              transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {segments.segments.map((seg, i) => {
              const angle = (i / num) * 360 + segAngle / 2
              const rad = (angle * Math.PI) / 180
              const r = segments.segments.length
              const cx = 100; const cy = 100
              const labelR = 72
              const x = cx + labelR * Math.sin(rad)
              const y = cy - labelR * Math.cos(rad)
              return (
                <div key={i} className="absolute font-bold text-[10px] sm:text-xs md:text-sm text-white pointer-events-none z-[3] [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]"
                  style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}
                >{'\u00D7'}{seg.multiplier}</div>
              )
            })}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50px] h-[50px] sm:w-[60px] sm:h-[60px] md:w-[70px] md:h-[70px] rounded-full bg-[#1a1a2e] border-3 border-gray-500 flex items-center justify-center text-[10px] sm:text-xs md:text-sm font-bold text-gold-light z-[5]"
              style={{ borderColor: result ? '#ffd700' : undefined, boxShadow: result ? '0 0 20px rgba(255,215,0,0.6)' : undefined }}
            >{result ? `\u00D7${result.multiplier}` : 'SPIN'}</div>
          </div>
        </div>
        {!spinning ? (
          <button onClick={handleSpinWheel}
            className="px-6 sm:px-8 md:px-10 py-2 sm:py-3 text-sm sm:text-base md:text-lg font-bold uppercase tracking-wider text-wood-darker bg-gradient-to-b from-gold-light to-gold-dark border-2 border-gold rounded-full cursor-pointer transition-all duration-200 shadow-[0_4px_15px_rgba(212,160,23,0.4)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(212,160,23,0.6)] active:translate-y-0"
          >{'\u{1F3B2}'} SPIN WHEEL</button>
        ) : result ? (
          <button onClick={onClose}
            className="px-6 sm:px-8 md:px-10 py-2 sm:py-3 text-sm sm:text-base md:text-lg font-bold uppercase tracking-wider text-wood-darker bg-gradient-to-b from-gold-light to-gold-dark border-2 border-gold rounded-full cursor-pointer transition-all duration-200"
          >CLOSE</button>
        ) : (
          <button disabled
            className="px-6 sm:px-8 md:px-10 py-2 sm:py-3 text-sm sm:text-base md:text-lg font-bold uppercase tracking-wider text-wood-darker bg-gradient-to-b from-gold-light to-gold-dark border-2 border-gold rounded-full opacity-60 cursor-not-allowed"
          >Spinning...</button>
        )}
      </div>
    </div>
  )
}
