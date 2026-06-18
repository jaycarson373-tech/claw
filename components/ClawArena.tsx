"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Activity, Radio, Volume2, Zap } from "lucide-react"
import * as THREE from "three"

type Holder = {
  wallet: string
  supply: number
  color: number
  radius: number
}

type Draw = {
  id: number
  wallet: string
  rewardPct: number
  amount: number
  proof: string
  time: string
}

const HOLDERS: Holder[] = [
  { wallet: "9cL4...r8QP", supply: 18_400, color: 0xbaff77, radius: 0.44 },
  { wallet: "4mVy...K2a9", supply: 9_800, color: 0x67e8f9, radius: 0.36 },
  { wallet: "HE2p...xM11", supply: 7_100, color: 0xf7c948, radius: 0.33 },
  { wallet: "2Xn8...PqR7", supply: 5_600, color: 0xff6b6b, radius: 0.3 },
  { wallet: "G7sz...T44d", supply: 4_200, color: 0xf4f0bb, radius: 0.27 },
  { wallet: "Aar1...zZ90", supply: 3_050, color: 0xc084fc, radius: 0.25 },
  { wallet: "6Qop...Jn8v", supply: 2_150, color: 0x7dd3fc, radius: 0.22 },
  { wallet: "B0nK...M8tr", supply: 1_200, color: 0xfca5a5, radius: 0.19 },
]

const REWARD_ODDS = [
  { pct: 1, weight: 38 },
  { pct: 3, weight: 25 },
  { pct: 5, weight: 18 },
  { pct: 10, weight: 10 },
  { pct: 25, weight: 5 },
  { pct: 50, weight: 2 },
  { pct: 75, weight: 1.25 },
  { pct: 100, weight: 0.75 },
]

const slotFlash = [1, 3, 5, 10, 25, 50, 75, 100]

function weightedPick<T extends { weight?: number; supply?: number }>(items: T[]) {
  const total = items.reduce((sum, item) => sum + (item.weight ?? item.supply ?? 0), 0)
  let cursor = Math.random() * total

  for (const item of items) {
    cursor -= item.weight ?? item.supply ?? 0
    if (cursor <= 0) return item
  }

  return items[items.length - 1]
}

function makeProof(seed: string) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const left = (hash >>> 0).toString(16).padStart(8, "0")
  const right = Math.imul(hash, 2654435761).toString(16).replace("-", "f").slice(0, 8)
  return `0x${left}${right}`
}

function secondsLabel(value: number) {
  const mins = Math.floor(value / 60).toString().padStart(2, "0")
  const secs = Math.floor(value % 60).toString().padStart(2, "0")
  return `${mins}:${secs}`
}

export function ClawArena() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sceneApi = useRef<{
    pulse: (winnerIndex: number) => void
    treasury: () => void
  } | null>(null)

  const [treasury, setTreasury] = useState(118.42)
  const [nextDraw, setNextDraw] = useState(11)
  const [nextSweep, setNextSweep] = useState(28)
  const [winner, setWinner] = useState(HOLDERS[0].wallet)
  const [rewardPct, setRewardPct] = useState(5)
  const [proof, setProof] = useState("0xwaiting-for-vrf-feed")
  const [slotValue, setSlotValue] = useState(5)
  const [spinning, setSpinning] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [ledger, setLedger] = useState<Draw[]>([])
  const [muted, setMuted] = useState(true)

  const totalSupply = useMemo(() => HOLDERS.reduce((sum, holder) => sum + holder.supply, 0), [])

  const playTone = useCallback(
    (frequency: number, duration = 0.16, type: OscillatorType = "sine") => {
      if (muted) return
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext
      const audio = new AudioContextCtor()
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      oscillator.frequency.value = frequency
      oscillator.type = type
      gain.gain.setValueAtTime(0.0001, audio.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.15, audio.currentTime + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration)
      oscillator.connect(gain)
      gain.connect(audio.destination)
      oscillator.start()
      oscillator.stop(audio.currentTime + duration)
    },
    [muted],
  )

  const runDraw = useCallback(() => {
    if (drawing) return

    setDrawing(true)
    setSpinning(true)
    playTone(96, 0.22, "sawtooth")

    const flashTimer = window.setInterval(() => {
      setSlotValue(slotFlash[Math.floor(Math.random() * slotFlash.length)])
    }, 90)

    window.setTimeout(() => {
      const holder = weightedPick(HOLDERS)
      const reward = weightedPick(REWARD_ODDS).pct
      const seed = `${Date.now()}:${holder.wallet}:${reward}:${Math.random()}`
      const nextProof = makeProof(seed)
      const payout = Number(((treasury * reward) / 100).toFixed(3))
      const winnerIndex = HOLDERS.findIndex((item) => item.wallet === holder.wallet)

      window.clearInterval(flashTimer)
      setWinner(holder.wallet)
      setRewardPct(reward)
      setSlotValue(reward)
      setProof(nextProof)
      setTreasury((current) => Number(Math.max(0, current - payout).toFixed(3)))
      setLedger((current) =>
        [
          {
            id: Date.now(),
            wallet: holder.wallet,
            rewardPct: reward,
            amount: payout,
            proof: nextProof,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
          ...current,
        ].slice(0, 5),
      )
      setSpinning(false)
      sceneApi.current?.pulse(Math.max(0, winnerIndex))
      playTone(420 + reward * 4, 0.28, "triangle")

      window.setTimeout(() => {
        setDrawing(false)
        setNextDraw(60 + Math.floor(Math.random() * 121))
      }, 1300)
    }, 2150)
  }, [drawing, playTone, treasury])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNextDraw((current) => {
        if (current <= 1) {
          runDraw()
          return 999
        }
        return current - 1
      })

      setNextSweep((current) => {
        if (current <= 1) {
          setTreasury((balance) => Number((balance + 4.75 + Math.random() * 5.5).toFixed(3)))
          sceneApi.current?.treasury()
          playTone(184, 0.18, "square")
          return 300
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [playTone, runDraw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x050606, 1)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x070908, 0.045)

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120)
    camera.position.set(0, 5.2, 17)

    const group = new THREE.Group()
    scene.add(group)

    const ambient = new THREE.HemisphereLight(0xc8ffd4, 0x14130e, 1.1)
    scene.add(ambient)

    const key = new THREE.PointLight(0xc6ff8e, 9, 42)
    key.position.set(0, 9, 5)
    scene.add(key)

    const red = new THREE.PointLight(0xff5757, 2.2, 18)
    red.position.set(-6, 4, 2)
    scene.add(red)

    const roomMat = new THREE.MeshStandardMaterial({ color: 0x141614, roughness: 0.88, metalness: 0.08 })
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 36, 32, 32), roomMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -3
    scene.add(floor)

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(36, 20), roomMat)
    backWall.position.set(0, 7, -11)
    scene.add(backWall)

    const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(36, 20), roomMat)
    sideWall.rotation.y = Math.PI / 2
    sideWall.position.set(-18, 7, 0)
    scene.add(sideWall)

    const machineMat = new THREE.MeshStandardMaterial({
      color: 0x1d2621,
      roughness: 0.36,
      metalness: 0.68,
      emissive: 0x17250f,
      emissiveIntensity: 0.2,
    })
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x9bff9a,
      metalness: 0,
      roughness: 0.06,
      transmission: 0.32,
      transparent: true,
      opacity: 0.26,
    })

    const frame = new THREE.Mesh(new THREE.BoxGeometry(8, 10.8, 3.1), machineMat)
    frame.position.y = 2.5
    group.add(frame)

    const windowBox = new THREE.Mesh(new THREE.BoxGeometry(7.34, 8.5, 3.24), glassMat)
    windowBox.position.y = 3.1
    group.add(windowBox)

    const base = new THREE.Mesh(new THREE.BoxGeometry(9.2, 2.2, 4.2), machineMat)
    base.position.y = -2.15
    group.add(base)

    const pegMat = new THREE.MeshStandardMaterial({ color: 0xcedfc2, roughness: 0.42, metalness: 0.5 })
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 12), pegMat)
        peg.rotation.x = Math.PI / 2
        peg.position.set((x - 3.5) * 0.82 + (y % 2 ? 0.38 : 0), 5.9 - y * 0.72, 1.75)
        group.add(peg)
      }
    }

    const rail = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.16, 0.16), pegMat)
    rail.position.set(0, 7.9, 1.98)
    group.add(rail)

    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 8), pegMat)
    cable.position.set(0, 6.9, 1.98)
    group.add(cable)

    const claw = new THREE.Group()
    claw.position.set(0, 5.7, 1.98)
    group.add(claw)

    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), machineMat)
    claw.add(hub)

    for (let i = 0; i < 3; i += 1) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.8, 6, 10), pegMat)
      finger.rotation.z = (i / 3) * Math.PI * 2
      finger.rotation.x = 0.72
      finger.position.set(Math.cos((i / 3) * Math.PI * 2) * 0.26, -0.42, Math.sin((i / 3) * Math.PI * 2) * 0.26)
      claw.add(finger)
    }

    const balls = HOLDERS.map((holder, index) => {
      const ballMat = new THREE.MeshStandardMaterial({
        color: holder.color,
        roughness: 0.35,
        metalness: 0.18,
        emissive: holder.color,
        emissiveIntensity: 0.08,
      })
      const ball = new THREE.Mesh(new THREE.SphereGeometry(holder.radius, 32, 18), ballMat)
      ball.position.set((index % 4 - 1.5) * 1.45, -0.75 + Math.floor(index / 4) * 0.75, 1.35 + (index % 2) * 0.44)
      ball.userData.home = ball.position.clone()
      group.add(ball)
      return ball
    })

    const resize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    let activeBall = -1
    let pulseUntil = 0
    let sweepUntil = 0
    let frameId = 0

    sceneApi.current = {
      pulse: (winnerIndex) => {
        activeBall = winnerIndex
        pulseUntil = performance.now() + 2100
      },
      treasury: () => {
        sweepUntil = performance.now() + 1300
      },
    }

    const animate = (time: number) => {
      frameId = window.requestAnimationFrame(animate)
      const t = time * 0.001

      group.rotation.y = Math.sin(t * 0.2) * 0.035
      key.intensity = 8.4 + Math.sin(t * 1.8) * 1.4 + (time < sweepUntil ? 4 : 0)
      red.intensity = 1.8 + Math.sin(t * 2.3) * 0.6
      claw.position.x = Math.sin(t * 0.62) * 2.7
      claw.position.y = 5.7 + Math.sin(t * 1.4) * 0.16 - (time < pulseUntil ? Math.sin((pulseUntil - time) * 0.006) * 1.25 : 0)
      cable.scale.y = 1 + (5.7 - claw.position.y) * 0.3
      cable.position.x = claw.position.x
      claw.rotation.z = Math.sin(t * 2) * 0.04

      balls.forEach((ball, index) => {
        const home = ball.userData.home as THREE.Vector3
        ball.position.x = home.x + Math.sin(t * 0.9 + index) * 0.08
        ball.position.y = home.y + Math.abs(Math.sin(t * 1.2 + index * 0.7)) * 0.09
        ball.rotation.x += 0.008 + index * 0.0007
        ball.rotation.y += 0.006

        if (index === activeBall && time < pulseUntil) {
          const lift = Math.sin((1 - (pulseUntil - time) / 2100) * Math.PI)
          ball.position.x = claw.position.x
          ball.position.y = -0.6 + lift * 5.8
          ball.position.z = 1.94
          ;(ball.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.55
        } else {
          ;(ball.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.08
        }
      })

      renderer.render(scene, camera)
    }

    resize()
    window.addEventListener("resize", resize)
    frameId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener("resize", resize)
      renderer.dispose()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const material = object.material
          if (Array.isArray(material)) material.forEach((item) => item.dispose())
          else material.dispose()
        }
      })
      sceneApi.current = null
    }
  }, [])

  return (
    <main className="claw-shell">
      <canvas ref={canvasRef} className="claw-canvas" aria-hidden="true" />

      <div className="hud">
        <header className="topbar">
          <div className="brand">
            <div className="mark">
              <Zap size={19} />
            </div>
            <div>
              <h1 className="title">Claw Vault</h1>
              <p className="subtitle">{totalSupply.toLocaleString()} weighted supply in play</p>
            </div>
          </div>

          <div className="signal" aria-live="polite">
            <span className="signal-label">Latest winner</span>
            <strong className="wallet">{winner}</strong>
          </div>

          <div className="status-row">
            <span className="pill">
              <Radio size={13} /> VRF proof {proof.slice(0, 10)}
            </span>
            <button className="pill action" type="button" onClick={() => setMuted((value) => !value)}>
              <Volume2 size={14} /> {muted ? "Sound off" : "Sound on"}
            </button>
          </div>
        </header>

        <section className="center-stage" aria-label="Reward spinner">
          <div className="slot">
            <div className="slot-top">
              <span>Reward balance spin</span>
              <span>{drawing ? "claw locked" : "armed"}</span>
            </div>
            <div className="slot-window">
              <div className={`slot-reel ${spinning ? "spinning" : ""}`}>
                <span className="slot-value">{slotValue}%</span>
              </div>
              <div className="slot-cut" />
            </div>
            <div className="proof-line">
              <span>proof</span>
              <span>{proof}</span>
            </div>
          </div>
        </section>

        <footer className="bottombar">
          <div className="panel metrics">
            <div className="metric">
              <span className="metric-label">Treasury</span>
              <strong className="metric-value">{treasury.toFixed(3)} SOL</strong>
            </div>
            <div className="metric">
              <span className="metric-label">Next claw</span>
              <strong className="metric-value">{drawing ? "drawing" : secondsLabel(nextDraw)}</strong>
            </div>
            <div className="metric">
              <span className="metric-label">Fee sweep</span>
              <strong className="metric-value">{secondsLabel(nextSweep)}</strong>
            </div>
          </div>

          <button className="action" type="button" onClick={runDraw} disabled={drawing}>
            <Activity size={16} /> Draw now
          </button>

          <div className="panel ledger">
            <div className="ledger-title">
              <span>Payout queue</span>
              <span>{rewardPct}% latest</span>
            </div>
            {(ledger.length ? ledger : [{ id: 0, time: "--:--", wallet: "awaiting first draw", rewardPct: 0, amount: 0, proof }]).map(
              (draw) => (
                <div className="ledger-row" key={draw.id}>
                  <span>{draw.time}</span>
                  <span>{draw.wallet}</span>
                  <strong>{draw.amount ? `${draw.amount.toFixed(3)} SOL` : "ready"}</strong>
                </div>
              ),
            )}
          </div>
        </footer>
      </div>
    </main>
  )
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}
