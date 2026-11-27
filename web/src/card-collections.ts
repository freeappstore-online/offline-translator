import { scenarios } from './card-scenarios'
export type CardCollection = { id: string; name: string; cards: string[] }
export const collectionsKey = 'offline-translator-collections-v1'
export const collectionsEvent = 'offline-translator-collections-changed'
export function parseCollections(raw: string): CardCollection[] {
  const rows: unknown = JSON.parse(raw)
  if (!Array.isArray(rows)) throw new Error('Invalid collections.')
  const ids = new Set<string>()
  for (const row of rows) {
    if (!row || typeof row.id !== 'string' || !row.id || ids.has(row.id) || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 80 || !Array.isArray(row.cards) || !row.cards.every((id: unknown) => typeof id === 'string')) throw new Error('Invalid collections.')
    ids.add(row.id)
  }
  return rows
}
export function readCollections() { try { return parseCollections(localStorage.getItem(collectionsKey) ?? '[]') } catch { return [] } }
export function updateCollection(collection: CardCollection) {
  const rows = parseCollections(localStorage.getItem(collectionsKey) ?? '[]')
  const next = [...rows.filter(row => row.id !== collection.id), collection]
  const raw = JSON.stringify(next); parseCollections(raw); localStorage.setItem(collectionsKey, raw); window.dispatchEvent(new Event(collectionsEvent))
}
export function createCollection(name: string) {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 80) throw new Error('Use a collection name of 1–80 characters.')
  const old = readCollections().find(row => row.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())
  if (old) return old.id
  const row = { id: 'custom-' + crypto.randomUUID(), name: trimmed, cards: [] }
  updateCollection(row); return row.id
}
export function collectionOptions(custom: CardCollection[]) {
  return [...Object.entries(scenarios).map(([id, name]) => ({ id, name, builtin: true })), ...custom.filter(row => !(row.id in scenarios)).map(row => ({ ...row, builtin: false }))]
}

export function setSharedCollections(cardId: string, selected: string[]) {
  const current = parseCollections(localStorage.getItem(collectionsKey) ?? '[]')
  const options = collectionOptions(current)
  const next = options.map(option => {
    const row = current.find(item => item.id === option.id) ?? {id:option.id,name:option.name,cards:[]}
    return {...row,cards:selected.includes(option.id) ? [...new Set([...row.cards,cardId])] : row.cards.filter(id=>id!==cardId)}
  })
  const raw = JSON.stringify(next); parseCollections(raw); localStorage.setItem(collectionsKey,raw);window.dispatchEvent(new Event(collectionsEvent))
}
