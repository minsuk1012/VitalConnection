// app/api/thumbnail/templates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getRegistry, saveConfig, PATHS } from '@/lib/thumbnail'
import { buildRegistryEntry } from '@/lib/thumbnail-registry'
import { normalizeTemplateSnapshot } from '@/lib/thumbnail-template-schema'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const body = await req.json()
  const {
    nameKo,
    source,
    name,
    sceneTokenId,
    accentColor,
    panelColor,
    elements,
    texts,
    requiresCutout,
  } = body

  if (!sceneTokenId || !panelColor || !elements?.length || !texts?.ko) {
    return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
  }

  const id = `custom-${Date.now()}`
  const snapshot = normalizeTemplateSnapshot({
    id,
    nameKo: nameKo || '새 템플릿',
    name: name || nameKo || 'New Template',
    source: source || 'manual',
    sceneTokenId,
    panelColor,
    elements,
    texts,
    createdAt: new Date().toISOString(),
  })
  saveConfig(id, snapshot)

  const registry = getRegistry()
  registry.templates.push(buildRegistryEntry({
    ...snapshot,
    id,
    accentColor,
    color: snapshot.panelColor,
    panelColor: snapshot.panelColor,
    elements: snapshot.elements,
    sceneTokenId: snapshot.sceneTokenId,
    requiresCutout,
  }))
  fs.writeFileSync(PATHS.registry, JSON.stringify(registry, null, 2), 'utf-8')

  return NextResponse.json({ id })
}
