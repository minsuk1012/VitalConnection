'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── 타입 ────────────────────────────────────────────────────

interface VocabEntry {
  id: string; source: string
  position: string; layout: string; sizeClass: string; color: string
  accentType: string; accentPlacement: string
  overlayType: string; overlayDirection?: string
  modelPresent: boolean; modelFraming?: string; modelPosition?: string
  mood: string; primaryColor: string; accentColor: string
}

interface DesignVocabulary {
  totalRefs: number
  textBlocks: { id: string; source: string; position: string; layout: string; sizeClass: string; color: string }[]
  decorativeAccents: { id: string; source: string; type: string; placement: string; color: string }[]
  overlays: { id: string; source: string; type: string; direction?: string }[]
  modelCompositions: { id: string; source: string; present: boolean; framing?: string; position?: string }[]
  colorMoods: { id: string; source: string; mood: string; primaryColor: string; accentColor: string }[]
}

interface MixItem {
  filename: string
  approved: boolean
  sourceDiversity: string
  splitDone: boolean
}

interface MixTokens {
  textLayer: {
    elements: { type: string; position: string; sizeClass: string; color: string }[]
    pricePresent: boolean
    tagPresent: boolean
  }
  styleLayer: {
    layoutType: string
    bgType: string
    overlayType?: string
    primaryColor: string
    accentColor?: string
    effectTokens: string[]
    modelPresent: boolean
    modelPosition?: string
  }
}

// ── 상수 ────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  overlay: 'Overlay', a_text: 'A-Text', nukki: 'Nukki', overlay_effect: 'Effect'
}

const TOKEN_COLORS: Record<string, string> = {
  position: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  layout:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
  accent:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
  overlay:  'bg-green-500/20 text-green-300 border-green-500/30',
  model:    'bg-pink-500/20 text-pink-300 border-pink-500/30',
  mood:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
}

function TokenBadge({ label, value, colorKey }: { label: string; value: string; colorKey: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border', TOKEN_COLORS[colorKey] ?? 'bg-zinc-700/50 text-zinc-300 border-zinc-600')}>
      <span className="opacity-60">{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  )
}

// ── 레퍼런스 탭 ──────────────────────────────────────────────

function RefTab() {
  const [vocab, setVocab] = useState<DesignVocabulary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetch('/api/thumbnail/vocab').then(r => r.json()).then(d => { setVocab(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const entries = useMemo<VocabEntry[]>(() => {
    if (!vocab) return []
    return vocab.textBlocks.map((tb, i) => ({
      id: tb.id, source: tb.source,
      position: tb.position, layout: tb.layout, sizeClass: tb.sizeClass, color: tb.color,
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

  const filterOptions = useMemo(() => ({
    position:     [...new Set(entries.map(e => e.position))].sort(),
    accentType:   [...new Set(entries.map(e => e.accentType))].sort(),
    overlayType:  [...new Set(entries.map(e => e.overlayType))].sort(),
    mood:         [...new Set(entries.map(e => e.mood))].sort(),
    modelFraming: [...new Set(entries.filter(e => e.modelFraming).map(e => e.modelFraming!))].sort(),
  }), [entries])

  const categories = useMemo(() => ['all', ...new Set(entries.map(e => e.source.split('/')[0]))], [entries])

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

  if (loading) return <div className="p-8 text-zinc-400">로딩 중...</div>
  if (!vocab)  return <div className="p-8 text-zinc-400">design-vocabulary.json 없음 — npm run thumbnail:extract-vocab</div>

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-52 shrink-0 border-r border-zinc-800 p-4 space-y-5 overflow-y-auto">
        <p className="text-[11px] text-zinc-500">{filtered.length} / {entries.length}</p>
        <div>
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">카테고리</p>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={cn('w-full text-left text-xs px-2 py-1.5 rounded', selectedCategory === cat ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50')}>
              {cat === 'all' ? '전체' : CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>
        {([
          { key: 'position', label: 'Text Position', opts: filterOptions.position },
          { key: 'accentType', label: 'Accent', opts: filterOptions.accentType },
          { key: 'overlayType', label: 'Overlay', opts: filterOptions.overlayType },
          { key: 'mood', label: 'Mood', opts: filterOptions.mood },
          { key: 'modelFraming', label: 'Model Framing', opts: filterOptions.modelFraming },
        ] as const).map(({ key, label, opts }) => (
          <div key={key}>
            <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
            {opts.map(opt => (
              <button key={opt} onClick={() => setFilter(key, opt)}
                className={cn('w-full text-left text-xs px-2 py-1.5 rounded', filters[key] === opt ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50')}>
                {opt}
              </button>
            ))}
          </div>
        ))}
        {Object.values(filters).some(Boolean) && (
          <button onClick={() => setFilters({})} className="w-full text-xs text-zinc-500 hover:text-zinc-300 py-1">필터 초기화</button>
        )}
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(entry => {
            const [cat, filename] = entry.source.split('/')
            const imgBase = `/api/thumbnail/asset/references/${cat}/${filename}`
            return (
              <div key={entry.id} className="bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors">
                <div className="aspect-square relative bg-zinc-800">
                  <img src={`${imgBase}.jpg`} alt={entry.source} className="w-full h-full object-cover"
                    onError={e => { const el = e.currentTarget; if (!el.src.endsWith('.png')) el.src = `${imgBase}.png` }} />
                  <span className="absolute top-1.5 left-1.5 text-[9px] bg-black/60 text-zinc-300 px-1.5 py-0.5 rounded">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </span>
                  <div className="absolute bottom-1.5 right-1.5 flex gap-1">
                    <div className="w-3 h-3 rounded-full border border-zinc-600" style={{ backgroundColor: entry.primaryColor }} />
                    <div className="w-3 h-3 rounded-full border border-zinc-600" style={{ backgroundColor: entry.accentColor }} />
                  </div>
                </div>
                <div className="p-2.5 space-y-1.5">
                  <p className="text-[10px] text-zinc-500 truncate">{entry.source}</p>
                  <div className="flex flex-wrap gap-1">
                    <TokenBadge label="pos"  value={entry.position}    colorKey="position" />
                    <TokenBadge label="lay"  value={entry.layout}      colorKey="layout" />
                    {entry.accentType !== 'none' && <TokenBadge label="acc" value={entry.accentType} colorKey="accent" />}
                    {entry.overlayType !== 'none' && <TokenBadge label="ov" value={entry.overlayType} colorKey="overlay" />}
                    {entry.modelFraming && <TokenBadge label="mdl" value={entry.modelFraming} colorKey="model" />}
                    <TokenBadge label="mood" value={entry.mood}        colorKey="mood" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {filtered.length === 0 && <div className="text-center text-zinc-500 py-20">해당 조건에 맞는 레퍼런스가 없어요</div>}
      </main>
    </div>
  )
}

// ── MixModal ─────────────────────────────────────────────────

function MixModal({ item, onClose }: { item: MixItem; onClose: () => void }) {
  const [tokens, setTokens] = useState<MixTokens | null>(null)

  const stem = item.filename.replace(/\.webp$/, '')
  const originalUrl = item.approved
    ? `/api/thumbnail/asset/mixed/approved/${item.filename}`
    : `/api/thumbnail/asset/mixed/${item.filename}`
  const textUrl  = `/api/thumbnail/asset/references-layers/mixed/${stem}-text.webp`
  const styleUrl = `/api/thumbnail/asset/references-layers/mixed/${stem}-style.webp`
  const tokenUrl = `/api/thumbnail/asset/generated-tokens/mixed/${stem}.json`

  useEffect(() => {
    if (!item.splitDone) return
    fetch(tokenUrl).then(r => r.json()).then(setTokens).catch(() => {})
  }, [item.filename, item.splitDone, tokenUrl])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{stem}</span>
            {item.splitDone && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                분리됨
              </span>
            )}
            {item.approved && !item.splitDone && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-zinc-700/50 text-zinc-400 border-zinc-600">
                승인됨
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-lg leading-none">✕</button>
        </div>

        {/* 3장 비교 */}
        <div className="grid grid-cols-3 gap-3 p-5">
          {([
            { label: '원본',        url: originalUrl, show: true },
            { label: '텍스트 레이어', url: textUrl,    show: item.splitDone },
            { label: '스타일 레이어', url: styleUrl,   show: item.splitDone },
          ] as const).map(({ label, url, show }) => (
            <div key={label}>
              <p className="text-[11px] text-zinc-500 mb-1.5">{label}</p>
              <div className="aspect-square bg-zinc-800 rounded-lg overflow-hidden">
                {show ? (
                  <img src={url} alt={label} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[11px]">
                    분리 전
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 디자인 토큰 */}
        <div className="px-5 pb-5 border-t border-zinc-800 pt-4">
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3">디자인 토큰</p>
          {!item.splitDone ? (
            <p className="text-xs text-zinc-500">
              레이어 분리 후 표시됩니다 →{' '}
              <code className="bg-zinc-800 px-1.5 py-0.5 rounded">npm run thumbnail:split:mixed</code>
            </p>
          ) : !tokens ? (
            <p className="text-xs text-zinc-500">로딩 중...</p>
          ) : (
            <div className="space-y-3">
              {/* styleLayer 토큰 */}
              <div className="flex flex-wrap gap-1.5 items-center">
                {([
                  ['layout',  tokens.styleLayer.layoutType],
                  ['bg',      tokens.styleLayer.bgType],
                  tokens.styleLayer.overlayType ? ['overlay', tokens.styleLayer.overlayType] : null,
                  ['model',   tokens.styleLayer.modelPresent ? (tokens.styleLayer.modelPosition ?? 'present') : 'none'],
                ] as ([string, string] | null)[])
                  .filter((x): x is [string, string] => x !== null)
                  .map(([k, v]) => (
                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-300 border border-zinc-600">
                      <span className="opacity-60">{k} </span>{v}
                    </span>
                  ))}
                <div className="flex gap-1 ml-1">
                  <div className="w-3.5 h-3.5 rounded-full border border-zinc-600" style={{ backgroundColor: tokens.styleLayer.primaryColor }} />
                  {tokens.styleLayer.accentColor && (
                    <div className="w-3.5 h-3.5 rounded-full border border-zinc-600" style={{ backgroundColor: tokens.styleLayer.accentColor }} />
                  )}
                </div>
              </div>
              {/* effectTokens */}
              {tokens.styleLayer.effectTokens.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tokens.styleLayer.effectTokens.map(e => (
                    <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{e}</span>
                  ))}
                </div>
              )}
              {/* textLayer elements */}
              {tokens.textLayer.elements.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tokens.textLayer.elements.map((el, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {el.type} · {el.position} · {el.sizeClass}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Mix 탭 ───────────────────────────────────────────────────

function MixTab() {
  const [items, setItems] = useState<MixItem[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<Set<string>>(new Set())
  const [selectedMix, setSelectedMix] = useState<MixItem | null>(null)

  useEffect(() => {
    fetch('/api/thumbnail/mix-list').then(r => r.json()).then(d => { setItems(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function approve(filename: string) {
    setApproving(prev => new Set(prev).add(filename))
    try {
      const res = await fetch('/api/thumbnail/approve-mix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      })
      if (res.ok) {
        setItems(prev => prev.map(item => item.filename === filename ? { ...item, approved: true } : item))
      }
    } finally {
      setApproving(prev => { const next = new Set(prev); next.delete(filename); return next })
    }
  }

  if (loading) return <div className="p-8 text-zinc-400">로딩 중...</div>

  if (items.length === 0) return (
    <div className="p-8 text-center text-zinc-400">
      <p className="mb-2">생성된 mix 이미지가 없어요</p>
      <code className="text-xs bg-zinc-800 px-2 py-1 rounded">npm run thumbnail:mix -- --count=5</code>
    </div>
  )

  const approvedCount = items.filter(i => i.approved).length

  return (
    <>
      {selectedMix && (
        <MixModal item={selectedMix} onClose={() => setSelectedMix(null)} />
      )}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <p className="text-zinc-400 text-sm">
            총 {items.length}장 · 승인됨 {approvedCount}장
            {approvedCount > 0 && (
              <span className="ml-3 text-zinc-500">
                → <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">npm run thumbnail:split:mixed</code> 로 레이어 분리
              </span>
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map(item => {
            const stem = item.filename.replace(/\.webp$/, '')
            const imgUrl = item.approved
              ? `/api/thumbnail/asset/mixed/approved/${item.filename}`
              : `/api/thumbnail/asset/mixed/${item.filename}`
            const isApproving = approving.has(item.filename)

            return (
              <div
                key={item.filename}
                className={cn(
                  'bg-zinc-900 rounded-lg overflow-hidden border transition-colors cursor-pointer',
                  item.approved ? 'border-emerald-600/50' : 'border-zinc-800 hover:border-zinc-600'
                )}
                onClick={() => setSelectedMix(item)}
              >
                <div className="aspect-square relative bg-zinc-800">
                  <img src={imgUrl} alt={stem} className="w-full h-full object-cover" />
                  {item.approved && (
                    <div className="absolute inset-0 bg-emerald-900/20 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                  )}
                </div>
                <div className="p-2.5 space-y-2">
                  <p className="text-[10px] text-zinc-500">{stem}</p>
                  {item.sourceDiversity && (
                    <p className="text-[10px] text-zinc-600">소스 다양성: {item.sourceDiversity}</p>
                  )}
                  <div className="flex items-center justify-between gap-1">
                    {item.splitDone ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        분리됨
                      </span>
                    ) : (
                      <span />
                    )}
                    {item.approved ? (
                      <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> 승인됨
                      </div>
                    ) : (
                      <button
                        onClick={e => { e.stopPropagation(); approve(item.filename) }}
                        disabled={isApproving}
                        className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 disabled:opacity-50 transition-colors"
                      >
                        {isApproving ? '처리 중...' : '✓ 승인'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────

export default function VocabExplorerPage() {
  const [tab, setTab] = useState<'ref' | 'mix'>('ref')

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-6 shrink-0">
        <Link href="/admin/thumbnail" className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 text-sm">
          <ArrowLeft className="w-3.5 h-3.5" /> 에디터
        </Link>
        <h1 className="text-sm font-medium">Design Vocabulary</h1>
        <div className="flex gap-1 ml-4">
          {(['ref', 'mix'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('text-xs px-3 py-1.5 rounded transition-colors',
                tab === t ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50')}>
              {t === 'ref' ? '레퍼런스' : 'Mix'}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {tab === 'ref' ? <RefTab /> : <MixTab />}
      </div>
    </div>
  )
}
