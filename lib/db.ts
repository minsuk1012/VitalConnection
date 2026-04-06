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
      status TEXT NOT NULL DEFAULT '미확인',
      memo TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      followers INTEGER DEFAULT 0,
      following INTEGER DEFAULT 0,
      is_business INTEGER DEFAULT 0,
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

  const rows = db.prepare(
    'SELECT owner_username, hashtags FROM posts WHERE owner_username != \'\''
  ).all() as { owner_username: string; hashtags: string }[]

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
  status?: string
  sortBy?: string
  sortOrder?: string
  page?: number
  pageSize?: number
}) {
  const db = getDb()

  const conditions: string[] = []
  const values: any[] = []

  if (params.status) {
    conditions.push('status = ?')
    values.push(params.status)
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

  const sortCol = { likes: 'avg_likes', comments: 'avg_comments', posts: 'post_count' }[params.sortBy || ''] || 'avg_engagement'
  const sortDir = params.sortOrder === 'asc' ? 'ASC' : 'DESC'

  const page = params.page || 1
  const pageSize = params.pageSize || 50
  const offset = (page - 1) * pageSize

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM influencers ${where}`).get(...values) as any).cnt

  const rows = db.prepare(`
    SELECT * FROM influencers
    ${where}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT ? OFFSET ?
  `).all(...values, pageSize, offset)

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

export function updateCandidate(username: string, updates: { status?: string; memo?: string; tags?: string[] }) {
  const db = getDb()
  const sets: string[] = []
  const values: any[] = []

  if (updates.status !== undefined) { sets.push('status = ?'); values.push(updates.status) }
  if (updates.memo !== undefined) { sets.push('memo = ?'); values.push(updates.memo) }
  if (updates.tags !== undefined) { sets.push('hashtags = ?'); values.push(JSON.stringify(updates.tags)) }

  if (sets.length === 0) return

  sets.push("last_updated = datetime('now')")
  values.push(username)

  db.prepare(`UPDATE influencers SET ${sets.join(', ')} WHERE username = ?`).run(...values)
}

export function updateInfluencerProfile(username: string, profile: { bio?: string; followers?: number; following?: number; is_business?: boolean; fullname?: string }) {
  const db = getDb()
  const sets: string[] = ["last_updated = datetime('now')"]
  const values: any[] = []

  if (profile.bio !== undefined) { sets.push('bio = ?'); values.push(profile.bio) }
  if (profile.followers !== undefined) { sets.push('followers = ?'); values.push(profile.followers) }
  if (profile.following !== undefined) { sets.push('following = ?'); values.push(profile.following) }
  if (profile.is_business !== undefined) { sets.push('is_business = ?'); values.push(profile.is_business ? 1 : 0) }
  if (profile.fullname !== undefined) { sets.push('fullname = ?'); values.push(profile.fullname) }

  values.push(username)

  db.prepare(`UPDATE influencers SET ${sets.join(', ')} WHERE username = ?`).run(...values)
}

export function getInfluencer(username: string) {
  const db = getDb()
  return db.prepare('SELECT * FROM influencers WHERE username = ?').get(username)
}
