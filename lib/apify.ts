import { ApifyClient } from 'apify-client'
import { getSelectedApifyKey, getActiveApifyKeys, updateApifyKeyBalance } from './db'

// 키 우선순위: 설정에서 선택한 키 → 나머지 활성 키 → .env.local 폴백
function getKeyOrder(excludeTokens: string[] = []): string[] {
  const tokens: string[] = []

  // 1. 선택된 키
  const selected = getSelectedApifyKey()
  if (selected && !excludeTokens.includes(selected.token)) {
    tokens.push(selected.token)
  }

  // 2. 나머지 활성 키
  const others = getActiveApifyKeys().filter(k => k.token !== selected?.token && !excludeTokens.includes(k.token))
  tokens.push(...others.map(k => k.token))

  // 3. .env.local 폴백
  const envToken = process.env.APIFY_TOKEN
  if (envToken && !excludeTokens.includes(envToken) && !tokens.includes(envToken)) {
    tokens.push(envToken)
  }

  return tokens
}

// Actor 호출: 선택된 키 사용 → 에러 시 자동 스위칭
async function runWithFallback<T>(fn: (client: ApifyClient) => Promise<T>): Promise<T> {
  const triedTokens: string[] = []

  while (true) {
    const tokens = getKeyOrder(triedTokens)
    if (tokens.length === 0) {
      throw new Error('사용 가능한 API 키가 없습니다. 설정에서 키를 확인하세요.')
    }

    const token = tokens[0]
    const client = new ApifyClient({ token })

    try {
      return await fn(client)
    } catch (error: any) {
      const msg = error?.message?.toLowerCase() ?? ''
      const isLimitError = msg.includes('limit') || msg.includes('usage') || msg.includes('exceeded') || msg.includes('402') || error?.statusCode === 402

      if (isLimitError) {
        // 해당 키 잔액 0으로 마킹 (DB 키인 경우)
        const keys = getActiveApifyKeys()
        const exhausted = keys.find(k => k.token === token)
        if (exhausted) {
          updateApifyKeyBalance(exhausted.id, exhausted.monthlyLimit, exhausted.monthlyLimit)
        }
        triedTokens.push(token)
        continue
      }

      throw error
    }
  }
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
  const actorId = ACTOR_MAP[type]
  const input = buildInput(type, query, limit)

  return runWithFallback(async (client) => {
    const run = await client.actor(actorId).call({ ...input })
    const items = await client.dataset(run.defaultDatasetId).listItems()
    return items.items
  })
}

export async function analyzeProfile(username: string) {
  return runWithFallback(async (client) => {
    const profileRun = await client.actor('apify/instagram-profile-scraper').call({
      usernames: [username.replace(/^@/, '')],
    })
    const profiles = await client.dataset(profileRun.defaultDatasetId).listItems()
    return { profile: profiles.items[0] || null }
  })
}

export async function collectReels(username: string, limit: number = 20) {
  return runWithFallback(async (client) => {
    const run = await client.actor('apify/instagram-reel-scraper').call({
      username: [username.replace(/^@/, '')],
      resultsLimit: limit,
    })
    const items = await client.dataset(run.defaultDatasetId).listItems()
    return items.items
  })
}

export async function collectComments(reelUrls: string[], limitPerReel: number = 100) {
  return runWithFallback(async (client) => {
    const run = await client.actor('apify/instagram-comment-scraper').call({
      directUrls: reelUrls,
      resultsLimit: limitPerReel,
    })
    const items = await client.dataset(run.defaultDatasetId).listItems()
    return items.items
  })
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
