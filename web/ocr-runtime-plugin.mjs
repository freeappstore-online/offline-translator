import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { readFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
const tess = dirname(require.resolve('tesseract.js/package.json'))
const core = dirname(require.resolve('tesseract.js-core/package.json', { paths: [tess] }))
const files = new Map([
  ['worker.min.js', join(tess, 'dist/worker.min.js')],
  ['tesseract-core-lstm.wasm.js', join(core, 'tesseract-core-lstm.wasm.js')],
  ['tesseract-core-lstm.wasm', join(core, 'tesseract-core-lstm.wasm')],
])
export function ocrRuntimePlugin() {
  return { name: 'local-ocr-runtime',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split('?')[0]?.replace(/^\/ocr-runtime\//, '')
        if (!req.url?.startsWith('/ocr-runtime/') || !files.has(name)) return next()
        res.setHeader('Content-Type', name.endsWith('.wasm') ? 'application/wasm' : 'application/javascript')
        res.end(readFileSync(files.get(name)))
      })
    },
    generateBundle() { for (const [name, path] of files) this.emitFile({ type: 'asset', fileName: 'ocr-runtime/' + name, source: readFileSync(path) }) },
  }
}
