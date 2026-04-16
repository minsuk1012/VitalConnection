// app/admin/thumbnail/_types.ts
import type { Lang, SceneToken, TemplateSnapshot, TextContent } from '@/lib/thumbnail-template-schema'
export type { ElementInstance } from '@/lib/thumbnail-element-schema'
export type { Lang, SceneToken, TemplateSnapshot, TextContent }

export const LANG_LABELS: Record<Lang, { flag: string; label: string }> = {
  ko: { flag: '🇰🇷', label: 'KO' },
  en: { flag: '🇺🇸', label: 'EN' },
  ja: { flag: '🇯🇵', label: 'JA' },
  zh: { flag: '🇨🇳', label: 'ZH' },
}

export { FONT_OPTIONS } from '@/lib/thumbnail-element-schema'

/** 신규 토큰 포맷 템플릿 설정 */
export interface TemplateConfig {
  sceneTokenId: string
  panelColor: string
  elements: import('@/lib/thumbnail-element-schema').ElementInstance[]
  texts: Partial<Record<Lang, TextContent>>
}

/** 템플릿 레지스트리 엔트리 */
export interface TemplateEntry {
  id:             string
  nameKo:         string
  name:           string
  source:         'builder' | 'manual' | 'legacy'
  baseTemplateId?: string
  version?:       number
  sceneTokenId?:  string
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
