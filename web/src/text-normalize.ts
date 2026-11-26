export function normalize(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(/[’']/g, '')
    .replace(/\p{P}/gu, ' ').trim().replace(/\s+/g, ' ')
}
