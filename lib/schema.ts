import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const collections = sqliteTable('collections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  query: text('query').notNull(),
  limitPerItem: integer('limit_per_item').notNull().default(30),
  status: text('status').notNull().default('pending'),
  totalCollected: integer('total_collected').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  collectionId: integer('collection_id').notNull().references(() => collections.id),
  shortcode: text('shortcode').notNull().unique(),
  url: text('url'),
  caption: text('caption'),
  ownerUsername: text('owner_username'),
  ownerFullname: text('owner_fullname'),
  likes: integer('likes').default(0),
  comments: integer('comments').default(0),
  postTimestamp: text('post_timestamp'),
  location: text('location'),
  hashtags: text('hashtags').default('[]'),
  postType: text('post_type'),
  displayUrl: text('display_url'),
  videoViewCount: integer('video_view_count').default(0),
  mentions: text('mentions').default('[]'),
  isVideo: integer('is_video').default(0),
  searchTag: text('search_tag'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_posts_collection').on(table.collectionId),
  index('idx_posts_username').on(table.ownerUsername),
  index('idx_posts_likes').on(table.likes),
])

export const influencers = sqliteTable('influencers', {
  username: text('username').primaryKey(),
  fullname: text('fullname'),
  profileUrl: text('profile_url'),
  postCount: integer('post_count').default(0),
  avgLikes: real('avg_likes').default(0),
  avgComments: real('avg_comments').default(0),
  avgEngagement: real('avg_engagement').default(0),
  hashtags: text('hashtags').default('[]'),
  status: text('status').notNull().default('미확인'),
  memo: text('memo').default(''),
  bio: text('bio').default(''),
  followers: integer('followers').default(0),
  following: integer('following').default(0),
  isBusiness: integer('is_business').default(0),
  lastUpdated: text('last_updated').notNull().default(sql`(datetime('now'))`),
}, (table) => [
  index('idx_influencers_engagement').on(table.avgEngagement),
])
