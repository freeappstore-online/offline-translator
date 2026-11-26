/** Bounded PCM storage; no encoded chunks need to be decoded mid-recording. */
export class SpeechAudio {
  private chunks: Float32Array[] = []
  private length = 0
  readonly sampleRate: number
  readonly maxSeconds: number
  constructor(sampleRate: number, maxSeconds = 20) { this.sampleRate = sampleRate; this.maxSeconds = maxSeconds }
  append(input: Float32Array) {
    const remaining = Math.max(0, Math.floor(this.sampleRate * this.maxSeconds) - this.length)
    const chunk = input.slice(0, remaining)
    if (chunk.length) { this.chunks.push(chunk); this.length += chunk.length }
  }
  get duration() { return this.length / this.sampleRate }
  samples() {
    const source = new Float32Array(this.length)
    let offset = 0
    for (const chunk of this.chunks) { source.set(chunk, offset); offset += chunk.length }
    const count = Math.floor(this.length * 16000 / this.sampleRate), output = new Float32Array(count)
    // Average each source interval when downsampling to avoid simple point-sampling aliasing.
    for (let i = 0; i < count; i++) {
      const start = i * this.sampleRate / 16000, end = Math.min(this.length, (i + 1) * this.sampleRate / 16000)
      let sum = 0
      for (let j = Math.floor(start); j < Math.ceil(end); j++) sum += source[j] * Math.max(0, Math.min(end, j + 1) - Math.max(start, j))
      output[i] = sum / (end - start)
    }
    return output
  }
  clear() { this.chunks = []; this.length = 0 }
}
export function hasSpeech(samples: Float32Array) {
  if (samples.length < 4000) return false
  let peak = 0
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample))
  return peak >= 0.003
}
