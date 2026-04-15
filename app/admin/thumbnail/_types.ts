// app/admin/thumbnail/_types.ts
import type { TextContent } from '@/app/admin/thumbnail/builder/_types'

export type { TextContent }

/** 새 포맷 템플릿 설정 (BuilderState 기반) */
export interface TemplateConfig {
  layoutTokenId: string   // 'bottom-text-stack'
  effectTokenId: string   // 'overlay-dark'
  fontFamily:    string   // 'BlackHan'
  accentColor:   string   // '#FF6B9D'
  panelColor:    string   // '#1A1A2E'
  texts: {
    ko:   TextContent
    en?:  TextContent
    ja?:  TextContent
    zh?:  TextContent
  }
}

/** 템플릿 레지스트리 엔트리 (신규 + legacy 공용) */
export interface TemplateEntry {
  id:           string
  nameKo:       string
  name:         string
  source:       'llm-text' | 'llm-image' | 'builder' | 'manual' | 'legacy'
  layoutTokenId?: string   // 신규 전용
  effectTokenId?: string   // 신규 전용
  accentColor:  string
  createdAt:    string
  // legacy 호환 필드
  layout?:          string
  tone?:            string
  priceStyle?:      string
  tags?:            string[]
  description?:     string
  color?:           string
  requiresCutout?:  boolean
}

/** LLM 초안 응답 (draft API 공통 출력) */
export interface DraftResult {
  layoutTokenId:  string
  effectTokenId:  string
  fontFamily:     string
  accentColor:    string
  panelColor:     string
  templateNameKo: string
  reason:         string
  texts: {
    ko: TextContent
  }
}
