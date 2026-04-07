# 인스타그램 수집 페이지 UX 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인스타그램 수집 페이지의 관리자 경험을 개선하여, 수집→결과확인→분석의 흐름을 끊김 없이 만든다.

**Architecture:** CollectTab에 수집 이력/잔액/결과 미리보기를 통합하고, 태그 입력 UX를 개선한다. ExploreTab에 collection 필터를 추가하여 수집→탐색 연결을 강화한다. CandidatesTab 상단에 파이프라인 카운트 카드를 추가한다.

**Tech Stack:** Next.js 16, React 19, shadcn/ui (base-nova), Drizzle ORM + better-sqlite3, Tailwind CSS v4

---

## File Map

| Action | File | 역할 |
|--------|------|------|
| Modify | `app/admin/instagram/components/CollectTab.tsx` | 수집 이력, 잔액, 결과 미리보기, 태그 개선 |
| Modify | `app/admin/instagram/components/ExploreTab.tsx` | collection 필터 추가 |
| Modify | `app/admin/instagram/components/CandidatesTab.tsx` | 상태 카운트 카드 |
| Modify | `app/api/instagram/results/route.ts` | collections 목록 반환 (이미 함) |
| Create | `app/api/instagram/collections/route.ts` | 수집 이력 전용 API |
| Modify | `app/api/admin/apify-keys/route.ts` | 잔액 summary 엔드포인트 (기존 활용) |

---

### Task 1: 수집 이력 표시

수집 페이지 하단에 최근 수집 이력 테이블을 추가한다. collections 테이블의 데이터를 노출.

**Files:**
- Create: `app/api/instagram/collections/route.ts`
- Modify: `app/admin/instagram/components/CollectTab.tsx`

- [ ] **Step 1: collections API 생성**

```ts
// app/api/instagram/collections/route.ts
import { NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getCollections } from '@/lib/db'

export async function GET() {
  const authError = await checkAdmin()
  if (authError) return authError
  const collections = getCollections()
  return NextResponse.json({ collections })
}
```

- [ ] **Step 2: CollectTab에 수집 이력 섹션 추가**

CollectTab 하단에 최근 수집 이력을 Table로 표시. 컴포넌트 마운트 시 `/api/instagram/collections` 호출.

표시 컬럼: 시간 | 유형 | 검색어 | 건수 | 상태

```tsx
// CollectTab 내부에 추가할 state와 fetch
const [collections, setCollections] = useState<any[]>([])

useEffect(() => {
  fetch('/api/instagram/collections').then(r => r.json()).then(d => setCollections(d.collections || []))
}, [])

// progress가 변경될 때(수집 완료 시) 이력 새로고침
// startCollect 함수 마지막에:
fetch('/api/instagram/collections').then(r => r.json()).then(d => setCollections(d.collections || []))
```

이력 테이블 JSX — progress 카드 아래에 배치:

```tsx
{collections.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">최근 수집 이력</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>시간</TableHead>
            <TableHead>유형</TableHead>
            <TableHead>검색어</TableHead>
            <TableHead className="text-right">건수</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {collections.slice(0, 10).map((c: any) => (
            <TableRow key={c.id}>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(c.createdAt).toLocaleDateString('ko-KR')}
              </TableCell>
              <TableCell><Badge variant="secondary">{c.type}</Badge></TableCell>
              <TableCell className="font-medium">{c.query}</TableCell>
              <TableCell className="text-right">{c.totalCollected}</TableCell>
              <TableCell>
                <span className={cn(
                  'text-xs',
                  c.status === 'completed' && 'text-green-600',
                  c.status === 'failed' && 'text-destructive',
                  c.status === 'running' && 'text-primary',
                )}>
                  {c.status === 'completed' ? '완료' : c.status === 'failed' ? '실패' : '진행중'}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)}
```

필요한 import 추가: `Table, TableBody, TableCell, TableHead, TableHeader, TableRow` from `@/components/ui/table`

- [ ] **Step 3: 중복 태그 경고**

태그 추가 시 최근 수집에 같은 query가 있으면 경고 표시:

```tsx
function addTag(value: string) {
  const trimmed = value.trim().replace(/^[#@]/, '')
  if (trimmed && !tags.includes(trimmed)) {
    setTags([...tags, trimmed])
  }
  setInputValue('')
}

// 중복 감지 (렌더링에서):
const recentQueries = collections.map((c: any) => c.query)
const duplicateTags = tags.filter(t => recentQueries.includes(t))
```

중복 경고 JSX (태그 입력 영역 아래):
```tsx
{duplicateTags.length > 0 && (
  <p className="text-xs text-muted-foreground">
    이미 수집한 태그: {duplicateTags.join(', ')}
  </p>
)}
```

- [ ] **Step 4: 확인 및 커밋**

Run: `npx next build` — 빌드 성공 확인
Commit: `feat: 수집 이력 테이블 및 중복 태그 경고 추가`

---

### Task 2: 수집 완료 후 결과 미리보기

각 쿼리 수집 완료 시 상위 결과를 인라인으로 보여주고, 탐색 페이지로의 링크를 제공한다.

**Files:**
- Modify: `app/admin/instagram/components/CollectTab.tsx`

- [ ] **Step 1: ProgressItem 타입에 collectionId, topPosts 추가**

```tsx
type ProgressItem = {
  query: string
  status: 'pending' | 'collecting' | 'done' | 'error'
  count?: number
  error?: string
  collectionId?: number
  topPosts?: { owner_username: string; likes: number; url: string }[]
}
```

- [ ] **Step 2: 수집 완료 시 collectionId와 상위 게시물 저장**

startCollect 함수에서, 수집 성공 시 data에서 collectionId를 받고, 상위 게시물 3개를 가져온다:

```tsx
if (res.ok) {
  const topRes = await fetch(`/api/instagram/results?collectionId=${data.collectionId}&page=1&sortBy=likes&sortOrder=desc`)
  const topData = await topRes.json()
  items[i] = {
    ...items[i],
    status: 'done',
    count: data.inserted,
    collectionId: data.collectionId,
    topPosts: (topData.rows || []).slice(0, 3).map((p: any) => ({
      owner_username: p.owner_username,
      likes: p.likes,
      url: p.url,
    })),
  }
}
```

- [ ] **Step 3: 완료된 항목에 미리보기 + 링크 표시**

progress 렌더링에서 done 상태일 때 미리보기 추가:

```tsx
{item.status === 'done' && item.topPosts && item.topPosts.length > 0 && (
  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
    <span>상위:</span>
    {item.topPosts.map((p, i) => (
      <span key={i}>@{p.owner_username} ({p.likes.toLocaleString()})</span>
    ))}
    <a
      href={`/admin/instagram/explore?collectionId=${item.collectionId}`}
      className="text-primary hover:underline ml-auto"
    >
      전체 결과 →
    </a>
  </div>
)}
```

- [ ] **Step 4: 확인 및 커밋**

Run: `npx next build`
Commit: `feat: 수집 완료 시 상위 결과 미리보기 및 탐색 링크`

---

### Task 3: Apify 잔액을 수집 페이지에 표시

수집 시작 전에 잔액을 확인할 수 있도록, 예상 비용 옆에 잔액을 표시한다.

**Files:**
- Modify: `app/admin/instagram/components/CollectTab.tsx`

- [ ] **Step 1: 잔액 fetch 추가**

```tsx
const [balance, setBalance] = useState<number | null>(null)

useEffect(() => {
  fetch('/api/admin/apify-keys').then(r => r.ok ? r.json() : null).then(d => {
    if (d?.keys) {
      setBalance(d.keys.reduce((sum: number, k: any) => sum + (k.remaining ?? 0), 0))
    }
  }).catch(() => {})
}, [])
```

- [ ] **Step 2: 비용/잔액 표시 개선**

기존 예상 크레딧 텍스트를 교체:

```tsx
<span className="text-sm text-muted-foreground pb-2">
  예상 ~${estimatedCost}
  {balance !== null && (
    <> / 잔액 <span className={balance < Number(estimatedCost) ? 'text-destructive' : ''}>${balance.toFixed(2)}</span></>
  )}
</span>
```

- [ ] **Step 3: 확인 및 커밋**

Run: `npx next build`
Commit: `feat: 수집 페이지에 Apify 잔액 표시`

---

### Task 4: 태그 입력 개선 (붙여넣기, 추천)

쉼표/줄바꿈으로 여러 태그를 한 번에 추가하고, 최근 사용한 태그를 추천한다.

**Files:**
- Modify: `app/admin/instagram/components/CollectTab.tsx`

- [ ] **Step 1: 붙여넣기 핸들러 추가**

```tsx
function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
  const text = e.clipboardData.getData('text')
  if (text.includes(',') || text.includes('\n')) {
    e.preventDefault()
    const newTags = text.split(/[,\n]/).map(t => t.trim().replace(/^[#@]/, '')).filter(Boolean)
    const unique = newTags.filter(t => !tags.includes(t))
    setTags([...tags, ...unique])
  }
}
```

Input에 `onPaste={handlePaste}` 추가.

- [ ] **Step 2: 최근 사용 태그 추천**

collections에서 distinct query를 추출하여 추천:

```tsx
const recentSuggestions = [...new Set(collections.map((c: any) => c.query))].filter(q => !tags.includes(q)).slice(0, 8)
```

태그 입력 영역 아래에 추천 태그 표시:

```tsx
{recentSuggestions.length > 0 && !isCollecting && (
  <div className="flex flex-wrap gap-1">
    <span className="text-xs text-muted-foreground">최근:</span>
    {recentSuggestions.map(s => (
      <button
        key={s}
        onClick={() => addTag(s)}
        className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border hover:bg-muted transition-colors"
      >
        {s}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 3: 확인 및 커밋**

Run: `npx next build`
Commit: `feat: 태그 붙여넣기 및 최근 태그 추천`

---

### Task 5: 탐색 페이지에 collection 필터 추가

탐색 페이지에서 특정 수집 작업의 결과만 볼 수 있게 한다. 수집 페이지의 "전체 결과 →" 링크와 연결.

**Files:**
- Modify: `app/admin/instagram/components/ExploreTab.tsx`

- [ ] **Step 1: URL searchParams에서 collectionId 읽기**

```tsx
import { useSearchParams } from 'next/navigation'

// 컴포넌트 상단:
const searchParams = useSearchParams()
const initialCollectionId = searchParams.get('collectionId') || ''
```

state 추가:
```tsx
const [filterCollection, setFilterCollection] = useState(initialCollectionId)
const [collectionsList, setCollectionsList] = useState<any[]>([])
```

- [ ] **Step 2: collections 목록 fetch**

```tsx
useEffect(() => {
  fetch('/api/instagram/collections').then(r => r.json()).then(d => setCollectionsList(d.collections || []))
}, [])
```

- [ ] **Step 3: fetchResults에 collectionId 파라미터 추가**

fetchResults 함수의 params에:
```tsx
if (filterCollection) params.set('collectionId', filterCollection)
```

useCallback deps에 `filterCollection` 추가.

- [ ] **Step 4: 필터 UI에 collection Select 추가**

필터 바의 해시태그 Select 앞에:

```tsx
<Select value={filterCollection} onValueChange={v => { setFilterCollection(v === 'all' ? '' : v); setPage(1) }}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="전체 수집" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">전체 수집</SelectItem>
    {collectionsList.slice(0, 20).map((c: any) => (
      <SelectItem key={c.id} value={String(c.id)}>
        {c.query} ({c.totalCollected}건)
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

- [ ] **Step 5: 확인 및 커밋**

Run: `npx next build`
Commit: `feat: 탐색 페이지에 수집 작업 필터 추가`

---

### Task 6: 후보 상태 카운트 카드

후보 관리 페이지 상단에 상태별 건수 요약 카드를 추가한다.

**Files:**
- Modify: `app/admin/instagram/components/CandidatesTab.tsx`
- Modify: `app/api/instagram/influencers/route.ts`

- [ ] **Step 1: API에서 상태별 카운트 반환**

`app/api/instagram/influencers/route.ts`에서 statusCounts를 추가 반환:

```ts
// 기존 import에 추가 필요시:
import { getStatusCounts } from '@/lib/db'
```

db.ts에 함수 추가:
```ts
export function getStatusCounts() {
  const db = getDb()
  const rows = db.select({
    status: influencers.status,
    count: count(),
  }).from(influencers).groupBy(influencers.status).all()
  return Object.fromEntries(rows.map(r => [r.status, r.count]))
}
```

route.ts 응답에 추가:
```ts
const statusCounts = getStatusCounts()
return NextResponse.json({ ...data, statusCounts })
```

- [ ] **Step 2: CandidatesTab에 카운트 카드 추가**

```tsx
const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
```

fetchData에서:
```tsx
setStatusCounts(data.statusCounts || {})
```

필터 Card 위에 카운트 카드:
```tsx
<div className="flex gap-2 flex-wrap">
  {STATUSES.map(s => (
    <button
      key={s}
      onClick={() => { setFilterStatus(filterStatus === s ? '' : s); setPage(1) }}
      className={cn(
        'px-3 py-1.5 rounded-lg border text-sm transition-colors',
        filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted',
      )}
    >
      {s} <span className="font-bold ml-1">{statusCounts[s] || 0}</span>
    </button>
  ))}
</div>
```

- [ ] **Step 3: 확인 및 커밋**

Run: `npx next build`
Commit: `feat: 후보 상태별 카운트 카드`

---

### Task 7: 일괄 프로필 분석

탐색 페이지에서 여러 계정을 선택하여 한번에 분석할 수 있게 한다.

**Files:**
- Modify: `app/admin/instagram/components/ExploreTab.tsx`

- [ ] **Step 1: 체크박스 선택 상태 추가**

```tsx
const [selected, setSelected] = useState<Set<string>>(new Set())
const [bulkAnalyzing, setBulkAnalyzing] = useState(false)

function toggleSelect(username: string) {
  setSelected(prev => {
    const next = new Set(prev)
    next.has(username) ? next.delete(username) : next.add(username)
    return next
  })
}

function toggleSelectAll() {
  const usernames = posts.map(p => p.owner_username).filter(Boolean)
  if (selected.size === usernames.length) {
    setSelected(new Set())
  } else {
    setSelected(new Set(usernames))
  }
}
```

- [ ] **Step 2: 테이블에 체크박스 컬럼 추가**

TableHeader에:
```tsx
<TableHead className="w-8">
  <input type="checkbox" onChange={toggleSelectAll} checked={selected.size > 0 && selected.size === posts.length} />
</TableHead>
```

각 TableRow에:
```tsx
<TableCell>
  <input type="checkbox" checked={selected.has(p.owner_username)} onChange={() => toggleSelect(p.owner_username)} onClick={e => e.stopPropagation()} />
</TableCell>
```

colSpan을 7→8로 변경 (빈 행, 프로필 확장 행).

- [ ] **Step 3: 일괄 분석 버튼**

필터 바의 CSV 내보내기 옆에:

```tsx
{selected.size > 0 && (
  <Button variant="outline" size="sm" onClick={bulkAnalyze} disabled={bulkAnalyzing}>
    {bulkAnalyzing ? '분석중...' : `선택 분석 (${selected.size})`}
  </Button>
)}
```

```tsx
async function bulkAnalyze() {
  setBulkAnalyzing(true)
  const usernames = [...selected]
  for (const username of usernames) {
    await analyzeProfile(username)
  }
  setSelected(new Set())
  setBulkAnalyzing(false)
}
```

- [ ] **Step 4: 확인 및 커밋**

Run: `npx next build`
Commit: `feat: 탐색 페이지 일괄 프로필 분석`
