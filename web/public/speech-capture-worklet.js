// Capture mono PCM; the output stays silent. Never upload or persist audio.
class SpeechCapture extends AudioWorkletProcessor {
  buffer = new Float32Array(2048)
  offset = 0
  constructor() {
    super()
    this.port.onmessage = ({ data }) => { if (data === 'flush') { if (this.offset) this.port.postMessage(this.buffer.slice(0, this.offset)); this.offset = 0; this.port.postMessage({ flushed: true }) } }
  }
  process(inputs) {
    const channels = inputs[0]
    if (channels?.length) for (let i = 0; i < channels[0].length; i++) {
      let value = 0
      for (const channel of channels) value += channel[i] / channels.length
      this.buffer[this.offset++] = value
      if (this.offset === this.buffer.length) {
        this.port.postMessage(this.buffer, [this.buffer.buffer])
        this.buffer = new Float32Array(2048); this.offset = 0
      }
    }
    return true
  }
}
registerProcessor('speech-capture', SpeechCapture)
