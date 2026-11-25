import type { Phrase } from './phrases'

export const scenarios = {
  essentials: 'Everyday phrases',
  restaurant: 'At a restaurant',
  transport: 'Getting around',
  hotel: 'At the hotel',
  shopping: 'Shopping',
  belongings: 'Lost belongings',
  help: 'Getting help',
}
export type Scenario = keyof typeof scenarios
export const tasks = ['Starting a conversation', 'Finding your way', 'Getting a table', 'Ordering', 'Ingredients', 'Changing an order', 'Paying', 'Checking in', 'During your stay', 'Checking out', 'Choosing an item', 'Reporting a loss', 'Finding your belongings', 'Asking for help', 'More phrases'] as const
export type Task = typeof tasks[number]

export function cardScenarios(card: Phrase): Scenario[] {
  if (card.scenarios?.length) return card.scenarios
  const text = card.en.toLowerCase()
  if (/belongings-/.test(card.id)) {
    const contexts: Scenario[] = ['belongings']
    if (/I left my|I have lost my|Have you seen my/i.test(card.en)) {
      contexts.push('hotel', 'transport')
      if (/bag|wallet|phone|umbrella|jacket|hat|glasses/.test(text)) contexts.push('restaurant')
    }
    return contexts
  }
  if (card.category === 'food') return ['restaurant']
  if (card.category === 'help') return ['help']
  if (/services-/.test(card.id)) {
    if (/rental|parking|shuttle/.test(text)) return ['transport', 'hotel']
    if (/printing|sim card|charging/.test(text)) return ['shopping', 'hotel']
    return ['hotel']
  }
  if (card.category === 'directions') {
    if (/hotel|hostel/.test(text)) return ['hotel', 'transport']
    if (/market|mall|bakery|bank|atm/.test(text)) return ['shopping', 'transport']
    return ['transport']
  }
  return ['essentials']
}

export function cardTask(card: Phrase, scenario: string): Task {
  if (card.task) return card.task
  const text = card.en.toLowerCase()
  if (/belongings-/.test(card.id)) return /seen|find|check|return/.test(text) ? 'Finding your belongings' : 'Reporting a loss'
  if (/cost|charge|pay|price|bill|receipt/.test(text)) return 'Paying'
  if (scenario === 'restaurant' || card.category === 'food') {
    if (/not order|not arrived|cancel|pack|more /.test(text)) return 'Changing an order'
    if (/allerg|vegetarian|ingredient/.test(text)) return 'Ingredients'
    return 'Ordering'
  }
  if (/checkout|check-out/.test(text)) return 'Checking out'
  if (/check-in/.test(text)) return 'Checking in'
  if (card.category === 'directions') return 'Finding your way'
  if (card.category === 'help') return 'Asking for help'
  if (/services-/.test(card.id)) return 'During your stay'
  return 'Starting a conversation'
}
