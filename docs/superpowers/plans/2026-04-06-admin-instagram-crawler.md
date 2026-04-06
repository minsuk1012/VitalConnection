# Admin 인스타그램 수집 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** VitalConnection admin에 인스타그램 해시태그/프로필/위치/키워드 기반 수집 + 결과 조회 + 인플루언서 분석 기능 추가

**Architecture:** Apify API로 인스타그램 데이터를 수집하고 SQLite에 저장. `/admin/instagram` ��일 페이지에서 3개 탭(수집/결과/인플루언서)으로 운영. 클라이언트가 항목별로 순차 API 호출하여 진행 상황을 직접 관리.

**Tech Stack:** Next.js 16 (App Router), better-sqlite3, apify-client, Tailwind CSS, TypeScript

---

## 파일 구조

```
lib/
  db.ts                              — SQLite 초기화 + 테이블 생성 + 쿼리 헬퍼
  apify.ts                           — Apify 클라이언트 래퍼 (Actor 매핑)
  auth.ts                            — API 라우트용 인증 헬퍼
app/admin/instagram/
  page.tsx                           — 메인 페이지 (인증 체크 + 탭 컨테이너)
  components/
    CollectTab.tsx                   — 수집 탭 (프리셋, 모드전환, 태그입력, 진행상황)
    ResultsTab.tsx                   — 결과 탭 (테이블, 필터, 정렬, 페이지네이션, CSV)
    InfluencerTab.tsx                — 인플루언서 탭 (랭킹, CSV)
app/api/instagram/
  collect/route.ts                   — POST: 단일 쿼리 수집
  results/route.ts                   — GET: 결과 조회 (필터/정렬/페이지네이션)
  results/export/route.ts            — GET: 결과 CSV 내보내기
  influencers/route.ts               — GET: 인플루언서 조회
  influencers/export/route.ts        — GET: 인플루언서 CSV 내보내기
```

---

### Task 1: 의존성 설치 + 설정

**Files:**
- Modify: `package.json`
- Modify: `next.config.js`
- Modify: `.env.local`
- Modify: `.gitignore`

- [ ] **Step 1: 패키지 설치**

```bash
cd /Users/choiminsuk/Desktop/beautypass_martketing/vitalconnection
npm install better-sqlite3 apify-client
npm install -D @types/better-sqlite3
```

- [ ] **Step 2: next.config.js에 better-sqlite3 외부 패키지 등록**

`next.config.js`를 다음으로 교체:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
};

module.exports = nextConfig;
```

- [ ] **Step 3: .env.local에 APIFY_TOKEN 추가**

`.env.local` 파일 끝에 추가:

```
APIFY_TOKEN=apify_api_REDACTED
```

- [ ] **Step 4: .gitignore에 SQLite DB 파일 추가**

`.gitignore` 파일 끝에 추가:

```
*.db
.superpowers/
```

- [ ] **Step 5: 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공 (기존 기능 깨지지 않음)

- [ ] **Step 6: 커밋**

```bash
git add package.json package-lock.json next.config.js .env.local .gitignore
git commit -m "chore: add better-sqlite3, apify-client dependencies"
```

---

### Task 2: SQLite 데이터베이스 레이어

**Files:**
- Create: `lib/db.ts`

- [ ] **Step 1: lib/db.ts 작성**

```typescript
import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'instagram.db')

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')
    _db.pragma('foreign_keys = ON')
    initTables(_db)
  }
  return _db
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      query TEXT NOT NULL,
      limit_per_item INTEGER NOT NULL DEFAULT 30,
      status TEXT NOT NULL DEFAULT 'pending',
      total_collected INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id INTEGER NOT NULL REFERENCES collections(id),
      shortcode TEXT NOT NULL,
      url TEXT,
      caption TEXT,
      owner_username TEXT,
      owner_fullname TEXT,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      post_timestamp TEXT,
      location TEXT,
      hashtags TEXT DEFAULT '[]',
      post_type TEXT,
      display_url TEXT,
      search_tag TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(shortcode)
    );

    CREATE TABLE IF NOT EXISTS influencers (
      username TEXT PRIMARY KEY,
      fullname TEXT,
      profile_url TEXT,
      post_count INTEGER DEFAULT 0,
      avg_likes REAL DEFAULT 0,
      avg_comments REAL DEFAULT 0,
      avg_engagement REAL DEFAULT 0,
      hashtags TEXT DEFAULT '[]',
      last_updated TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_posts_collection ON posts(collection_id);
    CREATE INDEX IF NOT EXISTS idx_posts_username ON posts(owner_username);
    CREATE INDEX IF NOT EXISTS idx_posts_likes ON posts(likes DESC);
    CREATE INDEX IF NOT EXISTS idx_influencers_engagement ON influencers(avg_engagement DESC);
  `)
}

export function createCollection(type: string, query: string, limitPerItem: number) {
  const db = getDb()
  const result = db.prepare(
    'INSERT INTO collections (type, query, limit_per_item, status) VALUES (?, ?, ?, ?)'
  ).run(type, query, limitPerItem, 'running')
  return result.lastInsertRowid as number
}

export function updateCollection(id: number, status: string, totalCollected: number) {
  const db = getDb()
  db.prepare(
    'UPDATE collections SET status = ?, total_collected = ? WHERE id = ?'
  ).run(status, totalCollected, id)
}

export function insertPosts(collectionId: number, posts: any[], searchTag: string) {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO posts
      (collection_id, shortcode, url, caption, owner_username, owner_fullname,
       likes, comments, post_timestamp, location, hashtags, post_type, display_url, search_tag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertMany = db.transaction((items: any[]) => {
    let inserted = 0
    for (const p of items) {
      const result = stmt.run(
        collectionId,
        p.shortCode || p.shortcode || p.id || '',
        p.url || '',
        p.caption || '',
        p.ownerUsername || p.owner?.username || '',
        p.ownerFullName || p.owner?.fullName || '',
        p.likesCount ?? p.likes ?? 0,
        p.commentsCount ?? p.comments ?? 0,
        p.timestamp || '',
        p.locationName || p.location || '',
        JSON.stringify(p.hashtags || []),
        p.type || p.productType || '',
        p.displayUrl || '',
        searchTag
      )
      if (result.changes > 0) inserted++
    }
    return inserted
  })

  return insertMany(posts)
}

export function refreshInfluencers() {
  const db = getDb()
  db.exec(`
    INSERT OR REPLACE INTO influencers (username, fullname, profile_url, post_count, avg_likes, avg_comments, avg_engagement, hashtags, last_updated)
    SELECT
      owner_username,
      MAX(owner_fullname),
      'https://instagram.com/' || owner_username,
      COUNT(*),
      ROUND(AVG(likes), 1),
      ROUND(AVG(comments), 1),
      ROUND(AVG(likes) + AVG(comments), 1),
      '[]',
      datetime('now')
    FROM posts
    WHERE owner_username != ''
    GROUP BY owner_username
  `)

  // Update hashtags per influencer
  const rows = db.prepare(`
    SELECT owner_username, hashtags FROM posts WHERE owner_username != ''
  `).all() as { owner_username: string; hashtags: string }[]

  const map: Record<string, Set<string>> = {}
  for (const row of rows) {
    if (!map[row.owner_username]) map[row.owner_username] = new Set()
    try {
      const tags = JSON.parse(row.hashtags)
      for (const t of tags) map[row.owner_username].add(t)
    } catch {}
  }

  const updateStmt = db.prepare('UPDATE influencers SET hashtags = ? WHERE username = ?')
  for (const [username, tags] of Object.entries(map)) {
    updateStmt.run(JSON.stringify([...tags]), username)
  }
}

export function queryResults(params: {
  collectionId?: number
  searchTag?: string
  minLikes?: number
  sortBy?: string
  sortOrder?: string
  page?: number
  pageSize?: number
}) {
  const db = getDb()
  const conditions: string[] = []
  const values: any[] = []

  if (params.collectionId) {
    conditions.push('p.collection_id = ?')
    values.push(params.collectionId)
  }
  if (params.searchTag) {
    conditions.push('p.search_tag = ?')
    values.push(params.searchTag)
  }
  if (params.minLikes !== undefined) {
    conditions.push('p.likes >= ?')
    values.push(params.minLikes)
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

  const sortCol = { likes: 'p.likes', comments: 'p.comments', date: 'p.post_timestamp' }[params.sortBy || 'likes'] || 'p.likes'
  const sortDir = params.sortOrder === 'asc' ? 'ASC' : 'DESC'

  const page = params.page || 1
  const pageSize = params.pageSize || 50
  const offset = (page - 1) * pageSize

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM posts p ${where}`).get(...values) as any).cnt

  const rows = db.prepare(`
    SELECT p.*, c.type as collection_type, c.query as collection_query
    FROM posts p
    JOIN collections c ON p.collection_id = c.id
    ${where}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT ? OFFSET ?
  `).all(...values, pageSize, offset)

  return { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export function queryInfluencers(params: {
  sortBy?: string
  sortOrder?: string
  page?: number
  pageSize?: number
}) {
  const db = getDb()
  const sortCol = { likes: 'avg_likes', comments: 'avg_comments', posts: 'post_count' }[params.sortBy || ''] || 'avg_engagement'
  const sortDir = params.sortOrder === 'asc' ? 'ASC' : 'DESC'

  const page = params.page || 1
  const pageSize = params.pageSize || 50
  const offset = (page - 1) * pageSize

  const total = (db.prepare('SELECT COUNT(*) as cnt FROM influencers').get() as any).cnt

  const rows = db.prepare(`
    SELECT * FROM influencers
    ORDER BY ${sortCol} ${sortDir}
    LIMIT ? OFFSET ?
  `).all(pageSize, offset)

  return { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export function getInfluencerSamplePosts(username: string, limit = 3) {
  const db = getDb()
  return db.prepare(
    'SELECT url, caption, likes, comments FROM posts WHERE owner_username = ? ORDER BY likes DESC LIMIT ?'
  ).all(username, limit)
}

export function getCollections() {
  const db = getDb()
  return db.prepare('SELECT * FROM collections ORDER BY created_at DESC').all()
}

export function getDistinctSearchTags() {
  const db = getDb()
  return (db.prepare('SELECT DISTINCT search_tag FROM posts WHERE search_tag != "" ORDER BY search_tag').all() as { search_tag: string }[]).map(r => r.search_tag)
}

export function getAllPostsForExport(params: { collectionId?: number; searchTag?: string; minLikes?: number }) {
  const db = getDb()
  const conditions: string[] = []
  const values: any[] = []

  if (params.collectionId) { conditions.push('collection_id = ?'); values.push(params.collectionId) }
  if (params.searchTag) { conditions.push('search_tag = ?'); values.push(params.searchTag) }
  if (params.minLikes !== undefined) { conditions.push('likes >= ?'); values.push(params.minLikes) }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''
  return db.prepare(`SELECT * FROM posts ${where} ORDER BY likes DESC`).all(...values)
}

export function getAllInfluencersForExport() {
  const db = getDb()
  return db.prepare('SELECT * FROM influencers ORDER BY avg_engagement DESC').all()
}
```

- [ ] **Step 2: 동작 확인**

```bash
cd /Users/choiminsuk/Desktop/beautypass_martketing/vitalconnection
npx tsx -e "const { getCollections } = require('./lib/db'); console.log(getCollections())"
```

Expected: `[]` (빈 배열, DB 초기화 성공)

- [ ] **Step 3: 커밋**

```bash
git add lib/db.ts
git commit -m "feat: add SQLite database layer for Instagram data"
```

---

### Task 3: Apify 클라이언트 래퍼

**Files:**
- Create: `lib/apify.ts`

- [ ] **Step 1: lib/apify.ts 작성**

```typescript
import { ApifyClient } from 'apify-client'

function getClient() {
  const token = process.env.APIFY_TOKEN
  if (!token) throw new Error('APIFY_TOKEN 환경변수가 설정되지 않았습니다.')
  return new ApifyClient({ token })
}

type CollectType = 'hashtag' | 'profile' | 'location' | 'keyword'

const ACTOR_MAP: Record<CollectType, string> = {
  hashtag: 'apify/instagram-hashtag-scraper',
  profile: 'apify/instagram-scraper',
  location: 'apify/instagram-scraper',
  keyword: 'apify/instagram-search-scraper',
}

function buildInput(type: CollectType, query: string, limit: number): Record<string, any> {
  switch (type) {
    case 'hashtag':
      return { hashtags: [query], resultsLimit: limit, resultsType: 'posts' }
    case 'profile':
      return { usernames: [query.replace(/^@/, '')], resultsLimit: limit, resultsType: 'posts' }
    case 'location':
      return {
        directUrls: [query.startsWith('http') ? query : `https://www.instagram.com/explore/locations/${query}/`],
        resultsLimit: limit,
      }
    case 'keyword':
      return { search: query, searchType: 'hashtag', resultsLimit: limit }
  }
}

export async function collectFromInstagram(type: CollectType, query: string, limit: number) {
  const client = getClient()
  const actorId = ACTOR_MAP[type]
  const input = buildInput(type, query, limit)

  const run = await client.actor(actorId).call({ ...input })
  const items = await client.dataset(run.defaultDatasetId).listItems()
  return items.items
}

export const PRESETS: Record<string, { label: string; tags: string[] }> = {
  kbeauty: {
    label: '🇰🇷 K-Beauty',
    tags: ['kbeauty', 'kbeautyskincare', 'koreanbeauty', 'koreanskincare'],
  },
  medical_tourism: {
    label: '🏥 의료관광',
    tags: ['plasticsurgerykorea', 'koreandermatology', 'gangnamclinic', 'koreamedical'],
  },
  japan: {
    label: '🇯🇵 일본',
    tags: ['韓国美容', '韓国皮膚科', '韓国整形'],
  },
  thai: {
    label: '🇹🇭 태국',
    tags: ['ศัลยกรรมเกาหลี', 'คลินิกเกาหลี'],
  },
  vietnam: {
    label: '🇻🇳 베트남',
    tags: ['thẩmmỹhànquốc', 'dauhanquoc'],
  },
}
```

- [ ] **Step 2: 커밋**

```bash
git add lib/apify.ts
git commit -m "feat: add Apify client wrapper with actor mapping and presets"
```

---

### Task 4: API 인증 헬퍼

**Files:**
- Create: `lib/auth.ts`

- [ ] **Step 1: lib/auth.ts 작성**

```typescript
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function checkAdmin(): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  if (!cookieStore.has('admin_session')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
```

- [ ] **Step 2: 커밋**

```bash
git add lib/auth.ts
git commit -m "feat: add API auth helper for admin routes"
```

---

### Task 5: 수집 API 라우트

**Files:**
- Create: `app/api/instagram/collect/route.ts`

- [ ] **Step 1: collect/route.ts 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { collectFromInstagram } from '@/lib/apify'
import { createCollection, updateCollection, insertPosts, refreshInfluencers } from '@/lib/db'

export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const body = await request.json()
  const { type, query, limit = 30 } = body

  if (!type || !query) {
    return NextResponse.json({ error: 'type과 query는 필수입니다.' }, { status: 400 })
  }

  if (!['hashtag', 'profile', 'location', 'keyword'].includes(type)) {
    return NextResponse.json({ error: '유효하지 않은 type입니다.' }, { status: 400 })
  }

  const collectionId = createCollection(type, query, limit)

  try {
    const items = await collectFromInstagram(type, query, limit)
    const inserted = insertPosts(collectionId, items, query)
    updateCollection(collectionId, 'completed', inserted)
    refreshInfluencers()

    return NextResponse.json({
      collectionId,
      query,
      collected: items.length,
      inserted,
    })
  } catch (error: any) {
    updateCollection(collectionId, 'failed', 0)
    return NextResponse.json({
      error: `수집 실패: ${error.message}`,
      collectionId,
      query,
    }, { status: 500 })
  }
}
```

- [ ] **Step 2: curl로 테스트**

```bash
cd /Users/choiminsuk/Desktop/beautypass_martketing/vitalconnection
npm run dev &
sleep 3

# 먼저 로그인 쿠키 획득
curl -c cookies.txt -X POST http://localhost:3000/admin/login \
  -d "id=vitalconnect&password=vitalconnect123!" -L

# 수집 테스트 (limit 3으로 소량)
curl -b cookies.txt -X POST http://localhost:3000/api/instagram/collect \
  -H "Content-Type: application/json" \
  -d '{"type":"hashtag","query":"kbeauty","limit":3}'
```

Expected: `{"collectionId":1,"query":"kbeauty","collected":3,"inserted":3}`

- [ ] **Step 3: 커밋**

```bash
git add app/api/instagram/collect/route.ts
git commit -m "feat: add Instagram collect API route"
```

---

### Task 6: 결과 조회 + CSV 내보내기 API

**Files:**
- Create: `app/api/instagram/results/route.ts`
- Create: `app/api/instagram/results/export/route.ts`

- [ ] **Step 1: results/route.ts 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { queryResults, getCollections, getDistinctSearchTags } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const params = request.nextUrl.searchParams

  const data = queryResults({
    collectionId: params.get('collectionId') ? Number(params.get('collectionId')) : undefined,
    searchTag: params.get('searchTag') || undefined,
    minLikes: params.get('minLikes') ? Number(params.get('minLikes')) : undefined,
    sortBy: params.get('sortBy') || 'likes',
    sortOrder: params.get('sortOrder') || 'desc',
    page: params.get('page') ? Number(params.get('page')) : 1,
    pageSize: 50,
  })

  const collections = getCollections()
  const searchTags = getDistinctSearchTags()

  return NextResponse.json({ ...data, collections, searchTags })
}
```

- [ ] **Step 2: results/export/route.ts 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getAllPostsForExport } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const params = request.nextUrl.searchParams
  const posts = getAllPostsForExport({
    collectionId: params.get('collectionId') ? Number(params.get('collectionId')) : undefined,
    searchTag: params.get('searchTag') || undefined,
    minLikes: params.get('minLikes') ? Number(params.get('minLikes')) : undefined,
  }) as any[]

  const header = 'username,fullname,url,caption,likes,comments,hashtags,location,timestamp,search_tag'
  const rows = posts.map(p =>
    [
      p.owner_username,
      `"${(p.owner_fullname || '').replace(/"/g, '""')}"`,
      p.url,
      `"${(p.caption || '').replace(/"/g, '""').replace(/\n/g, ' ').slice(0, 200)}"`,
      p.likes,
      p.comments,
      `"${p.hashtags}"`,
      `"${(p.location || '').replace(/"/g, '""')}"`,
      p.post_timestamp,
      p.search_tag,
    ].join(',')
  )

  const csv = [header, ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="instagram_results_${Date.now()}.csv"`,
    },
  })
}
```

- [ ] **Step 3: 커밋**

```bash
git add app/api/instagram/results/
git commit -m "feat: add results query and CSV export API routes"
```

---

### Task 7: 인플루언서 조회 + CSV 내보내기 API

**Files:**
- Create: `app/api/instagram/influencers/route.ts`
- Create: `app/api/instagram/influencers/export/route.ts`

- [ ] **Step 1: influencers/route.ts 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { queryInfluencers, getInfluencerSamplePosts } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const params = request.nextUrl.searchParams

  const data = queryInfluencers({
    sortBy: params.get('sortBy') || undefined,
    sortOrder: params.get('sortOrder') || 'desc',
    page: params.get('page') ? Number(params.get('page')) : 1,
    pageSize: 50,
  })

  const rowsWithSamples = (data.rows as any[]).map(row => ({
    ...row,
    hashtags: JSON.parse(row.hashtags || '[]'),
    samplePosts: getInfluencerSamplePosts(row.username),
  }))

  return NextResponse.json({ ...data, rows: rowsWithSamples })
}
```

- [ ] **Step 2: influencers/export/route.ts 작성**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { getAllInfluencersForExport } from '@/lib/db'

export async function GET(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const influencers = getAllInfluencersForExport() as any[]

  const header = 'username,fullname,profile_url,post_count,avg_likes,avg_comments,avg_engagement,hashtags'
  const rows = influencers.map(i =>
    [
      i.username,
      `"${(i.fullname || '').replace(/"/g, '""')}"`,
      i.profile_url,
      i.post_count,
      i.avg_likes,
      i.avg_comments,
      i.avg_engagement,
      `"${i.hashtags}"`,
    ].join(',')
  )

  const csv = [header, ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="instagram_influencers_${Date.now()}.csv"`,
    },
  })
}
```

- [ ] **Step 3: 커밋**

```bash
git add app/api/instagram/influencers/
git commit -m "feat: add influencers query and CSV export API routes"
```

---

### Task 8: 인스타그램 페이지 셸 + 탭 컨테이너

**Files:**
- Create: `app/admin/instagram/page.tsx`

- [ ] **Step 1: page.tsx 작성**

```tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import InstagramClient from './components/InstagramClient'

export default async function InstagramPage() {
  const cookieStore = await cookies()
  if (!cookieStore.has('admin_session')) {
    redirect('/admin/login')
  }

  return <InstagramClient />
}
```

- [ ] **Step 2: InstagramClient 클라이언트 컴포넌트 작성**

Create `app/admin/instagram/components/InstagramClient.tsx`:

```tsx
'use client'

import { useState } from 'react'
import CollectTab from './CollectTab'
import ResultsTab from './ResultsTab'
import InfluencerTab from './InfluencerTab'

const TABS = [
  { id: 'collect', label: '🔍 수집' },
  { id: 'results', label: '📊 수집 결과' },
  { id: 'influencers', label: '⭐ 인플루언서' },
] as const

type TabId = typeof TABS[number]['id']

export default function InstagramClient() {
  const [activeTab, setActiveTab] = useState<TabId>('collect')

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">인스타그램 수집</h1>
          <a href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
            ← 대시보드
          </a>
        </div>

        <div className="flex gap-1 border-b border-gray-200 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'collect' && <CollectTab />}
        {activeTab === 'results' && <ResultsTab />}
        {activeTab === 'influencers' && <InfluencerTab />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 커밋**

```bash
git add app/admin/instagram/
git commit -m "feat: add Instagram admin page shell with tab container"
```

---

### Task 9: 수집 탭 컴포넌트

**Files:**
- Create: `app/admin/instagram/components/CollectTab.tsx`

- [ ] **Step 1: CollectTab.tsx 작성**

```tsx
'use client'

import { useState } from 'react'

const PRESETS: Record<string, { label: string; tags: string[] }> = {
  kbeauty: { label: '🇰🇷 K-Beauty', tags: ['kbeauty', 'kbeautyskincare', 'koreanbeauty', 'koreanskincare'] },
  medical_tourism: { label: '🏥 의료관광', tags: ['plasticsurgerykorea', 'koreandermatology', 'gangnamclinic', 'koreamedical'] },
  japan: { label: '🇯🇵 일본', tags: ['韓国美容', '韓国皮膚科', '韓国整形'] },
  thai: { label: '🇹🇭 태국', tags: ['ศัลยกรรมเกาหลี', 'คลินิกเกาหลี'] },
  vietnam: { label: '🇻🇳 베트남', tags: ['thẩmmỹhànquốc', 'dauhanquoc'] },
}

type CollectType = 'hashtag' | 'profile' | 'location' | 'keyword'

const MODES: { id: CollectType; label: string }[] = [
  { id: 'hashtag', label: '#️⃣ 해시태그' },
  { id: 'profile', label: '👤 프로필' },
  { id: 'location', label: '📍 위치' },
  { id: 'keyword', label: '🔍 키워드' },
]

type ProgressItem = { query: string; status: 'pending' | 'collecting' | 'done' | 'error'; count?: number; error?: string }

export default function CollectTab() {
  const [mode, setMode] = useState<CollectType>('hashtag')
  const [tags, setTags] = useState<string[]>([])
  const [inputValue, setInputValue] = useState('')
  const [limit, setLimit] = useState(30)
  const [isCollecting, setIsCollecting] = useState(false)
  const [progress, setProgress] = useState<ProgressItem[]>([])

  function addTag(value: string) {
    const trimmed = value.trim().replace(/^[#@]/, '')
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setInputValue('')
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag))
  }

  function applyPreset(key: string) {
    const preset = PRESETS[key]
    if (!preset) return
    const newTags = [...new Set([...tags, ...preset.tags])]
    setTags(newTags)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(inputValue)
    }
  }

  async function startCollect() {
    if (tags.length === 0 || isCollecting) return

    setIsCollecting(true)
    const items: ProgressItem[] = tags.map(q => ({ query: q, status: 'pending' }))
    setProgress(items)

    for (let i = 0; i < items.length; i++) {
      items[i] = { ...items[i], status: 'collecting' }
      setProgress([...items])

      try {
        const res = await fetch('/api/instagram/collect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: mode, query: items[i].query, limit }),
        })
        const data = await res.json()

        if (res.ok) {
          items[i] = { ...items[i], status: 'done', count: data.inserted }
        } else {
          items[i] = { ...items[i], status: 'error', error: data.error }
        }
      } catch (err: any) {
        items[i] = { ...items[i], status: 'error', error: err.message }
      }
      setProgress([...items])
    }

    setIsCollecting(false)
  }

  const estimatedCost = (tags.length * limit * 0.01).toFixed(2)

  return (
    <div className="space-y-6">
      {/* 프리셋 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">빠른 프리셋</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className="px-4 py-2 rounded-full text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 transition"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 수집 방식 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">수집 방식</label>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden w-fit">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-4 py-2 text-sm font-medium transition ${
                mode === m.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 검색어 입력 */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">검색어 입력</label>
        <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-wrap gap-2 items-center min-h-[48px]">
          {tags.map(tag => (
            <span key={tag} className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-purple-200">✕</button>
            </span>
          ))}
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="입력 후 Enter..."
            disabled={isCollecting}
            className="flex-1 min-w-[150px] outline-none text-sm text-gray-700 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* 설정 + 시작 */}
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">건수/항목당</label>
          <input
            type="number"
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            min={1}
            max={100}
            disabled={isCollecting}
            className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={startCollect}
          disabled={tags.length === 0 || isCollecting}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold text-sm hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCollecting ? '수집중...' : '수집 시작'}
        </button>

        <span className="text-sm text-gray-400">
          예상 크레딧: ~${estimatedCost}
        </span>
      </div>

      {/* 진행 상황 */}
      {progress.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">수집 진행 상황</h3>
          <div className="space-y-3">
            {progress.map(item => (
              <div key={item.query}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{mode === 'hashtag' ? '#' : ''}{item.query}</span>
                  <span className={
                    item.status === 'done' ? 'text-green-600' :
                    item.status === 'collecting' ? 'text-purple-600' :
                    item.status === 'error' ? 'text-red-500' :
                    'text-gray-400'
                  }>
                    {item.status === 'done' ? `✓ ${item.count}건 완료` :
                     item.status === 'collecting' ? '수집중...' :
                     item.status === 'error' ? `✕ ${item.error}` :
                     '대기중'}
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.status === 'done' ? 'bg-green-500 w-full' :
                      item.status === 'collecting' ? 'bg-purple-500 w-1/2 animate-pulse' :
                      item.status === 'error' ? 'bg-red-400 w-full' :
                      'w-0'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: dev 서버에서 UI 확인**

```bash
npm run dev
```

http://localhost:3000/admin/instagram 접속 → 수집 탭 확인
- 프리셋 버튼 클릭 시 태그 추가되는지
- 모드 전환 동작하는지
- 태그 입력/삭제 동작하는지

- [ ] **Step 3: 커밋**

```bash
git add app/admin/instagram/components/CollectTab.tsx
git commit -m "feat: add CollectTab component with presets, mode switching, tag input"
```

---

### Task 10: 결과 탭 컴포넌트

**Files:**
- Create: `app/admin/instagram/components/ResultsTab.tsx`

- [ ] **Step 1: ResultsTab.tsx 작성**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'

interface Post {
  id: number
  owner_username: string
  owner_fullname: string
  url: string
  caption: string
  likes: number
  comments: number
  post_timestamp: string
  hashtags: string
  search_tag: string
  location: string
}

export default function ResultsTab() {
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [searchTags, setSearchTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Filters
  const [filterTag, setFilterTag] = useState('')
  const [minLikes, setMinLikes] = useState('')
  const [sortBy, setSortBy] = useState('likes')
  const [sortOrder, setSortOrder] = useState('desc')

  const fetchResults = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('sortBy', sortBy)
    params.set('sortOrder', sortOrder)
    if (filterTag) params.set('searchTag', filterTag)
    if (minLikes) params.set('minLikes', minLikes)

    const res = await fetch(`/api/instagram/results?${params}`)
    const data = await res.json()

    setPosts(data.rows || [])
    setTotal(data.total || 0)
    setTotalPages(data.totalPages || 0)
    setSearchTags(data.searchTags || [])
    setLoading(false)
  }, [page, sortBy, sortOrder, filterTag, minLikes])

  useEffect(() => { fetchResults() }, [fetchResults])

  function exportCSV() {
    const params = new URLSearchParams()
    if (filterTag) params.set('searchTag', filterTag)
    if (minLikes) params.set('minLikes', minLikes)
    window.open(`/api/instagram/results/export?${params}`)
  }

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-lg p-4">
        <select
          value={filterTag}
          onChange={e => { setFilterTag(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">전체 해시태그</option>
          {searchTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <input
          type="number"
          placeholder="최소 좋아요"
          value={minLikes}
          onChange={e => { setMinLikes(e.target.value); setPage(1) }}
          className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />

        <select
          value={sortBy}
          onChange={e => { setSortBy(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="likes">좋아요순</option>
          <option value="comments">댓글순</option>
          <option value="date">최신순</option>
        </select>

        <button
          onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
        >
          {sortOrder === 'desc' ? '↓ 내림차순' : '↑ 오름차순'}
        </button>

        <div className="flex-1" />

        <span className="text-sm text-gray-500">{total}건</span>

        <button
          onClick={exportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
        >
          CSV 내보내기
        </button>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr>
                <th className="px-4 py-3">작성자</th>
                <th className="px-4 py-3">캡션</th>
                <th className="px-4 py-3 text-right">좋아요</th>
                <th className="px-4 py-3 text-right">댓글</th>
                <th className="px-4 py-3">태그</th>
                <th className="px-4 py-3">날짜</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">로딩중...</td></tr>
              ) : posts.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">수집된 데이터가 없습니다.</td></tr>
              ) : (
                posts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a href={`https://instagram.com/${p.owner_username}`} target="_blank" rel="noopener" className="text-purple-600 hover:underline font-medium">
                        @{p.owner_username}
                      </a>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-gray-600">
                      <a href={p.url} target="_blank" rel="noopener" className="hover:text-gray-900">
                        {(p.caption || '').slice(0, 80)}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{p.likes.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{p.comments.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-xs">{p.search_tag}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {p.post_timestamp ? new Date(p.post_timestamp).toLocaleDateString('ko-KR') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-30"
          >
            이전
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/admin/instagram/components/ResultsTab.tsx
git commit -m "feat: add ResultsTab with filters, sorting, pagination, CSV export"
```

---

### Task 11: 인플루언서 탭 컴포넌트

**Files:**
- Create: `app/admin/instagram/components/InfluencerTab.tsx`

- [ ] **Step 1: InfluencerTab.tsx 작성**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'

interface Influencer {
  username: string
  fullname: string
  profile_url: string
  post_count: number
  avg_likes: number
  avg_comments: number
  avg_engagement: number
  hashtags: string[]
  samplePosts: { url: string; caption: string; likes: number; comments: number }[]
}

export default function InfluencerTab() {
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [sortBy, setSortBy] = useState('')
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    if (sortBy) params.set('sortBy', sortBy)

    const res = await fetch(`/api/instagram/influencers?${params}`)
    const data = await res.json()

    setInfluencers(data.rows || [])
    setTotal(data.total || 0)
    setTotalPages(data.totalPages || 0)
    setLoading(false)
  }, [page, sortBy])

  useEffect(() => { fetchData() }, [fetchData])

  function exportCSV() {
    window.open('/api/instagram/influencers/export')
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-4">
        <select
          value={sortBy}
          onChange={e => { setSortBy(e.target.value); setPage(1) }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Engagement순</option>
          <option value="likes">평균 좋아요순</option>
          <option value="comments">평균 댓글순</option>
          <option value="posts">게시물 수순</option>
        </select>

        <div className="flex-1" />

        <span className="text-sm text-gray-500">{total}명</span>

        <button
          onClick={exportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
        >
          CSV 내보내기
        </button>
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 font-semibold">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">계정</th>
              <th className="px-4 py-3 text-right">게시물</th>
              <th className="px-4 py-3 text-right">평균 좋아요</th>
              <th className="px-4 py-3 text-right">평균 댓글</th>
              <th className="px-4 py-3 text-right">Engagement</th>
              <th className="px-4 py-3">해시태그</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">로딩중...</td></tr>
            ) : influencers.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">인플루언서 데이터가 없습니다.</td></tr>
            ) : (
              influencers.map((inf, idx) => (
                <>
                  <tr
                    key={inf.username}
                    onClick={() => setExpanded(expanded === inf.username ? null : inf.username)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-gray-400">{(page - 1) * 50 + idx + 1}</td>
                    <td className="px-4 py-3">
                      <a href={inf.profile_url} target="_blank" rel="noopener" className="text-purple-600 hover:underline font-medium"
                         onClick={e => e.stopPropagation()}>
                        @{inf.username}
                      </a>
                      {inf.fullname && <div className="text-xs text-gray-400">{inf.fullname}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">{inf.post_count}</td>
                    <td className="px-4 py-3 text-right">{inf.avg_likes.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{inf.avg_comments.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-purple-600">{inf.avg_engagement.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {inf.hashtags.slice(0, 3).map(h => (
                          <span key={h} className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-xs">#{h}</span>
                        ))}
                        {inf.hashtags.length > 3 && (
                          <span className="text-gray-400 text-xs">+{inf.hashtags.length - 3}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === inf.username && inf.samplePosts.length > 0 && (
                    <tr key={`${inf.username}-detail`}>
                      <td colSpan={7} className="px-8 py-3 bg-gray-50">
                        <div className="text-xs font-semibold text-gray-500 mb-2">샘플 게시물 (상위 {inf.samplePosts.length}개)</div>
                        <div className="space-y-2">
                          {inf.samplePosts.map((post, i) => (
                            <div key={i} className="flex items-center gap-3 text-xs">
                              <a href={post.url} target="_blank" rel="noopener" className="text-purple-500 hover:underline truncate max-w-xs">
                                {(post.caption || '').slice(0, 60) || post.url}
                              </a>
                              <span className="text-gray-400">❤️ {post.likes}</span>
                              <span className="text-gray-400">💬 {post.comments}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-30"
          >
            이전
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-30"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/admin/instagram/components/InfluencerTab.tsx
git commit -m "feat: add InfluencerTab with ranking, sample posts, CSV export"
```

---

### Task 12: Admin 대시보드에 네비게이션 링크 추가

**Files:**
- Modify: `app/admin/page.tsx:18-25`

- [ ] **Step 1: admin/page.tsx에 인스타그램 링크 추가**

기존 `app/admin/page.tsx`의 헤더 영역에 링크를 추가한다. `<div className="flex justify-between items-center mb-8">` 블록을 다음으로 교체:

```tsx
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">상담 신청 현황</h1>
          <div className="flex items-center gap-3">
            <a href="/admin/instagram" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition text-sm">
              인스타그램 수집
            </a>
            <form action={logoutAdmin}>
              <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition">
                로그아웃
              </button>
            </form>
          </div>
        </div>
```

- [ ] **Step 2: 전체 동작 확인**

```bash
npm run dev
```

1. http://localhost:3000/admin/login → 로그인
2. 대시보드에서 "인스타그램 수집" 버튼 확인
3. /admin/instagram 이동 → 3개 탭 확인
4. 수집 탭: 프리셋 클릭 → 수집 시작 → 진행 상황 확인
5. 결과 탭: 수집된 데이터 조회 → 필터/정렬 → CSV 내보내기
6. 인플루언서 탭: 랭킹 확인 → 행 클릭으로 샘플 게시물 확인

- [ ] **Step 3: 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공

- [ ] **Step 4: 최종 커밋**

```bash
git add app/admin/page.tsx
git commit -m "feat: add Instagram link to admin dashboard"
```
