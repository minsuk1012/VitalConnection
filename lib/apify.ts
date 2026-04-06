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

export async function analyzeProfile(username: string) {
  const client = getClient()

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
