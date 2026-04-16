import type { ElementInstance } from './thumbnail-element-schema'

export type TemplateSource = 'builder' | 'manual' | 'legacy' | 'llm-text' | 'llm-image'

export type Lang = 'ko' | 'en' | 'ja' | 'zh'

export interface TextContent {
  headline: string
  headlineKo: string
  subheadline: string
  price: string
  brandEn: string
  brandKo: string
}

/**
 * Scene는 템플릿이 참조하는 디자인 프리셋이다.
 * public surface에서는 scene 하나만 노출하고,
 * 내부 구현은 필요 시 layout/effect 자산을 조합할 수 있다.
 */
export interface SceneToken {
  id: string
  nameKo: string
  name: string
  description?: string
  group?: string
  tags?: string[]
  requiresCutout?: boolean
  color?: string
  accentColor?: string
  layoutTokenId?: string
  effectTokenId?: string
}

/**
 * Template는 최상위 저장 스냅샷이다.
 * 1024x1024 한 장의 완성 상태를 의미한다.
 */
export interface TemplateSnapshot {
  id: string
  nameKo: string
  name: string
  source: TemplateSource
  sceneTokenId: string
  panelColor: string
  elements: ElementInstance[]
  texts: Partial<Record<Lang, TextContent>>
  baseTemplateId?: string
  version?: number
  createdAt?: string
}

export interface TemplateSavePayload {
  sceneTokenId: string
  panelColor: string
  elements: ElementInstance[]
  texts: Partial<Record<Lang, TextContent>>
  nameKo?: string
  name?: string
}

export interface LegacyTemplateConfig {
  layoutTokenId?: string
  effectTokenId?: string
  panelColor?: string
  elements?: ElementInstance[]
  texts?: Partial<Record<Lang, TextContent>>
  vars?: Record<string, string>
}

export function resolveSceneTokenId(input: {
  sceneTokenId?: string
  baseTemplateId?: string
  id: string
}) {
  return input.sceneTokenId ?? input.baseTemplateId ?? input.id
}

export function normalizeTemplateSnapshot(input: {
  id: string
  nameKo?: string
  name?: string
  source?: TemplateSource
  sceneTokenId?: string
  panelColor?: string
  elements?: ElementInstance[]
  texts?: Partial<Record<Lang, TextContent>>
  baseTemplateId?: string
  version?: number
  createdAt?: string
}): TemplateSnapshot {
  return {
    id: input.id,
    nameKo: input.nameKo ?? input.name ?? input.id,
    name: input.name ?? input.nameKo ?? input.id,
    source: input.source ?? 'manual',
    sceneTokenId: resolveSceneTokenId(input),
    panelColor: input.panelColor ?? '#1a1a2e',
    elements: input.elements ?? [],
    texts: input.texts ?? {},
    baseTemplateId: input.baseTemplateId,
    version: input.version,
    createdAt: input.createdAt ?? new Date().toISOString(),
  }
}

export function isTemplateSnapshot(value: unknown): value is TemplateSnapshot {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<TemplateSnapshot>
  return typeof v.id === 'string'
    && typeof v.sceneTokenId === 'string'
    && typeof v.panelColor === 'string'
    && Array.isArray(v.elements)
    && typeof v.texts === 'object'
}
