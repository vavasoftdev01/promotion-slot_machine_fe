import { useState, useRef, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import MachineContainer from './components/MachineContainer'
import SlotScreen from './components/SlotScreen'

const ASSET_MAP = {
  cherry: '🍒', lemon: '🍋', orange: '🍊', plum: '🫐',
  bell: '🔔', seven: '7️⃣', bar: '🥃', star: '⭐',
  grape: '🍇', watermelon: '🍉', diamond: '💎',
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
const COLS = 7
const CYLINDER_N = 14
const SPIN_DURATION = 2.5
const STAGGER = 0.12

const COMMON_SYMBOLS = ['cherry','cherry','cherry','cherry','lemon','lemon','orange','seven','star','grape','watermelon','diamond']

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

export default function App() {
  const [spinning, setSpinning] = useState(false)
  const [winData, setWinData] = useState(null)
  const [freeSpins, setFreeSpins] = useState(0)
  const [miniGameActive, setMiniGameActive] = useState(false)
  const [winningCells, setWinningCells] = useState(new Set())
  const [cellSize, setCellSize] = useState(getCellSize)
  const [spinKey, setSpinKey] = useState(0)
  const [strips, setStrips] = useState(() =>
    Array.from({ length: COLS }, (_, c) =>
      buildCylinderSegments(
        COMMON_SYMBOLS[Math.floor(Math.random() * COMMON_SYMBOLS.length)],
        JACKPOT_LETTERS[c],
        COMMON_SYMBOLS[Math.floor(Math.random() * COMMON_SYMBOLS.length)],
        c
      )
    )
  )

  const spinLock = useRef(false)
  const stripRefs = useRef([])
  const tlRef = useRef(null)
  const pendingMiniGame = useRef(false)
  const armWrapRef = useRef(null)

  const getAsset = (symbol) => ASSET_MAP[symbol] ?? symbol

  useEffect(() => {
    const onResize = () => setCellSize(getCellSize())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleSpin = useCallback(async () => {
    if (spinLock.current) return
    animateLever()
    spinLock.current = true
    pendingMiniGame.current = false

    setSpinning(true)
    setWinData(null)
    setWinningCells(new Set())

    try {
      const res = await fetch('/api/spin')
      const data = await res.json()

      // Build cylinder segments with result symbols at positions 0, 1, 2
      const newSegments = Array.from({ length: COLS }, (_, c) =>
        buildCylinderSegments(data.grid[0][c], data.grid[1][c], data.grid[2][c], c)
      )
      setStrips(newSegments)
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

      setSpinKey(k => k + 1)
    } catch {
      setSpinning(false)
      spinLock.current = false
    }
  }, [])

  // Set initial cylinder rotation so middle segment faces front
  useEffect(() => {
    const stepAngle = 360 / CYLINDER_N
    stripRefs.current.forEach(ref => {
      if (ref) gsap.set(ref, { rotationX: -stepAngle })
    })
  }, [cellSize])

  // Run GSAP cylinder rotation on each spin
  useEffect(() => {
    if (spinKey === 0) return

    if (tlRef.current) tlRef.current.kill()

    // Set random starting rotation so result isn't instantly visible
    stripRefs.current.forEach((ref) => {
      if (!ref) return
      const startAngle = Math.random() * 360
      gsap.set(ref, { rotationX: startAngle })
    })

    const tl = gsap.timeline({
      onComplete: () => {
        setSpinning(false)
        spinLock.current = false

        if (pendingMiniGame.current) {
          setTimeout(() => setMiniGameActive(true), 600)
        }
      },
    })

    const stepAngle = 360 / CYLINDER_N
    stripRefs.current.forEach((ref, i) => {
      if (!ref) return
      const fullSpins = 5 + Math.floor(Math.random() * 4)
      const totalRotation = (fullSpins + 1) * 360 - stepAngle
      tl.to(ref, {
        rotationX: totalRotation,
        duration: SPIN_DURATION,
        ease: 'power4.out',
      }, i * STAGGER)
    })

    tlRef.current = tl

    return () => {
      if (tlRef.current) tlRef.current.kill()
    }
  }, [spinKey, cellSize])

  useEffect(() => {
    if (armWrapRef.current) gsap.set(armWrapRef.current, { rotation: 0 })
  }, [])

  const animateLever = useCallback(() => {
    if (!armWrapRef.current) return
    const el = armWrapRef.current
    gsap.to(el, {
      rotation: -25,
      duration: 0.15,
      ease: 'power2.in',
      onComplete: () => {
        gsap.to(el, {
          rotation: 0,
          duration: 0.4,
          ease: 'elastic.out(1, 0.3)',
        })
      },
    })
  }, [])

  const handleLeverPull = useCallback(() => {
    if (spinLock.current || !armWrapRef.current) return
    animateLever()
    handleSpin()
  }, [animateLever, handleSpin])

  const bodyWidth = Math.min(cellSize.w * 7 + 80, 520)
  const jackpotLine = winData?.winningLines?.find(l => l.name === 'Jackpot')
  const payableLines = winData?.winningLines?.filter(l => l.multiplier > 0)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0015] via-[#1a0030] to-[#0d0020] font-['Inter',sans-serif] p-4 gap-4">
      <MachineContainer
        bodyWidth={bodyWidth}
        handleSpin={handleSpin}
        handleLeverPull={handleLeverPull}
        armWrapRef={armWrapRef}
        spinning={spinning}
        miniGameActive={miniGameActive}
      >
        <SlotScreen
          strips={strips}
          cellSize={cellSize}
          winningCells={winningCells}
          spinning={spinning}
          stripRefs={stripRefs}
        />
      </MachineContainer>

      {/* Win display */}
      <div className="w-full max-w-[48rem] space-y-2">
        {freeSpins > 0 && (
          <div className="text-[#ffd700] font-bold text-xs sm:text-sm md:text-base px-2 sm:px-3 py-1 sm:py-1.5 bg-[rgba(255,215,0,0.1)] border border-[rgba(255,215,0,0.3)] rounded-lg">
            {'\u{1F300}'} Free Spins: {freeSpins}
          </div>
        )}
        <div className="min-h-10 text-[#e2e8f0] font-bold text-sm sm:text-base md:text-lg text-center">
          {jackpotLine ? (
            <div className="text-[#ff6b6b] text-lg sm:text-xl md:text-2xl animate-[jackpotPulse_0.5s_ease-in-out_infinite_alternate] [text-shadow:0_0_20px_rgba(255,107,107,0.6)]">
              {'\u{1F3C6}'} JACKPOT!!! Pot: {jackpotLine.potAmount}
            </div>
          ) : payableLines?.length > 0 ? (
            <>
              <div className="text-xs sm:text-sm md:text-base text-[#ffd700]">{'\u{1F3C6}'} WINNER! Total Multiplier: x{winData.totalMultiplier}</div>
              <div className="flex flex-col gap-0.5 text-[10px] sm:text-xs md:text-sm text-[#cbd5e1] mt-1">
                {payableLines.map(l => (
                  <div key={l.name} className="flex items-center justify-center gap-1">{l.name}: {getAsset(l.symbol)} x{l.multiplier}</div>
                ))}
              </div>
            </>
          ) : winData && !winData.isWinner ? null : (
            <span>{spinning ? 'Spinning...' : 'Pull the lever!'}</span>
          )}
        </div>
      </div>

      {miniGameActive && (
        <MiniGameModal onClose={() => { setMiniGameActive(false); spinLock.current = false }} />
      )}

      <style>{`
        @keyframes pulseGlow {
          from { box-shadow: 0 0 5px #ff6b6b, 0 0 10px #ff6b6b; }
          to   { box-shadow: 0 0 15px #ff6b6b, 0 0 30px #ff6b6b; }
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

  // return (
  //   <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 transition-opacity duration-300 p-2 sm:p-4">
  //     <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d1b4e] border-3 border-gold-light rounded-2xl p-4 sm:p-6 md:p-8 text-center max-w-sm sm:max-w-md w-full shadow-[0_0_40px_rgba(255,215,0,0.3)]">
  //       <h2 className="text-gold-light text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4">{'\u{2B50}'} Roulette Bonus {'\u{2B50}'}</h2>
  //       <div className="relative w-[200px] h-[200px] sm:w-[250px] sm:h-[250px] md:w-[300px] md:h-[300px] mx-auto mb-4 sm:mb-5">
  //         <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl sm:text-3xl text-gold-light z-10 drop-shadow-[0_0_6px_rgba(255,215,0,0.6)]">{'\u{25BC}'}</div>
  //         <div
  //           className="w-full h-full rounded-full border-4 border-gold-light relative shadow-[0_0_20px_rgba(255,215,0,0.3),_inset_0_0_15px_rgba(0,0,0,0.3)]"
  //           style={{
  //             background: `conic-gradient(${gradient})`,
  //             transform: `rotate(${wheelRotation}deg)`,
  //             transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
  //           }}
  //           onTransitionEnd={handleTransitionEnd}
  //         >
  //           {segments.segments.map((seg, i) => {
  //             const angle = (i / num) * 360 + segAngle / 2
  //             const rad = (angle * Math.PI) / 180
  //             const r = segments.segments.length
  //             const cx = 100; const cy = 100
  //             const labelR = 72
  //             const x = cx + labelR * Math.sin(rad)
  //             const y = cy - labelR * Math.cos(rad)
  //             return (
  //               <div key={i} className="absolute font-bold text-[10px] sm:text-xs md:text-sm text-white pointer-events-none z-[3] [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]"
  //                 style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}
  //               >{'\u00D7'}{seg.multiplier}</div>
  //             )
  //           })}
  //           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50px] h-[50px] sm:w-[60px] sm:h-[60px] md:w-[70px] md:h-[70px] rounded-full bg-[#1a1a2e] border-3 border-gray-500 flex items-center justify-center text-[10px] sm:text-xs md:text-sm font-bold text-gold-light z-[5]"
  //             style={{ borderColor: result ? '#ffd700' : undefined, boxShadow: result ? '0 0 20px rgba(255,215,0,0.6)' : undefined }}
  //           >{result ? `\u00D7${result.multiplier}` : 'SPIN'}</div>
  //         </div>
  //       </div>
  //       {!spinning ? (
  //         <button onClick={handleSpinWheel}
  //           className="px-6 sm:px-8 md:px-10 py-2 sm:py-3 text-sm sm:text-base md:text-lg font-bold uppercase tracking-wider text-wood-darker bg-gradient-to-b from-gold-light to-gold-dark border-2 border-gold rounded-full cursor-pointer transition-all duration-200 shadow-[0_4px_15px_rgba(212,160,23,0.4)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(212,160,23,0.6)] active:translate-y-0"
  //         >{'\u{1F3B2}'} SPIN WHEEL</button>
  //       ) : result ? (
  //         <button onClick={onClose}
  //           className="px-6 sm:px-8 md:px-10 py-2 sm:py-3 text-sm sm:text-base md:text-lg font-bold uppercase tracking-wider text-wood-darker bg-gradient-to-b from-gold-light to-gold-dark border-2 border-gold rounded-full cursor-pointer transition-all duration-200"
  //         >CLOSE</button>
  //       ) : (
  //         <button disabled
  //           className="px-6 sm:px-8 md:px-10 py-2 sm:py-3 text-sm sm:text-base md:text-lg font-bold uppercase tracking-wider text-wood-darker bg-gradient-to-b from-gold-light to-gold-dark border-2 border-gold rounded-full opacity-60 cursor-not-allowed"
  //         >Spinning...</button>
  //       )}
  //     </div>
  //   </div>
  // )
}
