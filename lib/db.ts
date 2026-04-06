import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq, desc, asc, gte, sql, count, max, ne, and } from 'drizzle-orm'
import path from 'path'
import * as schema from './schema'
import { collections, posts, influencers } from './schema'
import { computeAllMetrics, type MetricsInput } from './metrics'

const DB_PATH = path.join(process.cwd(), 'instagram.db')

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
    `)

    // ALTER TABLE for existing DBs — posts
    try { sqlite.exec(`ALTER TABLE posts ADD COLUMN video_view_count INTEGER DEFAULT 0`) } catch {}
    try { sqlite.exec(`ALTER TABLE posts ADD COLUMN mentions TEXT DEFAULT '[]'`) } catch {}
    try { sqlite.exec(`ALTER TABLE posts ADD COLUMN is_video INTEGER DEFAULT 0`) } catch {}

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
        searchTag,
      }).onConflictDoNothing().run()
      inserted++
    } catch {
      // duplicate shortcode — skip
    }
  }

  return inserted
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
  const page = params.page || 1
  const pageSize = params.pageSize || 50
  const offset = (page - 1) * pageSize

  const conditions = []
  if (params.collectionId) conditions.push(eq(posts.collectionId, params.collectionId))
  if (params.searchTag) conditions.push(eq(posts.searchTag, params.searchTag))
  if (params.minLikes !== undefined) conditions.push(gte(posts.likes, params.minLikes))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  const sortCol = {
    likes: posts.likes,
    comments: posts.comments,
    date: posts.postTimestamp,
  }[params.sortBy || 'likes'] || posts.likes

  const orderFn = params.sortOrder === 'asc' ? asc : desc

  const totalResult = db.select({ cnt: count() }).from(posts).where(where).get()
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

export function refreshInfluencers() {
  const db = getDb()

  // Aggregate stats from posts
  const stats = db.select({
    ownerUsername: posts.ownerUsername,
    fullname: max(posts.ownerFullname),
    postCount: count(),
    avgLikes: sql<number>`ROUND(AVG(${posts.likes}), 1)`,
    avgComments: sql<number>`ROUND(AVG(${posts.comments}), 1)`,
    avgEngagement: sql<number>`ROUND(AVG(${posts.likes}) + AVG(${posts.comments}), 1)`,
  })
    .from(posts)
    .where(ne(posts.ownerUsername, ''))
    .groupBy(posts.ownerUsername)
    .all()

  for (const s of stats) {
    const username = s.ownerUsername!

    // Query individual posts for this user
    const userPosts = db.select({
      caption: posts.caption,
      hashtags: posts.hashtags,
      location: posts.location,
      postTimestamp: posts.postTimestamp,
      likes: posts.likes,
      comments: posts.comments,
    })
      .from(posts)
      .where(eq(posts.ownerUsername, username))
      .all()

    // Look up existing influencer record for profile data
    const existing = db.select({
      followers: influencers.followers,
      following: influencers.following,
      bio: influencers.bio,
      externalUrl: influencers.externalUrl,
      isBusiness: influencers.isBusiness,
      isVerified: influencers.isVerified,
    })
      .from(influencers)
      .where(eq(influencers.username, username))
      .get()

    const followers = existing?.followers ?? 0
    const following = existing?.following ?? 0
    const bio = existing?.bio ?? ''
    const externalUrl = existing?.externalUrl ?? ''
    const isBusiness = !!(existing?.isBusiness)
    const isVerified = !!(existing?.isVerified)

    // Build per-post arrays
    const captions = userPosts.map(p => p.caption || '')
    const hashtagArrays = userPosts.map(p => {
      try { return JSON.parse(p.hashtags || '[]') as string[] } catch { return [] }
    })
    const allHashtags = [...new Set(hashtagArrays.flat())]
    const locations = userPosts.map(p => p.location || '').filter(Boolean)
    const postTimestamps = userPosts.map(p => p.postTimestamp || '').filter(Boolean)
    const engagements = userPosts.map(p => (p.likes ?? 0) + (p.comments ?? 0))

    // Compute all metrics
    const metricsInput: MetricsInput = {
      avgLikes: s.avgLikes,
      avgComments: s.avgComments,
      followers,
      following,
      bio,
      externalUrl,
      isBusiness,
      isVerified,
      captions,
      hashtags: hashtagArrays,
      allHashtags,
      locations,
      postTimestamps,
      engagements,
    }
    const metrics = computeAllMetrics(metricsInput)

    // Upsert influencer with all metrics
    db.insert(influencers).values({
      username,
      fullname: s.fullname,
      profileUrl: `https://instagram.com/${username}`,
      postCount: s.postCount,
      avgLikes: s.avgLikes,
      avgComments: s.avgComments,
      avgEngagement: s.avgEngagement,
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
