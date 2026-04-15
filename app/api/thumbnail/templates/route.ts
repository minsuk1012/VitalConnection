// app/api/thumbnail/templates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getRegistry, saveConfig, PATHS } from '@/lib/thumbnail'
import fs from 'fs'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const body = await req.json()
  const { nameKo, source, layoutTokenId, effectTokenId, fontFamily, accentColor, panelColor, texts } = body

  if (!layoutTokenId || !effectTokenId || !fontFamily || !accentColor || !panelColor || !texts?.ko) {
    return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
  }

  const id = `custom-${Date.now()}`
  const config = { layoutTokenId, effectTokenId, fontFamily, accentColor, panelColor, texts }
  saveConfig(id, config)

  const registry = getRegistry()
  registry.templates.push({
    id,
    nameKo: nameKo || '새 템플릿',
    name:   nameKo || 'New Template',
    source: source || 'manual',
    layoutTokenId,
    effectTokenId,
    accentColor,
    createdAt: new Date().toISOString(),
  })
  fs.writeFileSync(PATHS.registry, JSON.stringify(registry, null, 2), 'utf-8')

  return NextResponse.json({ id })
}
