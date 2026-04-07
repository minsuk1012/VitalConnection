# VitalConnect 인플루언서 지표 시스템 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apify로 수집한 공개 데이터에서 ERF, 인게이지먼트 품질, 의료관광 적합도 등 복합 지표를 계산하고, Fit Score로 인플루언서를 랭킹하며, 선별된 후보에 대해 릴스 댓글 심층 분석을 제공한다.

**Architecture:** 기존 `lib/db.ts`의 `refreshInfluencers()`를 확장하여 지표를 계산하고, 새로운 `lib/metrics.ts`에 정규화/스코어링 로직을 분리한다. Phase 4의 릴스/댓글 심층 분석은 별도 API 엔드포인트로 분리하여 비용이 드는 Apify 호출을 명시적으로 트리거한다.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM + SQLite (better-sqlite3), Apify Client, TypeScript

**Spec:** `docs/influencer-metrics-spec.md`

---

## 파일 구조

| 파일 | 역할 | 변�� |
|---|---|---|
| `lib/schema.ts` | Drizzle 테이블 정의 | 수정: posts/influencers 컬럼 추가, reels/reel_comments 테이블 추가 |
| `lib/db.ts` | DB 쿼리 헬퍼 | 수정: CREATE TABLE SQL 확장, insertPosts/refreshInfluencers 수정, 신규 함수 추가 |
| `lib/metrics.ts` | 지표 계산 + 정규화 + Fit Score | 신규 |
| `lib/apify.ts` | Apify Actor 호출 | 수정: reel/comment scraper 함수 추가 |
| `app/api/instagram/analyze/route.ts` | 프로필 분석 API | 수정: 추가 필드 저장 |
| `app/api/instagram/influencers/route.ts` | 인플루언서 목록 API | 수정: Fit Score 정렬 옵션 추가 |
| `app/api/instagram/deep-analyze/route.ts` | 심층 분석 API | 신규 |
| `app/admin/instagram/components/CandidatesTab.tsx` | 후보 관리 UI | 수정: Fit Score 표시 + 심층 분석 버튼 |

---

## Task 1: posts 테이블 스키마 확장 + insertPosts 수정

**Files:**
- Modify: `lib/schema.ts:14-35`
- Modify: `lib/db.ts:30-39` (CREATE TABLE SQL)
- Modify: `lib/db.ts:84-113` (insertPosts)

- [ ] **Step 1: schema.ts에 posts 컬럼 추가**

`lib/schema.ts`의 posts 테이블에 3개 컬럼 추가:

```typescript
// lib/schema.ts — posts 테이블, 기존 displayUrl 뒤에 추가
  videoViewCount: integer('video_view_count').default(0),
  mentions: text('mentions').default('[]'),
  isVideo: integer('is_video').default(0),
```

- [ ] **Step 2: db.ts CREATE TABLE SQL에 새 컬럼 반영**

`lib/db.ts`의 posts CREATE TABLE 문에 추가:

```sql
video_view_count INTEGER DEFAULT 0,
mentions TEXT DEFAULT '[]',
is_video INTEGER DEFAULT 0,
```

기존 `display_url TEXT, search_tag TEXT,` 뒤에 삽입.

- [ ] **Step 3: insertPosts()에서 새 필드 저장**

`lib/db.ts`의 `insertPosts` 함수에서 `db.insert(posts).values({...})` 블록에 추가:

```typescript
videoViewCount: p.videoViewCount ?? p.videoPlayCount ?? 0,
mentions: JSON.stringify(p.mentions || []),
isVideo: p.isVideo ? 1 : 0,
```

기존 `searchTag` 뒤에 삽입.

- [ ] **Step 4: 서버 재시작 후 수집 테스트**

Run: dev 서버 재시작 → 기존 수집 기능(`/admin/instagram`)이 정상 작동하는지 확인.
기존 DB가 있으면 ALTER TABLE이 필요할 수 있으므로, CREATE TABLE에 `IF NOT EXISTS`로 처리하되 새 컬럼은 별도 ALTER로 추가:

```typescript
// db.ts getDb() 함수 내, 기존 CREATE TABLE 뒤에 추가
sqlite.exec(`
  ALTER TABLE posts ADD COLUMN video_view_count INTEGER DEFAULT 0;
`).catch?.(() => {}) // 이미 존재하면 무시
```

SQLite에서 ALTER TABLE은 에러가 나면 무시해야 하므로 try-catch로 감쌈:

```typescript
try { sqlite.exec(`ALTER TABLE posts ADD COLUMN video_view_count INTEGER DEFAULT 0`) } catch {}
try { sqlite.exec(`ALTER TABLE posts ADD COLUMN mentions TEXT DEFAULT '[]'`) } catch {}
try { sqlite.exec(`ALTER TABLE posts ADD COLUMN is_video INTEGER DEFAULT 0`) } catch {}
```

- [ ] **Step 5: 커밋**

```bash
git add lib/schema.ts lib/db.ts
git commit -m "feat: posts 테이블에 video_view_count, mentions, is_video 컬럼 추가"
```

---

## Task 2: influencers 테이블 스키마 확장

**Files:**
- Modify: `lib/schema.ts:37-55`
- Modify: `lib/db.ts:40-54` (CREATE TABLE SQL)
- Modify: `lib/db.ts:330-343` (updateInfluencerProfile)
- Modify: `app/api/instagram/analyze/route.ts`

- [ ] **Step 1: schema.ts에 influencers 컬럼 추가**

`lib/schema.ts`의 influencers 테이블, 기존 `lastUpdated` 앞에 추가:

```typescript
  totalPosts: integer('total_posts').default(0),
  isVerified: integer('is_verified').default(0),
  externalUrl: text('external_url').default(''),
  category: text('category').default(''),
  profilePicUrl: text('profile_pic_url').default(''),
  engagementRate: real('engagement_rate').default(0),
  fitScore: real('fit_score').default(0),
  commentLikeRatio: real('comment_like_ratio').default(0),
  followerFollowingRatio: real('follower_following_ratio').default(0),
  postingFrequency: real('posting_frequency').default(0),
  lastPostDate: text('last_post_date').default(''),
  contentRelevance: real('content_relevance').default(0),
  detectedLanguage: text('detected_language').default(''),
  commentLangDistribution: text('comment_lang_distribution').default('{}'),
  commentQualityScore: real('comment_quality_score').default(0),
  deepAnalyzedAt: text('deep_analyzed_at').default(''),
```

- [ ] **Step 2: db.ts CREATE TABLE SQL에 새 컬럼 반영**

influencers CREATE TABLE 문에 추가 (is_business 뒤, last_updated 앞):

```sql
total_posts INTEGER DEFAULT 0,
is_verified INTEGER DEFAULT 0,
external_url TEXT DEFAULT '',
category TEXT DEFAULT '',
profile_pic_url TEXT DEFAULT '',
engagement_rate REAL DEFAULT 0,
fit_score REAL DEFAULT 0,
comment_like_ratio REAL DEFAULT 0,
follower_following_ratio REAL DEFAULT 0,
posting_frequency REAL DEFAULT 0,
last_post_date TEXT DEFAULT '',
content_relevance REAL DEFAULT 0,
detected_language TEXT DEFAULT '',
comment_lang_distribution TEXT DEFAULT '{}',
comment_quality_score REAL DEFAULT 0,
deep_analyzed_at TEXT DEFAULT '',
```

- [ ] **Step 3: ALTER TABLE로 기존 DB 마이그레이션**

`getDb()` 함수 내에 ALTER TABLE 추가 (Task 1�� 같은 패턴):

```typescript
const alterColumns = [
  `ALTER TABLE influencers ADD COLUMN total_posts INTEGER DEFAULT 0`,
  `ALTER TABLE influencers ADD COLUMN is_verified INTEGER DEFAULT 0`,
  `ALTER TABLE influencers ADD COLUMN external_url TEXT DEFAULT ''`,
  `ALTER TABLE influencers ADD COLUMN category TEXT DEFAULT ''`,
  `ALTER TABLE influencers ADD COLUMN profile_pic_url TEXT DEFAULT ''`,
  `ALTER TABLE influencers ADD COLUMN engagement_rate REAL DEFAULT 0`,
  `ALTER TABLE influencers ADD COLUMN fit_score REAL DEFAULT 0`,
  `ALTER TABLE influencers ADD COLUMN comment_like_ratio REAL DEFAULT 0`,
  `ALTER TABLE influencers ADD COLUMN follower_following_ratio REAL DEFAULT 0`,
  `ALTER TABLE influencers ADD COLUMN posting_frequency REAL DEFAULT 0`,
  `ALTER TABLE influencers ADD COLUMN last_post_date TEXT DEFAULT ''`,
  `ALTER TABLE influencers ADD COLUMN content_relevance REAL DEFAULT 0`,
  `ALTER TABLE influencers ADD COLUMN detected_language TEXT DEFAULT ''`,
  `ALTER TABLE influencers ADD COLUMN comment_lang_distribution TEXT DEFAULT '{}'`,
  `ALTER TABLE influencers ADD COLUMN comment_quality_score REAL DEFAULT 0`,
  `ALTER TABLE influencers ADD COLUMN deep_analyzed_at TEXT DEFAULT ''`,
]
for (const sql of alterColumns) {
  try { sqlite.exec(sql) } catch {}
}
```

- [ ] **Step 4: updateInfluencerProfile() 확장**

`lib/db.ts`의 `updateInfluencerProfile` 함수 시그니처와 본문 확장:

```typescript
export function updateInfluencerProfile(username: string, profile: {
  bio?: string; followers?: number; following?: number; is_business?: boolean; fullname?: string;
  total_posts?: number; is_verified?: boolean; external_url?: string; category?: string; profile_pic_url?: string;
}) {
  const db = getDb()
  const set: Record<string, any> = { lastUpdated: sql`datetime('now')` }

  if (profile.bio !== undefined) set.bio = profile.bio
  if (profile.followers !== undefined) set.followers = profile.followers
  if (profile.following !== undefined) set.following = profile.following
  if (profile.is_business !== undefined) set.isBusiness = profile.is_business ? 1 : 0
  if (profile.fullname !== undefined) set.fullname = profile.fullname
  if (profile.total_posts !== undefined) set.totalPosts = profile.total_posts
  if (profile.is_verified !== undefined) set.isVerified = profile.is_verified ? 1 : 0
  if (profile.external_url !== undefined) set.externalUrl = profile.external_url
  if (profile.category !== undefined) set.category = profile.category
  if (profile.profile_pic_url !== undefined) set.profilePicUrl = profile.profile_pic_url

  db.update(influencers).set(set).where(eq(influencers.username, username)).run()
}
```

- [ ] **Step 5: analyze route에서 추가 필드 저장**

`app/api/instagram/analyze/route.ts`의 `updateInfluencerProfile` 호출 확장:

```typescript
updateInfluencerProfile(username, {
  bio: profile.biography || profile.bio || '',
  followers: profile.followersCount ?? profile.followers ?? 0,
  following: profile.followingCount ?? profile.following ?? 0,
  is_business: profile.isBusinessAccount ?? profile.isBusiness ?? false,
  fullname: profile.fullName || profile.name || '',
  total_posts: profile.postsCount ?? profile.mediaCount ?? 0,
  is_verified: profile.isVerified ?? profile.verified ?? false,
  external_url: profile.externalUrl || profile.website || '',
  category: profile.businessCategoryName || profile.categoryName || '',
  profile_pic_url: profile.profilePicUrl || profile.profilePicUrlHd || '',
})
```

- [ ] **Step 6: 커밋**

```bash
git add lib/schema.ts lib/db.ts app/api/instagram/analyze/route.ts
git commit -m "feat: influencers 테이블에 지표 컬럼 추가 + 프로필 분석 시 추가 필드 저장"
```

---

## Task 3: lib/metrics.ts 생성 — 지표 계산 + 언어 감지 + Fit Score

**Files:**
- Create: `lib/metrics.ts`

- [ ] **Step 1: metrics.ts 파일 생성 — 언어 감지**

```typescript
// lib/metrics.ts

// ─── 언어 감지 ───

const LANG_PATTERNS: [string, RegExp][] = [
  ['ja', /[\u3040-\u309F\u30A0-\u30FF]/],  // 히라가나/가타카나 (한자 제외 — 한자만 있으면 중국어)
  ['th', /[\u0E00-\u0E7F]/],
  ['vi', /[àáạảãăắằẳẵặâấầẩẫậèéẹẻẽêếềểễệ]/i],
  ['ko', /[\uAC00-\uD7AF]/],
  ['zh', /[\u4E00-\u9FFF]/],  // CJK ��� ja가 먼저 매칭되므로, 히라가나 없이 한자만 있으면 zh
]

export function detectLanguage(text: string): string {
  if (!text) return 'en'
  for (const [lang, pattern] of LANG_PATTERNS) {
    if (pattern.test(text)) return lang
  }
  return 'en'
}

export function detectLanguageDistribution(texts: string[]): Record<string, number> {
  if (texts.length === 0) return {}
  const counts: Record<string, number> = {}
  for (const text of texts) {
    const lang = detectLanguage(text)
    counts[lang] = (counts[lang] || 0) + 1
  }
  const total = texts.length
  const dist: Record<string, number> = {}
  for (const [lang, count] of Object.entries(counts)) {
    dist[lang] = Math.round((count / total) * 100) / 100
  }
  return dist
}
```

- [ ] **Step 2: metrics.ts — 키워드 점수 + PRESET 매칭**

파일 하단에 추가:

```typescript
// ─── 키워드 점수 ───

const KEYWORDS_HIGH = [
  'plastic surgery', 'dermatology', 'clinic', 'skincare routine',
  '피부과', '성형', '시술', 'botox', 'filler', 'laser',
  '韓国美容', '韓国皮膚科', '韓国整形',
  'ศัลยกรรมเกาหลี', 'คลินิกเกาหลี',
  'thẩm mỹ hàn quốc',
]
const KEYWORDS_MEDIUM = [
  'kbeauty', 'korean skincare', 'glass skin', 'beauty review',
  'gangnam', '강남', 'seoul', '서울',
  'before after', 'transformation', 'glow up',
]
const KEYWORDS_LOW = [
  'beauty', 'skincare', 'makeup', 'cosmetics',
  'korea', 'travel korea', 'korea trip',
]

export function computeKeywordScore(captions: string[], hashtags: string[][]): number {
  const allText = captions.map(c => c.toLowerCase()).join(' ')
  const allTags = hashtags.flat().map(h => h.toLowerCase())
  const combined = allText + ' ' + allTags.join(' ')

  let score = 0
  for (const kw of KEYWORDS_HIGH) { if (combined.includes(kw.toLowerCase())) score += 3 }
  for (const kw of KEYWORDS_MEDIUM) { if (combined.includes(kw.toLowerCase())) score += 2 }
  for (const kw of KEYWORDS_LOW) { if (combined.includes(kw.toLowerCase())) score += 1 }

  const postCount = Math.max(1, captions.length)
  return Math.round((score / postCount) * 100) / 100
}

const PRESET_TAGS = new Set([
  'kbeauty', 'kbeautyskincare', 'koreanbeauty', 'koreanskincare',
  'plasticsurgerykorea', 'koreandermatology', 'gangnamclinic', 'koreamedical',
  '韓国美容', '韓国皮膚科', '韓国整形',
  'ศัลยกรรมเกาหลี', 'คลินิกเกาหลี',
  'thẩmmỹhànquốc', 'dauhanquoc',
])

export function computePresetMatchRate(hashtags: string[]): number {
  if (hashtags.length === 0) return 0
  const matched = hashtags.filter(h => PRESET_TAGS.has(h.toLowerCase())).length
  return Math.round((matched / hashtags.length) * 100) / 100
}

const COLLAB_SIGNALS = ['#ad', '#sponsored', '#pr', '#gifted', '#협찬', '#광고', 'paid partnership']

export function detectCollabCount(captions: string[]): number {
  return captions.filter(c => {
    const lower = c.toLowerCase()
    return COLLAB_SIGNALS.some(s => lower.includes(s))
  }).length
}

const KOREA_LOCATIONS = ['seoul', 'gangnam', 'korea', '서울', '강남', 'incheon', '인천']

export function computeLocationRelevance(locations: string[]): number {
  if (locations.length === 0) return 0
  const matched = locations.filter(loc => {
    const lower = (loc || '').toLowerCase()
    return KOREA_LOCATIONS.some(k => lower.includes(k))
  }).length
  return Math.round((matched / locations.length) * 100) / 100
}
```

- [ ] **Step 3: metrics.ts — 정규화 함수 + Fit Score 계산**

파일 하단에 추가:

```typescript
// ─── 정규화 함수 ───

export function normalizeERF(rate: number, followers: number): number {
  const benchmark =
    followers < 10000 ? 5.0 :
    followers < 50000 ? 3.0 :
    followers < 500000 ? 1.5 :
    1.0
  return Math.min(100, (rate / benchmark) * 50)
}

function normalizeFFR(ratio: number): number {
  if (ratio < 0.5) return 10
  if (ratio < 1) return 30
  if (ratio < 5) return 60
  if (ratio < 20) return 90
  return 100
}

function normalizeCLR(ratio: number): number {
  if (ratio < 0.005) return 10
  if (ratio < 0.01) return 40
  if (ratio < 0.03) return 70
  if (ratio < 0.05) return 90
  return 100
}

function normalizeRelevance(keywordScore: number, presetMatchRate: number): number {
  return Math.min(100, keywordScore * 10 + presetMatchRate * 100)
}

function normalizeMarketFit(detectedLang: string, locationRelevance: number): number {
  let score = 0
  if (['ja', 'th', 'vi'].includes(detectedLang)) score += 60
  if (detectedLang === 'zh') score += 40
  score += locationRelevance * 40
  return Math.min(100, score)
}

function normalizeActivity(postsPerWeek: number, daysSinceLastPost: number): number {
  let score = Math.min(50, postsPerWeek * 20)
  if (daysSinceLastPost < 7) score += 50
  else if (daysSinceLastPost < 30) score += 30
  else if (daysSinceLastPost < 90) score += 10
  return score
}

// ─── Fit Score ───

export interface MetricsInput {
  avgLikes: number
  avgComments: number
  followers: number
  following: number
  bio: string
  externalUrl: string
  isBusiness: boolean
  isVerified: boolean
  captions: string[]
  hashtags: string[][]        // per-post hashtag arrays
  allHashtags: string[]       // flattened unique hashtags
  locations: string[]
  postTimestamps: string[]
  engagements: number[]       // per-post (likes+comments)
}

export interface MetricsOutput {
  engagementRate: number
  commentLikeRatio: number
  followerFollowingRatio: number
  postingFrequency: number
  lastPostDate: string
  contentRelevance: number
  detectedLanguage: string
  fitScore: number
}

export function computeAllMetrics(input: MetricsInput): MetricsOutput {
  // ERF
  const engagementRate = input.followers > 0
    ? Math.round(((input.avgLikes + input.avgComments) / input.followers) * 10000) / 100
    : 0

  // Comment-to-Like Ratio
  const commentLikeRatio = input.avgLikes > 0
    ? Math.round((input.avgComments / input.avgLikes) * 1000) / 1000
    : 0

  // Follower/Following Ratio
  const followerFollowingRatio = input.following > 0
    ? Math.round((input.followers / input.following) * 100) / 100
    : 999

  // Posting Frequency (주당)
  let postingFrequency = 0
  let lastPostDate = ''
  if (input.postTimestamps.length >= 2) {
    const sorted = [...input.postTimestamps].sort()
    lastPostDate = sorted[sorted.length - 1]
    const oldest = new Date(sorted[0]).getTime()
    const newest = new Date(sorted[sorted.length - 1]).getTime()
    const weeks = Math.max(1, (newest - oldest) / (7 * 24 * 60 * 60 * 1000))
    postingFrequency = Math.round((input.postTimestamps.length / weeks) * 10) / 10
  } else if (input.postTimestamps.length === 1) {
    lastPostDate = input.postTimestamps[0]
    postingFrequency = 0
  }

  // Consistency
  let consistency = 0
  if (input.engagements.length >= 2) {
    const avg = input.engagements.reduce((a, b) => a + b, 0) / input.engagements.length
    if (avg > 0) {
      const variance = input.engagements.reduce((sum, e) => sum + (e - avg) ** 2, 0) / input.engagements.length
      const stddev = Math.sqrt(variance)
      consistency = Math.max(0, 1 - stddev / avg)
    }
  }

  // Language Detection
  const allCaptions = input.captions.join(' ') + ' ' + input.bio
  const detectedLanguage = detectLanguage(allCaptions)

  // Content Relevance
  const keywordScore = computeKeywordScore(input.captions, input.hashtags)
  const presetMatchRate = computePresetMatchRate(input.allHashtags)
  const contentRelevance = Math.round(normalizeRelevance(keywordScore, presetMatchRate) * 100) / 100

  // Bio Score (0~4)
  const emailPattern = /[\w.-]+@[\w.-]+\.\w+/
  const bioScore =
    (input.bio ? 1 : 0) +
    (input.externalUrl ? 1 : 0) +
    (emailPattern.test(input.bio) ? 1 : 0) +
    (input.isBusiness ? 1 : 0)

  // Location Relevance
  const locationRelevance = computeLocationRelevance(input.locations)

  // Days Since Last Post
  const daysSinceLastPost = lastPostDate
    ? Math.max(0, (Date.now() - new Date(lastPostDate).getTime()) / (24 * 60 * 60 * 1000))
    : 999

  // ─── Fit Score ───
  const erfScore = normalizeERF(engagementRate, input.followers)
  const relevanceScore = normalizeRelevance(keywordScore, presetMatchRate)
  const marketScore = normalizeMarketFit(detectedLanguage, locationRelevance)
  const trustScore =
    normalizeFFR(followerFollowingRatio) * 0.4 +
    (bioScore / 4 * 100) * 0.4 +
    (input.isVerified ? 100 : 0) * 0.2
  const qualityScore =
    normalizeCLR(commentLikeRatio) * 0.6 +
    (consistency * 100) * 0.4
  const activityScore = normalizeActivity(postingFrequency, daysSinceLastPost)

  const fitScore = Math.round(
    erfScore * 0.25 +
    relevanceScore * 0.25 +
    marketScore * 0.20 +
    trustScore * 0.15 +
    qualityScore * 0.10 +
    activityScore * 0.05
  )

  return {
    engagementRate,
    commentLikeRatio,
    followerFollowingRatio,
    postingFrequency,
    lastPostDate,
    contentRelevance,
    detectedLanguage,
    fitScore,
  }
}
```

- [ ] **Step 4: 커밋**

```bash
git add lib/metrics.ts
git commit -m "feat: lib/metrics.ts 생성 — 언어 감지, 키워드 점수, 정규화, Fit Score 계산"
```

---

## Task 4: refreshInfluencers() 수정 — 지표 통합

**Files:**
- Modify: `lib/db.ts:202-265` (refreshInfluencers)

- [ ] **Step 1: refreshInfluencers에서 metrics 계산 통합**

`lib/db.ts` 상단에 import 추가:

```typescript
import { computeAllMetrics, type MetricsInput } from './metrics'
```

`refreshInfluencers()` ��수를 교체:

```typescript
export function refreshInfluencers() {
  const db = getDb()

  // 1. 기본 집계 (기존과 동일)
  const stats = db.select({
    ownerUsername: posts.ownerUsername,
    fullname: max(posts.ownerFullname),
    postCount: count(),
    avgLikes: sql<number>`ROUND(AVG(${posts.likes}), 1)`,
    avgComments: sql<number>`ROUND(AVG(${posts.comments}), 1)`,
  })
    .from(posts)
    .where(ne(posts.ownerUsername, ''))
    .groupBy(posts.ownerUsername)
    .all()

  for (const s of stats) {
    if (!s.ownerUsername) continue

    // 2. 해당 유저의 게시물 상세 데이터 조회
    const userPosts = db.select({
      caption: posts.caption,
      likes: posts.likes,
      comments: posts.comments,
      hashtags: posts.hashtags,
      location: posts.location,
      postTimestamp: posts.postTimestamp,
    })
      .from(posts)
      .where(eq(posts.ownerUsername, s.ownerUsername))
      .all()

    // 3. 기존 influencer 프로필 데이터 조회
    const existing = db.select({
      followers: influencers.followers,
      following: influencers.following,
      bio: influencers.bio,
      externalUrl: influencers.externalUrl,
      isBusiness: influencers.isBusiness,
      isVerified: influencers.isVerified,
    }).from(influencers).where(eq(influencers.username, s.ownerUsername)).get()

    const followers = existing?.followers ?? 0
    const following = existing?.following ?? 0

    // 4. metrics 입력 구성
    const captions = userPosts.map(p => p.caption || '')
    const hashtagArrays = userPosts.map(p => {
      try { return JSON.parse(p.hashtags || '[]') } catch { return [] }
    })
    const allHashtags = [...new Set(hashtagArrays.flat())]
    const locations = userPosts.map(p => p.location || '').filter(Boolean)
    const postTimestamps = userPosts.map(p => p.postTimestamp || '').filter(Boolean)
    const engagements = userPosts.map(p => (p.likes ?? 0) + (p.comments ?? 0))

    const metricsInput: MetricsInput = {
      avgLikes: s.avgLikes,
      avgComments: s.avgComments,
      followers,
      following,
      bio: existing?.bio || '',
      externalUrl: existing?.externalUrl || '',
      isBusiness: existing?.isBusiness === 1,
      isVerified: existing?.isVerified === 1,
      captions,
      hashtags: hashtagArrays,
      allHashtags,
      locations,
      postTimestamps,
      engagements,
    }

    const metrics = computeAllMetrics(metricsInput)

    // 5. Upsert
    db.insert(influencers).values({
      username: s.ownerUsername,
      fullname: s.fullname,
      profileUrl: `https://instagram.com/${s.ownerUsername}`,
      postCount: s.postCount,
      avgLikes: s.avgLikes,
      avgComments: s.avgComments,
      avgEngagement: s.avgLikes + s.avgComments,  // 기존 호환 유지
      hashtags: JSON.stringify(allHashtags),
      engagementRate: metrics.engagementRate,
      commentLikeRatio: metrics.commentLikeRatio,
      followerFollowingRatio: metrics.followerFollowingRatio,
      postingFrequency: metrics.postingFrequency,
      lastPostDate: metrics.lastPostDate,
      contentRelevance: metrics.contentRelevance,
      detectedLanguage: metrics.detectedLanguage,
      fitScore: metrics.fitScore,
    }).onConflictDoUpdate({
      target: influencers.username,
      set: {
        fullname: sql`excluded.fullname`,
        profileUrl: sql`excluded.profile_url`,
        postCount: sql`excluded.post_count`,
        avgLikes: sql`excluded.avg_likes`,
        avgComments: sql`excluded.avg_comments`,
        avgEngagement: sql`excluded.avg_engagement`,
        hashtags: sql`excluded.hashtags`,
        engagementRate: sql`excluded.engagement_rate`,
        commentLikeRatio: sql`excluded.comment_like_ratio`,
        followerFollowingRatio: sql`excluded.follower_following_ratio`,
        postingFrequency: sql`excluded.posting_frequency`,
        lastPostDate: sql`excluded.last_post_date`,
        contentRelevance: sql`excluded.content_relevance`,
        detectedLanguage: sql`excluded.detected_language`,
        fitScore: sql`excluded.fit_score`,
        lastUpdated: sql`datetime('now')`,
      },
    }).run()
  }
}
```

참고: 기존 `avgEngagement` 필드는 하위 호환을 위해 절대값(`avgLikes + avgComments`)으로 유지. 새 `engagementRate` 필드가 실제 ERF%.

- [ ] **Step 2: queryInfluencers에 fitScore 정렬 옵션 추가**

`lib/db.ts`의 `queryInfluencers` 함수에서 sortCol 매핑에 추가:

```typescript
const sortCol = {
  likes: influencers.avgLikes,
  comments: influencers.avgComments,
  posts: influencers.postCount,
  fitScore: influencers.fitScore,
  engagementRate: influencers.engagementRate,
}[params.sortBy || ''] || influencers.fitScore  // 기본 정렬을 fitScore로 변경
```

- [ ] **Step 3: 서버 재시작 후 /admin/instagram에서 수집 → 인플루언서 목록 확인**

Expected: influencers 목록에서 engagementRate, fitScore가 0이 아닌 값으로 표시되는지 확인 (팔로워 데이터가 있는 경우).

- [ ] **Step 4: 커밋**

```bash
git add lib/db.ts
git commit -m "feat: refreshInfluencers에 ERF, Fit Score 등 전체 지표 계산 통합"
```

---

## Task 5: API 응답에 새 지��� 포함

**Files:**
- Modify: `app/api/instagram/influencers/route.ts`

- [ ] **Step 1: influencers API에서 정렬 옵션 추가**

`app/api/instagram/influencers/route.ts`에서 `rowsWithSamples` 매핑을 확장하여 새 필드를 명시적으로 포함:

```typescript
const rowsWithSamples = (data.rows as any[]).map(row => ({
  ...row,
  hashtags: JSON.parse(row.hashtags || '[]'),
  samplePosts: getInfluencerSamplePosts(row.username),
}))
```

기존 코드에서 `...row`가 이미 모든 컬럼을 포함하므로 별도 수정 불필요. 단, sortBy 파라미터에 `fitScore`와 `engagementRate`를 추가 허용해야 함.

실제로 `queryInfluencers`의 sortCol 매핑은 Task 4에서 이미 수정됨. API route 자체는 sortBy를 그대로 패스스루하므로 추가 수정 없음.

- [ ] **Step 2: 커밋**

```bash
git add app/api/instagram/influencers/route.ts
git commit -m "feat: influencers API sortBy에 fitScore, engagementRate 옵션 추가"
```

---

## Task 6: CandidatesTab UI에 Fit Score + 지표 표시

**Files:**
- Modify: `app/admin/instagram/components/CandidatesTab.tsx`

- [ ] **Step 1: Influencer 인터페이스에 새 필드 추가**

`CandidatesTab.tsx`의 `Influencer` 인터페이스 확장:

```typescript
interface Influencer {
  username: string
  fullname: string
  profileUrl: string
  postCount: number
  avgLikes: number
  avgComments: number
  avgEngagement: number
  hashtags: string[]
  status: string
  memo: string
  bio: string
  followers: number
  following: number
  isBusiness: number
  samplePosts: { url: string; caption: string; likes: number; comments: number }[]
  // 새 필드
  engagementRate: number
  fitScore: number
  commentLikeRatio: number
  followerFollowingRatio: number
  postingFrequency: number
  lastPostDate: string
  contentRelevance: number
  detectedLanguage: string
  deepAnalyzedAt: string
}
```

- [ ] **Step 2: 정렬 드롭다운에 Fit Score 옵션 추가**

기존 Select를 수정:

```tsx
<Select value={sortBy} onValueChange={v => { setSortBy(v); setPage(1) }}>
  <SelectTrigger className="w-[160px]">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="fitScore">Fit Score순</SelectItem>
    <SelectItem value="engagementRate">ERF순</SelectItem>
    <SelectItem value="engagement">Engagement순</SelectItem>
    <SelectItem value="likes">평균 좋아요순</SelectItem>
    <SelectItem value="comments">평균 댓글순</SelectItem>
    <SelectItem value="posts">게���물 수순</SelectItem>
  </SelectContent>
</Select>
```

기본값도 변경: `const [sortBy, setSortBy] = useState('fitScore')`

- [ ] **Step 3: 테이블 헤더에 Fit Score, ERF 컬럼 추가**

`<TableHeader>` 수정:

```tsx
<TableRow>
  <TableHead className="w-12">#</TableHead>
  <TableHead>계정</TableHead>
  <TableHead className="text-right">Fit</TableHead>
  <TableHead className="text-right">ERF%</TableHead>
  <TableHead className="text-right">팔로워</TableHead>
  <TableHead>상태</TableHead>
  <TableHead>메모</TableHead>
</TableRow>
```

- [ ] **Step 4: 테이블 행에 Fit Score, ERF 셀 추가**

각 `<TableRow>` 내 `<TableCell>` 수정. 기존 Engagement 셀을 Fit Score + ERF로 교체:

```tsx
<TableCell className="text-right">
  <span className={`font-bold ${inf.fitScore >= 70 ? 'text-green-600' : inf.fitScore >= 40 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
    {inf.fitScore}
  </span>
</TableCell>
<TableCell className="text-right text-sm">
  {inf.engagementRate > 0 ? `${inf.engagementRate}%` : '-'}
</TableCell>
```

- [ ] **Step 5: 확장 패널에 상세 지표 추가**

기존 확장 패널(expanded row)의 grid 내에 추가 지표 표시:

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
  <div>
    <div className="text-muted-foreground text-xs">Fit Score</div>
    <div className="font-medium text-lg">{inf.fitScore}/100</div>
  </div>
  <div>
    <div className="text-muted-foreground text-xs">ERF (팔로워 대비)</div>
    <div className="font-medium">{inf.engagementRate > 0 ? `${inf.engagementRate}%` : '미분석'}</div>
  </div>
  <div>
    <div className="text-muted-foreground text-xs">팔로워</div>
    <div className="font-medium">{inf.followers > 0 ? inf.followers.toLocaleString() : '미수집'}</div>
  </div>
  <div>
    <div className="text-muted-foreground text-xs">팔로잉 비율</div>
    <div className="font-medium">{inf.followerFollowingRatio > 0 ? `${inf.followerFollowingRatio}x` : '미수집'}</div>
  </div>
  <div>
    <div className="text-muted-foreground text-xs">댓글/좋아요 비율</div>
    <div className="font-medium">{inf.commentLikeRatio > 0 ? `${(inf.commentLikeRatio * 100).toFixed(1)}%` : '-'}</div>
  </div>
  <div>
    <div className="text-muted-foreground text-xs">포스팅 빈도</div>
    <div className="font-medium">{inf.postingFrequency > 0 ? `주 ${inf.postingFrequency}회` : '-'}</div>
  </div>
  <div>
    <div className="text-muted-foreground text-xs">감지 언어</div>
    <div className="font-medium">{inf.detectedLanguage || '-'}</div>
  </div>
  <div>
    <div className="text-muted-foreground text-xs">콘텐츠 관련성</div>
    <div className="font-medium">{inf.contentRelevance > 0 ? `${inf.contentRelevance}/100` : '-'}</div>
  </div>
  {inf.bio && (
    <div className="col-span-2 md:col-span-4">
      <div className="text-muted-foreground text-xs">바이오</div>
      <div className="text-sm">{inf.bio}</div>
    </div>
  )}
</div>
```

- [ ] **Step 6: colSpan 업데이트**

테이블 컬럼이 7개로 늘었으므로, 로딩/빈 데이터 행과 확장 행의 `colSpan={6}`을 `colSpan={7}`로 변경.

- [ ] **Step 7: 브라우저에서 /admin/instagram/candidates 확인**

Expected: Fit Score순으로 정렬된 인플루언서 목록, 각 행에 Fit Score와 ERF% 표시.

- [ ] **Step 8: 커밋**

```bash
git add app/admin/instagram/components/CandidatesTab.tsx
git commit -m "feat: CandidatesTab에 Fit Score, ERF, 상세 지표 표시"
```

---

## Task 7: apify.ts에 릴스/댓글 수집 함수 추가

**Files:**
- Modify: `lib/apify.ts`

- [ ] **Step 1: ACTOR_MAP에 릴스/댓글 Actor 추가**

`lib/apify.ts` 하단에 새 함수 추가:

```typescript
export async function collectReels(username: string, limit: number = 20) {
  const client = getClient()
  const run = await client.actor('apify/instagram-reel-scraper').call({
    username: [username.replace(/^@/, '')],
    resultsLimit: limit,
  })
  const items = await client.dataset(run.defaultDatasetId).listItems()
  return items.items
}

export async function collectComments(reelUrls: string[], limitPerReel: number = 100) {
  const client = getClient()
  const run = await client.actor('apify/instagram-comment-scraper').call({
    directUrls: reelUrls,
    resultsLimit: limitPerReel,
  })
  const items = await client.dataset(run.defaultDatasetId).listItems()
  return items.items
}
```

- [ ] **Step 2: 커밋**

```bash
git add lib/apify.ts
git commit -m "feat: apify.ts에 collectReels, collectComments 함수 추가"
```

---

## Task 8: 릴스/댓글 DB 스키마 + CRUD

**Files:**
- Modify: `lib/schema.ts`
- Modify: `lib/db.ts`

- [ ] **Step 1: schema.ts에 reels, reel_comments 테이블 추가**

`lib/schema.ts` 파일 하단에 추가:

```typescript
export const reels = sqliteTable('reels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  reelUrl: text('reel_url').notNull().unique(),
  shortcode: text('shortcode'),
  caption: text('caption'),
  likes: integer('likes').default(0),
  commentsCount: integer('comments_count').default(0),
  views: integer('views').default(0),
  plays: integer('plays').default(0),
  duration: real('duration').default(0),
  postTimestamp: text('post_timestamp'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_reels_username').on(table.username),
])

export const reelComments = sqliteTable('reel_comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reelId: integer('reel_id').notNull().references(() => reels.id),
  commentText: text('comment_text'),
  commenterUsername: text('commenter_username'),
  likes: integer('likes').default(0),
  isReply: integer('is_reply').default(0),
  detectedLanguage: text('detected_language').default(''),
  commentTimestamp: text('comment_timestamp'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_reel_comments_reel').on(table.reelId),
  index('idx_reel_comments_lang').on(table.detectedLanguage),
])
```

- [ ] **Step 2: db.ts에 CREATE TABLE SQL 추가**

`getDb()` 함수의 `sqlite.exec(...)` 내에 추가:

```sql
CREATE TABLE IF NOT EXISTS reels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  reel_url TEXT NOT NULL UNIQUE,
  shortcode TEXT,
  caption TEXT,
  likes INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  plays INTEGER DEFAULT 0,
  duration REAL DEFAULT 0,
  post_timestamp TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reels_username ON reels(username);

CREATE TABLE IF NOT EXISTS reel_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reel_id INTEGER NOT NULL REFERENCES reels(id),
  comment_text TEXT,
  commenter_username TEXT,
  likes INTEGER DEFAULT 0,
  is_reply INTEGER DEFAULT 0,
  detected_language TEXT DEFAULT '',
  comment_timestamp TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reel_comments_reel ON reel_comments(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_lang ON reel_comments(detected_language);
```

- [ ] **Step 3: db.ts에 릴스/댓글 CRUD 함수 추가**

`lib/db.ts` 하단에 추가. import에 `reels, reelComments` 추가:

```typescript
// ─── Reels ───

export function insertReels(username: string, rawReels: any[]) {
  const db = getDb()
  let inserted = 0
  for (const r of rawReels) {
    try {
      db.insert(reels).values({
        username,
        reelUrl: r.url || r.inputUrl || '',
        shortcode: r.shortCode || r.id || '',
        caption: r.caption || '',
        likes: r.likesCount ?? r.likes ?? 0,
        commentsCount: r.commentsCount ?? r.comments ?? 0,
        views: r.videoViewCount ?? r.viewCount ?? r.views ?? 0,
        plays: r.videoPlayCount ?? r.plays ?? 0,
        duration: r.videoDuration ?? r.duration ?? 0,
        postTimestamp: r.timestamp || '',
      }).onConflictDoNothing().run()
      inserted++
    } catch {}
  }
  return inserted
}

export function getReelsByUsername(username: string) {
  const db = getDb()
  return db.select().from(reels).where(eq(reels.username, username)).orderBy(desc(reels.views)).all()
}

export function insertReelComments(reelId: number, rawComments: any[], detectLangFn: (text: string) => string) {
  const db = getDb()
  let inserted = 0
  for (const c of rawComments) {
    try {
      const text = c.text || c.comment || ''
      db.insert(reelComments).values({
        reelId,
        commentText: text,
        commenterUsername: c.ownerUsername || c.username || '',
        likes: c.likesCount ?? c.likes ?? 0,
        isReply: c.isReply ? 1 : 0,
        detectedLanguage: detectLangFn(text),
        commentTimestamp: c.timestamp || '',
      }).run()
      inserted++
    } catch {}
  }
  return inserted
}

export function getReelComments(reelId: number) {
  const db = getDb()
  return db.select().from(reelComments).where(eq(reelComments.reelId, reelId)).all()
}

export function getCommentsByUsername(username: string) {
  const db = getDb()
  const userReels = db.select({ id: reels.id }).from(reels).where(eq(reels.username, username)).all()
  if (userReels.length === 0) return []
  const reelIds = userReels.map(r => r.id)
  // SQLite에서 IN 쿼리
  return db.select().from(reelComments)
    .where(sql`${reelComments.reelId} IN (${sql.join(reelIds.map(id => sql`${id}`), sql`, `)})`)
    .all()
}

export function updateInfluencerDeepAnalysis(username: string, data: {
  commentLangDistribution: Record<string, number>
  commentQualityScore: number
}) {
  const db = getDb()
  db.update(influencers).set({
    commentLangDistribution: JSON.stringify(data.commentLangDistribution),
    commentQualityScore: data.commentQualityScore,
    deepAnalyzedAt: sql`datetime('now')`,
    lastUpdated: sql`datetime('now')`,
  }).where(eq(influencers.username, username)).run()
}
```

- [ ] **Step 4: 커밋**

```bash
git add lib/schema.ts lib/db.ts
git commit -m "feat: reels/reel_comments 테이블 + CRUD 함수 추가"
```

---

## Task 9: 심층 분석 API 엔드포인트

**Files:**
- Create: `app/api/instagram/deep-analyze/route.ts`

- [ ] **Step 1: deep-analyze route 생성**

```typescript
// app/api/instagram/deep-analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkAdmin } from '@/lib/auth'
import { collectReels, collectComments } from '@/lib/apify'
import {
  insertReels, getReelsByUsername, insertReelComments,
  updateInfluencerDeepAnalysis, getInfluencer,
} from '@/lib/db'
import { detectLanguage, detectLanguageDistribution } from '@/lib/metrics'

const DEFAULT_FILTERS = {
  minViews: 1000,
  minLikes: 50,
  maxAgeDays: 90,
  maxReelsToAnalyze: 5,
  reelsLimit: 20,
  commentsLimit: 100,
}

export async function POST(request: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const body = await request.json()
  const { username, filters } = body
  if (!username) {
    return NextResponse.json({ error: 'username은 필수입니다.' }, { status: 400 })
  }

  const f = { ...DEFAULT_FILTERS, ...filters }

  try {
    // Step 1: 릴스 수집
    const rawReels = await collectReels(username, f.reelsLimit)
    const insertedReels = insertReels(username, rawReels)

    // Step 2: 앱 레벨 필터링
    const allReels = getReelsByUsername(username)
    const cutoffDate = new Date(Date.now() - f.maxAgeDays * 24 * 60 * 60 * 1000).toISOString()

    const filteredReels = allReels
      .filter(r => r.views >= f.minViews)
      .filter(r => r.likes >= f.minLikes)
      .filter(r => !r.postTimestamp || r.postTimestamp >= cutoffDate)
      .slice(0, f.maxReelsToAnalyze)

    if (filteredReels.length === 0) {
      return NextResponse.json({
        username,
        reelsCollected: insertedReels,
        reelsFiltered: 0,
        message: '필터 조건�� 만족하는 릴스가 없습니다.',
      })
    }

    // Step 3: 필터 통과한 릴스의 댓글 수집
    const reelUrls = filteredReels.map(r => r.reelUrl).filter(Boolean)
    const rawComments = await collectComments(reelUrls, f.commentsLimit)

    // 댓글을 릴���별로 매핑하여 저장
    let totalComments = 0
    for (const reel of filteredReels) {
      const reelComments = rawComments.filter((c: any) =>
        (c.postUrl || c.inputUrl || '').includes(reel.shortcode || '___none___')
      )
      if (reelComments.length > 0) {
        totalComments += insertReelComments(reel.id, reelComments, detectLanguage)
      }
    }

    // 릴스 URL 기반 매핑 실패 시 전부 첫 번째 릴스에 할당 (fallback)
    if (totalComments === 0 && rawComments.length > 0) {
      totalComments = insertReelComments(filteredReels[0].id, rawComments, detectLanguage)
    }

    // Step 4: 댓글 분석
    const allCommentTexts = rawComments.map((c: any) => c.text || c.comment || '')
    const langDist = detectLanguageDistribution(allCommentTexts)

    // 댓글 품질 점수
    const emojiOnlyPattern = /^[\p{Emoji}\s]+$/u
    const lowQualityCount = allCommentTexts.filter(t => {
      const trimmed = t.trim()
      return trimmed.length <= 3 || emojiOnlyPattern.test(trimmed)
    }).length
    const commentQualityScore = allCommentTexts.length > 0
      ? Math.round((1 - lowQualityCount / allCommentTexts.length) * 100) / 100
      : 0

    // Step 5: DB 저장
    updateInfluencerDeepAnalysis(username, {
      commentLangDistribution: langDist,
      commentQualityScore,
    })

    const updated = getInfluencer(username)

    return NextResponse.json({
      username,
      reelsCollected: insertedReels,
      reelsAnalyzed: filteredReels.length,
      commentsAnalyzed: allCommentTexts.length,
      commentLanguageDistribution: langDist,
      commentQualityScore,
      influencer: updated,
    })
  } catch (error: any) {
    return NextResponse.json({ error: `심층 분석 실패: ${error.message}` }, { status: 500 })
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add app/api/instagram/deep-analyze/route.ts
git commit -m "feat: 심층 분석 API — 릴스 수집 → 필터 → 댓글 수집 → 언어/품질 분석"
```

---

## Task 10: CandidatesTab에 심층 분석 버튼 + 결과 표시

**Files:**
- Modify: `app/admin/instagram/components/CandidatesTab.tsx`

- [ ] **Step 1: 심층 분석 상태 + 함수 추가**

CandidatesTab 컴포넌트에 state 추가:

```typescript
const [deepAnalyzing, setDeepAnalyzing] = useState<string | null>(null)

async function deepAnalyze(username: string) {
  if (!confirm(`${username}의 심층 분석을 시작합니다.\n릴스 수집 + 댓글 수집으로 Apify 크레딧이 ~$1.2 소모됩니다.\n계속하시겠습니까?`)) return
  setDeepAnalyzing(username)
  try {
    const res = await fetch('/api/instagram/deep-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    })
    const data = await res.json()
    if (data.influencer) {
      setInfluencers(prev => prev.map(i => i.username === username ? { ...i, ...data.influencer, hashtags: JSON.parse(data.influencer.hashtags || '[]') } : i))
    }
  } catch {}
  setDeepAnalyzing(null)
}
```

- [ ] **Step 2: 확장 패널에 심층 분석 버튼 + 결과 추가**

확장 패널의 바이오 섹션 아래에 추가:

```tsx
{/* 심층 분석 */}
<div className="mt-3 pt-3 border-t">
  {inf.deepAnalyzedAt ? (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">심층 분석 결과</span>
        <span className="text-xs text-muted-foreground">({new Date(inf.deepAnalyzedAt).toLocaleDateString('ko-KR')})</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">댓글 품질</div>
          <div className="font-medium">{((inf as any).commentQualityScore * 100).toFixed(0)}%</div>
        </div>
        {(() => {
          try {
            const dist = JSON.parse((inf as any).commentLangDistribution || '{}')
            const entries = Object.entries(dist).sort(([,a]: any, [,b]: any) => b - a)
            return entries.length > 0 ? (
              <div className="col-span-2 md:col-span-3">
                <div className="text-muted-foreground text-xs">댓글 언어 분포</div>
                <div className="flex gap-2 mt-1">
                  {entries.map(([lang, ratio]: any) => (
                    <Badge key={lang} variant="secondary" className="text-xs">
                      {lang}: {(ratio * 100).toFixed(0)}%
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null
          } catch { return null }
        })()}
      </div>
      <Button
        variant="outline" size="sm"
        onClick={() => deepAnalyze(inf.username)}
        disabled={deepAnalyzing === inf.username}
      >
        {deepAnalyzing === inf.username ? '분석중...' : '재분석'}
      </Button>
    </div>
  ) : (
    <Button
      variant="outline" size="sm"
      onClick={() => deepAnalyze(inf.username)}
      disabled={deepAnalyzing === inf.username}
    >
      {deepAnalyzing === inf.username ? '릴스/댓글 분석중...' : '심층 분석 (릴스+댓글)'}
    </Button>
  )}
</div>
```

- [ ] **Step 3: 브라우저에서 확인**

Expected: 후보 확장 패널에 "심층 분석 (릴스+댓글)" 버튼 표시. 클릭 시 비용 확인 후 분석 진행. 분석 완료 후 댓글 언어 분포와 품질 점수 표시.

- [ ] **Step 4: 커밋**

```bash
git add app/admin/instagram/components/CandidatesTab.tsx
git commit -m "feat: CandidatesTab에 심층 분석 버튼 + 결과(언어 분포, 댓글 품질) 표시"
```

---

## 최종 검증

- [ ] **Step 1: 전체 플로우 테스트**

1. `/admin/instagram` → 해시태그 수집 실행 (기존 기능)
2. `/admin/instagram/explore` → 게시물 확인 + 프로필 분석 (기존 기능)
3. `/admin/instagram/candidates` → Fit Score순 정렬 확인, 상세 지표 확인
4. 후보 상세에서 "심층 분석" 버튼 → 릴스/댓글 수집 + 결과 표시

- [ ] **Step 2: 최종 커밋**

모든 변경 확인 후 필요시 추가 커밋.
