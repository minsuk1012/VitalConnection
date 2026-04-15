import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { THUMBNAIL_BASE } from '@/lib/thumbnail'

export const dynamic = 'force-dynamic'

interface MixItem {
  filename: string
  approved: boolean
  sourceDiversity: string
  splitDone: boolean
}

export async function GET() {
  const mixDir = path.join(THUMBNAIL_BASE, 'references-transformed/mixed')
  const approvedDir = path.join(mixDir, 'approved')
  const layersDir = path.join(THUMBNAIL_BASE, 'references-layers/mixed')

  const pendingFiles = fs.existsSync(mixDir)
    ? fs.readdirSync(mixDir).filter(f => /\.webp$/i.test(f) && !f.startsWith('.'))
    : []
  const approvedFiles = fs.existsSync(approvedDir)
    ? fs.readdirSync(approvedDir).filter(f => /\.webp$/i.test(f) && !f.startsWith('.'))
    : []

  const allFilenames = [...new Set([...pendingFiles, ...approvedFiles])].sort()

  if (allFilenames.length === 0) {
    return NextResponse.json([])
  }

  const items: MixItem[] = allFilenames.map(filename => {
    const stem = filename.replace(/\.webp$/, '')
    // recipe.json은 항상 mixDir에 남아있음 (webp만 approved/로 이동됨)
    const recipePath = path.join(mixDir, `${stem}.recipe.json`)

    let sourceDiversity = ''
    if (fs.existsSync(recipePath)) {
      try {
        const recipe = JSON.parse(fs.readFileSync(recipePath, 'utf-8'))
        sourceDiversity = recipe.recipe?.sourceDiversity ?? ''
      } catch {}
    }

    const approved = approvedFiles.includes(filename)
    const splitDone = fs.existsSync(path.join(layersDir, `${stem}-text.webp`))

    return { filename, approved, sourceDiversity, splitDone }
  })

  return NextResponse.json(items)
}
