// app/admin/thumbnail/_types.ts
export type { ElementInstance } from '@/lib/thumbnail-element-schema'

export type Lang = 'ko' | 'en' | 'ja' | 'zh'

export const LANG_LABELS: Record<Lang, { flag: string; label: string }> = {
  ko: { flag: '🇰🇷', label: 'KO' },
  en: { flag: '🇺🇸', label: 'EN' },
  ja: { flag: '🇯🇵', label: 'JA' },
  zh: { flag: '🇨🇳', label: 'ZH' },
}

export { FONT_OPTIONS } from '@/lib/thumbnail-element-schema'

export interface TextContent {
  headline:    string
  headlineKo:  string
  subheadline: string
  price:       string
  brandEn:     string
  brandKo:     string
}

/** 신규 토큰 포맷 템플릿 설정 */
export interface TemplateConfig {
  layoutTokenId: string
  effectTokenId: string
  panelColor:    string
  elements:      import('@/lib/thumbnail-element-schema').ElementInstance[]
  texts: {
    ko:   TextContent
    en?:  TextContent
    ja?:  TextContent
    zh?:  TextContent
  }
}

/** 템플릿 레지스트리 엔트리 */
export interface TemplateEntry {
  id:             string
  nameKo:         string
  name:           string
  source:         'builder' | 'manual' | 'legacy'
  layoutTokenId?: string
  effectTokenId?: string
  accentColor:    string
  createdAt:      string
  layout?:        string
  tone?:          string
  priceStyle?:    string
  tags?:          string[]
  description?:   string
  color?:         string
  requiresCutout?: boolean
}
