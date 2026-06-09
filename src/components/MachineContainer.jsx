const MachineContainer = ({
  bodyWidth,
  children,
  handleSpin,
  handleLeverPull,
  armWrapRef,
  spinning,
  miniGameActive,
}) => (
  <div className="relative flex flex-col items-stretch w-full">
    {/* Top Light */}
    <div className="flex flex-col items-center" style={{ marginBottom: '-4px', zIndex: 2 }}>
      <div className="w-[50px] h-[25px] rounded-t-[50px]" style={{
        background: 'linear-gradient(180deg, #ff6b6b, #cc0000)',
        boxShadow: '0 0 15px rgba(255,107,107,0.6), inset 0 -3px 6px rgba(0,0,0,0.3)',
      }} />
      <div className="w-[60px] h-[10px] rounded-[4px]" style={{
        background: 'linear-gradient(180deg, #cbd5e1, #94a3b8)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }} />
    </div>

    {/* Machine Body */}
    <div className="flex flex-col w-full lg:max-w-[90%]" style={{
      borderRadius: '12px',
      padding: '20px 15px 15px',
      gap: '15px',
      position: 'relative',
      zIndex: 1,
      border: '2px solid #ffd700',
      background: 'linear-gradient(180deg, #2a2a3a 0%, #1a1a2e 50%, #0d0d1b 100%)',
      boxShadow: '0 0 40px rgba(255,215,0,0.15), inset 0 0 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
    }}>
      {/* Shine overlay */}
      <div className="absolute pointer-events-none" style={{
        inset: 0, borderRadius: '18px',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(255,215,0,0.03) 100%)',
      }} />

      {children}

      {/* Controls Row */}
      <div className="flex items-center" style={{ gap: '12px', padding: '0 5px' }}>
        <div className="rounded-[6px]" style={{ width: '28px', height: '14px', background: 'linear-gradient(180deg, #ff6b6b, #cc0000)', boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)' }} />
        <div className="rounded-[6px]" style={{ width: '28px', height: '14px', background: 'linear-gradient(180deg, #ff6b6b, #cc0000)', boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)' }} />
        <div className="rounded-[6px]" style={{ width: '28px', height: '14px', background: 'linear-gradient(180deg, #ffd700, #b8860b)', boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4)' }} />
        <div className="ml-auto relative" style={{ width: '50px', height: '22px', background: 'linear-gradient(180deg, #cbd5e1, #94a3b8)', borderRadius: '4px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}>
          <div className="absolute" style={{ right: '5px', top: '4px', width: '25px', height: '6px', background: 'linear-gradient(180deg, #64748b, #475569)', borderRadius: '2px' }} />
        </div>
      </div>

      {/* Base Section */}
      <div style={{
        background: 'linear-gradient(180deg, #1a1a2e, #0d0d1b)',
        borderRadius: '12px',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        border: '1px solid rgba(255,215,0,0.2)',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
      }}>
        <button onClick={handleSpin}
          disabled={spinning || miniGameActive}
          className="w-full font-bold uppercase tracking-widest text-white cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            height: '40px',
            background: 'linear-gradient(180deg, #ffd700, #b8860b)',
            borderRadius: '8px',
            border: '1px solid #ffd700',
            fontSize: '15px',
            letterSpacing: '3px',
            boxShadow: '0 3px 10px rgba(255,215,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          <span className="flex items-center justify-center gap-2">
            <img src="/images/icons/spin.svg" alt="" className="w-5 h-5" />
            {spinning ? 'SPINNING...' : 'SPIN'}
          </span>
        </button>
        <div className="hidden" style={{ height: '30px', background: 'linear-gradient(180deg, #2a2a3a, #1a1a2e)', borderRadius: '8px', border: '1px solid rgba(255,215,0,0.1)' }} />
      </div>

      {/* Handle */}
      <div className="absolute" style={{ right: '-20px', top: '65px', width: '45px', height: '150px', cursor: 'pointer', zIndex: 10 }}
      onClick={handleLeverPull}>
      <div className="absolute" style={{
        left: 0, top: '85px', width: '20px', height: '45px',
        background: 'linear-gradient(90deg, #cbd5e1, #94a3b8)',
        borderRadius: '0 8px 8px 0',
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)',
      }} />
      <div ref={armWrapRef} className="absolute" style={{
        left: '18px', top: '20px', width: '10px', height: '80px',
        background: 'linear-gradient(90deg, #e8e8f0, #c8c8d8, #a8a8b8)',
        borderRadius: '4px',
        transformOrigin: '5px 80px',
        boxShadow: '2px 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
      }}>
        <div className="absolute" style={{
          left: '-9px', top: '-18px', width: '28px', height: '28px',
          background: 'radial-gradient(circle at 35% 35%, #ff8a8a, #ff6b6b 40%, #cc0000 80%)',
          borderRadius: '50%',
          boxShadow: '0 3px 10px rgba(255,107,107,0.5), inset 0 -3px 6px rgba(0,0,0,0.3)',
        }} />
        </div>
      </div>
    </div>
  </div>
)

export default MachineContainer
