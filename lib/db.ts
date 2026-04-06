import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq, desc, asc, gte, sql, count, max, ne, and } from 'drizzle-orm'
import path from 'path'
import * as schema from './schema'
import { collections, posts, influencers } from './schema'

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
        post_type TEXT, display_url TEXT, search_tag TEXT,
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
        last_updated TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_posts_collection ON posts(collection_id);
      CREATE INDEX IF NOT EXISTS idx_posts_username ON posts(owner_username);
      CREATE INDEX IF NOT EXISTS idx_posts_likes ON posts(likes DESC);
      CREATE INDEX IF NOT EXISTS idx_influencers_engagement ON influencers(avg_engagement DESC);
    `)
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
    db.insert(influencers).values({
      username: s.ownerUsername!,
      fullname: s.fullname,
      profileUrl: `https://instagram.com/${s.ownerUsername}`,
      postCount: s.postCount,
      avgLikes: s.avgLikes,
      avgComments: s.avgComments,
      avgEngagement: s.avgEngagement,
      hashtags: '[]',
    }).onConflictDoUpdate({
      target: influencers.username,
      set: {
        fullname: sql`excluded.fullname`,
        profileUrl: sql`excluded.profile_url`,
        postCount: sql`excluded.post_count`,
        avgLikes: sql`excluded.avg_likes`,
        avgComments: sql`excluded.avg_comments`,
        avgEngagement: sql`excluded.avg_engagement`,
        lastUpdated: sql`datetime('now')`,
      },
    }).run()
  }

  // Update hashtags per influencer
  const postRows = db.select({
    ownerUsername: posts.ownerUsername,
    hashtags: posts.hashtags,
  }).from(posts).where(ne(posts.ownerUsername, '')).all()

  const map: Record<string, Set<string>> = {}
  for (const row of postRows) {
    if (!row.ownerUsername) continue
    if (!map[row.ownerUsername]) map[row.ownerUsername] = new Set()
    try {
      const tags = JSON.parse(row.hashtags || '[]')
      for (const t of tags) map[row.ownerUsername].add(t)
    } catch {}
  }

  for (const [username, tags] of Object.entries(map)) {
    db.update(influencers)
      .set({ hashtags: JSON.stringify([...tags]) })
      .where(eq(influencers.username, username))
      .run()
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
  }[params.sortBy || ''] || influencers.avgEngagement

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
  bio?: string; followers?: number; following?: number; is_business?: boolean; fullname?: string
}) {
  const db = getDb()
  const set: Record<string, any> = { lastUpdated: sql`datetime('now')` }

  if (profile.bio !== undefined) set.bio = profile.bio
  if (profile.followers !== undefined) set.followers = profile.followers
  if (profile.following !== undefined) set.following = profile.following
  if (profile.is_business !== undefined) set.isBusiness = profile.is_business ? 1 : 0
  if (profile.fullname !== undefined) set.fullname = profile.fullname

  db.update(influencers).set(set).where(eq(influencers.username, username)).run()
}

export function getInfluencer(username: string) {
  const db = getDb()
  return db.select().from(influencers).where(eq(influencers.username, username)).get()
}
