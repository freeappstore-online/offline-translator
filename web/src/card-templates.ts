import { scorePhrase } from './suggest-phrases'
import type { Language } from './model-options'
export type TemplateField = { id: string; label: string; kind: 'name' | 'identifier' | 'date' | 'text' }
export type CardTemplate = { id: string; revision: number; title: string; fields: readonly string[]; wording: Record<Language, string> }
export type TemplateReference = { id: string; revision: number; source: Language; values: Record<string, string> }
export const templateFields: Record<string, TemplateField> = {
  destination: { id: 'destination', label: 'Destination', kind: 'name' },
  hotel: { id: 'hotel', label: 'Hotel name', kind: 'name' },
  booking: { id: 'booking', label: 'Booking number', kind: 'identifier' },
  restaurant: { id: 'restaurant', label: 'Restaurant name', kind: 'name' },
  date: { id: 'date', label: 'Date', kind: 'date' },
  person: { id: 'person', label: 'Person’s name', kind: 'name' },
  allergen: { id: 'allergen', label: 'Allergen', kind: 'text' },
}
export const cardTemplates: readonly CardTemplate[] = [
  { id: 'go_to', revision: 1, title: 'Getting somewhere', fields: ['destination'], wording: { en: 'I want to go to {destination}.', vi: 'Tôi muốn đến {destination}.', zh: '我想去{destination}。' } },
  { id: 'where_is', revision: 1, title: 'Finding a place', fields: ['destination'], wording: { en: 'Where is {destination}?', vi: '{destination} ở đâu?', zh: '{destination}在哪里？' } },
  { id: 'staying_at', revision: 1, title: 'My accommodation', fields: ['hotel', 'booking'], wording: { en: 'I’m staying at {hotel}, and my booking number is {booking}.', vi: 'Tôi đang ở tại {hotel}, và mã đặt phòng của tôi là {booking}.', zh: '我住在{hotel}，我的预订编号是{booking}。' } },
  { id: 'reservation_number', revision: 1, title: 'My booking number', fields: ['booking'], wording: { en: 'My reservation number is {booking}.', vi: 'Mã đặt chỗ của tôi là {booking}.', zh: '我的预订编号是{booking}。' } },
  { id: 'hotel_checkin', revision: 1, title: 'Checking in', fields: ['hotel'], wording: { en: 'I’d like to check in at {hotel}.', vi: 'Tôi muốn làm thủ tục nhận phòng tại {hotel}.', zh: '我想在{hotel}办理入住。' } },
  { id: 'checkout_date', revision: 1, title: 'My check-out date', fields: ['date'], wording: { en: 'My check-out date is {date}.', vi: 'Ngày trả phòng của tôi là {date}.', zh: '我的退房日期是{date}。' } },
  { id: 'restaurant_booking', revision: 1, title: 'A restaurant reservation', fields: ['restaurant'], wording: { en: 'I have a reservation at {restaurant}.', vi: 'Tôi đã đặt bàn tại {restaurant}.', zh: '我在{restaurant}订了位。' } },
  { id: 'meet_person', revision: 1, title: 'Meeting someone', fields: ['person'], wording: { en: 'I’d like to meet {person}.', vi: 'Tôi muốn gặp {person}.', zh: '我想见{person}。' } },
  { id: 'allergy', revision: 1, title: 'Explaining an allergy', fields: ['allergen'], wording: { en: 'I’m allergic to {allergen}.', vi: 'Tôi bị dị ứng với {allergen}.', zh: '我对{allergen}过敏。' } },
]
export function renderTemplate(template: CardTemplate, source: Language, values: Record<string, string>) {
  if (!template.fields.every(id => values[id]?.trim() && values[id].length <= 120)) throw new Error('Complete every field (up to 120 characters each).')
  const text = template.wording[source].replace(/\{(\w+)\}/g, (_, id: string) => values[id].trim())
  if (text.length > 500) throw new Error('Keep the completed phrase within 500 characters.')
  return text
}

function recommendationText(text: string, source: Language) {
  const plain = text.replace(/\{\w+\}/g, '')
  return source === 'en' ? plain.toLowerCase().replace(/[’']/g, '').replace(/\b(i|im|id|am|my|the|a|an|to|at|is|and|of|for|with)\b/g, ' ').replace(/\s+/g, ' ').trim() : plain
}
export function recommendTemplates(query: string, source: Language) {
  if (!query.trim()) return cardTemplates.slice(0, 3)
  return cardTemplates.map(template => ({ template, score: scorePhrase(recommendationText(query, source), recommendationText(template.wording[source], source), source) }))
    .filter(item => item.score >= 0.25).sort((a, b) => b.score - a.score).slice(0, 3).map(item => item.template)
}
