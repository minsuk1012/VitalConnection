# Mix Split Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mix 탭 카드 클릭 시 모달로 원본/텍스트레이어/스타일레이어 3장 비교 + 디자인 토큰 표시

**Architecture:** asset 라우트에 references-layers/generated-tokens 베이스 추가 → mix-list에 splitDone 필드 추가 → vocab 페이지에 MixModal 컴포넌트 삽입. 토큰 JSON은 모달 열릴 때 on-demand fetch.

**Tech Stack:** Next.js App Router, TypeScript, React, fs (Node), 기존 asset/[...slug] 라우트 재사용

---

## 파일 구조

```
수정:
  app/api/thumbnail/asset/[...slug]/route.ts   ALLOWED_BASES 2항목 추가
  app/api/thumbnail/mix-list/route.ts          splitDone 필드 추가
  app/admin/thumbnail/vocab/page.tsx           MixModal + 카드 변경
```

---

## Task 1: asset 라우트에 references-layers, generated-tokens 베이스 추가

**Files:**
- Modify: `app/api/thumbnail/asset/[...slug]/route.ts:26-34`

- [ ] **Step 1: ALLOWED_BASES에 두 항목 추가**

`app/api/thumbnail/asset/[...slug]/route.ts`의 `ALLOWED_BASES` 객체:

```typescript
const ALLOWED_BASES: Record<string, string> = {
  'models':            PATHS.models,
  'models-raw':        PATHS.modelsRaw,
  'models-cutout':     PATHS.cutout,
  'fonts':             PATHS.fonts,
  'docs':              path.join(THUMBNAIL_BASE, 'docs'),
  'references':        path.join(THUMBNAIL_BASE, 'references'),
  'mixed':             path.join(THUMBNAIL_BASE, 'references-transformed/mixed'),
  'references-layers': path.join(THUMBNAIL_BASE, 'references-layers'),
  'generated-tokens':  path.join(THUMBNAIL_BASE, 'templates/generated'),
}
```

- [ ] **Step 2: 동작 확인**

개발 서버가 켜진 상태에서:
```bash
curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:2999/api/thumbnail/asset/references-layers/mixed/mix-001-text.webp"
```
예상: `200` (파일 있을 때) 또는 `404` (파일 없을 때, 정상)

```bash
curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:2999/api/thumbnail/asset/generated-tokens/mixed/mix-001.json"
```
예상: `200` 또는 `404`

- [ ] **Step 3: 커밋**

```bash
git add app/api/thumbnail/asset/[...slug]/route.ts
git commit -m "feat: add references-layers and generated-tokens asset bases"
```

---

## Task 2: mix-list API에 splitDone 필드 추가

**Files:**
- Modify: `app/api/thumbnail/mix-list/route.ts`

- [ ] **Step 1: MixItem 인터페이스에 splitDone 추가**

`app/api/thumbnail/mix-list/route.ts` 전체를 아래로 교체:

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
```

- [ ] **Step 2: 동작 확인**

```bash
curl -s http://localhost:2999/api/thumbnail/mix-list | python3 -m json.tool | head -20
```

예상 출력 (mix 이미지가 있는 경우):
```json
[
  {
    "filename": "mix-001.webp",
    "approved": false,
    "sourceDiversity": "5/5 distinct sources",
    "splitDone": false
  }
]
```

- [ ] **Step 3: 커밋**

```bash
git add app/api/thumbnail/mix-list/route.ts
git commit -m "feat: add splitDone field to mix-list API"
```

---

## Task 3: MixModal 컴포넌트 추가 + MixTab 카드 변경

**Files:**
- Modify: `app/admin/thumbnail/vocab/page.tsx`

- [ ] **Step 1: MixItem 타입에 splitDone 추가 + MixTokens 타입 추가**

파일 상단 타입 섹션에서 `MixItem` 인터페이스를 찾아 교체:

```typescript
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
```

- [ ] **Step 2: MixModal 컴포넌트 추가**

`MixTab` 함수 바로 위에 `MixModal` 컴포넌트 삽입:

```typescript
function MixModal({ item, onClose }: { item: MixItem; onClose: () => void }) {
  const [tokens, setTokens] = useState<MixTokens | null>(null)

  const stem = item.filename.replace(/\.webp$/, '')
  const originalUrl = item.approved
    ? `/api/thumbnail/asset/mixed/approved/${item.filename}`
    : `/api/thumbnail/asset/mixed/${item.filename}`
  const textUrl    = `/api/thumbnail/asset/references-layers/mixed/${stem}-text.webp`
  const styleUrl   = `/api/thumbnail/asset/references-layers/mixed/${stem}-style.webp`
  const tokenUrl   = `/api/thumbnail/asset/generated-tokens/mixed/${stem}.json`

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
                ] as ([string, string] | null)[]).filter((x): x is [string, string] => x !== null).map(([k, v]) => (
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
```

- [ ] **Step 3: MixTab에 selectedMix state + 모달 렌더링 + 카드 변경 적용**

`MixTab` 함수를 아래로 교체:

```typescript
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
```

**주의:** 승인 버튼의 `onClick`에 `e.stopPropagation()` 추가 — 카드 클릭(모달 열기)과 충돌 방지.

- [ ] **Step 4: 브라우저에서 확인**

```
http://localhost:2999/admin/thumbnail/vocab
```

확인 항목:
- [Mix] 탭 → 카드 목록 표시됨
- split된 이미지 카드에 `분리됨` 뱃지 표시
- 카드 클릭 → 모달 열림
- 모달: 원본 이미지 표시, split 미완료 시 레이어 자리 "분리 전" 텍스트
- 모달: split 완료 시 텍스트/스타일 레이어 이미지 + 토큰 표시
- 모달 외부 클릭 또는 ✕ 클릭 → 닫힘
- 승인 버튼 클릭 → 모달 열리지 않음 (stopPropagation)

- [ ] **Step 5: 커밋**

```bash
git add app/admin/thumbnail/vocab/page.tsx
git commit -m "feat: add MixModal with layer comparison and token display"
```

---

## Self-Review

**스펙 커버리지:**
- ✅ splitDone 필드 → Task 2
- ✅ asset 베이스 추가 → Task 1
- ✅ 카드 클릭 → 모달 → Task 3 Step 3
- ✅ 원본/텍스트/스타일 3장 비교 → Task 3 Step 2
- ✅ 디자인 토큰 표시 → Task 3 Step 2
- ✅ split 미완료 시 blank + CLI 안내 → Task 3 Step 2
- ✅ 카드 splitDone 뱃지 → Task 3 Step 3

**타입 일관성:**
- `MixItem.splitDone` → Task 2에서 API 반환, Task 3 Step 1에서 인터페이스 업데이트 ✅
- `MixTokens` → Task 3 Step 1에서 정의, Step 2 모달에서 사용 ✅
- `selectedMix: MixItem | null` → Task 3 Step 3에서 정의, `MixModal` props와 일치 ✅
- `e.stopPropagation()` 승인 버튼 → 카드 onClick과 충돌 방지 ✅
