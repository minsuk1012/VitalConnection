// app/admin/thumbnail/builder/_types.ts
import type { LayoutToken, EffectToken } from '@/lib/thumbnail-compose'

export type Lang = 'ko' | 'en' | 'ja' | 'zh'

// fs 없는 순수 상수 — thumbnail.ts(서버 전용)에서 분리
export const FONT_OPTIONS = [
  { value: 'Noto',        label: 'Noto Sans KR' },
  { value: 'Pretendard',  label: 'Pretendard Bold' },
  { value: 'BlackHan',    label: 'Black Han Sans' },
  { value: 'Bebas',       label: 'Bebas Neue' },
  { value: 'Montserrat',  label: 'Montserrat' },
  { value: 'Playfair',    label: 'Playfair Display' },
  { value: 'PlayfairI',   label: 'Playfair Display Italic' },
  { value: 'NotoSerif',   label: 'Noto Serif' },
] as const

export interface TextContent {
  headline:    string
  headlineKo:  string   // 한글 헤드라인 (2색 레이아웃용)
  subheadline: string
  price:       string
  brandEn:     string
  brandKo:     string
}

export interface LayoutSuggestion {
  layoutTokenId: string
  confidence:    number   // 0-100
  reason:        string   // 한국어 1문장
  fontFamily:    string
}

export interface BuilderState {
  // Step 1
  imageType:         'full' | 'cutout' | null
  archetype:         string | null
  selectedImageFile: string | null   // 실제 파일 경로 (models/ or models-cutout/ 기준 상대경로)
                                     // e.g. 'dewy_glow/hcanips_53436_...png'

  // Step 2
  suggestions:   LayoutSuggestion[]
  layoutTokenId: string | null

  // Step 3
  effectTokenId: string | null

  // Step 4
  texts:         Record<Lang, TextContent>
  fontFamily:    string
  accentColor:   string
  panelColor:    string

  // 메타
  rendered:      boolean
}

export const DEFAULT_TEXT: TextContent = {
  headline: '', headlineKo: '', subheadline: '', price: '', brandEn: '', brandKo: '',
}

export const INITIAL_STATE: BuilderState = {
  imageType: null, archetype: null, selectedImageFile: null,
  suggestions: [], layoutTokenId: null,
  effectTokenId: null,
  texts: { ko: { ...DEFAULT_TEXT }, en: { ...DEFAULT_TEXT }, ja: { ...DEFAULT_TEXT }, zh: { ...DEFAULT_TEXT } },
  fontFamily: 'BlackHan', accentColor: '#FF6B9D', panelColor: '#1A1A2E',
  rendered: false,
}

export const STEPS = [
  { id: 'image',   label: '이미지 선택',     icon: '🖼' },
  { id: 'layout',  label: '텍스트 레이아웃',  icon: '✦' },
  { id: 'effect',  label: '효과',            icon: '🎨' },
  { id: 'text',    label: '텍스트 편집',      icon: '✏️' },
  { id: 'export',  label: '내보내기',         icon: '⬇' },
] as const

export type StepId = typeof STEPS[number]['id']

export const LANG_LABELS: Record<Lang, { flag: string; label: string }> = {
  ko: { flag: '🇰🇷', label: 'KO' },
  en: { flag: '🇺🇸', label: 'EN' },
  ja: { flag: '🇯🇵', label: 'JA' },
  zh: { flag: '🇨🇳', label: 'ZH' },
}

export type { LayoutToken, EffectToken }
