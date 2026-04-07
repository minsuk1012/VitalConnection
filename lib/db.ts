import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq, desc, asc, gte, sql, count, max, ne, and } from 'drizzle-orm'
import path from 'path'
import * as schema from './schema'
import { collections, posts, influencers, reels, reelComments, apifyKeys } from './schema'
import { computeAllMetrics, type MetricsInput } from './metrics'

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'instagram.db')

let _db: ReturnType<typeof drizzle> | null = null

function getDb() {
  if (!_db) {
    const sqlite = new Database(DB_PATH)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    _db = drizzle(sqlite, { schema })

    // Create tables if not exist (push schema)
    sqlite.exec(`
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
        shortcode TEXT NOT NULL UNIQUE,
        url TEXT, caption TEXT, owner_username TEXT, owner_fullname TEXT,
        likes INTEGER DEFAULT 0, comments INTEGER DEFAULT 0,
        post_timestamp TEXT, location TEXT, hashtags TEXT DEFAULT '[]',
        post_type TEXT, display_url TEXT,
        video_view_count INTEGER DEFAULT 0, mentions TEXT DEFAULT '[]', is_video INTEGER DEFAULT 0,
        search_tag TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS influencers (
        username TEXT PRIMARY KEY, fullname TEXT, profile_url TEXT,
        post_count INTEGER DEFAULT 0, avg_likes REAL DEFAULT 0,
        avg_comments REAL DEFAULT 0, avg_engagement REAL DEFAULT 0,
        hashtags TEXT DEFAULT '[]', status TEXT NOT NULL DEFAULT '미확인',
        memo TEXT DEFAULT '', bio TEXT DEFAULT '',
        followers INTEGER DEFAULT 0, following INTEGER DEFAULT 0,
        is_business INTEGER DEFAULT 0,
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
        last_updated TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_posts_collection ON posts(collection_id);
      CREATE INDEX IF NOT EXISTS idx_posts_username ON posts(owner_username);
      CREATE INDEX IF NOT EXISTS idx_posts_likes ON posts(likes DESC);
      CREATE INDEX IF NOT EXISTS idx_influencers_engagement ON influencers(avg_engagement DESC);

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

      CREATE TABLE IF NOT EXISTS apify_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        monthly_limit REAL DEFAULT 5.0,
        current_usage REAL DEFAULT 0,
        remaining REAL DEFAULT 5.0,
        is_active INTEGER DEFAULT 1,
        last_checked TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)

    // ALTER TABLE for existing DBs — posts
    try { sqlite.exec(`ALTER TABLE posts ADD COLUMN video_view_count INTEGER DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE posts ADD COLUMN mentions TEXT DEFAULT '[]'`) } catch {}
    try { sqlite.exec(`ALTER TABLE posts ADD COLUMN is_video INTEGER DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE posts ADD COLUMN owner_id TEXT DEFAULT ''`) } catch {}
    try { sqlite.exec(`ALTER TABLE posts ADD COLUMN dimensions_width INTEGER DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE posts ADD COLUMN dimensions_height INTEGER DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE posts ADD COLUMN images TEXT DEFAULT '[]'`) } catch {}
    try { sqlite.exec(`ALTER TABLE posts ADD COLUMN first_comment TEXT DEFAULT ''`) } catch {}
    try { sqlite.exec(`ALTER TABLE posts ADD COLUMN latest_comments TEXT DEFAULT '[]'`) } catch {}
    try { sqlite.exec(`ALTER TABLE posts ADD COLUMN music_info TEXT DEFAULT ''`) } catch {}

    // ALTER TABLE for existing DBs — influencers
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN total_posts INTEGER DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN is_verified INTEGER DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN external_url TEXT DEFAULT ''`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN category TEXT DEFAULT ''`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN profile_pic_url TEXT DEFAULT ''`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN engagement_rate REAL DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN fit_score REAL DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN comment_like_ratio REAL DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN follower_following_ratio REAL DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN posting_frequency REAL DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN last_post_date TEXT DEFAULT ''`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN content_relevance REAL DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN detected_language TEXT DEFAULT ''`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN comment_lang_distribution TEXT DEFAULT '{}'`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN comment_quality_score REAL DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN deep_analyzed_at TEXT DEFAULT ''`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN reel_count INTEGER DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN avg_reel_views REAL DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE influencers ADD COLUMN avg_reel_plays REAL DEFAULT 0`) } catch {}

    // ALTER TABLE for existing DBs — reels
    try { sqlite.exec(`ALTER TABLE reels ADD COLUMN video_url TEXT DEFAULT ''`) } catch {}
    try { sqlite.exec(`ALTER TABLE reels ADD COLUMN display_url TEXT DEFAULT ''`) } catch {}
    try { sqlite.exec(`ALTER TABLE reels ADD COLUMN audio_title TEXT DEFAULT ''`) } catch {}
    try { sqlite.exec(`ALTER TABLE reels ADD COLUMN hashtags TEXT DEFAULT '[]'`) } catch {}
    try { sqlite.exec(`ALTER TABLE reels ADD COLUMN owner_fullname TEXT DEFAULT ''`) } catch {}

    // ALTER TABLE for existing DBs — apify_keys
    try { sqlite.exec(`ALTER TABLE apify_keys ADD COLUMN is_selected INTEGER DEFAULT 0`) } catch {}

    // ─── 초기 세팅 (마이그레이션) ───
    // Apify 키: APIFY_TOKEN 환경변수가 있고 DB에 키가 없으면 자동 등록
    const seedToken = process.env.APIFY_TOKEN
    if (seedToken) {
      const keyCount = (sqlite.prepare('SELECT COUNT(*) as cnt FROM apify_keys').get() as any).cnt
      if (keyCount === 0) {
        sqlite.prepare(
          `INSERT INTO apify_keys (token, label, monthly_limit, current_usage, remaining, is_active, is_selected, last_checked)
           VALUES (?, ?, 5.0, 0, 5.0, 1, 1, ?)`
        ).run(seedToken, process.env.APIFY_LABEL || '기본 계정', new Date().toISOString())
      }
    }
  }
  return _db
}

// ─── Collections ───

export function createCollection(type: string, query: string, limitPerItem: number) {
  const db = getDb()
  const result = db.insert(collections).values({
    type, query, limitPerItem, status: 'running',
  }).returning({ id: collections.id }).get()
  return result.id
}

export function updateCollection(id: number, status: string, totalCollected: number) {
  const db = getDb()
  db.update(collections)
    .set({ status, totalCollected })
    .where(eq(collections.id, id))
    .run()
}

export function getCollections() {
  const db = getDb()
  return db.select().from(collections).orderBy(desc(collections.createdAt)).all()
}

// ─── Posts ───

export function insertPosts(collectionId: number, rawPosts: any[], searchTag: string) {
  const db = getDb()
  let inserted = 0

  for (const p of rawPosts) {
    try {
      // 에러 응답이나 유효하지 않은 아이템 스킵
      if (p.error || (!p.shortCode && !p.shortcode && !p.id)) continue

      db.insert(posts).values({
        collectionId,
        shortcode: p.shortCode || p.shortcode || p.id || '',
        url: p.url || '',
        caption: p.caption || '',
        ownerUsername: p.ownerUsername || p.owner?.username || '',
        ownerFullname: p.ownerFullName || p.owner?.fullName || '',
        likes: p.likesCount ?? p.likes ?? 0,
        comments: p.commentsCount ?? p.comments ?? 0,
        postTimestamp: p.timestamp || '',
        location: p.locationName || p.location || '',
        hashtags: JSON.stringify(p.hashtags || []),
        postType: p.type || p.productType || '',
        displayUrl: p.displayUrl || '',
        videoViewCount: p.videoViewCount ?? p.videoPlayCount ?? 0,
        mentions: JSON.stringify(p.mentions || p.taggedUsers || []),
        isVideo: (p.isVideo || p.type === 'Video' || p.productType === 'clips') ? 1 : 0,
        ownerId: String(p.ownerId || p.owner?.id || ''),
        dimensionsWidth: p.dimensionsWidth ?? p.dimensions?.width ?? 0,
        dimensionsHeight: p.dimensionsHeight ?? p.dimensions?.height ?? 0,
        images: JSON.stringify(p.images || []),
        firstComment: p.firstComment || '',
        latestComments: JSON.stringify(p.latestComments || []),
        musicInfo: p.musicInfo ? JSON.stringify(p.musicInfo) : '',
        searchTag,
      }).onConflictDoNothing().run()
      inserted++
    } catch {
      // duplicate or error — skip
    }
  }

  return inserted
}

export function queryResults(params: {
  collectionId?: number
  collectionType?: string
  search?: string
  minLikes?: number
  maxLikes?: number
  minComments?: number
  maxComments?: number
  sortBy?: string
  sortOrder?: string
  page?: number
  pageSize?: number
}) {
  const db = getDb()
  const page = params.page || 1
  const pageSize = params.pageSize || 50
  const offset = (page - 1) * pageSize

  const conditions = []
  if (params.collectionId) conditions.push(eq(posts.collectionId, params.collectionId))
  if (params.collectionType) conditions.push(eq(collections.type, params.collectionType))
  if (params.search) {
    const term = `%${params.search}%`
    conditions.push(sql`(${posts.caption} LIKE ${term} OR ${posts.location} LIKE ${term} OR ${posts.ownerUsername} LIKE ${term} OR ${posts.hashtags} LIKE ${term})`)
  }
  if (params.minLikes !== undefined) conditions.push(gte(posts.likes, params.minLikes))
  if (params.maxLikes !== undefined) conditions.push(sql`${posts.likes} <= ${params.maxLikes}`)
  if (params.minComments !== undefined) conditions.push(gte(posts.comments, params.minComments))
  if (params.maxComments !== undefined) conditions.push(sql`${posts.comments} <= ${params.maxComments}`)

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const sortCol = {
    likes: posts.likes,
    comments: posts.comments,
    date: posts.postTimestamp,
  }[params.sortBy || 'likes'] || posts.likes

  const orderFn = params.sortOrder === 'asc' ? asc : desc

  const totalResult = db.select({ cnt: count() }).from(posts).innerJoin(collections, eq(posts.collectionId, collections.id)).where(where).get()
  const total = totalResult?.cnt || 0

  const rows = db.select({
    id: posts.id,
    collectionId: posts.collectionId,
    shortcode: posts.shortcode,
    url: posts.url,
    caption: posts.caption,
    owner_username: posts.ownerUsername,
    owner_fullname: posts.ownerFullname,
    likes: posts.likes,
    comments: posts.comments,
    post_timestamp: posts.postTimestamp,
    location: posts.location,
    hashtags: posts.hashtags,
    post_type: posts.postType,
    display_url: posts.displayUrl,
    is_video: posts.isVideo,
    video_view_count: posts.videoViewCount,
    images: posts.images,
    first_comment: posts.firstComment,
    latest_comments: posts.latestComments,
    music_info: posts.musicInfo,
    search_tag: posts.searchTag,
    created_at: posts.createdAt,
    collection_type: collections.type,
    collection_query: collections.query,
  })
    .from(posts)
    .innerJoin(collections, eq(posts.collectionId, collections.id))
    .where(where)
    .orderBy(orderFn(sortCol))
    .limit(pageSize)
    .offset(offset)
    .all()

  return { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export function getPostsGroupedBySearchTag() {
  const db = getDb()
  return db.select({
    searchTag: posts.searchTag,
    postCount: count(),
    avgLikes: sql<number>`ROUND(AVG(${posts.likes}), 0)`,
    avgComments: sql<number>`ROUND(AVG(${posts.comments}), 0)`,
    totalLikes: sql<number>`SUM(${posts.likes})`,
    lastCollected: max(posts.createdAt),
  }).from(posts).where(ne(posts.searchTag, '')).groupBy(posts.searchTag).orderBy(sql`MAX(${posts.createdAt}) DESC`).all()
}

export function getPostsBySearchTag(searchTag: string) {
  const db = getDb()
  return db.select({
    id: posts.id,
    url: posts.url,
    caption: posts.caption,
    owner_username: posts.ownerUsername,
    owner_fullname: posts.ownerFullname,
    likes: posts.likes,
    comments: posts.comments,
    post_timestamp: posts.postTimestamp,
    display_url: posts.displayUrl,
    post_type: posts.postType,
    location: posts.location,
    hashtags: posts.hashtags,
    first_comment: posts.firstComment,
    latest_comments: posts.latestComments,
    images: posts.images,
    is_video: posts.isVideo,
    video_view_count: posts.videoViewCount,
  }).from(posts).where(eq(posts.searchTag, searchTag)).orderBy(desc(posts.likes)).all()
}

export function deletePostsBySearchTag(searchTag: string) {
  const db = getDb()
  db.delete(posts).where(eq(posts.searchTag, searchTag)).run()
}

export function deleteInfluencer(username: string) {
  const db = getDb()
  // 릴스 댓글 삭제
  const userReels = db.select({ id: reels.id }).from(reels).where(eq(reels.username, username)).all()
  for (const r of userReels) {
    db.delete(reelComments).where(eq(reelComments.reelId, r.id)).run()
  }
  // 릴스 삭제
  db.delete(reels).where(eq(reels.username, username)).run()
  // 게시물 삭제
  db.delete(posts).where(eq(posts.ownerUsername, username)).run()
  // 인플루언서 삭제
  db.delete(influencers).where(eq(influencers.username, username)).run()
}

export function getPostsByUsername(username: string) {
  const db = getDb()
  return db.select({
    id: posts.id,
    url: posts.url,
    caption: posts.caption,
    owner_username: posts.ownerUsername,
    likes: posts.likes,
    comments: posts.comments,
    post_timestamp: posts.postTimestamp,
    display_url: posts.displayUrl,
    post_type: posts.postType,
    location: posts.location,
    hashtags: posts.hashtags,
    images: posts.images,
    first_comment: posts.firstComment,
    latest_comments: posts.latestComments,
  }).from(posts).where(eq(posts.ownerUsername, username)).orderBy(desc(posts.likes)).all()
}

export function getDistinctSearchTags() {
  const db = getDb()
  const rows = db.selectDistinct({ searchTag: posts.searchTag })
    .from(posts)
    .where(ne(posts.searchTag, ''))
    .orderBy(asc(posts.searchTag))
    .all()
  return rows.map(r => r.searchTag).filter(Boolean) as string[]
}

export function getAllPostsForExport(params: { collectionId?: number; searchTag?: string; minLikes?: number }) {
  const db = getDb()
  const conditions = []
  if (params.collectionId) conditions.push(eq(posts.collectionId, params.collectionId))
  if (params.searchTag) conditions.push(eq(posts.searchTag, params.searchTag))
  if (params.minLikes !== undefined) conditions.push(gte(posts.likes, params.minLikes))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  return db.select().from(posts).where(where).orderBy(desc(posts.likes)).all()
}

// ─── Influencers ───

// 통합 메트릭 재계산: posts + reels + profile + comments 전부 반영
export function recalculateInfluencer(username: string) {
  const db = getDb()

  // 1. posts 데이터
  const userPosts = db.select({
    caption: posts.caption,
    hashtags: posts.hashtags,
    location: posts.location,
    postTimestamp: posts.postTimestamp,
    likes: posts.likes,
    comments: posts.comments,
    ownerFullname: posts.ownerFullname,
  }).from(posts).where(eq(posts.ownerUsername, username)).all()

  // 2. reels 데이터
  const userReels = db.select({
    caption: reels.caption,
    hashtags: reels.hashtags,
    postTimestamp: reels.postTimestamp,
    views: reels.views,
    plays: reels.plays,
    likes: reels.likes,
    commentsCount: reels.commentsCount,
  }).from(reels).where(eq(reels.username, username)).all()

  // 3. 기존 프로필 정보
  const existing = db.select().from(influencers).where(eq(influencers.username, username)).get()

  const postCount = userPosts.length
  const reelCount = userReels.length
  if (postCount === 0 && reelCount === 0 && !existing) return

  // 4. posts 통계
  const avgLikes = postCount > 0 ? Math.round(userPosts.reduce((s, p) => s + (p.likes ?? 0), 0) / postCount * 10) / 10 : 0
  const avgComments = postCount > 0 ? Math.round(userPosts.reduce((s, p) => s + (p.comments ?? 0), 0) / postCount * 10) / 10 : 0
  const avgEngagement = Math.round((avgLikes + avgComments) * 10) / 10

  // 5. reels 통계
  const avgReelViews = reelCount > 0 ? Math.round(userReels.reduce((s, r) => s + (r.views ?? 0), 0) / reelCount) : 0
  const avgReelPlays = reelCount > 0 ? Math.round(userReels.reduce((s, r) => s + (r.plays ?? 0), 0) / reelCount) : 0

  // 6. 캡션/해시태그/위치/타임스탬프 합산 (posts + reels)
  const allCaptions = [
    ...userPosts.map(p => p.caption || ''),
    ...userReels.map(r => r.caption || ''),
  ]
  const allHashtagArrays = [
    ...userPosts.map(p => { try { return JSON.parse(p.hashtags || '[]') as string[] } catch { return [] } }),
    ...userReels.map(r => { try { return JSON.parse(r.hashtags || '[]') as string[] } catch { return [] } }),
  ]
  const allHashtags = [...new Set(allHashtagArrays.flat())]
  const allLocations = userPosts.map(p => p.location || '').filter(Boolean)
  const allTimestamps = [
    ...userPosts.map(p => p.postTimestamp || '').filter(Boolean),
    ...userReels.map(r => r.postTimestamp || '').filter(Boolean),
  ]
  const allEngagements = [
    ...userPosts.map(p => (p.likes ?? 0) + (p.comments ?? 0)),
    ...userReels.map(r => (r.views ?? 0) + (r.likes ?? 0)),
  ]

  // 7. 프로필 정보 (기존 DB에서)
  const followers = existing?.followers ?? 0
  const following = existing?.following ?? 0
  const bio = existing?.bio ?? ''
  const externalUrl = existing?.externalUrl ?? ''
  const isBusiness = !!(existing?.isBusiness)
  const isVerified = !!(existing?.isVerified)

  // 8. computeAllMetrics에 posts+reels 합산 데이터 전달
  const combinedAvgLikes = postCount > 0 ? avgLikes : (reelCount > 0 ? Math.round(userReels.reduce((s, r) => s + Math.max(0, r.likes ?? 0), 0) / reelCount) : 0)
  const combinedAvgComments = postCount > 0 ? avgComments : (reelCount > 0 ? Math.round(userReels.reduce((s, r) => s + (r.commentsCount ?? 0), 0) / reelCount) : 0)

  const metricsInput: MetricsInput = {
    avgLikes: combinedAvgLikes,
    avgComments: combinedAvgComments,
    followers,
    following,
    bio,
    externalUrl,
    isBusiness,
    isVerified,
    captions: allCaptions,
    hashtags: allHashtagArrays,
    allHashtags,
    locations: allLocations,
    postTimestamps: allTimestamps,
    engagements: allEngagements,
  }
  const metrics = computeAllMetrics(metricsInput)

  // 9. Upsert
  const fullname = userPosts[0]?.ownerFullname || existing?.fullname || ''

  db.insert(influencers).values({
    username,
    fullname,
    profileUrl: `https://instagram.com/${username}`,
    postCount,
    avgLikes,
    avgComments,
    avgEngagement,
    reelCount,
    avgReelViews,
    avgReelPlays,
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
      fullname: fullname || sql`${influencers.fullname}`,
      postCount,
      avgLikes,
      avgComments,
      avgEngagement,
      reelCount,
      avgReelViews,
      avgReelPlays,
      hashtags: JSON.stringify(allHashtags),
      engagementRate: metrics.engagementRate,
      commentLikeRatio: metrics.commentLikeRatio,
      followerFollowingRatio: metrics.followerFollowingRatio,
      postingFrequency: metrics.postingFrequency,
      lastPostDate: metrics.lastPostDate,
      contentRelevance: metrics.contentRelevance,
      detectedLanguage: metrics.detectedLanguage,
      fitScore: metrics.fitScore,
      lastUpdated: sql`datetime('now')`,
    },
  }).run()
}

// 전체 influencer 일괄 재계산
export function refreshInfluencers() {
  const db = getDb()
  const usernames = new Set<string>()

  // posts의 모든 username
  db.select({ u: posts.ownerUsername }).from(posts).where(ne(posts.ownerUsername, '')).groupBy(posts.ownerUsername).all()
    .forEach(r => usernames.add(r.u!))

  // reels의 모든 username
  db.select({ u: reels.username }).from(reels).groupBy(reels.username).all()
    .forEach(r => usernames.add(r.u))

  for (const username of usernames) {
    recalculateInfluencer(username)
  }
}

// 하위 호환 — 기존 코드에서 호출하는 곳 대응
export const refreshInfluencersForUser = recalculateInfluencer

export function queryInfluencers(params: {
  status?: string
  sortBy?: string
  sortOrder?: string
  page?: number
  pageSize?: number
}) {
  const db = getDb()
  const page = params.page || 1
  const pageSize = params.pageSize || 50
  const offset = (page - 1) * pageSize

  const conditions = []
  if (params.status) conditions.push(eq(influencers.status, params.status))
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const sortCol = {
    likes: influencers.avgLikes,
    comments: influencers.avgComments,
    posts: influencers.postCount,
    fitScore: influencers.fitScore,
    engagementRate: influencers.engagementRate,
    avgEngagement: influencers.avgEngagement,
    reelViews: influencers.avgReelViews,
  }[params.sortBy || ''] || influencers.fitScore

  const orderFn = params.sortOrder === 'asc' ? asc : desc

  const totalResult = db.select({ cnt: count() }).from(influencers).where(where).get()
  const total = totalResult?.cnt || 0

  const rows = db.select().from(influencers).where(where).orderBy(orderFn(sortCol)).limit(pageSize).offset(offset).all()

  return { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export function getInfluencerSamplePosts(username: string, limit = 3) {
  const db = getDb()
  return db.select({
    url: posts.url,
    caption: posts.caption,
    likes: posts.likes,
    comments: posts.comments,
  })
    .from(posts)
    .where(eq(posts.ownerUsername, username))
    .orderBy(desc(posts.likes))
    .limit(limit)
    .all()
}

export function getAllInfluencersForExport() {
  const db = getDb()
  return db.select().from(influencers).orderBy(desc(influencers.avgEngagement)).all()
}

export function updateCandidate(username: string, updates: { status?: string; memo?: string; tags?: string[] }) {
  const db = getDb()
  const set: Record<string, any> = { lastUpdated: sql`datetime('now')` }

  if (updates.status !== undefined) set.status = updates.status
  if (updates.memo !== undefined) set.memo = updates.memo
  if (updates.tags !== undefined) set.hashtags = JSON.stringify(updates.tags)

  db.update(influencers).set(set).where(eq(influencers.username, username)).run()
}

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

export function getInfluencer(username: string) {
  const db = getDb()
  return db.select().from(influencers).where(eq(influencers.username, username)).get()
}

export function getStatusCounts() {
  const db = getDb()
  const rows = db.select({
    status: influencers.status,
    count: count(),
  }).from(influencers).groupBy(influencers.status).all()
  return Object.fromEntries(rows.map(r => [r.status, r.count]))
}

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
        likes: Math.max(0, r.likesCount ?? r.likes ?? 0),
        commentsCount: r.commentsCount ?? r.comments ?? 0,
        views: r.videoViewCount ?? r.viewCount ?? r.views ?? 0,
        plays: r.videoPlayCount ?? r.plays ?? 0,
        duration: r.videoDuration ?? r.duration ?? 0,
        postTimestamp: r.timestamp || '',
        videoUrl: r.videoUrl || '',
        displayUrl: r.displayUrl || '',
        audioTitle: r.musicInfo?.title || r.audioTitle || '',
        hashtags: JSON.stringify(r.hashtags || []),
        ownerFullname: r.ownerFullName || r.ownerFullname || '',
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
      if (!text.trim()) continue  // 빈 댓글 스킵
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

export function deleteReelsByUsername(username: string) {
  const db = getDb()
  const reelIds = db.select({ id: reels.id }).from(reels).where(eq(reels.username, username)).all()
  for (const r of reelIds) {
    db.delete(reelComments).where(eq(reelComments.reelId, r.id)).run()
  }
  db.delete(reels).where(eq(reels.username, username)).run()
}

export function getReelComments(reelId: number) {
  const db = getDb()
  return db.select().from(reelComments).where(eq(reelComments.reelId, reelId)).orderBy(desc(reelComments.likes)).all()
}

export function getReelsByUsernameList(username: string) {
  const db = getDb()
  return db.select().from(reels).where(eq(reels.username, username)).orderBy(desc(reels.views)).all()
}

export function getReelsGroupedByUser() {
  const db = getDb()
  const groups = db.select({
    username: reels.username,
    reelCount: count(),
    avgViews: sql<number>`ROUND(AVG(${reels.views}), 0)`,
    avgPlays: sql<number>`ROUND(AVG(${reels.plays}), 0)`,
    avgLikes: sql<number>`ROUND(AVG(CASE WHEN ${reels.likes} > 0 THEN ${reels.likes} ELSE NULL END), 0)`,
    totalViews: sql<number>`SUM(${reels.views})`,
    lastCollected: max(reels.createdAt),
  }).from(reels).groupBy(reels.username).orderBy(sql`AVG(${reels.views}) DESC`).all()
  return groups
}

export function queryReels(params: {
  username?: string
  sortBy?: string
  sortOrder?: string
  page?: number
  pageSize?: number
}) {
  const db = getDb()
  const page = params.page || 1
  const pageSize = params.pageSize || 50
  const offset = (page - 1) * pageSize

  const conditions = []
  if (params.username) conditions.push(eq(reels.username, params.username))
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const sortCol = {
    views: reels.views,
    likes: reels.likes,
    plays: reels.plays,
    date: reels.postTimestamp,
  }[params.sortBy || 'views'] || reels.views

  const orderFn = params.sortOrder === 'asc' ? asc : desc

  const totalResult = db.select({ cnt: count() }).from(reels).where(where).get()
  const total = totalResult?.cnt || 0

  const rows = db.select().from(reels).where(where).orderBy(orderFn(sortCol)).limit(pageSize).offset(offset).all()

  return { rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
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

// ─── Apify Keys ───

export function getApifyKeys() {
  const db = getDb()
  return db.select().from(apifyKeys).orderBy(desc(apifyKeys.remaining)).all()
}

export function getActiveApifyKeys() {
  const db = getDb()
  return db.select().from(apifyKeys).where(eq(apifyKeys.isActive, 1)).orderBy(desc(apifyKeys.remaining)).all()
}

export function addApifyKey(token: string, label: string, monthlyLimit: number = 5.0, currentUsage: number = 0) {
  const db = getDb()
  const remaining = monthlyLimit - currentUsage
  return db.insert(apifyKeys).values({
    token, label, monthlyLimit, currentUsage, remaining,
    lastChecked: new Date().toISOString(),
  }).returning({ id: apifyKeys.id }).get()
}

export function deleteApifyKey(id: number) {
  const db = getDb()
  db.delete(apifyKeys).where(eq(apifyKeys.id, id)).run()
}

export function updateApifyKeyBalance(id: number, currentUsage: number, monthlyLimit: number) {
  const db = getDb()
  const remaining = Math.max(0, monthlyLimit - currentUsage)
  db.update(apifyKeys).set({
    currentUsage,
    monthlyLimit,
    remaining,
    lastChecked: new Date().toISOString(),
  }).where(eq(apifyKeys.id, id)).run()
}

export function selectApifyKey(id: number) {
  const db = getDb()
  // 모두 해제 후 선택
  db.update(apifyKeys).set({ isSelected: 0 }).run()
  db.update(apifyKeys).set({ isSelected: 1 }).where(eq(apifyKeys.id, id)).run()
}

export function getSelectedApifyKey() {
  const db = getDb()
  return db.select().from(apifyKeys).where(eq(apifyKeys.isSelected, 1)).get() ?? null
}
