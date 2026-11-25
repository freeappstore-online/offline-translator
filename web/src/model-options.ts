export const engines = {
  opus: 'OPUS-MT · English ↔ Vietnamese',
  multilingual: 'M2M100 · English, Vietnamese, Chinese',
}

export type Engine = keyof typeof engines
export type Language = 'en' | 'vi' | 'zh'

const opus = {
  en: { id: 'Xenova/opus-mt-en-vi', revision: '30bcd461c0d7338ad106b36314d3eedc2d4e998c' },
  vi: { id: 'Xenova/opus-mt-vi-en', revision: '541dfd72ec07e8f1563795e0224408ad8d729e80' },
}
const multilingual = { id: 'Xenova/m2m100_418M', revision: '9c374f0b7aca709787cea97b047bfbbd1559d177' }

export function modelFor(engine: Engine, from: Language, to: Language) {
  if (engine === 'multilingual') return multilingual
  if (from !== to && from !== 'zh' && to !== 'zh') return opus[from]
}
