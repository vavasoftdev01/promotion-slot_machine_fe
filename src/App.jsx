import { useState, useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import useGameStore from './stores/useGameStore'
import MachineContainer from './components/MachineContainer'
import SlotScreen from './components/SlotScreen'
import config from './config.json'

const IMG = { w: '/images/emojiv4/bar.png', d: '/images/emojiv4/diamond.png', s: '/images/emojiv4/star.png', se: '/images/emojiv4/seven.png', b: '/images/emojiv4/bell.png', p: '/images/emojiv4/plum.png', o: '/images/emojiv4/orange.png', g: '/images/emojiv4/grape.png', l: '/images/emojiv4/lemon.png', c: '/images/emojiv4/cherries.png', wm: '/images/emojiv4/watermelon.png' }

const ASSET_MAP = {
  cherry: '🍒', lemon: '🍋', orange: '🍊', plum: '🫐',
  bell: '🔔', seven: '7️⃣', bar: '🥃', star: '⭐',
  grape: '🍇', watermelon: '🍉', diamond: '💎',
  K: 'K', B: 'B', C: 'C', G: 'G', A: 'A', M: 'M', E: 'E',
}

const ASSET_IMG = {
  cherry: IMG.c, lemon: IMG.l, orange: IMG.o, plum: IMG.p,
  bell: IMG.b, seven: IMG.se, bar: IMG.w, star: IMG.s,
  grape: IMG.g, watermelon: IMG.wm, diamond: IMG.d,
}

const JACKPOT_LETTERS = ['K', 'B', 'C', 'G', 'A', 'M', 'E']
const COLS = 7
const CYLINDER_N = 14
const SPIN_DURATION = 2.5
const STAGGER = 0.12

// const COMMON_SYMBOLS = ['cherry','cherry','plum','bar','lemon','lemon','orange','seven','star','grape','watermelon','diamond']
const COMMON_SYMBOLS = ['bar','bell','cherry','diamond','grape','lemon','orange','plum','seven','star','watermelon']

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
  const API = import.meta.env.VITE_API_URL || ''
  const spinning = useGameStore((s) => s.spinning)
  const winData = useGameStore((s) => s.winData)
  const freeSpins = useGameStore((s) => s.freeSpins)
  const miniGameActive = useGameStore((s) => s.miniGameActive)
  const winningCells = useGameStore((s) => s.winningCells)
  const cellSize = useGameStore((s) => s.cellSize)
  const spinKey = useGameStore((s) => s.spinKey)
  const strips = useGameStore((s) => s.strips)
  const setSpinning = useGameStore((s) => s.setSpinning)
  const setWinData = useGameStore((s) => s.setWinData)
  const setFreeSpins = useGameStore((s) => s.setFreeSpins)
  const setMiniGameActive = useGameStore((s) => s.setMiniGameActive)
  const setWinningCells = useGameStore((s) => s.setWinningCells)
  const setCellSize = useGameStore((s) => s.setCellSize)
  const setStrips = useGameStore((s) => s.setStrips)
  const setUser = useGameStore((s) => s.setUser)
  const incrementSpinKey = useGameStore((s) => s.incrementSpinKey)

  const tokenRef = useRef(new URLSearchParams(window.location.search).get('token') || '')
  const authHeaders = () => tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}

  const [authState, setAuthState] = useState(null)
  const [ongoingEvent, setOngoingEvent] = useState(null)

  const spinLock = useRef(false)
  const stripRefs = useRef([])
  const tlRef = useRef(null)
  const pendingMiniGame = useRef(false)
  const armWrapRef = useRef(null)

  const getAsset = (symbol) => {
    const src = ASSET_IMG[symbol]
    return src ? <img src={src} alt={symbol} className="inline-block w-5 h-5 align-middle" /> : (ASSET_MAP[symbol] ?? symbol)
  }

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth
      let size
      if (w < 640) size = { w: 38, h: 43 }
      else if (w < 768) size = { w: 52, h: 58 }
      else if (w < 1024) size = { w: 66, h: 74 }
      else size = { w: 80, h: 90 }
      setCellSize(size)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [setCellSize])

  const authFetched = useRef(false)
  useEffect(() => {
    if (authFetched.current) return
    authFetched.current = true
    async function init() {
      try {
        const res = await fetch(`${API}/promotion-ace/v1/checkAuth`, { headers: authHeaders() })
        const data = await res.json()
        if (!res.ok || data.success === false) {
          setAuthState({ success: false, error: data.message || 'Unauthorized' })
          return
        }
        setAuthState({ success: true, user: data })
        setUser(data)
      } catch {
        setAuthState({ success: false, error: 'Unable to connect to server' })
      }
    }
    init()
  }, [API])

  useEffect(() => {
    if (!authState?.success) return
    fetch(`${API}/promotion-ace/v1/ongoing-event`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.event) setOngoingEvent(data.event)
      })
      .catch(() => {})
  }, [authState, API])

  const handleSpin = useCallback(async () => {
    if (spinLock.current) return
    animateLever()
    spinLock.current = true
    pendingMiniGame.current = false

    setSpinning(true)
    setWinData(null)
    setWinningCells(new Set())

    try {
      const res = await fetch(`${API}/promotion-ace/v1/spin`, { headers: authHeaders() })
      const data = await res.json()

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
        setFreeSpins((prev) => prev + data.freeSpinsAwarded)
      }

      if (data.miniGameTriggered) {
        pendingMiniGame.current = true
      }

      incrementSpinKey()
    } catch {
      setSpinning(false)
      spinLock.current = false
    }
  }, [setSpinning, setWinData, setWinningCells, setStrips, setFreeSpins, incrementSpinKey])

  useEffect(() => {
    const stepAngle = 360 / CYLINDER_N
    stripRefs.current.forEach(ref => {
      if (ref) gsap.set(ref, { rotationX: -stepAngle })
    })
  }, [cellSize])

  useEffect(() => {
    if (spinKey === 0) return

    if (tlRef.current) tlRef.current.kill()

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
  }, [spinKey, cellSize, setSpinning, setMiniGameActive])

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

  const jackpotLine = winData?.winningLines?.find(l => l.name === 'Jackpot')
  const payableLines = winData?.winningLines?.filter(l => l.multiplier > 0)

  if (!authState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0015] via-[#1a0030] to-[#0d0020] font-['Inter',sans-serif]">
        <div className="text-[#ffd700] text-xl font-bold animate-pulse">Authenticating...</div>
      </div>
    )
  }

  if (!authState.success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#0a0015] via-[#1a0030] to-[#0d0020] font-['Inter',sans-serif]">
        <div className="text-[#ff6b6b] text-2xl font-bold">Access Denied</div>
        <div className="text-[#e2e8f0] text-sm">{authState.error || 'Invalid or missing token'}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[5fr_4fr] lg:grid-rows-[auto_1fr] gap-4 p-4 bg-gradient-to-br from-[#0a0015] via-[#1a0030] to-[#0d0020] font-['Inter',sans-serif]">

      {/* Top-Left: Slot Machine - main game board with 7 reels */}
      <div id="slot-machine" className="flex flex-col gap-4 w-full">
        <div className="rounded-xl border border-[rgba(255,215,0,0.2)] bg-[rgba(26,26,46,0.6)] backdrop-blur-sm p-4 flex items-center justify-center">
          <h1 className="text-[#ffd700] text-2xl font-bold uppercase tracking-widest">{config.slot_machine_div.header}</h1>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 w-full flex-1">
        <MachineContainer
          bodyWidth={9999}
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
        <div className="w-full lg:w-1/4 rounded-xl border border-[rgba(255,215,0,0.2)] bg-[rgba(26,26,46,0.6)] backdrop-blur-sm p-4 flex flex-col items-center">
          <p className="text-[#ffd700] text-sm font-bold uppercase tracking-wider text-center">Bonus Info</p>
          <div className="mt-auto w-full h-1/4 bg-[rgba(255,215,0,0.1)]"></div>
        </div>
        </div>
      </div>

      {/* Top-Right: Info & Stats Panel */}
      <div className="flex flex-col items-center justify-center gap-4 p-6 rounded-xl border border-[rgba(255,215,0,0.2)] bg-[rgba(26,26,46,0.6)] backdrop-blur-sm">
        <h2 className="text-[#ffd700] text-xl font-bold uppercase tracking-wider">{config.mechanics_div.header}</h2>
        <div className="space-y-3 text-center">
          <div className="text-[#e2e8f0] text-sm">
            <span className="text-[#94a3b8]">Free Spins:</span>{' '}
            <span className="text-[#ffd700] font-bold">{freeSpins}</span>
          </div>
          <div className="text-[#e2e8f0] text-sm">
            <span className="text-[#94a3b8]">Status:</span>{' '}
            <span className="text-[#ffd700] font-bold">{spinning ? 'Spinning...' : 'Ready'}</span>
          </div>
        </div>
      </div>

      {/* Bottom-Left: On Going Event */}
      <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-[rgba(255,215,0,0.2)] bg-[rgba(26,26,46,0.6)] backdrop-blur-sm">
        <h2 className="text-[#ffd700] text-xl font-bold uppercase tracking-wider mb-3">{config.events_div.header}</h2>
        {ongoingEvent ? (
          <div className="w-full max-w-[48rem] space-y-3 text-center text-xs sm:text-sm">
            <div className="text-[#ffd700] font-bold text-sm sm:text-base">{ongoingEvent.eventName}</div>
            {ongoingEvent.eventDescription?.event_mechanics?.length > 0 && (
              <div>
                <div className="text-[#ffd700] font-semibold mb-1">Event Mechanics</div>
                <ul className="space-y-0.5">
                  {ongoingEvent.eventDescription.event_mechanics.map((m, i) => (
                    <li key={i} className="text-[#e2e8f0]">{'\u2022'} {m.value}</li>
                  ))}
                </ul>
              </div>
            )}
            {ongoingEvent.eventDescription?.winning_conditions?.length > 0 && (
              <div>
                <div className="text-[#ffd700] font-semibold mb-1">Winning Conditions</div>
                <ul className="space-y-0.5">
                  {ongoingEvent.eventDescription.winning_conditions.map((c, i) => (
                    <li key={i} className="text-[#e2e8f0]">{'\u2022'} {c.value}</li>
                  ))}
                </ul>
              </div>
            )}
            {ongoingEvent.eventDescription?.participation_mechanics?.length > 0 && (
              <div>
                <div className="text-[#ffd700] font-semibold mb-1">Participation</div>
                <ul className="space-y-0.5">
                  {ongoingEvent.eventDescription.participation_mechanics.map((m, i) => (
                    <li key={i} className="text-[#e2e8f0]">{'\u2022'} {m.value}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[#94a3b8] text-sm">No ongoing event</div>
        )}
      </div>

      {/* Bottom-Right: Price Information */}
      <div className="flex flex-col items-center justify-center p-6 rounded-xl border border-[rgba(255,215,0,0.2)] bg-[rgba(26,26,46,0.6)] backdrop-blur-sm">
        <h2 className="text-[#ffd700] text-xl font-bold uppercase tracking-wider mb-3">{config.price_info_div.header}</h2>
        {ongoingEvent?.prizeDetails ? (
          <div className="w-full space-y-2 text-center">
            {Object.entries(ongoingEvent.prizeDetails).map(([key, prize]) => (
              <div key={key} className="text-[#e2e8f0] text-xs sm:text-sm">
                <span className="text-[#ffd700] font-semibold capitalize">{key.replace('_', ' ')}:</span>{' '}
                {prize.label} — {prize.reward.toLocaleString()} {prize.currency.toUpperCase()} ({prize.winner_count} winner{prize.winner_count > 1 ? 's' : ''})
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[#94a3b8] text-sm">TBD</div>
        )}
        <div className="flex gap-1 mt-3">
          {(ongoingEvent?.jackpotCombinations || ['K', 'B', 'C', 'G', 'A', 'M', 'E']).map((letter) => (
            <span key={letter} className="w-8 h-8 flex items-center justify-center rounded bg-[rgba(255,215,0,0.15)] border border-[rgba(255,215,0,0.3)] text-[#ffd700] font-bold text-sm">
              {letter}
            </span>
          ))}
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
    const token = new URLSearchParams(window.location.search).get('token') || ''
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    fetch(`${import.meta.env.VITE_API_URL || ''}/promotion-ace/v1/minigame`, { headers })
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
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d1b4e] border-3 border-gold-light rounded-xl p-4 sm:p-6 md:p-8 text-center">
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
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#2d1b4e] border-3 border-gold-light rounded-xl p-4 sm:p-6 md:p-8 text-center max-w-sm sm:max-w-md w-full shadow-[0_0_40px_rgba(255,215,0,0.3)]">
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
              const labelR = 72
              const x = 100 + labelR * Math.sin(rad)
              const y = 100 - labelR * Math.cos(rad)
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
