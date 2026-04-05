"use client"

import { useRef, useState, useCallback } from "react"

export type SoundType = "none" | "rain" | "ocean" | "bowl" | "forest"

// ── Synthetic reverb (programmatic impulse response) ──────────────────────────
function createReverb(ctx: AudioContext, duration = 3, decay = 2): ConvolverNode {
  const rate   = ctx.sampleRate
  const length = Math.floor(rate * duration)
  const ir     = ctx.createBuffer(2, length, rate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  const conv  = ctx.createConvolver()
  conv.buffer = ir
  return conv
}

// ── Pink noise buffer (Paul Kellet's algorithm — much warmer than white) ──────
function createPinkNoise(ctx: AudioContext): AudioBufferSourceNode {
  const size = ctx.sampleRate * 8
  const buf  = ctx.createBuffer(2, size, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    for (let i = 0; i < size; i++) {
      const w  = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + w * 0.0555179
      b1 = 0.99332 * b1 + w * 0.0750759
      b2 = 0.96900 * b2 + w * 0.1538520
      b3 = 0.86650 * b3 + w * 0.3104856
      b4 = 0.55000 * b4 + w * 0.5329522
      b5 = -0.7616 * b5 - w * 0.0168980
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11
      b6   = w * 0.115926
    }
  }
  const src   = ctx.createBufferSource()
  src.buffer  = buf
  src.loop    = true
  return src
}

// ── RAIN ─────────────────────────────────────────────────────────────────────
// Pink noise shaped through bandpass filters to mimic rain on leaves + reverb
function buildRain(ctx: AudioContext): { node: AudioNode; cleanup: () => void } {
  const master = ctx.createGain()
  master.gain.value = 1.0

  const reverb = createReverb(ctx, 1.5, 3)
  const dryGain = ctx.createGain(); dryGain.gain.value = 0.7
  const wetGain = ctx.createGain(); wetGain.gain.value = 0.3

  // Layer 1: heavy rain body — mid-frequency pink noise
  const rain1 = createPinkNoise(ctx)
  const bp1   = ctx.createBiquadFilter()
  bp1.type        = "bandpass"
  bp1.frequency.value = 1400
  bp1.Q.value     = 0.6
  const g1 = ctx.createGain(); g1.gain.value = 0.55
  rain1.connect(bp1); bp1.connect(g1)

  // Layer 2: high tinkle — droplets hitting leaves
  const rain2 = createPinkNoise(ctx)
  const bp2   = ctx.createBiquadFilter()
  bp2.type        = "bandpass"
  bp2.frequency.value = 3800
  bp2.Q.value     = 1.2
  const g2 = ctx.createGain(); g2.gain.value = 0.18
  rain2.connect(bp2); bp2.connect(g2)

  // Layer 3: low rumble — distant thunder undertone
  const rain3 = createPinkNoise(ctx)
  const lp3   = ctx.createBiquadFilter()
  lp3.type        = "lowpass"
  lp3.frequency.value = 120
  const g3 = ctx.createGain(); g3.gain.value = 0.22
  rain3.connect(lp3); lp3.connect(g3)

  // Mix dry + wet
  const mixer = ctx.createGain()
  g1.connect(mixer); g2.connect(mixer); g3.connect(mixer)
  mixer.connect(dryGain); dryGain.connect(master)
  mixer.connect(reverb);  reverb.connect(wetGain); wetGain.connect(master)

  rain1.start(); rain2.start(); rain3.start()

  return { node: master, cleanup: () => {} }
}

// ── OCEAN ────────────────────────────────────────────────────────────────────
// Two slow amplitude-modulated noise layers — wave swell + foam — deep reverb
function buildOcean(ctx: AudioContext): { node: AudioNode; cleanup: () => void } {
  const master = ctx.createGain()
  master.gain.value = 1.0

  const reverb  = createReverb(ctx, 4, 1.5)
  const wetGain = ctx.createGain(); wetGain.gain.value = 0.45
  const dryGain = ctx.createGain(); dryGain.gain.value = 0.55

  const makeWave = (lpFreq: number, lfoRate: number, vol: number) => {
    const noise = createPinkNoise(ctx)
    const lp    = ctx.createBiquadFilter()
    lp.type           = "lowpass"
    lp.frequency.value = lpFreq
    lp.Q.value        = 0.3

    const env  = ctx.createGain(); env.gain.value = 0
    const lfo  = ctx.createOscillator()
    lfo.type           = "sine"
    lfo.frequency.value = lfoRate
    const lfoG = ctx.createGain(); lfoG.gain.value = vol * 0.5
    const dc   = ctx.createGain(); dc.gain.value   = vol * 0.5   // DC offset so gain stays positive

    lfo.connect(lfoG); lfoG.connect(env.gain); dc.connect(env.gain)
    noise.connect(lp); lp.connect(env)
    noise.start(); lfo.start()
    return env
  }

  const swell = makeWave(350, 0.08, 0.52)  // deep rolling swell
  const foam  = makeWave(900, 0.14, 0.28)  // higher-pitched wash

  swell.connect(dryGain); foam.connect(dryGain); dryGain.connect(master)
  swell.connect(reverb);  foam.connect(reverb);  reverb.connect(wetGain); wetGain.connect(master)

  return { node: master, cleanup: () => {} }
}

// ── SINGING BOWL ─────────────────────────────────────────────────────────────
// Tibetan bowl fundamentals (A2 = 110Hz) + harmonics, struck periodically, long reverb
function buildBowl(ctx: AudioContext): { node: AudioNode; cleanup: () => void } {
  const master = ctx.createGain()
  master.gain.value = 1.0

  const reverb  = createReverb(ctx, 5, 1.2)
  const wetGain = ctx.createGain(); wetGain.gain.value = 0.55
  const dryGain = ctx.createGain(); dryGain.gain.value = 0.45

  // Very soft pink noise bed for ambience
  const noise  = createPinkNoise(ctx)
  const noiseLp = ctx.createBiquadFilter()
  noiseLp.type = "lowpass"; noiseLp.frequency.value = 200
  const noiseG = ctx.createGain(); noiseG.gain.value = 0.04
  noise.connect(noiseLp); noiseLp.connect(noiseG); noiseG.connect(master)
  noise.start()

  let stopped = false
  const timeouts: ReturnType<typeof setTimeout>[] = []

  // Bowl harmonic series: fundamental + 5th + octave + minor 7th + 2nd octave
  const strikeFreqs = [110, 165, 220, 275, 330, 440]

  const strike = () => {
    if (stopped) return
    strikeFreqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      osc.type           = "sine"
      osc.frequency.value = freq

      // Slight detuning for warmth
      const osc2 = ctx.createOscillator()
      osc2.type           = "sine"
      osc2.frequency.value = freq * 1.0015

      const env  = ctx.createGain()
      const vol  = 0.38 / (i + 1)
      const decay = 5 + i * 0.8  // lower harmonics decay slower
      env.gain.setValueAtTime(0, ctx.currentTime)
      env.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.005)
      env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decay)

      osc.connect(env); osc2.connect(env)
      env.connect(dryGain); env.connect(reverb)
      osc.start(); osc2.start()
      osc.stop(ctx.currentTime + decay + 0.1)
      osc2.stop(ctx.currentTime + decay + 0.1)
    })
  }

  const scheduleStrike = () => {
    if (stopped) return
    strike()
    const gap = 12000 + Math.random() * 8000   // 12–20s between strikes
    const t   = setTimeout(scheduleStrike, gap)
    timeouts.push(t)
  }

  scheduleStrike()
  reverb.connect(wetGain); dryGain.connect(master); wetGain.connect(master)

  return {
    node: master,
    cleanup: () => { stopped = true; timeouts.forEach(clearTimeout) },
  }
}

// ── FOREST ───────────────────────────────────────────────────────────────────
// Layered rustling pink noise + soft wind + occasional pentatonic bird notes
function buildForest(ctx: AudioContext): { node: AudioNode; cleanup: () => void } {
  const master = ctx.createGain()
  master.gain.value = 1.0

  const reverb  = createReverb(ctx, 2.5, 2)
  const wetGain = ctx.createGain(); wetGain.gain.value = 0.35
  const dryGain = ctx.createGain(); dryGain.gain.value = 0.65

  // Leaf rustle — mid-band pink noise with slow volume swell
  const rustle = createPinkNoise(ctx)
  const bp1    = ctx.createBiquadFilter()
  bp1.type = "bandpass"; bp1.frequency.value = 2200; bp1.Q.value = 0.8
  const rustleG = ctx.createGain(); rustleG.gain.value = 0.22
  rustle.connect(bp1); bp1.connect(rustleG)
  rustleG.connect(dryGain); rustleG.connect(reverb)
  rustle.start()

  // Wind — low filtered pink noise with slow LFO swell
  const wind  = createPinkNoise(ctx)
  const lp    = ctx.createBiquadFilter()
  lp.type = "lowpass"; lp.frequency.value = 300
  const windG = ctx.createGain(); windG.gain.value = 0.18
  const windLfo  = ctx.createOscillator()
  windLfo.type           = "sine"
  windLfo.frequency.value = 0.04   // very slow swell
  const windLfoG = ctx.createGain(); windLfoG.gain.value = 0.08
  windLfo.connect(windLfoG); windLfoG.connect(windG.gain)
  wind.connect(lp); lp.connect(windG)
  windG.connect(dryGain); windG.connect(reverb)
  wind.start(); windLfo.start()

  // Bird-like notes — pentatonic, high register, occasional
  const BIRD_PENTA = [1046.5, 1174.66, 1318.51, 1567.98, 1760] // C6–A6
  let stopped = false
  const timeouts: ReturnType<typeof setTimeout>[] = []

  const chirp = (freq: number) => {
    if (stopped) return
    const osc  = ctx.createOscillator()
    osc.type           = "sine"
    osc.frequency.value = freq
    // Slight upward glide for natural bird feel
    osc.frequency.linearRampToValueAtTime(freq * 1.06, ctx.currentTime + 0.12)

    const env = ctx.createGain()
    env.gain.setValueAtTime(0, ctx.currentTime)
    env.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 0.02)
    env.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45)
    osc.connect(env); env.connect(reverb)
    osc.start(); osc.stop(ctx.currentTime + 0.5)
  }

  const scheduleBirds = () => {
    if (stopped) return
    // 1–3 note chirp
    const count  = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      const t = setTimeout(() => {
        chirp(BIRD_PENTA[Math.floor(Math.random() * BIRD_PENTA.length)])
      }, i * (120 + Math.random() * 80))
      timeouts.push(t)
    }
    const gap = 6000 + Math.random() * 10000   // 6–16s between phrases
    const next = setTimeout(scheduleBirds, count * 200 + gap)
    timeouts.push(next)
  }

  const initT = setTimeout(scheduleBirds, 2000)
  timeouts.push(initT)

  dryGain.connect(master); reverb.connect(wetGain); wetGain.connect(master)

  return {
    node: master,
    cleanup: () => { stopped = true; timeouts.forEach(clearTimeout) },
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useAmbientSound() {
  const ctxRef     = useRef<AudioContext | null>(null)
  const destRef    = useRef<GainNode | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const [current, setCurrent]   = useState<SoundType>("none")
  const [volume, setVolumeState] = useState(0.65)
  const volumeRef = useRef(0.65)

  const stop = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    if (destRef.current) {
      destRef.current.gain.setTargetAtTime(0, destRef.current.context.currentTime, 0.5)
    }
    setTimeout(() => {
      ctxRef.current?.close()
      ctxRef.current = null
      destRef.current = null
    }, 800)
    setCurrent("none")
  }, [])

  const play = useCallback((type: SoundType) => {
    if (type === "none") { stop(); return }

    cleanupRef.current?.()
    cleanupRef.current = null
    if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null }

    const ctx  = new AudioContext()
    ctxRef.current = ctx
    const dest = ctx.createGain()
    dest.gain.value = 0
    dest.connect(ctx.destination)
    destRef.current = dest

    const { node, cleanup } =
      type === "rain"   ? buildRain(ctx)   :
      type === "ocean"  ? buildOcean(ctx)  :
      type === "bowl"   ? buildBowl(ctx)   :
                          buildForest(ctx)

    cleanupRef.current = cleanup
    node.connect(dest)

    // Smooth fade-in
    dest.gain.setTargetAtTime(volumeRef.current, ctx.currentTime, 1.5)
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
