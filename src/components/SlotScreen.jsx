import { forwardRef } from 'react'

const JACKPOT_LETTERS = ['K', 'B', 'C', 'G', 'A', 'M', 'E']
const CYLINDER_N = 14
const ROWS = 3

import { createElement } from 'react'

const IMG = { w: '/images/emojiv4/bar.png', d: '/images/emojiv4/diamond.png', s: '/images/emojiv4/star.png', se: '/images/emojiv4/seven.png', b: '/images/emojiv4/bell.png', p: '/images/emojiv4/plum.png', o: '/images/emojiv4/orange.png', g: '/images/emojiv4/grape.png', l: '/images/emojiv4/lemon.png', c: '/images/emojiv4/cherries.png', wm: '/images/emojiv4/watermelon.png' }

const ASSET_IMG = {
  cherry: IMG.c, lemon: IMG.l, orange: IMG.o, plum: IMG.p,
  bell: IMG.b, seven: IMG.se, bar: IMG.w, star: IMG.s,
  grape: IMG.g, watermelon: IMG.wm, diamond: IMG.d,
}

const ASSET_MAP = {
  K: 'K', B: 'B', C: 'C', G: 'G', A: 'A', M: 'M', E: 'E',
}

function getAsset(symbol) {
  const src = ASSET_IMG[symbol]
  if (src) return createElement('img', { src, alt: symbol, style: { width: 38, height: 38, objectFit: 'contain' } })
  return ASSET_MAP[symbol] ?? symbol
}

const SlotScreen = forwardRef(({ strips, cellSize, winningCells, spinning, stripRefs }, ref) => {
  const stepAngle = 360 / CYLINDER_N
  const segH = cellSize.h
  const radius = cellSize.h * 1.8
  const segHeight = (2 * Math.PI * radius) / CYLINDER_N

  return (
    <div style={{
      background: 'linear-gradient(180deg, #1a1a2e, #0d0d1b)',
      padding: '10px',
      borderRadius: '12px',
      position: 'relative',
      border: '1px solid rgba(255,215,0,0.3)',
      boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
    }}>
      <div className="flex" style={{ gap: '6px', backgroundColor: '#0a0a15', padding: '8px 4px', borderRadius: '6px', perspective: '1200px', border: '1px solid rgba(255,215,0,0.15)' }}>
        {strips.map((segments, c) => (
          <div key={`s-${c}`} className="flex-1" style={{
            background: 'radial-gradient(ellipse at center, #fff 0%, #ececf2 60%, #d8d8e2 100%)',
            borderRadius: '6px',
            height: `${segH * ROWS}px`,
            position: 'relative',
            boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4), inset 0 -2px 4px rgba(255,255,255,0.5), 0 1px 2px rgba(0,0,0,0.3)',
            overflow: 'hidden',
          }}>
            {/* Cylinder curvature overlay */}
            <div className="absolute pointer-events-none" style={{
              inset: 0, zIndex: 4,
              background: [
                'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 20%)',
                'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 20%)',
                'linear-gradient(to bottom, rgba(30,80,160,0.25) 0%, rgba(30,80,160,0.08) 8%, transparent 16%)',
                'linear-gradient(to top, rgba(200,100,30,0.2) 0%, rgba(200,100,30,0.06) 8%, transparent 16%)',
                'linear-gradient(to right, rgba(0,0,0,0.12) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.12) 100%)',
              ].join(', '),
            }} />
            <div className="absolute" style={{
              left: 0, width: '5px', height: '12px',
              background: 'linear-gradient(180deg, #ff6b6b, #cc0000)',
              top: '50%', transform: 'translateY(-50%)',
              borderRadius: '0 3px 3px 0',
              zIndex: 5,
              boxShadow: '0 0 4px rgba(255,107,107,0.4)',
            }} />
            <div ref={el => { stripRefs.current[c] = el }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: radius * 2,
                height: radius * 2,
                marginLeft: -radius,
                marginTop: -radius,
                transformStyle: 'preserve-3d',
              }}
            >
              {segments.map((symbol, i) => {
                const isJackpot = JACKPOT_LETTERS.includes(symbol)
                const isWinner = !spinning && winningCells.has(`${i}-${c}`)
                const asset = getAsset(symbol)
                return (
                  <div key={i}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: 1,
                      right: 1,
                      height: segHeight,
                      marginTop: -segHeight / 2,
                      transform: `rotateX(${stepAngle * i}deg) translateZ(${radius}px) scaleX(1.08)`,
                      backfaceVisibility: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px',
                      background: 'linear-gradient(180deg, #ffffff 0%, #e8e8f0 40%, #d0d0dd 100%)',
                      border: isWinner ? '2px solid #ff6b6b' : '1px solid rgba(0,0,0,0.06)',
                      boxShadow: isWinner
                        ? '0 0 10px #ff6b6b, 0 0 20px #ff6b6b80'
                        : 'inset 0 2px 3px rgba(255,255,255,0.9), inset 0 -2px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.1)',
                      fontSize: `${Math.round(cellSize.w * 0.35)}px`,
                      color: '#ff6b6b',
                      fontWeight: isJackpot ? 'normal' : '900',
                      fontFamily: isJackpot ? '"Honk", system-ui, sans-serif' : 'inherit',
                      animation: isWinner ? 'pulseGlow 0.8s ease-in-out infinite alternate' : 'none',
                    }}
                  >
                    <span style={{ fontSize: `${Math.round(cellSize.w * 0.45)}px`, lineHeight: 1 }}>
                      {asset}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="absolute" style={{
              right: 0, width: '5px', height: '12px',
              background: 'linear-gradient(180deg, #ff6b6b, #cc0000)',
              top: '50%', transform: 'translateY(-50%)',
              borderRadius: '3px 0 0 3px',
              zIndex: 5,
              boxShadow: '0 0 4px rgba(255,107,107,0.4)',
            }} />
          </div>
        ))}
      </div>
      <div style={{ height: '10px', marginTop: '8px', borderRadius: '20px', background: 'linear-gradient(180deg, #ffd700, #b8860b)', opacity: 0.6, boxShadow: '0 0 10px rgba(255,215,0,0.3)' }} />
    </div>
  )
})

SlotScreen.displayName = 'SlotScreen'
export default SlotScreen
