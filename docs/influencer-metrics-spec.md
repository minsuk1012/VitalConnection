# VitalConnect 인플루언서 지표 설계서

## 1. 데이터 소스: Apify 스크래퍼별 수집 필드

### 1-1. 게시물 수집 (hashtag/profile/location scraper)

현재 `collectFromInstagram()`으로 수집 → `insertPosts()`로 DB 저장

| Apify 반환 필드 | DB 컬럼 (posts) | 현재 저장 |
|---|---|---|
| `shortCode` | `shortcode` | O |
| `url` | `url` | O |
| `caption` | `caption` | O |
| `ownerUsername` | `owner_username` | O |
| `ownerFullName` | `owner_fullname` | O |
| `likesCount` | `likes` | O |
| `commentsCount` | `comments` | O |
| `timestamp` | `post_timestamp` | O |
| `locationName` | `location` | O |
| `hashtags` | `hashtags` (JSON array) | O |
| `type` / `productType` | `post_type` | O |
| `displayUrl` | `display_url` | O |
| `videoViewCount` | — | **X (미저장)** |
| `mentions` | — | **X (미저장)** |
| `isVideo` | — | **X (미저장)** |
| `latestComments` | — | **X (미저장)** |

### 1-2. 프로필 분석 (instagram-profile-scraper)

현재 `analyzeProfile()`로 수집 → `updateInfluencerProfile()`로 DB 저장

| Apify 반환 필드 | DB 컬럼 (influencers) | 현재 저장 |
|---|---|---|
| `biography` | `bio` | O |
| `followersCount` | `followers` | O |
| `followingCount` | `following` | O |
| `isBusinessAccount` | `is_business` | O |
| `fullName` | `fullname` | O |
| `postsCount` | — | **X (미저장)** |
| `isVerified` | — | **X (미저장)** |
| `externalUrl` | — | **X (미저장)** |
| `businessCategoryName` | — | **X (미저장)** |
| `profilePicUrl` | — | **X (미저장)** |

---

## 2. 추가 저장이 필요한 필드

구현 시 스키마 확장이 필요한 항목:

### posts 테이블
```
video_view_count  INTEGER DEFAULT 0    -- 릴스/영상 조회수
mentions          TEXT DEFAULT '[]'     -- @멘션 리스트 (JSON array)
is_video          INTEGER DEFAULT 0    -- 영상 여부
```

### influencers 테이블
```
total_posts       INTEGER DEFAULT 0    -- 프로필 전체 게시물 수
is_verified       INTEGER DEFAULT 0    -- 인증 마크
external_url      TEXT DEFAULT ''       -- 바이오 링크
category          TEXT DEFAULT ''       -- 비즈니스 카테고리
profile_pic_url   TEXT DEFAULT ''       -- 프로필 사진
fit_score         REAL DEFAULT 0       -- 복합 적합도 점수 (계산값)
engagement_rate   REAL DEFAULT 0       -- ERF (계산값)
comment_like_ratio REAL DEFAULT 0      -- 댓글/좋아요 비율 (계산값)
follower_following_ratio REAL DEFAULT 0 -- 팔로워/팔로잉 비율 (계산값)
posting_frequency REAL DEFAULT 0       -- 주당 포스팅 수 (계산값)
last_post_date    TEXT DEFAULT ''       -- 마지막 게시물 날짜
content_relevance REAL DEFAULT 0       -- 의료관광 콘텐츠 관련성 (계산값)
detected_language TEXT DEFAULT ''       -- 감지된 주요 언어
```

---

## 3. 지표 정의 및 계산 공식

### 3-1. 기본 인게이지먼트

#### ERF (Engagement Rate by Followers)
```
engagement_rate = (avg_likes + avg_comments) / followers × 100
```
- 팔로워 0이면 0 처리
- 벤치마크: 1~3% 보통, 3~6% 좋음, 6%+ 우수
- nano(1~10K)는 높고, mega(100K+)는 낮은 게 정상

#### Like Rate
```
like_rate = avg_likes / followers × 100
```

#### Comment Rate
```
comment_rate = avg_comments / followers × 100
```

### 3-2. 인게이지먼트 품질

#### Comment-to-Like Ratio (댓글 깊이)
```
comment_like_ratio = avg_comments / avg_likes
```
- 0.01~0.03 (1~3%) = 정상
- < 0.005 = 좋아요 구매 의심 (좋아요는 많은데 댓글이 거의 없음)
- > 0.05 = 매우 활발한 소통 (소규모 커뮤니티형)

#### Engagement 일관성 (변동계수)
```
consistency = MAX(0, 1 - (stddev(likes + comments) / avg(likes + comments)))
```
- 게시물별 (likes+comments)의 표준편차를 평균으로 나눈 뒤 1에서 뺌
- 1에 가까울수록 일관적, 0에 가까울수록 들쭉날쭉
- stddev > avg인 경우 0으로 클램프
- SQLite에 STDEV 없으므로 앱 레벨에�� 계산
- 게시물 1개 이하면 0 처리 (계산 불가)

#### Top vs Average Gap
```
top_gap = MAX(likes + comments) / AVG(likes + comments)
```
- 5배 이상이면 바이럴 한 건에 평균이 왜곡된 상태 → 중간값(median) 사용 권장

### 3-3. 계정 신뢰도

#### Follower/Following 비율
```
follower_following_ratio = followers / following
```
- < 1 = 맞팔 품앗이 (follow-for-follow)
- 1~5 = 일반적
- > 10 = 자연적 영향력
- following이 0이면 999로 cap

#### 바이오 완성도 점수 (0~4)
```
bio_score = (bio 존재? 1:0)
          + (external_url 존재? 1:0)
          + (bio에 이메일 패턴? 1:0)
          + (is_business? 1:0)
```

#### 계정 활동성
```
posting_frequency = 수집된 게시물 수 / (최신 게시물 ~ 가장 오래된 게시물 간 주 수)
```
- 주 2회 이상 = 활발
- 주 0.5회 미만 = 비활성
- `last_post_date`가 30일 이상 전이면 비활성 플래그

### 3-4. 콘텐츠 분석

#### 콘텐츠 타입 비율
```
reels_ratio = COUNT(post_type = 'video' OR 'reel') / COUNT(전체)
```
- 릴스 비율 높을수록 도달력 높음 (인스타그램 알고리즘 우대)

#### 캡션 평균 길이
```
avg_caption_length = AVG(LENGTH(caption))
```
- 짧은 캡션 (<50자) = 비주얼 위주
- 긴 캡션 (>200자) = 스토리텔링형/리뷰형 (의료관광에 더 적합)

#### 해시태그 다양성
```
hashtag_diversity = COUNT(DISTINCT hashtags) / SUM(hashtag 사용 횟수)
```
- 낮으면 같은 태그만 반복 (봇 또는 저품질)

### 3-5. VitalConnect 특화: 의료관광 적합도

#### 타겟 시장 언어 감지
캡션 + 바이오 텍스트에서 언어별 키워드/문자 범위 매칭:

```
언어 감지 규칙:
- 일본어: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/ (히라가나/가타카나/한자)
- 태국어: /[\u0E00-\u0E7F]/
- 베트남어: /[àáạảãăắằẳẵặâấầẩẫậèéẹẻẽêếềểễệ]/i
- 중국어: /[\u4E00-\u9FFF]/ (일본 한자와 구분 필요 — 히라가나 없이 한자만 있으면 중국어)
- 영어: 기본값
```

결과: `detected_language = 'ja' | 'th' | 'vi' | 'zh' | 'en' | 'multi'`

#### K-Beauty/의료관광 키워드 점수

캡션 + 해시태그에서 관련 키워드 출현 빈도:

```javascript
const KEYWORDS = {
  high: [  // 직접적 관련 — 가중치 3
    'plastic surgery', 'dermatology', 'clinic', 'skincare routine',
    '피부과', '성형', '시술', 'botox', 'filler', 'laser',
    '韓国美容', '韓国皮膚科', '韓国整形',
    'ศัลยกรรมเกาหลี', 'คลินิกเกาหลี',
    'thẩm mỹ hàn quốc',
  ],
  medium: [  // 간접적 관련 — 가중치 2
    'kbeauty', 'korean skincare', 'glass skin', 'beauty review',
    'gangnam', '강남', 'seoul', '서울',
    'before after', 'transformation', 'glow up',
  ],
  low: [  // 넓은 카테고리 — 가중치 1
    'beauty', 'skincare', 'makeup', 'cosmetics',
    'korea', 'travel korea', 'korea trip',
  ],
}

keyword_score = (high매칭 × 3 + medium매칭 × 2 + low매칭 × 1) / 전체 게시물 수
```

#### PRESET 해시태그 매칭률

현재 `PRESETS`(apify.ts)에 정의된 해시태그 세트와 수집 게시물의 해시태그 겹침:

```
preset_match_rate = 매칭된 해시태그 수 / 인플루언서 전체 해시태그 수
```

매칭 대상 (기존 PRESETS):
- kbeauty: `kbeauty`, `kbeautyskincare`, `koreanbeauty`, `koreanskincare`
- medical_tourism: `plasticsurgerykorea`, `koreandermatology`, `gangnamclinic`, `koreamedical`
- japan: `韓国美容`, `韓国皮膚科`, `韓国整形`
- thai: `ศัลยกรรมเกาหลี`, `คลินิกเกาหลี`
- vietnam: `thẩmmỹhànquốc`, `dauhanquoc`

#### 브랜드 협업 이력 감지
```javascript
const COLLAB_SIGNALS = ['#ad', '#sponsored', '#pr', '#gifted', '#협찬', '#광고', 'paid partnership']

has_collab_experience = 캡션에 위 시그널 1개 이상 포함된 게시물 존재 여부
collab_count = 해당 게시물 수
```

#### 위치 관련성
```
location_relevance = 게시물 location에 'seoul', 'gangnam', 'korea', '서울', '강남' 포함 비율
```

---

## 4. 복합 스코어: VitalConnect Fit Score (0~100)

각 지표를 0~100으로 정규화한 뒤 가중 합산:

### 가중치 배분

| 카테고리 | 가중치 | 구성 |
|---|---|---|
| **ERF** | 25% | engagement_rate를 벤치마크 대비 점수화 |
| **콘텐츠 관련성** | 25% | keyword_score + preset_match_rate |
| **타겟 시장 매칭** | 20% | 언어 감지 + 위치 관련성 + 포스팅 시간대 |
| **계정 신뢰도** | 15% | follower_following_ratio + bio_score + is_verified |
| **인게이지먼트 품질** | 10% | comment_like_ratio + consistency |
| **활동성** | 5% | posting_frequency + last_post_date 최신 여부 |

### 정규화 기준

```javascript
// ERF → 0~100
function normalizeERF(rate, followers) {
  // 팔로워 규모별 벤치마크 적용
  const benchmark =
    followers < 10000 ? 5.0 :    // nano: 5% 기준
    followers < 50000 ? 3.0 :    // micro: 3% 기준
    followers < 500000 ? 1.5 :   // mid: 1.5% 기준
    1.0                          // macro: 1% 기준
  return Math.min(100, (rate / benchmark) * 50)
}

// Follower/Following Ratio → 0~100
function normalizeFFR(ratio) {
  if (ratio < 0.5) return 10     // 맞팔 품앗이
  if (ratio < 1) return 30
  if (ratio < 5) return 60
  if (ratio < 20) return 90
  return 100
}

// Comment-to-Like Ratio → 0~100
function normalizeCLR(ratio) {
  if (ratio < 0.005) return 10   // 좋아요 구매 의심
  if (ratio < 0.01) return 40
  if (ratio < 0.03) return 70
  if (ratio < 0.05) return 90
  return 100                      // 매우 활발
}

// 콘텐츠 관련성 → 0~100
function normalizeRelevance(keywordScore, presetMatchRate) {
  return Math.min(100, keywordScore * 10 + presetMatchRate * 100)
}

// 타겟 시장 매칭 → 0~100
function normalizeMarketFit(detectedLang, locationRelevance) {
  let score = 0
  if (['ja', 'th', 'vi'].includes(detectedLang)) score += 60  // 타겟 언어
  if (detectedLang === 'zh') score += 40                       // 중국어 (부분 타겟)
  score += locationRelevance * 40                               // 한국 위치 비율
  return Math.min(100, score)
}

// 활동성 → 0~100
function normalizeActivity(postsPerWeek, daysSinceLastPost) {
  let score = Math.min(50, postsPerWeek * 20)  // 주 2.5회 이상이면 만점
  if (daysSinceLastPost < 7) score += 50
  else if (daysSinceLastPost < 30) score += 30
  else if (daysSinceLastPost < 90) score += 10
  return score
}
```

### 최종 Fit Score 계산
```javascript
// 계정 신뢰도 내부 정규화 (각 서브지표를 0~100으로 맞춘 뒤 가중합)
const trustScore =
  normalizeFFR(ffratio) * 0.4          // max 40
  + (bioScore / 4 * 100) * 0.4         // max 40 (bioScore 0~4 → 0~100)
  + (isVerified ? 100 : 0) * 0.2       // max 20

// 인게이지먼트 품질 내부 정규화
const qualityScore =
  normalizeCLR(clr) * 0.6              // max 60
  + (consistency * 100) * 0.4           // max 40 (consistency 0~1 → 0~100)

fitScore = Math.round(
  normalizeERF(er, followers) * 0.25
  + normalizeRelevance(kwScore, presetRate) * 0.25
  + normalizeMarketFit(lang, locRelevance) * 0.20
  + trustScore * 0.15
  + qualityScore * 0.10
  + normalizeActivity(freq, daysSince) * 0.05
)
```

참고: 모든 서브 컴포넌트가 0~100 범위로 정규화되어야 최종 fitScore도 0~100 범위를 유지함.

---

## 5. 구현 순서 제안

### Phase 1: 스키마 확장 + ERF 수정
1. posts 테이블에 `video_view_count`, `mentions`, `is_video` 추가
2. influencers 테이블에 새 컬럼 추가
3. `insertPosts()`에서 누락 필드 저장하도록 수정
4. `analyzeProfile()` → `updateInfluencerProfile()`에서 누락 필드 저장
5. `refreshInfluencers()`의 `avgEngagement` 계산을 ERF로 수정

### Phase 2: 개별 지표 계산
6. Comment-to-Like Ratio, Follower/Following Ratio 계산 로직
7. 포스팅 빈도, 최근 활동일 계산
8. 캡션/해시태그 기반 언어 감지
9. 키워드 점수 + PRESET 매칭률 계산

### Phase 3: Fit Score + UI
10. 복합 Fit Score 계산 함수
11. `refreshInfluencers()` 실행 시 모든 지표 + Fit Score 일괄 갱신
12. Admin UI에 지표 표시 (candidates 탭에 Fit Score 컬럼, 상세보기에 개별 지표)

### Phase 4: 심층 댓글 분석 (선별된 후보 대상)

Fit Score 기반으로 1차 선별된 후보에 대해서만 실행하는 심층 분석 단계.

#### 4-1. 데이터 수집 플로우

```
유저네임 입력
  → Step 1: instagram-reel-scraper (릴스 목록 수집)
      Input:  { username: ["target_user"], resultsLimit: 20 }
      Output: 릴스 URL, 좋아요, 댓글수, 조회수, 캡션, 최근 댓글 10개
  → Step 2: 앱에서 필터링 (조회수/좋아요/날짜 기준)
  → Step 3: instagram-comment-scraper (필터 통과한 릴스의 전체 댓글)
      Input:  { directUrls: [필터 통과 릴스 URL들], resultsLimit: 100 }
      Output: 댓글 텍스트, 유저네임, 타임스탬프, 답글
```

#### 4-2. Apify Actor 매핑

| Actor | 용도 | 비용 |
|---|---|---|
| `apify/instagram-reel-scraper` | 특정 유저의 릴스 목록 | ~$2.60 / 1,000 릴스 |
| `apify/instagram-comment-scraper` | 특정 릴스/게시물의 전체 댓글 | ~$2.30 / 1,000 댓글 |

#### 4-3. 릴스 필터 조건 (앱 레벨, Step 2)

릴스 수집 후 댓글 분석 대상을 필터링:

```javascript
// 기본 필터 (Admin UI에서 조정 가능)
const REEL_FILTERS = {
  minViews: 1000,          // 최소 조회수
  minLikes: 50,            // 최소 좋아요
  maxAgeDays: 90,          // 최근 N일 이내
  maxReelsToAnalyze: 5,    // 댓글 분석할 최대 릴스 수 (비용 제어)
}
```

Apify 자체 필터는 `resultsLimit`(개수)과 날짜 필터만 지원.
조회수/좋아요 기반 필터링은 수집 후 앱에서 처리.

#### 4-4. 댓글 분석 지표

수집된 댓글로 계산하는 지표:

| 지표 | 공식 | 의미 |
|---|---|---|
| **댓글 언어 분포** | 댓글별 언어 감지 → 언어별 비율 | 오디언스 국가 추정 (OAuth 없이 가장 현실적) |
| **댓글 품질 점수** | 1 - (이모지만 댓글 + 1단어 댓글) / 전체 댓글 | 진성 소통 비율 |
| **평균 댓글 길이** | AVG(댓글 텍스트 길이) | 길수록 관심도 높음 |
| **봇 의심 비율** | 반복 패턴 댓글 / 전체 | "🔥", "nice", "beautiful" 등 반복 |
| **질문 비율** | "?" 포함 댓글 / 전체 | 높을수록 관심/구매의도 |

#### 4-5. 댓글 언어 감지 → 오디언스 국가 추정

```javascript
// 댓글 텍스트에서 언어 감지 (3-5 섹션의 동일 regex 재사용)
// 결과 예시:
commentLanguageDistribution = {
  ja: 0.45,   // 일본어 45%
  en: 0.25,   // 영어 25%
  th: 0.15,   // 태국어 15%
  ko: 0.10,   // 한국어 10%
  other: 0.05
}
```

이 분포를 Fit Score의 "타겟 시장 매칭" 점수에 반영 가능:
- 댓글 언어 분석 결과가 있으면 → 캡션 기반 언어 감지를 **대체** (더 정확)
- 타겟 언어(ja/th/vi) 비율이 40% 이상이면 시장 매칭 점수 대폭 상승

#### 4-6. 스키마 확장

```sql
-- 릴스 테이블 (새로 생성)
CREATE TABLE reels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL REFERENCES influencers(username),
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

-- 댓글 테이블 (새로 생성)
CREATE TABLE reel_comments (
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
CREATE INDEX idx_reel_comments_reel ON reel_comments(reel_id);
CREATE INDEX idx_reel_comments_lang ON reel_comments(detected_language);

-- influencers 테이블 추가 컬럼
-- comment_lang_distribution TEXT DEFAULT '{}'  -- JSON: 댓글 언어 분포
-- comment_quality_score     REAL DEFAULT 0     -- 댓글 품질 점수
-- deep_analyzed_at          TEXT DEFAULT ''     -- 심층 분석 일시
```

#### 4-7. 구현 항목

13. `apify.ts`에 `collectReels(username, limit)`, `collectComments(reelUrls, limit)` 함수 추가
14. `lib/db.ts`에 reels, reel_comments 테이블 생성 + CRUD
15. `app/api/instagram/deep-analyze/route.ts` — 심층 분석 API 엔드포인트
    - 릴스 수집 → 필터 → 댓글 수집 → 언어 감지 → 지표 계산 → DB 저장
16. Admin UI에 "심층 분석" 버튼 추가 (후보 상세보기에서)
    - 분석 중 로딩 상태, 비용 경고 표시
    - 결과: 댓글 언어 분포 차트, 댓글 품질 점수, 샘플 댓글 목록

---

## 6. 비용 영향

Apify 무료 티어: **매월 $5 크레딧 자동 갱신** (이월 불가, 카드 불필요)

### Phase 1~3: 추가 비용 없음
- 기존 수집 데이터에서 계산만 추가
- `analyzeProfile()` 호출 시 이미 프로필 데이터 가져오고 있음 → 저장 필드만 확장
- 새 지표는 전부 **앱 레벨 계산** → API 비용 증가 없음

### Phase 4: 심층 분석 비용
- 인플루언서 1명당: 릴스 20개 수집 (~$0.05) + 상위 5개 릴스 댓글 각 100개 (~$1.15) ≈ **~$1.2/명**
- 월 $5 무료 크레딧으로 **~4명/월** 심층 분석 가능
- 선별된 후보에만 사용하므로 Phase 1~3의 Fit Score로 먼저 거른 뒤 실행
