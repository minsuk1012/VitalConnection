'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VocabEntry {
  id: string
  source: string  // "overlay/img-002"
  // textBlock
  position: string
  layout: string
  sizeClass: string
  color: string
  // decorativeAccent
  accentType: string
  accentPlacement: string
  // overlay
  overlayType: string
  overlayDirection?: string
  // model
  modelPresent: boolean
  modelFraming?: string
  modelPosition?: string
  // colorMood
  mood: string
  primaryColor: string
  accentColor: string
}

interface DesignVocabulary {
  totalRefs: number
  textBlocks: { id: string; source: string; position: string; layout: string; sizeClass: string; color: string }[]
  decorativeAccents: { id: string; source: string; type: string; placement: string; color: string }[]
  overlays: { id: string; source: string; type: string; direction?: string }[]
  modelCompositions: { id: string; source: string; present: boolean; framing?: string; position?: string }[]
  colorMoods: { id: string; source: string; mood: string; primaryColor: string; accentColor: string }[]
}

const CATEGORY_LABELS: Record<string, string> = {
  overlay: 'Overlay', a_text: 'A-Text', nukki: 'Nukki', overlay_effect: 'Effect'
}

const ACCENT_COLORS: Record<string, string> = {
  position: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  layout: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  accent: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  overlay: 'bg-green-500/20 text-green-300 border-green-500/30',
  model: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  mood: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
}

function TokenBadge({ label, value, colorKey }: { label: string; value: string; colorKey: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border',
      ACCENT_COLORS[colorKey] ?? 'bg-zinc-700/50 text-zinc-300 border-zinc-600'
    )}>
      <span className="opacity-60">{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  )
}

export default function VocabExplorerPage() {
  const [vocab, setVocab] = useState<DesignVocabulary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetch('/api/thumbnail/vocab')
      .then(r => r.json())
      .then(data => { setVocab(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // vocabulary를 카드 목록으로 병합
  const entries = useMemo<VocabEntry[]>(() => {
    if (!vocab) return []
    return vocab.textBlocks.map((tb, i) => ({
      id: tb.id,
      source: tb.source,
      position: tb.position,
      layout: tb.layout,
      sizeClass: tb.sizeClass,
      color: tb.color,
      accentType: vocab.decorativeAccents[i]?.type ?? 'none',
      accentPlacement: vocab.decorativeAccents[i]?.placement ?? '',
      overlayType: vocab.overlays[i]?.type ?? 'none',
      overlayDirection: vocab.overlays[i]?.direction,
      modelPresent: vocab.modelCompositions[i]?.present ?? false,
      modelFraming: vocab.modelCompositions[i]?.framing,
      modelPosition: vocab.modelCompositions[i]?.position,
      mood: vocab.colorMoods[i]?.mood ?? '',
      primaryColor: vocab.colorMoods[i]?.primaryColor ?? '#fff',
      accentColor: vocab.colorMoods[i]?.accentColor ?? '#fff',
    }))
  }, [vocab])

  // 필터 옵션 생성
  const filterOptions = useMemo(() => ({
    position: [...new Set(entries.map(e => e.position))].sort(),
    accentType: [...new Set(entries.map(e => e.accentType))].sort(),
    overlayType: [...new Set(entries.map(e => e.overlayType))].sort(),
    mood: [...new Set(entries.map(e => e.mood))].sort(),
    modelFraming: [...new Set(entries.filter(e => e.modelFraming).map(e => e.modelFraming!))].sort(),
  }), [entries])

  // 카테고리 추출
  const categories = useMemo(() => {
    const cats = new Set(entries.map(e => e.source.split('/')[0]))
    return ['all', ...cats]
  }, [entries])

  // 필터 적용
  const filtered = useMemo(() => entries.filter(e => {
    if (selectedCategory !== 'all' && !e.source.startsWith(selectedCategory + '/')) return false
    for (const [key, val] of Object.entries(filters)) {
      if (!val) continue
      if (key === 'position' && e.position !== val) return false
      if (key === 'accentType' && e.accentType !== val) return false
      if (key === 'overlayType' && e.overlayType !== val) return false
      if (key === 'mood' && e.mood !== val) return false
      if (key === 'modelFraming' && e.modelFraming !== val) return false
    }
    return true
  }), [entries, filters, selectedCategory])

  function setFilter(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: prev[key] === value ? '' : value }))
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
      vocabulary 로딩 중...
    </div>
  )

  if (!vocab) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
      <div className="text-center">
        <p className="mb-2">design-vocabulary.json 없음</p>
        <code className="text-xs bg-zinc-800 px-2 py-1 rounded">npm run thumbnail:extract-vocab</code>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* 사이드바 */}
      <aside className="w-52 shrink-0 border-r border-zinc-800 p-4 space-y-5 overflow-y-auto sticky top-0 h-screen">
        <Link href="/admin/thumbnail" className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-sm">
          <ArrowLeft className="w-3.5 h-3.5" /> 에디터
        </Link>

        <div>
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">총 {filtered.length} / {entries.length}</p>
        </div>

        {/* 카테고리 필터 */}
        <div>
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">카테고리</p>
          <div className="space-y-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'w-full text-left text-xs px-2 py-1.5 rounded transition-colors',
                  selectedCategory === cat
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                )}
              >
                {cat === 'all' ? '전체' : CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>
        </div>

        {/* 디자인 요소 필터들 */}
        {([
          { key: 'position', label: 'Text Position', opts: filterOptions.position },
          { key: 'accentType', label: 'Accent', opts: filterOptions.accentType },
          { key: 'overlayType', label: 'Overlay', opts: filterOptions.overlayType },
          { key: 'mood', label: 'Mood', opts: filterOptions.mood },
          { key: 'modelFraming', label: 'Model Framing', opts: filterOptions.modelFraming },
        ] as const).map(({ key, label, opts }) => (
          <div key={key}>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
            <div className="space-y-1">
              {opts.map(opt => (
                <button
                  key={opt}
                  onClick={() => setFilter(key, opt)}
                  className={cn(
                    'w-full text-left text-xs px-2 py-1.5 rounded transition-colors',
                    filters[key] === opt
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        {Object.values(filters).some(Boolean) && (
          <button
            onClick={() => setFilters({})}
            className="w-full text-xs text-zinc-500 hover:text-zinc-300 py-1"
          >
            필터 초기화
          </button>
        )}
      </aside>

      {/* 메인 그리드 */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="mb-5">
          <h1 className="text-lg font-semibold">Design Vocabulary</h1>
          <p className="text-zinc-500 text-sm mt-0.5">레퍼런스에서 추출된 디자인 토큰 탐색기</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(entry => {
            const [cat, filename] = entry.source.split('/')
            // jpg/png 둘 다 시도
            const imgBase = `/api/thumbnail/asset/references/${cat}/${filename}`

            return (
              <div
                key={entry.id}
                className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                {/* 이미지 */}
                <div className="aspect-square relative bg-zinc-800">
                  <img
                    src={`${imgBase}.jpg`}
                    alt={entry.source}
                    className="w-full h-full object-cover"
                    onError={e => {
                      const el = e.currentTarget
                      if (!el.src.endsWith('.png')) el.src = `${imgBase}.png`
                    }}
                  />
                  {/* 카테고리 배지 */}
                  <span className="absolute top-1.5 left-1.5 text-[9px] bg-black/60 text-zinc-300 px-1.5 py-0.5 rounded">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </span>
                  {/* 색상 스와치 */}
                  <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                    <div className="w-3 h-3 rounded-full border border-zinc-600" style={{ backgroundColor: entry.primaryColor }} />
                    <div className="w-3 h-3 rounded-full border border-zinc-600" style={{ backgroundColor: entry.accentColor }} />
                  </div>
                </div>

                {/* 토큰 태그 */}
                <div className="p-2.5 space-y-1.5">
                  <p className="text-[10px] text-zinc-500 truncate">{entry.source}</p>
                  <div className="flex flex-wrap gap-1">
                    <TokenBadge label="pos" value={entry.position} colorKey="position" />
                    <TokenBadge label="lay" value={entry.layout} colorKey="layout" />
                    {entry.accentType !== 'none' && (
                      <TokenBadge label="acc" value={entry.accentType} colorKey="accent" />
                    )}
                    {entry.overlayType !== 'none' && (
                      <TokenBadge label="ov" value={entry.overlayType} colorKey="overlay" />
                    )}
                    {entry.modelFraming && (
                      <TokenBadge label="mdl" value={entry.modelFraming} colorKey="model" />
                    )}
                    <TokenBadge label="mood" value={entry.mood} colorKey="mood" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-zinc-500 py-20">
            해당 조건에 맞는 레퍼런스가 없어요
          </div>
        )}
      </main>
    </div>
  )
}
