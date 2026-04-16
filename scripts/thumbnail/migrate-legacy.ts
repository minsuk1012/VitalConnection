/**
 * 레거시 썸네일 템플릿을 신규 elements[] 포맷으로 마이그레이션한다.
 *
 * Usage:
 *   npm run thumbnail:migrate-legacy -- --dry-run
 *   npm run thumbnail:migrate-legacy -- --all
 *   npm run thumbnail:migrate-legacy -- --id full-overlay-dark
 */
import fs from 'fs'
import path from 'path'
import { PATHS, getRegistry } from '../../lib/thumbnail'
import { buildRegistryEntry, deriveRequiresCutout } from '../../lib/thumbnail-registry'
import type { ElementInstance } from '../../lib/thumbnail-element-schema'
import { normalizeTemplateSnapshot, resolveSceneTokenId } from '../../lib/thumbnail-template-schema'

type LegacyConfig = {
  layout?: string
  vars?: Record<string, string>
  controls?: unknown[]
  [key: string]: unknown
}

type MigrationTarget = {
  layoutTokenId: string
  effectTokenId: string
  requiresCutout?: boolean
}

type TemplateRegistryEntry = {
  id: string
  nameKo?: string
  name?: string
  source?: 'builder' | 'manual' | 'legacy'
  baseTemplateId?: string
  version?: number
  sceneTokenId?: string
  layoutTokenId?: string
  effectTokenId?: string
  accentColor?: string
  color?: string
  panelColor?: string
  elements?: ElementInstance[]
  layout?: string
  createdAt?: string
  requiresCutout?: boolean
  description?: string
}

const MIGRATION_TARGETS: Record<string, MigrationTarget> = {
  'full-overlay-dark': { layoutTokenId: 'bottom-text-stack', effectTokenId: 'overlay-dark' },
  'full-overlay-left-fade': { layoutTokenId: 'bottom-text-stack', effectTokenId: 'overlay-dark' },
  'full-overlay-gradient': { layoutTokenId: 'bottom-text-stack', effectTokenId: 'overlay-gradient' },
  'full-overlay-light': { layoutTokenId: 'bottom-text-stack', effectTokenId: 'overlay-dark' },
  'full-overlay': { layoutTokenId: 'bottom-text-stack', effectTokenId: 'overlay-dark' },
  'minimal-editorial': { layoutTokenId: 'top-left-editorial', effectTokenId: 'overlay-dark' },
  'overlay-dark-center': { layoutTokenId: 'top-left-editorial', effectTokenId: 'overlay-dark' },
  'overlay-line-bottom': { layoutTokenId: 'top-left-editorial', effectTokenId: 'overlay-dark' },
  'overlay-line-top': { layoutTokenId: 'top-left-editorial', effectTokenId: 'overlay-dark' },
  'left-split': { layoutTokenId: 'left-text-stack', effectTokenId: 'split-light' },
  'split-right-light': { layoutTokenId: 'left-text-stack', effectTokenId: 'split-light' },
  'split-right-dark': { layoutTokenId: 'left-text-stack', effectTokenId: 'split-dark' },
  'vertical-split-gold': { layoutTokenId: 'left-text-stack', effectTokenId: 'split-dark' },
  'bottom-banner': { layoutTokenId: 'bottom-banner', effectTokenId: 'solid-bg' },
  'bottom-banner-circle': { layoutTokenId: 'bottom-banner', effectTokenId: 'solid-bg' },
  'solid-bg-cutout': { layoutTokenId: 'stacked-center-cutout', effectTokenId: 'solid-bg', requiresCutout: true },
  'solid-bg-stacked': { layoutTokenId: 'stacked-center-cutout', effectTokenId: 'solid-bg', requiresCutout: true },
  'solid-bg-dual-tag': { layoutTokenId: 'stacked-center-cutout', effectTokenId: 'solid-bg', requiresCutout: true },
  'center-frame-circle': { layoutTokenId: 'center-frame-circle', effectTokenId: 'solid-bg' },
  'card-frame-dark': { layoutTokenId: 'card-frame-dark', effectTokenId: 'solid-bg' },
  'card-frame-white': { layoutTokenId: 'card-frame-white', effectTokenId: 'solid-bg' },
  'gradient-dual-circle': { layoutTokenId: 'gradient-dual-circle', effectTokenId: 'solid-bg' },
  'circle-bg-callout': { layoutTokenId: 'circle-bg-callout', effectTokenId: 'solid-bg' },
  'arch-frame-editorial': { layoutTokenId: 'arch-frame-editorial', effectTokenId: 'solid-bg' },
  'center-frame-sparkle': { layoutTokenId: 'center-frame-sparkle', effectTokenId: 'solid-bg', requiresCutout: true },
  'solid-bg-stars': { layoutTokenId: 'solid-bg-stars', effectTokenId: 'solid-bg', requiresCutout: true },
  'solid-bg-icons': { layoutTokenId: 'solid-bg-icons', effectTokenId: 'solid-bg', requiresCutout: true },
  'solid-bg-stamp': { layoutTokenId: 'solid-bg-stamp', effectTokenId: 'solid-bg', requiresCutout: true },
  'gradient-mesh': { layoutTokenId: 'gradient-mesh', effectTokenId: 'solid-bg', requiresCutout: true },
  'gradient-stroke-typography': { layoutTokenId: 'gradient-stroke-typography', effectTokenId: 'solid-bg', requiresCutout: true },
  'notebook-diary': { layoutTokenId: 'notebook-diary', effectTokenId: 'solid-bg' },
}

function parseArgs(argv: string[]) {
  const ids: string[] = []
  let dryRun = false
  let all = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }
    if (arg === '--all') {
      all = true
      continue
    }
    if (arg === '--id') {
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        ids.push(next)
        i += 1
      }
      continue
    }
    if (arg.startsWith('--id=')) {
      const value = arg.slice('--id='.length)
      if (value) ids.push(value)
    }
  }

  return { dryRun, all, ids }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
}

function writeJson(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

function isNewConfig(config: LegacyConfig): config is LegacyConfig & {
  sceneTokenId: string
  panelColor: string
  elements: ElementInstance[]
  texts: Record<string, Record<string, string>>
} {
  return typeof config.sceneTokenId === 'string'
    && typeof config.panelColor === 'string'
    && Array.isArray(config.elements)
    && typeof config.texts === 'object'
    && config.texts !== null
}

function pickString(vars: Record<string, string> | undefined, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = vars?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return fallback
}

function pickNumberLike(vars: Record<string, string> | undefined, keys: string[], fallback: string | number): string | number {
  for (const key of keys) {
    const value = vars?.[key]
    if (typeof value !== 'string' || !value.trim()) continue

    const trimmed = value.trim()
    const parsed = Number.parseFloat(trimmed)
    if (!Number.isNaN(parsed) && /^-?\d+(?:\.\d+)?(?:px|deg|%)?$/.test(trimmed)) {
      return parsed
    }
    return trimmed
  }
  return fallback
}

function buildLegacyElements(vars: Record<string, string> | undefined): ElementInstance[] {
  const headlineFont = pickString(vars, ['headline-font'], 'Noto')
  const headlineColor = pickString(vars, ['headline-color', 'text-color', 'text-gradient', 'sub-color'], '#ffffff')
  const subColor = pickString(vars, ['sub-color', 'subheadline-color', 'text-color'], 'rgba(255,255,255,0.85)')
  const priceColor = pickString(vars, ['price-color', 'accent-color', 'badge-color'], '#FF6B9D')
  const brandColor = pickString(vars, ['brand-color', 'sub-color', 'text-color'], 'rgba(255,255,255,0.7)')
  const subBgColor = pickString(vars, ['badge-bg'], '')

  return [
    {
      type: 'image',
      cssTarget: 'model',
      label: '모델',
      props: {
        brightness: pickNumberLike(vars, ['model-brightness'], 1),
        opacity: pickNumberLike(vars, ['model-opacity'], 1),
        zIndex: pickNumberLike(vars, ['model-z-index'], 1),
      },
    },
    {
      type: 'text',
      cssTarget: 'brand-ko',
      label: '브랜드',
      props: {
        fontSize: pickNumberLike(vars, ['brand-size', 'logo-size', 'brand-v-size'], 22),
        color: brandColor,
        fontFamily: headlineFont,
        opacity: pickNumberLike(vars, ['brand-opacity'], 1),
      },
    },
    {
      type: 'text',
      cssTarget: 'headline',
      label: '헤드라인',
      props: {
        fontSize: pickNumberLike(vars, ['headline-size'], 96),
        color: headlineColor,
        fontFamily: headlineFont,
        maxWidth: pickString(vars, ['headline-max-width', 'text-max-width'], '900px'),
        lineHeight: pickNumberLike(vars, ['headline-line-height'], 1.05),
        letterSpacing: pickNumberLike(vars, ['headline-letter-spacing'], 0),
        opacity: pickNumberLike(vars, ['headline-opacity'], 1),
        zIndex: pickNumberLike(vars, ['headline-z-index'], 5),
      },
    },
    {
      type: 'text',
      cssTarget: 'subheadline',
      label: '서브카피',
      props: {
        fontSize: pickNumberLike(vars, ['sub-size', 'subheadline-size'], 30),
        color: subColor,
        ...(subBgColor ? { bgColor: subBgColor } : {}),
      },
    },
    {
      type: 'price',
      cssTarget: 'price',
      label: '가격',
      props: {
        fontSize: pickNumberLike(vars, ['price-size'], 70),
        color: priceColor,
      },
    },
  ]
}

function buildLegacyTexts(entry: TemplateRegistryEntry) {
  return {
    ko: {
      headline: entry.nameKo ?? entry.name ?? entry.id,
      headlineKo: '',
      subheadline: entry.description ?? '',
      price: '25',
      brandKo: '',
      brandEn: entry.name ?? entry.nameKo ?? entry.id,
    },
  }
}

function buildMigratedConfig(
  entry: TemplateRegistryEntry,
  config: LegacyConfig,
  target: MigrationTarget,
) {
  const vars = config.vars ?? {}
  const sceneTokenId = resolveSceneTokenId({
    sceneTokenId: entry.sceneTokenId,
    baseTemplateId: entry.baseTemplateId,
    id: entry.id,
  })
  const panelColor = target.layoutTokenId === 'gradient-dual-circle'
    ? `linear-gradient(${
        pickString(vars, ['bg-angle'], '145deg')
      }, ${
        pickString(vars, ['bg-start'], '#FF6B9D')
      } 0%, ${
        pickString(vars, ['bg-mid'], '#FFAB85')
      } 52%, ${
        pickString(vars, ['bg-end'], '#FFD97A')
      } 100%)`
    : pickString(vars, ['panel-color', 'bg-color', 'bg-base', 'banner-color', 'bg-gradient'], '#1a1a2e')

  return normalizeTemplateSnapshot({
    id: entry.id,
    nameKo: entry.nameKo ?? entry.name ?? entry.id,
    name: entry.name ?? entry.nameKo ?? entry.id,
    source: 'manual',
    sceneTokenId,
    panelColor,
    elements: buildLegacyElements(vars),
    texts: buildLegacyTexts(entry),
    baseTemplateId: entry.baseTemplateId,
    version: entry.version,
    createdAt: entry.createdAt,
  })
}

function main() {
  const { dryRun, all, ids } = parseArgs(process.argv.slice(2))
  const registry = getRegistry() as { templates: TemplateRegistryEntry[] }

  if (all && ids.length > 0) {
    throw new Error('--all 과 --id 는 함께 사용할 수 없습니다')
  }

  const selectedIds = ids.length > 0
    ? ids
    : registry.templates.map(t => t.id)

  const results: Array<{
    id: string
    status: 'converted' | 'already_new' | 'blocked' | 'missing_config' | 'missing_registry'
    sceneTokenId?: string
    layoutTokenId?: string
    effectTokenId?: string
    reason?: string
  }> = []

  for (const id of selectedIds) {
    const entry = registry.templates.find(t => t.id === id)
    if (!entry) {
      results.push({ id, status: 'missing_registry', reason: 'registry entry not found' })
      continue
    }

    const configPath = path.join(PATHS.configs, `${id}.json`)
    if (!fs.existsSync(configPath)) {
      results.push({ id, status: 'missing_config', reason: `config not found: ${configPath}` })
      continue
    }

    const config = readJson<LegacyConfig>(configPath)
    if (isNewConfig(config)) {
      const sceneTokenId = resolveSceneTokenId({
        sceneTokenId: config.sceneTokenId,
        baseTemplateId: entry.baseTemplateId,
        id: entry.id,
      })
      const normalizedConfig = normalizeTemplateSnapshot({
        id,
        nameKo: entry.nameKo ?? entry.name ?? id,
        name: entry.name ?? entry.nameKo ?? id,
        source: 'manual',
        sceneTokenId,
        panelColor: config.panelColor,
        elements: config.elements,
        texts: config.texts,
        baseTemplateId: entry.baseTemplateId,
        version: entry.version,
        createdAt: entry.createdAt,
      })
      const updatedRegistryEntry = buildRegistryEntry({
        ...entry,
        id,
        nameKo: entry.nameKo ?? entry.name ?? id,
        name: entry.name ?? entry.nameKo ?? id,
        source: 'manual',
        sceneTokenId,
        layoutTokenId: entry.layoutTokenId,
        effectTokenId: entry.effectTokenId,
        color: config.panelColor,
        panelColor: config.panelColor,
        elements: config.elements,
        createdAt: entry.createdAt,
      })

      if (!dryRun) {
        writeJson(configPath, normalizedConfig)
        Object.assign(entry, updatedRegistryEntry)
      }

      results.push({
        id,
        status: 'already_new',
        sceneTokenId,
        layoutTokenId: entry.layoutTokenId,
        effectTokenId: entry.effectTokenId,
      })
      continue
    }

    const target =
      MIGRATION_TARGETS[id] ??
      (typeof config.layoutTokenId === 'string' && typeof config.effectTokenId === 'string'
        ? {
            layoutTokenId: config.layoutTokenId,
            effectTokenId: config.effectTokenId,
            requiresCutout: deriveRequiresCutout(config.layoutTokenId),
          }
        : undefined)
    if (!target) {
      results.push({
        id,
        status: 'blocked',
        reason: `no direct token mapping for legacy layout "${config.layout ?? config.layoutTokenId ?? 'unknown'}"`,
      })
      continue
    }

    const migratedConfig = buildMigratedConfig(entry, config, target)
    const updatedRegistryEntry = buildRegistryEntry({
      ...entry,
      id,
      nameKo: entry.nameKo ?? entry.name ?? id,
      name: entry.name ?? entry.nameKo ?? id,
      source: 'manual',
      sceneTokenId: migratedConfig.sceneTokenId,
      layoutTokenId: target.layoutTokenId,
      effectTokenId: target.effectTokenId,
      accentColor: pickString(config.vars, ['accent-color', 'price-color', 'badge-color', 'brand-color', 'headline-color'], ''),
      color: migratedConfig.panelColor,
      panelColor: migratedConfig.panelColor,
      elements: migratedConfig.elements,
      requiresCutout: target.requiresCutout,
      createdAt: entry.createdAt,
    })

    if (!dryRun) {
      writeJson(configPath, migratedConfig)
      Object.assign(entry, updatedRegistryEntry)
    }

    results.push({
      id,
      status: 'converted',
      sceneTokenId: migratedConfig.sceneTokenId,
      layoutTokenId: target.layoutTokenId,
      effectTokenId: target.effectTokenId,
    })
  }

  if (!dryRun) {
    writeJson(PATHS.registry, registry)
  }

  const converted = results.filter(r => r.status === 'converted').length
  const alreadyNew = results.filter(r => r.status === 'already_new').length
  const blocked = results.filter(r => r.status === 'blocked').length
  const missing = results.filter(r => r.status === 'missing_config' || r.status === 'missing_registry').length

  console.log(`processed: ${results.length}`)
  console.log(`converted: ${converted}`)
  console.log(`already new: ${alreadyNew}`)
  console.log(`blocked: ${blocked}`)
  console.log(`missing: ${missing}`)

  if (blocked > 0) {
    console.log('')
    console.log('blocked entries:')
    for (const item of results.filter(r => r.status === 'blocked')) {
      console.log(`- ${item.id}: ${item.reason}`)
    }
  }

  if (dryRun) {
    console.log('')
    console.log('dry-run: no files were written')
  }
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
}
