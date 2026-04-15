# Mix Viewer + Layer Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mix 이미지를 vocab 페이지 탭에서 확인하고 승인 버튼으로 approved 처리, CLI로 레이어 분리하는 워크플로 구현

**Architecture:** API 라우트 2개(mix-list, approve-mix) + vocab 페이지 탭 확장 + split-layers.ts `--mixed` 플래그 추가. 승인은 파일을 `mixed/approved/`로 이동하는 방식으로 기존 approved 패턴 유지.

**Tech Stack:** Next.js App Router, TypeScript, React, `fs.renameSync`, 기존 `split-layers.ts` 재사용

---

## 파일 구조

```
신규:
  app/api/thumbnail/mix-list/route.ts         GET - mix 이미지 목록 + 승인 상태
  app/api/thumbnail/approve-mix/route.ts      POST - 파일을 approved/로 이동

수정:
  app/admin/thumbnail/vocab/page.tsx          탭 추가 + Mix 탭 구현
  scripts/thumbnail/split-layers.ts           --mixed 플래그 추가
  package.json                                thumbnail:split:mixed 스크립트 추가
```

---

## Task 1: `GET /api/thumbnail/mix-list` 라우트

**Files:**
- Create: `app/api/thumbnail/mix-list/route.ts`

- [ ] **Step 1: 파일 생성**

```typescript
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { THUMBNAIL_BASE } from '@/lib/thumbnail'

export const dynamic = 'force-dynamic'

interface MixItem {
  filename: string
  approved: boolean
  sourceDiversity: string
}

export async function GET() {
  const mixDir = path.join(THUMBNAIL_BASE, 'references-transformed/mixed')
  const approvedDir = path.join(mixDir, 'approved')

  if (!fs.existsSync(mixDir)) {
    return NextResponse.json([])
  }

  const files = fs.readdirSync(mixDir)
    .filter(f => /\.webp$/i.test(f) && !f.startsWith('.'))
    .sort()

  const items: MixItem[] = files.map(filename => {
    const stem = filename.replace(/\.webp$/, '')
    const recipePath = path.join(mixDir, `${stem}.recipe.json`)

    let sourceDiversity = ''
    if (fs.existsSync(recipePath)) {
      try {
        const recipe = JSON.parse(fs.readFileSync(recipePath, 'utf-8'))
        sourceDiversity = recipe.recipe?.sourceDiversity ?? ''
      } catch {}
    }

    const approved = fs.existsSync(path.join(approvedDir, filename))

    return { filename, approved, sourceDiversity }
  })

  return NextResponse.json(items)
}
```

- [ ] **Step 2: 동작 확인**

```bash
curl http://localhost:2999/api/thumbnail/mix-list
```

예상 출력:
```json
[
  {"filename":"mix-001.webp","approved":false,"sourceDiversity":"5/5 distinct sources"},
  {"filename":"mix-002.webp","approved":false,"sourceDiversity":"3/5 distinct sources"}
]
```

- [ ] **Step 3: 커밋**

```bash
git add app/api/thumbnail/mix-list/route.ts
git commit -m "feat: add GET /api/thumbnail/mix-list route"
```

---

## Task 2: `POST /api/thumbnail/approve-mix` 라우트

**Files:**
- Create: `app/api/thumbnail/approve-mix/route.ts`

- [ ] **Step 1: 파일 생성**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { THUMBNAIL_BASE } from '@/lib/thumbnail'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const filename = body?.filename

  if (!filename || typeof filename !== 'string' || !/^mix-\d+\.webp$/.test(filename)) {
    return NextResponse.json({ error: '유효하지 않은 filename' }, { status: 400 })
  }

  const mixDir = path.join(THUMBNAIL_BASE, 'references-transformed/mixed')
  const approvedDir = path.join(mixDir, 'approved')
  const src = path.join(mixDir, filename)
  const dst = path.join(approvedDir, filename)

  if (!fs.existsSync(src)) {
    return NextResponse.json({ error: '파일 없음' }, { status: 404 })
  }

  fs.mkdirSync(approvedDir, { recursive: true })
  fs.renameSync(src, dst)

  return NextResponse.json({ ok: true, filename })
}
```

- [ ] **Step 2: 동작 확인**

```bash
curl -X POST http://localhost:2999/api/thumbnail/approve-mix \
  -H "Content-Type: application/json" \
  -d '{"filename":"mix-001.webp"}'
```

예상 출력: `{"ok":true,"filename":"mix-001.webp"}`

파일 이동 확인:
```bash
ls thumbnail/references-transformed/mixed/approved/
# 예상: mix-001.webp
```

- [ ] **Step 3: 커밋**

```bash
git add app/api/thumbnail/approve-mix/route.ts
git commit -m "feat: add POST /api/thumbnail/approve-mix route"
```

---

## Task 3: split-layers.ts `--mixed` 플래그 추가

**Files:**
- Modify: `scripts/thumbnail/split-layers.ts:225-264`
- Modify: `package.json`

- [ ] **Step 1: `main()` 함수에 --mixed 분기 추가**

`scripts/thumbnail/split-layers.ts`의 `main()` 함수 전체를 아래로 교체:

```typescript
async function main() {
  const isTest   = process.argv.includes('--test');
  const isMixed  = process.argv.includes('--mixed');
  const catFlag  = process.argv.find(a => a.startsWith('--cat='))?.replace('--cat=', '') as Category | undefined;
  const fileFlag = process.argv.find(a => a.startsWith('--file='))?.replace('--file=', '');

  // --mixed: references-transformed/mixed/approved/ 처리
  if (isMixed) {
    const mixedApprovedDir = path.join(APPROVED_BASE, 'mixed', 'approved');
    if (!fs.existsSync(mixedApprovedDir)) {
      console.log('❌ mixed/approved/ 폴더 없음. 먼저 UI에서 이미지를 승인하세요.');
      process.exit(1);
    }
    const files = fs.readdirSync(mixedApprovedDir)
      .filter(f => /\.(webp|jpg|jpeg|png)$/i.test(f) && !f.startsWith('.'))
      .sort()
      .map(f => path.join(mixedApprovedDir, f));

    const targets = isTest ? [files[0]] : files;
    if (!targets?.length) { console.log('처리할 파일 없음'); return; }

    console.log(`\n[mixed] ${targets.length}장 처리`);
    let processed = 0;
    for (const filePath of targets) {
      await processFile(filePath, 'mixed', path.basename(filePath));
      processed++;
    }
    console.log(`\n✅ 완료!  처리: ${processed}장`);
    console.log(`   thumbnail/references-layers/mixed/ 에서 확인하세요.\n`);
    return;
  }

  if (fileFlag) {
    const [category, filename] = fileFlag.split('/');
    const filePath = path.join(APPROVED_BASE, category, 'approved', filename);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 파일 없음: ${filePath}`);
      process.exit(1);
    }
    await processFile(filePath, category, filename);
    return;
  }

  const categories = catFlag ? [catFlag as Category] : [...CATEGORIES];
  let processed = 0;

  for (const category of categories) {
    const files = await getApprovedFiles(category);
    if (files.length === 0) {
      console.log(`\n[${category}] approved/ 파일 없음, 스킵`);
      continue;
    }

    const targets = isTest ? [files[0]] : files;
    console.log(`\n[${category}] ${targets.length}장 처리`);

    for (const filePath of targets) {
      await processFile(filePath, category, path.basename(filePath));
      processed++;
    }
  }

  console.log(`\n✅ 완료!  처리: ${processed}장`);
  console.log(`   thumbnail/templates/generated/ 에서 JSON 토큰을 확인하세요.\n`);
}
```

- [ ] **Step 2: package.json에 스크립트 추가**

`package.json` `"scripts"` 블록에 추가:
```json
"thumbnail:split:mixed": "tsx scripts/thumbnail/split-layers.ts --mixed",
```

- [ ] **Step 3: 커밋**

```bash
git add scripts/thumbnail/split-layers.ts package.json
git commit -m "feat: add --mixed flag to split-layers for mixed/approved processing"
```

---

## Task 4: vocab 페이지 탭 + Mix 탭 구현

**Files:**
- Modify: `app/admin/thumbnail/vocab/page.tsx`

- [ ] **Step 1: 파일 전체 교체**

`app/admin/thumbnail/vocab/page.tsx` 전체를 아래로 교체:

```typescript
'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react'
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
      {/* 사이드바 */}
      <aside className="w-48 shrink-0 border-r border-zinc-800 p-4 space-y-5 overflow-y-auto">
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

      {/* 그리드 */}
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

// ── Mix 탭 ───────────────────────────────────────────────────

function MixTab() {
  const [items, setItems] = useState<MixItem[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<Set<string>>(new Set())

  const load = () => {
    fetch('/api/thumbnail/mix-list').then(r => r.json()).then(d => { setItems(d); setLoading(false) }).catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

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

  const approved = items.filter(i => i.approved)

  return (
    <main className="flex-1 p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-5">
        <p className="text-zinc-400 text-sm">
          총 {items.length}장 · 승인됨 {approved.length}장
          {approved.length > 0 && (
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
            <div key={item.filename} className={cn(
              'bg-zinc-900 rounded-lg overflow-hidden border transition-colors',
              item.approved ? 'border-emerald-600/50' : 'border-zinc-800 hover:border-zinc-600'
            )}>
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
                {item.approved ? (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> 승인됨
                  </div>
                ) : (
                  <button
                    onClick={() => approve(item.filename)}
                    disabled={isApproving}
                    className="w-full text-xs py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 disabled:opacity-50 transition-colors"
                  >
                    {isApproving ? '처리 중...' : '✓ 승인'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}

// ── 메인 페이지 ──────────────────────────────────────────────

export default function VocabExplorerPage() {
  const [tab, setTab] = useState<'ref' | 'mix'>('ref')

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* 헤더 */}
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

      {/* 컨텐츠 */}
      <div className="flex flex-1 overflow-hidden">
        {tab === 'ref' ? <RefTab /> : <MixTab />}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 개발 서버에서 확인**

```
http://localhost:2999/admin/thumbnail/vocab
```
- [레퍼런스] 탭: 기존 카드 갤러리 표시
- [Mix] 탭: mix 이미지 카드 + 승인 버튼 표시

- [ ] **Step 3: 커밋**

```bash
git add app/admin/thumbnail/vocab/page.tsx
git commit -m "feat: add Mix tab with approve button to vocab explorer"
```

---

## Self-Review

**스펙 커버리지:**
- ✅ vocab 페이지 탭 추가 → Task 4
- ✅ GET /api/thumbnail/mix-list → Task 1
- ✅ POST /api/thumbnail/approve-mix → Task 2
- ✅ split-layers.ts --mixed 플래그 → Task 3
- ✅ package.json thumbnail:split:mixed → Task 3 Step 2

**타입 일관성:**
- `MixItem.filename` → Task 1에서 정의, Task 4에서 동일하게 사용 ✅
- `approve(filename)` → `POST body.filename` → API에서 `filename` 그대로 ✅
- `approved/` 경로 → Task 2 `renameSync`, Task 3 `mixedApprovedDir` 동일 패턴 ✅
