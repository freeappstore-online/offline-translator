import type { Language } from './model-options'

type Words = Record<Language, string>
export const belongings: Record<string, Words> = {
  bag: { en: 'bag', vi: 'túi', zh: '包' },
  suitcase: { en: 'suitcase', vi: 'va li', zh: '行李箱' },
  backpack: { en: 'backpack', vi: 'ba lô', zh: '背包' },
  wallet: { en: 'wallet', vi: 'ví', zh: '钱包' },
  phone: { en: 'phone', vi: 'điện thoại', zh: '手机' },
  charger: { en: 'charger', vi: 'bộ sạc', zh: '充电器' },
  umbrella: { en: 'umbrella', vi: 'ô', zh: '雨伞' },
  glasses: { en: 'glasses', vi: 'kính', zh: '眼镜' },
}

// This frame accepts only the explicitly typed belongings above.
export function leftBelonging(words: Words): Words {
  return {
    en: `I left my ${words.en} here.`,
    vi: `Tôi để quên ${words.vi} ở đây.`,
    zh: `我把${words.zh}忘在这里了。`,
  }
}
