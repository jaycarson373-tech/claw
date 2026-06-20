"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { ExternalLink, Info, Link as LinkIcon, Volume2 } from "lucide-react"
import * as THREE from "three"

const CLAW_ALIGNMENT = {
  rest: new THREE.Vector3(-0.1, 1.32, 0),
  pileTarget: new THREE.Vector3(-0.58, -0.55, 0),
  lift: new THREE.Vector3(-0.58, 1.12, 0),
  chute: new THREE.Vector3(1.35, -1.22, 0),
  returnLift: new THREE.Vector3(0.16, 1.16, 0),
  scale: 0.76,
  mobileScale: 0.62,
}

const BALL_FIELD_ALIGNMENT = {
  center: new THREE.Vector3(-0.02, -1.04, -0.28),
  width: 2.92,
  height: 1.02,
  depth: 0.24,
  count: 26,
  mobileCount: 16,
}

const ROUND_MS = 5200
const TOKEN_ADDRESS = "2kGKRpTCtoSyDamtd3a2n8LaYWwf4sZjKMA49CCwpump"
const PUMP_URL = `https://pump.fun/coin/${TOKEN_ADDRESS}`
const CABINET_IMAGE_URL = "https://clawmachinesol.fun/claw-machine.png"

type Holder = {
  wallet: string
  supply: number
  color: string
}

type RoundResult = {
  id: number
  wallet: string
  payoutPct: number
  solAmount: number
  tier: "normal" | "glow" | "super"
  ballColor: string
  proof: string
}

type WinnerRow = RoundResult & {
  time: string
}

const HOLDERS: Holder[] = [
  { wallet: "9cL4...r8QP", supply: 18_400, color: "#ffd166" },
  { wallet: "4mVy...K2a9", supply: 9_800, color: "#7dd3fc" },
  { wallet: "HE2p...xM11", supply: 7_100, color: "#fca5a5" },
  { wallet: "2Xn8...PqR7", supply: 5_600, color: "#bef264" },
  { wallet: "G7sz...T44d", supply: 4_200, color: "#c084fc" },
  { wallet: "Aar1...zZ90", supply: 3_050, color: "#fef08a" },
]

type HolderBall = {
  holder: Holder
  home: THREE.Vector3
  velocity: THREE.Vector3
  radius: number
  phase: number
}

const PAYOUTS = [
  { pct: 1, weight: 36 },
  { pct: 3, weight: 28 },
  { pct: 5, weight: 18 },
  { pct: 8, weight: 9 },
  { pct: 10, weight: 5 },
  { pct: 15, weight: 3 },
  { pct: 25, weight: 1 },
]

const slotFlash = [1, 3, 5, 8, 10, 15, 25]

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
  return `0x${(hash >>> 0).toString(16).padStart(8, "0")}${Math.abs(Math.imul(hash, 2654435761)).toString(16).slice(0, 8)}`
}

function tierForPct(pct: number): RoundResult["tier"] {
  if (pct >= 10) return "super"
  if (pct >= 5) return "glow"
  return "normal"
}

function secondsLabel(value: number) {
  const mins = Math.floor(value / 60).toString().padStart(2, "0")
  const secs = Math.floor(value % 60).toString().padStart(2, "0")
  return `${mins}:${secs}`
}

// Replace this adapter with the real backend round record. The animation only reads this result.
function resolveRoundResult(treasury: number): RoundResult {
  const holder = weightedPick(HOLDERS)
  const payoutPct = weightedPick(PAYOUTS).pct
  return {
    id: Date.now(),
    wallet: holder.wallet,
    payoutPct,
    solAmount: Number(((treasury * payoutPct) / 100).toFixed(3)),
    tier: tierForPct(payoutPct),
    ballColor: holder.color,
    proof: makeProof(`${Date.now()}:${holder.wallet}:${payoutPct}`),
  }
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function mixVec(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  return a.clone().lerp(b, easeInOut(Math.min(1, Math.max(0, t))))
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  return reduced
}

function ChromeClaw({ progress, scale, tier }: { progress: number; scale: number; tier: RoundResult["tier"] }) {
  const closeAmount = progress > 0.34 && progress < 0.82 ? 1 : Math.max(0, 1 - Math.abs(progress - 0.68) * 4)
  const glow = tier === "super" ? 0.75 : tier === "glow" ? 0.28 : 0.06

  return (
    <group scale={scale}>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.84, 16]} />
        <meshStandardMaterial color="#d8d8d0" metalness={1} roughness={0.13} emissive="#ffc94a" emissiveIntensity={glow} />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <sphereGeometry args={[0.16, 24, 16]} />
        <meshStandardMaterial color="#f1f1ea" metalness={1} roughness={0.1} emissive="#ffc94a" emissiveIntensity={glow} />
      </mesh>
      {[0, 1, 2].map((index) => {
        const angle = (index / 3) * Math.PI * 2
        const open = 0.66 - closeAmount * 0.36
        return (
          <group key={index} rotation={[0, 0, angle]} position={[Math.cos(angle) * 0.11, -0.2, Math.sin(angle) * 0.11]}>
            <mesh rotation={[0, 0, open]} position={[0.2, -0.22, 0]}>
              <capsuleGeometry args={[0.035, 0.56, 6, 12]} />
              <meshStandardMaterial color="#e5e5dc" metalness={1} roughness={0.11} emissive="#ffc94a" emissiveIntensity={glow} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function WinnerBall({
  position,
  visible,
  color,
  tier,
}: {
  position: THREE.Vector3
  visible: boolean
  color: string
  tier: RoundResult["tier"]
}) {
  if (!visible) return null

  return (
    <mesh position={position} scale={0.22}>
      <sphereGeometry args={[1, 32, 18]} />
      <meshPhysicalMaterial
        color={color}
        clearcoat={1}
        clearcoatRoughness={0.12}
        roughness={0.22}
        metalness={0.08}
        emissive="#ffb703"
        emissiveIntensity={tier === "super" ? 0.9 : tier === "glow" ? 0.35 : 0.08}
      />
    </mesh>
  )
}

function makeHolderBalls(isMobile: boolean): HolderBall[] {
  const count = isMobile ? BALL_FIELD_ALIGNMENT.mobileCount : BALL_FIELD_ALIGNMENT.count

  return Array.from({ length: count }, (_, index) => {
    const holder = HOLDERS[index % HOLDERS.length]
    const row = Math.floor(index / 6)
    const col = index % 6
    const jitterX = ((index * 37) % 19) / 19 - 0.5
    const jitterY = ((index * 23) % 17) / 17 - 0.5
    const supplyScale = Math.sqrt(holder.supply / HOLDERS[0].supply)

    return {
      holder,
      home: new THREE.Vector3(
        BALL_FIELD_ALIGNMENT.center.x + (col - 2.5) * (BALL_FIELD_ALIGNMENT.width / 6) + jitterX * 0.18,
        BALL_FIELD_ALIGNMENT.center.y + (row - 1.6) * 0.32 + jitterY * 0.16,
        BALL_FIELD_ALIGNMENT.center.z + ((index % 3) - 1) * BALL_FIELD_ALIGNMENT.depth,
      ),
      velocity: new THREE.Vector3(Math.sin(index * 1.7) * 0.006, Math.cos(index * 2.1) * 0.006, Math.sin(index * 0.9) * 0.002),
      radius: 0.078 + supplyScale * 0.058,
      phase: index * 0.71,
    }
  })
}

function HolderBallField({ active, tier }: { active: boolean; tier: RoundResult["tier"] }) {
  const group = useRef<THREE.Group>(null)
  const balls = useMemo(() => makeHolderBalls(typeof window !== "undefined" && window.innerWidth < 700), [])
  const glow = tier === "super" ? 0.34 : tier === "glow" ? 0.14 : 0.03

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!group.current) return

    group.current.children.forEach((child, index) => {
      const ball = balls[index]
      if (!ball) return
      const mesh = child as THREE.Mesh
      const wake = active ? 1.8 : 1
      const driftX = Math.sin(t * (0.78 + index * 0.015) + ball.phase) * 0.075 * wake
      const driftY = Math.cos(t * (1.06 + index * 0.01) + ball.phase * 1.2) * 0.055 * wake
      const bob = Math.abs(Math.sin(t * 1.34 + ball.phase)) * 0.05 * wake
      mesh.position.set(ball.home.x + driftX, ball.home.y + driftY + bob, ball.home.z + Math.sin(t * 0.6 + ball.phase) * 0.035)
      mesh.rotation.x += ball.velocity.x * wake
      mesh.rotation.y += ball.velocity.y * wake
      mesh.rotation.z += ball.velocity.z * wake

      const left = BALL_FIELD_ALIGNMENT.center.x - BALL_FIELD_ALIGNMENT.width / 2
      const right = BALL_FIELD_ALIGNMENT.center.x + BALL_FIELD_ALIGNMENT.width / 2
      if (mesh.position.x < left + ball.radius || mesh.position.x > right - ball.radius) {
        mesh.position.x = THREE.MathUtils.clamp(mesh.position.x, left + ball.radius, right - ball.radius)
      }
    })
  })

  return (
    <group ref={group}>
      {balls.map((ball, index) => (
        <mesh key={`${ball.holder.wallet}-${index}`} position={ball.home} scale={ball.radius}>
          <sphereGeometry args={[1, 18, 12]} />
          <meshPhysicalMaterial
            color={ball.holder.color}
            clearcoat={0.85}
            clearcoatRoughness={0.18}
            roughness={0.28}
            metalness={0.04}
            emissive={ball.holder.color}
            emissiveIntensity={glow}
          />
        </mesh>
      ))}
    </group>
  )
}

function ClawScene({
  round,
  token,
  onDone,
  onWebGlReady,
  reduced,
}: {
  round: RoundResult | null
  token: number
  onDone: () => void
  onWebGlReady: () => void
  reduced: boolean
}) {
  const [progress, setProgress] = useState(0)
  const startRef = useRef(0)
  const doneRef = useRef(token)
  const claw = useRef<THREE.Group>(null)
  const tier = round?.tier ?? "normal"
  const scale = typeof window !== "undefined" && window.innerWidth < 700 ? CLAW_ALIGNMENT.mobileScale : CLAW_ALIGNMENT.scale

  useEffect(() => {
    startRef.current = performance.now()
    doneRef.current = 0
    if (reduced && token > 0) {
      window.setTimeout(onDone, 450)
    }
  }, [onDone, reduced, token])

  useEffect(() => {
    onWebGlReady()
  }, [onWebGlReady])

  useFrame(({ clock }) => {
    const elapsed = token > 0 ? performance.now() - startRef.current : 0
    const p = token > 0 ? Math.min(1, elapsed / ROUND_MS) : 0
    setProgress(p)

    let position = CLAW_ALIGNMENT.rest
    if (p < 0.18) position = mixVec(CLAW_ALIGNMENT.rest, CLAW_ALIGNMENT.pileTarget.clone().setY(CLAW_ALIGNMENT.rest.y), p / 0.18)
    else if (p < 0.36) position = mixVec(CLAW_ALIGNMENT.pileTarget.clone().setY(CLAW_ALIGNMENT.rest.y), CLAW_ALIGNMENT.pileTarget, (p - 0.18) / 0.18)
    else if (p < 0.56) position = mixVec(CLAW_ALIGNMENT.pileTarget, CLAW_ALIGNMENT.lift, (p - 0.36) / 0.2)
    else if (p < 0.75) position = mixVec(CLAW_ALIGNMENT.lift, CLAW_ALIGNMENT.chute.clone().setY(CLAW_ALIGNMENT.lift.y), (p - 0.56) / 0.19)
    else if (p < 0.86) position = mixVec(CLAW_ALIGNMENT.chute.clone().setY(CLAW_ALIGNMENT.lift.y), CLAW_ALIGNMENT.chute, (p - 0.75) / 0.11)
    else position = mixVec(CLAW_ALIGNMENT.returnLift, CLAW_ALIGNMENT.rest, (p - 0.86) / 0.14)

    if (claw.current) {
      claw.current.position.copy(position)
      claw.current.rotation.z = Math.sin(clock.elapsedTime * 2.4) * 0.025
    }

    if (p === 1 && token > 0 && doneRef.current !== token) {
      doneRef.current = token
      onDone()
    }
  })

  const clawPosition = claw.current?.position ?? CLAW_ALIGNMENT.rest
  const grabbed = token > 0 && progress > 0.34 && progress < 0.78
  const dropping = token > 0 && progress >= 0.78 && progress < 0.9
  const dropY = CLAW_ALIGNMENT.chute.y - (progress - 0.78) * 2.2
  const ballPosition = grabbed
    ? clawPosition.clone().add(new THREE.Vector3(0, -0.46 * scale, 0))
    : dropping
      ? new THREE.Vector3(CLAW_ALIGNMENT.chute.x, dropY, 0)
      : CLAW_ALIGNMENT.chute.clone().setY(-2.4)

  return (
    <>
      <ambientLight intensity={0.72} />
      <directionalLight position={[2, 3, 4]} intensity={2.1} />
      <pointLight position={[0, 1.3, 2.4]} intensity={tier === "super" ? 4.2 : 1.6} color="#ffd166" />
      <Environment preset="warehouse" />
      <HolderBallField active={token > 0 && progress < 0.75} tier={tier} />
      <group ref={claw} position={CLAW_ALIGNMENT.rest}>
        <ChromeClaw progress={progress} scale={scale} tier={tier} />
      </group>
      <WinnerBall position={ballPosition} visible={token > 0 && progress > 0.32 && progress < 0.92} color={round?.ballColor ?? "#ffd166"} tier={tier} />
    </>
  )
}

export function ClawArena() {
  const [treasury, setTreasury] = useState(118.42)
  const [nextDraw, setNextDraw] = useState(120)
  const [round, setRound] = useState<RoundResult | null>(null)
  const [lastReveal, setLastReveal] = useState<RoundResult | null>(null)
  const [winners, setWinners] = useState<WinnerRow[]>([])
  const [slotValue, setSlotValue] = useState(1)
  const [slotSpinning, setSlotSpinning] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [animationToken, setAnimationToken] = useState(0)
  const [soundOn, setSoundOn] = useState(false)
  const [webGlReady, setWebGlReady] = useState(true)
  const completedRound = useRef<number | null>(null)
  const reduced = useReducedMotion()

  const jackpotLabel = `${treasury.toFixed(2)} SOL`
  const latestTier = lastReveal?.tier ?? "normal"

  const playTone = useCallback(
    (frequency: number, duration = 0.16, type: OscillatorType = "sine") => {
      if (!soundOn) return
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext
      const audio = new AudioContextCtor()
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      oscillator.frequency.value = frequency
      oscillator.type = type
      gain.gain.setValueAtTime(0.0001, audio.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.14, audio.currentTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration)
      oscillator.connect(gain)
      gain.connect(audio.destination)
      oscillator.start()
      oscillator.stop(audio.currentTime + duration)
    },
    [soundOn],
  )

  const finishRound = useCallback(
    (result: RoundResult) => {
      if (completedRound.current === result.id) return
      completedRound.current = result.id

      setLastReveal(result)
      setTreasury((balance) => Number(Math.max(0, balance - result.solAmount).toFixed(3)))
      setWinners((current) =>
        [
          {
            ...result,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
          ...current,
        ].slice(0, 5),
      )
      setSlotSpinning(true)
      const timer = window.setInterval(() => {
        setSlotValue(slotFlash[Math.floor(Math.random() * slotFlash.length)])
      }, 70)
      window.setTimeout(() => {
        window.clearInterval(timer)
        setSlotValue(result.payoutPct)
        setSlotSpinning(false)
        setDrawing(false)
        setNextDraw(60 + Math.floor(Math.random() * 121))
        playTone(result.tier === "super" ? 660 : 420, 0.28, "triangle")
      }, 980)
    },
    [playTone],
  )

  const completeRound = useCallback(() => {
    if (round) finishRound(round)
  }, [finishRound, round])

  const startDraw = useCallback(() => {
    if (drawing) return
    const result = resolveRoundResult(treasury)
    completedRound.current = null
    setRound(result)
    setLastReveal(null)
    setDrawing(true)
    setAnimationToken((value) => value + 1)
    playTone(120, 0.2, "sawtooth")

    window.setTimeout(() => {
      finishRound(result)
    }, ROUND_MS + 1100)
  }, [drawing, finishRound, playTone, treasury])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNextDraw((value) => {
        if (value <= 1) {
          startDraw()
          return 999
        }
        return value - 1
      })
      setTreasury((value) => Number((value + 0.012).toFixed(3)))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [startDraw])

  const links = useMemo(
    () => [
      { label: "Pump", href: PUMP_URL },
      { label: "X", href: "https://x.com/search?q=%24CLAW" },
    ],
    [],
  )

  return (
    <main className={`claw-shell tier-${latestTier}`}>
      <img className="cabinet-photo" src={CABINET_IMAGE_URL} alt="$CLAW arcade machine in a dark backrooms room" />
      <div className="gold-flood" aria-hidden="true" />
      <div className="grain-overlay" aria-hidden="true" />
      <div className="backrooms-vignette" aria-hidden="true" />

      <div className="r3f-layer" aria-hidden="true">
        {webGlReady ? (
          <Canvas
            orthographic
            camera={{ position: [0, 0, 8], zoom: 120 }}
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
            onError={() => setWebGlReady(false)}
          >
            <ClawScene round={round} token={animationToken} onDone={completeRound} onWebGlReady={() => setWebGlReady(true)} reduced={reduced} />
          </Canvas>
        ) : (
          <div className="css-claw-fallback">CLAW</div>
        )}
      </div>

      <header className="site-header">
        <div className="brand-lockup">
          <span className="brand-name">$CLAW</span>
          <a className="contract-link" href={PUMP_URL} target="_blank" rel="noreferrer">
            {TOKEN_ADDRESS.slice(0, 6)}...pump <ExternalLink size={11} />
          </a>
        </div>
        <nav className="site-nav">
          <button type="button">How it works</button>
          <button type="button">Links</button>
          <button type="button" onClick={() => setSoundOn((value) => !value)} aria-label="Toggle sound">
            <Volume2 size={14} /> {soundOn ? "Sound on" : "Sound off"}
          </button>
        </nav>
      </header>

      <section className="jackpot-stack" aria-label="Round status">
        <div className="jackpot-card">
          <span>Jackpot</span>
          <strong>{jackpotLabel}</strong>
        </div>
        <div className="countdown-card">
          <span />
          <strong>{drawing ? "DRAWING" : `NEXT DRAW ${secondsLabel(nextDraw)}`}</strong>
        </div>
      </section>

      <section className={`reveal-card ${lastReveal ? "is-visible" : ""}`} aria-live="polite">
        <span className="eyebrow">{lastReveal ? `${lastReveal.tier} round` : "round pending"}</span>
        <strong className="winner-wallet">{lastReveal?.wallet ?? "winner queued"}</strong>
        <div className={`slot-readout ${slotSpinning ? "spinning" : ""}`}>{slotValue}%</div>
        <p>{lastReveal ? `${lastReveal.solAmount.toFixed(3)} SOL sent` : "claw is lining up"}</p>
        <code>{lastReveal?.proof ?? round?.proof ?? "0xwaiting-for-round"}</code>
      </section>

      <aside className="last-winners">
        <div className="panel-heading">
          <Info size={14} />
          <span>Last winners</span>
        </div>
        {(winners.length ? winners : [{ id: 0, wallet: "awaiting first draw", payoutPct: 0, solAmount: 0, tier: "normal" as const, ballColor: "#ffd166", proof: "0x", time: "--:--" }]).map((winner) => (
          <div className="winner-row" key={winner.id}>
            <span>{winner.time}</span>
            <strong>{winner.wallet}</strong>
            <em>{winner.solAmount ? `${winner.payoutPct}% / ${winner.solAmount.toFixed(3)} SOL` : "ready"}</em>
          </div>
        ))}
      </aside>

      <button className="draw-button" type="button" onClick={startDraw} disabled={drawing}>
        <LinkIcon size={15} />
        {drawing ? "Claw running" : "Run visual draw"}
      </button>

      <div className="how-panel">
        <strong>How it works</strong>
        <span>Hold 500K+ $CLAW. Every holder is a ball. Backend picks the winner, this layer only shows the 3D grab.</span>
      </div>

      <div className="links-panel">
        {links.map((link) => (
          <a href={link.href} key={link.label} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        ))}
      </div>
    </main>
  )
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}
