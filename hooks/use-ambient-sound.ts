"use client"

import { useRef, useState, useCallback } from "react"

export type SoundType = "none" | "chimes" | "drift" | "garden"

// Pentatonic scale notes (Hz): C4, D4, E4, G4, A4, C5, D5, E5
const PENTA = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]

function buildChimes(ctx: AudioContext): { node: AudioNode; cleanup: () => void } {
  const master = ctx.createGain()
  master.gain.value = 0.0 // controlled by dest gain

  let stopped = false
  const timeouts: ReturnType<typeof setTimeout>[] = []

  const ringNote = (freq: number) => {
    if (stopped) return
    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.value = freq

    // Detuned shimmer copy for a bell-like shimmer
    const osc2 = ctx.createOscillator()
    osc2.type = "sine"
    osc2.frequency.value = freq * 1.003 // ~5 cents sharp

    const env = ctx.createGain()
    env.gain.setValueAtTime(0, ctx.currentTime)
    env.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 0.012) // fast attack
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.2) // long decay

    const env2 = ctx.createGain()
    env2.gain.setValueAtTime(0, ctx.currentTime)
    env2.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 0.012)
    env2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.8)

    osc.connect(env)
    osc2.connect(env2)
    env.connect(master)
    env2.connect(master)

    osc.start()
    osc2.start()
    osc.stop(ctx.currentTime + 3.5)
    osc2.stop(ctx.currentTime + 3.5)
  }

  const scheduleNext = () => {
    if (stopped) return
    const delay = 2000 + Math.random() * 3500 // 2–5.5s between chimes
    const t = setTimeout(() => {
      if (stopped) return
      // Play 1–2 notes with a short gap between them
      const note1 = PENTA[Math.floor(Math.random() * PENTA.length)]
      ringNote(note1)
      if (Math.random() > 0.4) {
        // Optional second note ~600ms later for a gentle pair
        const t2 = setTimeout(() => {
          if (stopped) return
          const note2 = PENTA[Math.floor(Math.random() * PENTA.length)]
          ringNote(note2)
        }, 600)
        timeouts.push(t2)
      }
      scheduleNext()
    }, delay)
    timeouts.push(t)
  }

  scheduleNext()

  const cleanup = () => {
    stopped = true
    timeouts.forEach(clearTimeout)
  }

  return { node: master, cleanup }
}

function buildDrift(ctx: AudioContext): { node: AudioNode; cleanup: () => void } {
  const master = ctx.createGain()
  master.gain.value = 1.0

  // Low warm drone: root + fifth + octave + octave+fifth (Pythagorean ratios)
  const baseFreq = 55 // A1 — deep, resonant
  const harmonics = [1, 1.5, 2, 3]

  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 700
  lp.Q.value = 0.5

  harmonics.forEach((ratio, i) => {
    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.value = baseFreq * ratio

    const g = ctx.createGain()
    g.gain.value = 0.22 / (i + 1) // higher harmonics softer

    // Each partial swells independently at a very slow LFO
    const lfo = ctx.createOscillator()
    lfo.type = "sine"
    lfo.frequency.value = 0.02 + i * 0.015 // 0.02–0.065 Hz

    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.08

    lfo.connect(lfoGain)
    lfoGain.connect(g.gain)

    osc.connect(g)
    g.connect(lp)
    osc.start()
    lfo.start()
  })

  lp.connect(master)

  return { node: master, cleanup: () => {} }
}

function buildGarden(ctx: AudioContext): { node: AudioNode; cleanup: () => void } {
  const master = ctx.createGain()
  master.gain.value = 1.0

  // ── Soft nature base: pink-ish noise (white filtered) ──
  const bufSize = ctx.sampleRate * 4
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noiseSrc = ctx.createBufferSource()
  noiseSrc.buffer = buf
  noiseSrc.loop = true

  const hp = ctx.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = 80

  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 700

  const noiseGain = ctx.createGain()
  noiseGain.gain.value = 0.07

  noiseSrc.connect(hp)
  hp.connect(lp)
  lp.connect(noiseGain)
  noiseGain.connect(master)
  noiseSrc.start()

  // ── Gentle melodic line: slow ascending pentatonic arpeggio ──
  let stopped = false
  const timeouts: ReturnType<typeof setTimeout>[] = []
  let arpeggioIndex = 0
  const melody = [PENTA[0], PENTA[1], PENTA[2], PENTA[4], PENTA[5]] // C D E A C5

  const playMelodicNote = (freq: number) => {
    if (stopped) return
    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.value = freq

    const env = ctx.createGain()
    env.gain.setValueAtTime(0, ctx.currentTime)
    env.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 0.04)
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0)

    osc.connect(env)
    env.connect(master)
    osc.start()
    osc.stop(ctx.currentTime + 2.2)
  }

  const scheduleMelody = () => {
    if (stopped) return
    const noteGap = 600 + Math.random() * 500 // 0.6–1.1s between notes in a phrase
    const phrasePause = 5000 + Math.random() * 4000 // 5–9s between phrases

    // Play 2–3 notes then pause
    const noteCount = 2 + Math.floor(Math.random() * 2)
    let offset = 0
    for (let n = 0; n < noteCount; n++) {
      const freq = melody[arpeggioIndex % melody.length]
      arpeggioIndex++
      const t = setTimeout(() => playMelodicNote(freq), offset)
      timeouts.push(t)
      offset += noteGap
    }
    const t = setTimeout(scheduleMelody, offset + phrasePause)
    timeouts.push(t)
  }

  // Start melody after a short initial delay
  const initT = setTimeout(scheduleMelody, 1500)
  timeouts.push(initT)

  const cleanup = () => {
    stopped = true
    timeouts.forEach(clearTimeout)
  }

  return { node: master, cleanup }
}

export function useAmbientSound() {
  const ctxRef      = useRef<AudioContext | null>(null)
  const destRef     = useRef<GainNode | null>(null)
  const cleanupRef  = useRef<(() => void) | null>(null)
  const [current, setCurrent] = useState<SoundType>("none")
  const [volume, setVolumeState] = useState(0.7)
  const volumeRef = useRef(0.7)

  const stop = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    if (destRef.current) {
      destRef.current.gain.setTargetAtTime(0, destRef.current.context.currentTime, 0.4)
    }
    setTimeout(() => {
      ctxRef.current?.close()
      ctxRef.current = null
      destRef.current = null
    }, 600)
    setCurrent("none")
  }, [])

  const play = useCallback((type: SoundType) => {
    if (type === "none") { stop(); return }

    cleanupRef.current?.()
    cleanupRef.current = null
    if (ctxRef.current) {
      ctxRef.current.close()
      ctxRef.current = null
    }

    const ctx = new AudioContext()
    ctxRef.current = ctx

    const dest = ctx.createGain()
    dest.gain.value = 0
    dest.connect(ctx.destination)
    destRef.current = dest

    const { node, cleanup } =
      type === "chimes" ? buildChimes(ctx) :
      type === "drift"  ? buildDrift(ctx)  :
                          buildGarden(ctx)

    cleanupRef.current = cleanup
    node.connect(dest)

    // Fade in to current volume
    dest.gain.setTargetAtTime(volumeRef.current, ctx.currentTime, 1.2)
    setCurrent(type)
  }, [stop])

  const setVolume = useCallback((v: number) => {
    volumeRef.current = v
    setVolumeState(v)
    if (destRef.current) {
      destRef.current.gain.setTargetAtTime(v, destRef.current.context.currentTime, 0.1)
    }
  }, [])

  return { play, stop, current, volume, setVolume }
}
