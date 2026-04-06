import { ApifyClient } from 'apify-client'
import { getActiveApifyKeys, updateApifyKeyBalance } from './db'

async function fetchBalance(token: string): Promise<{ currentUsage: number; monthlyLimit: number } | null> {
  try {
    const res = await fetch('https://api.apify.com/v2/users/me/limits', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      currentUsage: data.data?.current?.monthlyUsageUsd ?? 0,
      monthlyLimit: data.data?.limits?.maxMonthlyUsageUsd ?? 5,
    }
  } catch {
    return null
  }
}

async function getBestKey(): Promise<string> {
  // Try DB keys first
  const keys = getActiveApifyKeys()

  if (keys.length > 0) {
    const TEN_MINUTES = 10 * 60 * 1000
    for (const key of keys) {
      const lastChecked = key.lastChecked ? new Date(key.lastChecked).getTime() : 0
      if (Date.now() - lastChecked > TEN_MINUTES) {
        const balance = await fetchBalance(key.token)
        if (balance) {
          updateApifyKeyBalance(key.id, balance.currentUsage, balance.monthlyLimit)
          key.remaining = Math.max(0, balance.monthlyLimit - balance.currentUsage)
        }
      }
    }

    const available = keys.filter(k => (k.remaining ?? 0) > 0.5).sort((a, b) => (b.remaining ?? 0) - (a.remaining ?? 0))
    if (available.length > 0) return available[0].token
  }

  // Fallback to env var
  const envToken = process.env.APIFY_TOKEN
  if (envToken) return envToken

  throw new Error('사용 가능한 Apify API 키가 없습니다. Admin에서 키를 추가하세요.')
}

async function getClient() {
  const token = await getBestKey()
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
  const client = await getClient()
  const actorId = ACTOR_MAP[type]
  const input = buildInput(type, query, limit)

  const run = await client.actor(actorId).call({ ...input })
  const items = await client.dataset(run.defaultDatasetId).listItems()
  return items.items
}

export async function analyzeProfile(username: string) {
  const client = await getClient()

  // 1. Profile info
  const profileRun = await client.actor('apify/instagram-profile-scraper').call({
    usernames: [username.replace(/^@/, '')],
  })
  const profiles = await client.dataset(profileRun.defaultDatasetId).listItems()

  // 2. Recent posts (already collected via other means, so just get profile)
  return {
    profile: profiles.items[0] || null,
  }
}

export async function collectReels(username: string, limit: number = 20) {
  const client = await getClient()
  const run = await client.actor('apify/instagram-reel-scraper').call({
    username: [username.replace(/^@/, '')],
    resultsLimit: limit,
  })
  const items = await client.dataset(run.defaultDatasetId).listItems()
  return items.items
}

export async function collectComments(reelUrls: string[], limitPerReel: number = 100) {
  const client = await getClient()
  const run = await client.actor('apify/instagram-comment-scraper').call({
    directUrls: reelUrls,
    resultsLimit: limitPerReel,
  })
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
