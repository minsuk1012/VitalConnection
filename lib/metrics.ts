// ─── Part 1: Language Detection ──────────────────────────────────────────────

const LANG_PATTERNS: [string, RegExp][] = [
  ['ja', /[\u3040-\u309F\u30A0-\u30FF]/], // hiragana/katakana (NOT kanji alone)
  ['th', /[\u0E00-\u0E7F]/],
  ['vi', /[àáạảãăắằẳẵặâấầẩẫậèéẹẻẽêếềểễệ]/i],
  ['ko', /[\uAC00-\uD7AF]/],
  ['zh', /[\u4E00-\u9FFF]/], // CJK — ja matches first if hiragana present
]

export function detectLanguage(text: string): string {
  for (const [lang, pattern] of LANG_PATTERNS) {
    if (pattern.test(text)) return lang
  }
  return 'en'
}

export function detectLanguageDistribution(texts: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const text of texts) {
    const lang = detectLanguage(text)
    counts[lang] = (counts[lang] ?? 0) + 1
  }
  const total = texts.length
  if (total === 0) return {}
  const dist: Record<string, number> = {}
  for (const [lang, count] of Object.entries(counts)) {
    dist[lang] = count / total
  }
  return dist
}

// ─── Part 2: Keyword Score + PRESET Matching ─────────────────────────────────

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

const PRESET_TAGS = new Set([
  'kbeauty', 'kbeautyskincare', 'koreanbeauty', 'koreanskincare',
  'plasticsurgerykorea', 'koreandermatology', 'gangnamclinic', 'koreamedical',
  '韓国美容', '韓国皮膚科', '韓国整形',
  'ศัลยกรรมเกาหลี', 'คลินิกเกาหลี',
  'thẩmmỹhànquốc', 'dauhanquoc',
])

const COLLAB_SIGNALS = ['#ad', '#sponsored', '#pr', '#gifted', '#협찬', '#광고', 'paid partnership']

const KOREA_LOCATIONS = ['seoul', 'gangnam', 'korea', '서울', '강남', 'incheon', '인천']

export function computeKeywordScore(captions: string[], hashtags: string[][]): number {
  const allText = [
    ...captions,
    ...hashtags.flat(),
  ].join(' ').toLowerCase()

  let score = 0
  for (const kw of KEYWORDS_HIGH) {
    if (allText.includes(kw.toLowerCase())) score += 3
  }
  for (const kw of KEYWORDS_MEDIUM) {
    if (allText.includes(kw.toLowerCase())) score += 2
  }
  for (const kw of KEYWORDS_LOW) {
    if (allText.includes(kw.toLowerCase())) score += 1
  }
  return score
}

export function computePresetMatchRate(hashtags: string[]): number {
  if (hashtags.length === 0) return 0
  const matches = hashtags.filter(tag => PRESET_TAGS.has(tag.toLowerCase().replace('#', ''))).length
  return matches / hashtags.length
}

export function detectCollabCount(captions: string[]): number {
  let count = 0
  for (const caption of captions) {
    const lower = caption.toLowerCase()
    if (COLLAB_SIGNALS.some(signal => lower.includes(signal))) count++
  }
  return count
}

export function computeLocationRelevance(locations: string[]): number {
  if (locations.length === 0) return 0
  const matches = locations.filter(loc =>
    KOREA_LOCATIONS.some(kl => loc.toLowerCase().includes(kl))
  ).length
  return matches / locations.length
}

// ─── Part 3: Normalization Functions ─────────────────────────────────────────

export function normalizeERF(rate: number, followers: number): number {
  let benchmark: number
  if (followers < 10_000) benchmark = 5
  else if (followers < 100_000) benchmark = 3
  else if (followers < 1_000_000) benchmark = 1.5
  else benchmark = 1
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
  else if (detectedLang === 'zh') score += 40
  score += locationRelevance * 40
  return Math.min(100, score)
}

function normalizeActivity(postsPerWeek: number, daysSinceLastPost: number): number {
  const frequencyScore = Math.min(50, postsPerWeek * 20)
  let recencyBonus = 0
  if (daysSinceLastPost <= 7) recencyBonus = 50
  else if (daysSinceLastPost <= 14) recencyBonus = 30
  else if (daysSinceLastPost <= 30) recencyBonus = 15
  return frequencyScore + recencyBonus
}

// ─── Part 4: MetricsInput / MetricsOutput + computeAllMetrics ────────────────

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
  hashtags: string[][]
  allHashtags: string[]
  locations: string[]
  postTimestamps: string[]
  engagements: number[]
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
  const {
    avgLikes, avgComments, followers, following,
    bio, externalUrl, isBusiness, isVerified,
    captions, hashtags, allHashtags, locations,
    postTimestamps, engagements,
  } = input

  // 1. Engagement rate
  const engagementRate = followers > 0
    ? (avgLikes + avgComments) / followers * 100
    : 0

  // 2. Comment-like ratio
  const commentLikeRatio = avgLikes > 0 ? avgComments / avgLikes : 0

  // 3. Follower-following ratio
  const followerFollowingRatio = following > 0 ? followers / following : 999

  // 4. Posting frequency (posts per week)
  let postingFrequency = 0
  let lastPostDate = ''
  if (postTimestamps.length > 0) {
    const sorted = [...postTimestamps].sort()
    lastPostDate = sorted[sorted.length - 1]
    const oldest = new Date(sorted[0]).getTime()
    const newest = new Date(sorted[sorted.length - 1]).getTime()
    const weeks = (newest - oldest) / (1000 * 60 * 60 * 24 * 7)
    postingFrequency = weeks > 0 ? postTimestamps.length / weeks : postTimestamps.length
  }

  // 5. lastPostDate already set above

  // 6. Consistency (stddev of engagements)
  let consistency = 0
  if (engagements.length >= 2) {
    const avg = engagements.reduce((a, b) => a + b, 0) / engagements.length
    const variance = engagements.reduce((sum, e) => sum + (e - avg) ** 2, 0) / engagements.length
    const stddev = Math.sqrt(variance)
    consistency = avg > 0 ? Math.max(0, 1 - stddev / avg) : 0
  }

  // 7. Detected language from captions + bio
  const detectedLanguage = detectLanguage([...captions, bio].join(' '))

  // 8. Content relevance
  const keywordScore = computeKeywordScore(captions, hashtags)
  const presetMatchRate = computePresetMatchRate(allHashtags)
  const contentRelevance = normalizeRelevance(keywordScore, presetMatchRate)

  // 9. Bio score
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(bio)
  const bioScore = (bio ? 1 : 0) + (externalUrl ? 1 : 0) + (hasEmail ? 1 : 0) + (isBusiness ? 1 : 0)

  // 10. Location relevance
  const locationRelevance = computeLocationRelevance(locations)

  // 11. Days since last post
  let daysSinceLastPost = 999
  if (lastPostDate) {
    const last = new Date(lastPostDate).getTime()
    const now = Date.now()
    daysSinceLastPost = Math.max(0, (now - last) / (1000 * 60 * 60 * 24))
  }

  // Fit score components
  const nERF = normalizeERF(engagementRate, followers)
  const nFFR = normalizeFFR(followerFollowingRatio)
  const nCLR = normalizeCLR(commentLikeRatio)
  const nRelevance = contentRelevance
  const nMarketFit = normalizeMarketFit(detectedLanguage, locationRelevance)
  const nActivity = normalizeActivity(postingFrequency, daysSinceLastPost)

  const trustScore = nFFR * 0.4 + (bioScore / 4 * 100) * 0.4 + (isVerified ? 100 : 0) * 0.2
  const qualityScore = nCLR * 0.6 + (consistency * 100) * 0.4

  const fitScore = Math.round(
    nERF * 0.25
    + nRelevance * 0.25
    + nMarketFit * 0.20
    + trustScore * 0.15
    + qualityScore * 0.10
    + nActivity * 0.05
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
