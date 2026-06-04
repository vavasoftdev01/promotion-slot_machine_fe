import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'

const SYMBOLS = ['cherry','cherry','cherry','cherry','lemon','lemon','orange','seven','star','grape','watermelon','diamond','K','B','C','G','A','M','E']
const NUM_REELS = 7
const SYM_COUNT = SYMBOLS.length
const CELL_W = 200
const CELL_H = 200
const REEL_RADIUS = 1.8
const REEL_LENGTH = 1.3
const REEL_SPACING = 2.9
const SPIN_DURATION = 2500
const STAGGER_MS = 100

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3)
}

let texId = 0
function createReelTexture(reelIndex) {
  const canvas = document.createElement('canvas')
  canvas.width = CELL_W * SYM_COUNT
  canvas.height = CELL_H
  const ctx = canvas.getContext('2d')
  const primary = ['K','B','C','G','A','M','E'][reelIndex]

  for (let i = 0; i < SYM_COUNT; i++) {
    const x = i * CELL_W
    const sym = SYMBOLS[i]
    const isPrimary = sym === primary

    const grad = ctx.createLinearGradient(x, 0, x + CELL_W, CELL_H)
    grad.addColorStop(0, '#1a1a3e')
    grad.addColorStop(1, '#2a2a4e')
    ctx.fillStyle = grad
    ctx.fillRect(x, 0, CELL_W, CELL_H)

    ctx.save()
    ctx.translate(x + CELL_W / 2, CELL_H / 2)
    ctx.rotate(Math.PI / 2)

    ctx.strokeStyle = isPrimary ? '#ffd700' : '#a78bfa'
    ctx.lineWidth = 4
    ctx.strokeRect(-CELL_W / 2 + 10, -CELL_H / 2 + 10, CELL_W - 20, CELL_H - 20)

    ctx.fillStyle = isPrimary ? '#ffd700' : '#fff'
    ctx.font = 'Bold 80px "Arial Black", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (isPrimary) {
      ctx.shadowBlur = 15
      ctx.shadowColor = '#ffd700'
    }
    ctx.fillText(sym, 0, 0)
    ctx.restore()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.anisotropy = 4
  tex.needsUpdate = true
  tex.userData = { id: texId++ }
  return tex
}

function buildScene(container) {
  const w = container.clientWidth
  const h = container.clientHeight

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#0a0a1a')

  const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100)
  camera.position.set(0, 0.8, 8)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  container.appendChild(renderer.domElement)

  const ambient = new THREE.AmbientLight(0x404060)
  scene.add(ambient)

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8)
  mainLight.position.set(5, 10, 7)
  mainLight.castShadow = true
  scene.add(mainLight)

  const fillLight = new THREE.PointLight(0x4466cc, 0.3)
  fillLight.position.set(-2, 3, 4)
  scene.add(fillLight)

  const backLight = new THREE.PointLight(0xffaa66, 0.2)
  backLight.position.set(0, 2, -3)
  scene.add(backLight)

  return { scene, camera, renderer }
}

export default function ThreeSlotMachine({ spinData, onSpinComplete }) {
  const containerRef = useRef(null)
  const stateRef = useRef(null)

  const animateSpin = useCallback((reelMeshes, textures, spinData) => {
    const targets = []
    for (let c = 0; c < NUM_REELS; c++) {
      const targetSym = spinData.grid[1][c]
      const idx = SYMBOLS.indexOf(targetSym)
      const baseOffset = idx / SYM_COUNT
      const rotations = 8 + Math.floor(Math.random() * 6)
      const startOffset = textures[c].offset.x
      let delta = rotations + baseOffset - startOffset
      while (delta < rotations) delta += 1
      targets.push({ startOffset, delta, elapsed: c * STAGGER_MS })
    }

    const startTime = performance.now()
    let finishedReels = 0
    const reelDone = Array(NUM_REELS).fill(false)

    function tick(now) {
      const globalElapsed = now - startTime
      let allDone = true

      for (let c = 0; c < NUM_REELS; c++) {
        if (reelDone[c]) continue
        const localElapsed = globalElapsed - targets[c].elapsed
        if (localElapsed < 0) { allDone = false; continue }

        const progress = Math.min(1, localElapsed / SPIN_DURATION)
        const eased = easeOutCubic(progress)
        const offset = (targets[c].startOffset + targets[c].delta * eased) % 1
        textures[c].offset.x = offset
        textures[c].needsUpdate = true

        if (progress < 1) {
          allDone = false
        } else {
          const finalOff = (targets[c].startOffset + targets[c].delta) % 1
          textures[c].offset.x = finalOff
          textures[c].needsUpdate = true
          reelDone[c] = true
          finishedReels++
        }
      }

      if (!allDone) {
        stateRef.current.renderer.render(stateRef.current.scene, stateRef.current.camera)
        requestAnimationFrame(tick)
      } else {
        stateRef.current.renderer.render(stateRef.current.scene, stateRef.current.camera)
        if (onSpinComplete) onSpinComplete(spinData)
      }
    }

    requestAnimationFrame(tick)
  }, [onSpinComplete])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const { scene, camera, renderer } = buildScene(container)

    const textures = Array.from({ length: NUM_REELS }, (_, i) => createReelTexture(i))

    const geo = new THREE.CylinderGeometry(REEL_RADIUS, REEL_RADIUS, REEL_LENGTH, 64)
    const reelMeshes = []
    const startX = -(NUM_REELS - 1) * REEL_SPACING / 2

    for (let i = 0; i < NUM_REELS; i++) {
      const mat = new THREE.MeshStandardMaterial({
        map: textures[i],
        metalness: 0.1,
        roughness: 0.1,
        emissive: new THREE.Color('#221133'),
        emissiveIntensity: 0.1,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow = true
      mesh.rotation.z = Math.PI / 2
      mesh.rotation.x = 0.1
      mesh.position.set(startX + i * REEL_SPACING, 0, 0)
      scene.add(mesh)
      reelMeshes.push(mesh)

      // Gold rings
      const ringMat = new THREE.MeshStandardMaterial({ color: '#EFBF04', metalness: 0.2, roughness: 0.1 })
      const ringGeo = new THREE.TorusGeometry(REEL_RADIUS + 0.08, 0.04, 16, 64)
      for (const yOff of [0.99, -0.1]) {
        const ring = new THREE.Mesh(ringGeo, ringMat)
        ring.position.set(startX + i * REEL_SPACING, yOff, 0)
        ring.rotation.x = Math.PI / 2
        scene.add(ring)
      }

      // Frame back plate
      const plateMat = new THREE.MeshStandardMaterial({ color: '#ffd700', metalness: 0.7, roughness: 0.3 })
      const plate = new THREE.Mesh(new THREE.BoxGeometry(11, 3.2, 0.3), plateMat)
      plate.position.set(0, 0.1, -1.5)
      scene.add(plate)
    }

    // Particles
    const particleCount = 1500
    const particleGeo = new THREE.BufferGeometry()
    const particlePos = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 16
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 8
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 7
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePos, 3))
    const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({
      color: 0x8b5cf6, size: 0.04, transparent: true, opacity: 0.3
    }))
    scene.add(particles)

    // Label sprites
    for (let i = 0; i < NUM_REELS; i++) {
      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffd700'
      ctx.font = 'Bold 44px "Arial Black", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(['K','B','C','G','A','M','E'][i], 64, 64)
      const labelTex = new THREE.CanvasTexture(canvas)
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex }))
      sprite.scale.set(0.7, 0.7, 1)
      sprite.position.set(startX + i * REEL_SPACING, 1.4, 0.8)
      scene.add(sprite)
    }

    // Set initial texture offsets to show primary symbols
    for (let i = 0; i < NUM_REELS; i++) {
      const primary = ['K','B','C','G','A','M','E'][i]
      const idx = SYMBOLS.indexOf(primary)
      textures[i].offset.x = (idx % SYM_COUNT) / SYM_COUNT
      textures[i].needsUpdate = true
    }

    stateRef.current = { scene, camera, renderer, reelMeshes, textures, particles }

    function animate() {
      stateRef.current.renderer.render(stateRef.current.scene, stateRef.current.camera)
      stateRef.current.animId = requestAnimationFrame(animate)
    }
    stateRef.current.animId = requestAnimationFrame(animate)

    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(stateRef.current.animId)
      window.removeEventListener('resize', onResize)
      container.removeChild(renderer.domElement)
      renderer.dispose()
      geo.dispose()
    }
  }, [])

  useEffect(() => {
    if (!spinData || !stateRef.current) return
    animateSpin(stateRef.current.reelMeshes, stateRef.current.textures, spinData)
  }, [spinData, animateSpin])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '320px' }}
    />
  )
}
