import { useEffect, useRef } from 'react'

/**
 * A dependency-free Aurora surface. It reads microphone energy on an animation
 * frame instead of React state, so the visual remains smooth while recording.
 */
export default function AuroraMicVisual({ listening = false, className = '' }) {
  const canvasRef = useRef(null)
  const levelRef = useRef(0)

  useEffect(() => {
    if (!listening) {
      levelRef.current = 0
      return undefined
    }

    let stream
    let audioContext
    let frameId = 0
    let cancelled = false

    const connectMic = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        audioContext = new AudioContext()
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.55
        audioContext.createMediaStreamSource(stream).connect(analyser)
        const samples = new Uint8Array(analyser.frequencyBinCount)
        const readLevel = () => {
          analyser.getByteFrequencyData(samples)
          const average = samples.reduce((sum, value) => sum + value, 0) / samples.length / 255
          const previous = levelRef.current
          levelRef.current = average > previous ? average : previous * 0.88 + average * 0.12
          frameId = requestAnimationFrame(readLevel)
        }
        readLevel()
      } catch {
        // Typed transcription remains available when microphone analysis is unavailable.
      }
    }

    void connectMic()
    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
      stream?.getTracks().forEach((track) => track.stop())
      void audioContext?.close()
    }
  }, [listening])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const context = canvas.getContext('2d')
    if (!context) return undefined

    let frameId = 0
    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(bounds.width * ratio))
      canvas.height = Math.max(1, Math.round(bounds.height * ratio))
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const draw = (time) => {
      const { width, height } = canvas.getBoundingClientRect()
      const energy = Math.min(1, levelRef.current * 3.5)
      const motion = time / 1800
      const radius = Math.max(width, height) * (0.36 + energy * 0.18)
      context.clearRect(0, 0, width, height)
      context.globalCompositeOperation = 'lighter'

      const paintGlow = (x, y, size, color, alpha) => {
        const gradient = context.createRadialGradient(x, y, 0, x, y, size)
        gradient.addColorStop(0, `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`)
        gradient.addColorStop(0.48, `${color}${Math.round(alpha * 0.42 * 255).toString(16).padStart(2, '0')}`)
        gradient.addColorStop(1, `${color}00`)
        context.fillStyle = gradient
        context.fillRect(0, 0, width, height)
      }

      paintGlow(width * (0.5 + Math.sin(motion) * 0.09), height * (0.45 + Math.cos(motion * 1.3) * 0.08), radius, '#55b6ab', 0.72 + energy * 0.22)
      paintGlow(width * (0.32 + Math.cos(motion * 0.8) * 0.1), height * (0.62 + Math.sin(motion * 1.2) * 0.09), radius * 0.82, '#b7e3dc', 0.5 + energy * 0.2)
      paintGlow(width * (0.7 + Math.sin(motion * 1.1) * 0.07), height * (0.33 + Math.cos(motion * 0.9) * 0.1), radius * 0.7, '#176c68', 0.34 + energy * 0.16)
      context.globalCompositeOperation = 'source-over'
      frameId = requestAnimationFrame(draw)
    }
    frameId = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className={`h-full w-full ${className}`} aria-hidden="true" />
}
