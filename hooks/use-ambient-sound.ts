"use client"

import { useRef, useState, useCallback } from "react"

export type SoundType = "none" | "rain" | "ocean" | "bowl"

function buildRain(ctx: AudioContext): AudioNode {
  const bufSize = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  // Brown noise
  let last = 0
  for (let i = 0; i < bufSize; i++) {
    const white = Math.random() * 2 - 1
    data[i] = (last + 0.02 * white) / 1.02
    last = data[i]
    data[i] *= 3.5
  }
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true

  const filter = ctx.createBiquadFilter()
  filter.type = "bandpass"
  filter.frequency.value = 1200
  filter.Q.value = 0.4

  const gain = ctx.createGain()
  gain.gain.value = 0.35

  src.connect(filter)
  filter.connect(gain)
  src.start()
  return gain
}

function buildOcean(ctx: AudioContext): AudioNode {
  const bufSize = ctx.sampleRate * 4
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true

  const lp = ctx.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 400

  // LFO for wave swell
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.12
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = 0.18
  lfo.connect(lfoGain)

  const gain = ctx.createGain()
  gain.gain.value = 0.22
  lfoGain.connect(gain.gain)

  src.connect(lp)
  lp.connect(gain)
  lfo.start()
  src.start()
  return gain
}

function buildBowl(ctx: AudioContext): AudioNode {
  const master = ctx.createGain()
  master.gain.value = 0.15

  const freqs = [432, 528, 639]
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.value = freq

    const g = ctx.createGain()
    g.gain.value = 1 / freqs.length

    // Slow amplitude swell per partial
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.05 + i * 0.03
    const lfoG = ctx.createGain()
    lfoG.gain.value = 0.4
    lfo.connect(lfoG)
    lfoG.connect(g.gain)

    osc.connect(g)
    g.connect(master)
    osc.start()
    lfo.start()
  })

  return master
}

export function useAmbientSound() {
  const ctxRef      = useRef<AudioContext | null>(null)
  const nodeRef     = useRef<AudioNode | null>(null)
  const destRef     = useRef<GainNode | null>(null)
  const [current, setCurrent] = useState<SoundType>("none")
  const [volume, setVolumeState] = useState(0.7)
  const volumeRef = useRef(0.7)

  const stop = useCallback(() => {
    if (destRef.current) {
      destRef.current.gain.setTargetAtTime(0, destRef.current.context.currentTime, 0.4)
    }
    setTimeout(() => {
      ctxRef.current?.close()
      ctxRef.current = null
      nodeRef.current = null
      destRef.current = null
    }, 600)
    setCurrent("none")
  }, [])

  const play = useCallback((type: SoundType) => {
    if (type === "none") { stop(); return }

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

    const node = type === "rain"  ? buildRain(ctx)
               : type === "ocean" ? buildOcean(ctx)
               : buildBowl(ctx)

    nodeRef.current = node
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
