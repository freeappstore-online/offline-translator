const original = self.fetch.bind(self)
self.fetch = (input, init) => {
 const url = String(input instanceof Request ? input.url : input)
 if (/^https:\/\//.test(url)) return Promise.reject(new Error('Offline test blocked external request: '+url))
 return original(input, init)
}
importScripts('/ocr-runtime/worker.min.js')
