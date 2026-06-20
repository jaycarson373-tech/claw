"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { Environment } from "@react-three/drei"
import { ExternalLink, Info, Link as LinkIcon, Volume2 } from "lucide-react"
import * as THREE from "three"

const CLAW_ALIGNMENT = {
  rest: new THREE.Vector3(0, 1.28, 0),
  pileTarget: new THREE.Vector3(-0.42, -0.36, 0),
  lift: new THREE.Vector3(-0.42, 0.98, 0),
  chute: new THREE.Vector3(1.28, -1.1, 0),
  returnLift: new THREE.Vector3(0.08, 1.02, 0),
  scale: 0.82,
  mobileScale: 0.68,
}

const BALL_FIELD_ALIGNMENT = {
  center: new THREE.Vector3(0, -0.76, -0.34),
  width: 3.22,
  height: 1.08,
  depth: 0.28,
  count: 34,
  mobileCount: 20,
}

const ROUND_MS = 5200
const TOKEN_ADDRESS = "2kGKRpTCtoSyDamtd3a2n8LaYWwf4sZjKMA49CCwpump"
const PUMP_URL = `https://pump.fun/coin/${TOKEN_ADDRESS}`
const CABINET_IMAGE_URL = "data:image/jpeg;base64,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"

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
  tier: "normal" | "super" | "mega"
  ballColor: string
  proof: string
}

type WinnerRow = RoundResult & {
  time: string
}

const HOLDERS: Holder[] = [
  { wallet: "9cL4...r8QP", supply: 18_400, color: "#fff0a6" },
  { wallet: "4mVy...K2a9", supply: 9_800, color: "#2fd8ff" },
  { wallet: "HE2p...xM11", supply: 7_100, color: "#ff4b2f" },
  { wallet: "2Xn8...PqR7", supply: 5_600, color: "#72ff3f" },
  { wallet: "G7sz...T44d", supply: 4_200, color: "#ff8b39" },
  { wallet: "Aar1...zZ90", supply: 3_050, color: "#ffe27a" },
]

type HolderBall = {
  holder: Holder
  home: THREE.Vector3
  velocity: THREE.Vector3
  radius: number
  phase: number
}

type HolderSprite = {
  holder: Holder
  x: number
  y: number
  size: number
  delay: number
  duration: number
  gold: boolean
}

const NORMAL_PAYOUTS = [
  { pct: 1, weight: 36 },
  { pct: 3, weight: 28 },
  { pct: 5, weight: 18 },
  { pct: 8, weight: 9 },
  { pct: 10, weight: 5 },
  { pct: 12, weight: 3 },
  { pct: 15, weight: 1 },
]

const SUPER_PAYOUTS = [
  { pct: 15, weight: 30 },
  { pct: 20, weight: 24 },
  { pct: 25, weight: 18 },
  { pct: 35, weight: 10 },
  { pct: 50, weight: 4 },
]

const MEGA_PAYOUTS = [
  { pct: 50, weight: 20 },
  { pct: 65, weight: 12 },
  { pct: 75, weight: 8 },
  { pct: 100, weight: 2 },
]

const slotFlash = [1, 3, 5, 8, 10, 15, 20, 25, 35, 50, 75, 100]

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
  if (pct >= 50) return "mega"
  if (pct >= 15) return "super"
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
  const tierRoll = Math.random()
  const table = tierRoll < 1 / 50 ? MEGA_PAYOUTS : tierRoll < 1 / 10 ? SUPER_PAYOUTS : NORMAL_PAYOUTS
  const payoutPct = weightedPick(table).pct
  const tier = tierForPct(payoutPct)
  return {
    id: Date.now(),
    wallet: holder.wallet,
    payoutPct,
    solAmount: Number(((treasury * payoutPct) / 100).toFixed(3)),
    tier,
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
  const glow = tier === "mega" ? 1.1 : tier === "super" ? 0.48 : 0.08

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
        emissiveIntensity={tier === "mega" ? 1.15 : tier === "super" ? 0.45 : 0.08}
      />
    </mesh>
  )
}

function makeHolderBalls(isMobile: boolean): HolderBall[] {
  const count = isMobile ? BALL_FIELD_ALIGNMENT.mobileCount : BALL_FIELD_ALIGNMENT.count

  return Array.from({ length: count }, (_, index) => {
    const holder = HOLDERS[index % HOLDERS.length]
    const randA = (Math.sin(index * 12.9898) * 43758.5453) % 1
    const randB = (Math.sin(index * 78.233) * 24634.6345) % 1
    const randC = (Math.sin(index * 39.425) * 13515.3719) % 1
    const xRand = Math.abs(randA)
    const yRand = Math.abs(randB)
    const zRand = Math.abs(randC)
    const supplyScale = Math.sqrt(holder.supply / HOLDERS[0].supply)
    const mound = Math.sin(xRand * Math.PI)
    const pileY = -0.54 + yRand * 0.68 * mound

    return {
      holder,
      home: new THREE.Vector3(
        BALL_FIELD_ALIGNMENT.center.x + (xRand - 0.5) * BALL_FIELD_ALIGNMENT.width,
        BALL_FIELD_ALIGNMENT.center.y + pileY,
        BALL_FIELD_ALIGNMENT.center.z + (zRand - 0.5) * BALL_FIELD_ALIGNMENT.depth,
      ),
      velocity: new THREE.Vector3(Math.sin(index * 1.7) * 0.006, Math.cos(index * 2.1) * 0.006, Math.sin(index * 0.9) * 0.002),
      radius: 0.086 + supplyScale * 0.064,
      phase: index * 0.71,
    }
  })
}

function makeHolderSprites(): HolderSprite[] {
  return Array.from({ length: 32 }, (_, index) => {
    const holder = HOLDERS[index % HOLDERS.length]
    const randA = Math.abs((Math.sin(index * 12.9898) * 43758.5453) % 1)
    const randB = Math.abs((Math.sin(index * 78.233) * 24634.6345) % 1)
    const supplyScale = Math.sqrt(holder.supply / HOLDERS[0].supply)

    return {
      holder,
      x: 22 + randA * 56,
      y: 58 + randB * 28,
      size: 34 + supplyScale * 34,
      delay: -index * 0.19,
      duration: 3.8 + (index % 7) * 0.32,
      gold: index % 4 === 0 || index % 7 === 0,
    }
  })
}

function HolderBallField({ active, tier }: { active: boolean; tier: RoundResult["tier"] }) {
  const group = useRef<THREE.Group>(null)
  const balls = useMemo(() => makeHolderBalls(typeof window !== "undefined" && window.innerWidth < 700), [])
  const glow = tier === "mega" ? 0.48 : tier === "super" ? 0.22 : 0.06

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!group.current) return

    group.current.children.forEach((child, index) => {
      const ball = balls[index]
      if (!ball) return
      const mesh = child as THREE.Object3D
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
        <group key={`${ball.holder.wallet}-${index}`} position={ball.home} scale={ball.radius}>
          <mesh>
            <sphereGeometry args={[1, 22, 14]} />
            <meshPhysicalMaterial
              color={index % 4 === 0 || index % 7 === 0 ? "#f8c73d" : ball.holder.color}
              clearcoat={1}
              clearcoatRoughness={0.08}
              roughness={0.11}
              metalness={index % 4 === 0 || index % 7 === 0 ? 0.5 : 0.18}
              emissive={index % 4 === 0 || index % 7 === 0 ? "#ffb300" : ball.holder.color}
              emissiveIntensity={glow}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.82, 0.018, 6, 32]} />
            <meshStandardMaterial color="#fff6c4" metalness={0.8} roughness={0.18} emissive="#ffd166" emissiveIntensity={glow * 0.7} />
          </mesh>
          <mesh position={[-0.32, 0.35, 0.72]} scale={[0.28, 0.12, 0.06]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color="#fff8d6" transparent opacity={0.68} />
          </mesh>
        </group>
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
      <directionalLight position={[2, 3, 4]} intensity={2.4} color="#fff3d0" />
      <pointLight position={[-1.8, 1.4, 2.6]} intensity={2.4} color="#ffbd45" />
      <pointLight position={[0, 1.3, 2.4]} intensity={tier === "mega" ? 5.8 : tier === "super" ? 3.2 : 1.6} color="#ffd166" />
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
  const holderSprites = useMemo(() => makeHolderSprites(), [])

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
        playTone(result.tier === "mega" ? 820 : result.tier === "super" ? 660 : 420, 0.28, "triangle")
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

      <div className="capsule-field" aria-hidden="true">
        {holderSprites.map((ball, index) => (
          <span
            className={`capsule-ball ${ball.gold ? "is-gold" : ""}`}
            key={`${ball.holder.wallet}-${index}`}
            style={
              {
                "--x": `${ball.x}%`,
                "--y": `${ball.y}%`,
                "--size": `${ball.size}px`,
                "--delay": `${ball.delay}s`,
                "--duration": `${ball.duration}s`,
                "--ball-color": ball.gold ? "#f7c948" : ball.holder.color,
              } as CSSProperties
            }
          />
        ))}
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
          <span>Jackpot fund</span>
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
        <span>100% of fees feed the jackpot. Every 1-3 minutes the claw picks a holder ball, then spins for a payout: normal 1-15%, super 15-50%, mega claw 50-100%.</span>
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
