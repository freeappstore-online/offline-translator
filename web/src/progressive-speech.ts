import type { SpeechResult } from './speech-engine'
type Run = (samples: Float32Array, partial: (text: string) => void) => Promise<SpeechResult>
/** At most one inference in flight. Old snapshots never queue up behind live audio. */
export class ProgressiveSpeech {
  private pending?: Promise<void>
  private finishing = false
  private active = true
  private lastPreview = ''
  readonly metrics = { previewPasses: 0, updates: 0, previewInferenceMs: 0, previewErrors: [] as string[] }
  private run: Run
  private preview: (text: string) => void
  constructor(run: Run, preview: (text: string) => void) { this.run = run; this.preview = preview }
  update(samples: Float32Array) {
    if (!this.active || this.finishing || this.pending) return
    this.metrics.previewPasses++
    const publish = (text: string, complete = false) => {
      const next = text.trim()
      // A fresh pass starts decoding at word one. Keep the preceding draft until
      // the new pass catches up, rather than erasing it on every first token.
      if (!this.active || !next || next === this.lastPreview || (!complete && next.length < this.lastPreview.length)) return
      this.lastPreview = next; this.metrics.updates++; this.preview(next)
    }
    this.pending = this.run(samples, text => publish(text)).then(result => {
      this.metrics.previewInferenceMs += result.inferenceMs ?? 0
      if (result.text) publish(result.text, true)
    }).catch(error => { if (this.active) this.metrics.previewErrors.push(String(error)) }).finally(() => { this.pending = undefined })
  }
  async finish(samples: Float32Array) {
    this.finishing = true
    await this.pending
    if (!this.active) throw new DOMException('Speech input canceled.', 'AbortError')
    return this.run(samples, text => { const next = text.trim(); if (this.active && next && next.length >= this.lastPreview.length && next !== this.lastPreview) { this.lastPreview = next; this.preview(next) } })
  }
  cancel() { this.active = false }
}
