# Admin 인스타그램 수집 기능 설계

## 개요

VitalConnection admin에 인스타그램 데이터 수집 + 조회 + 인플루언서 분석 기능을 추가한다.
Apify API를 통해 수집하고, SQLite에 저장하며, `/admin/instagram` 단일 페이지에서 3개 탭으로 운영한다.

## 요구사항

| 항목 | 결정 |
|------|------|
| 범위 | 수집 + ��과 조회 + 인플루언서 분석 |
| 저장소 | SQLite (better-sqlite3) |
| 페이지 | `/admin/instagram` 단일 페이지, 3개 탭 |
| 수집 방식 | 해시태그 / 프로필 / 위치 / 키워드 (4가지) |
| 입력 UI | 프리셋 버튼 + 자유 입력 |
| 크롤링 엔진 | Apify (토큰 서버 환경변수) |
| 인증 | ��존 admin 쿠키 인증 (`admin_session`) |

## 아키텍처

```
[브라우저 /admin/instagram]
    ���
    ├─ 수집 탭 → POST /api/instagram/collect
    │                  ├─ Apify Actor 호출
    │                  └─ 결과 → SQLite 저장
    │
    ��─ 결과 탭 → GET /api/instagram/results?page=1&tag=kbeauty
    │                  └─ SQLite 조회 (��터/정렬/��이지네이션)
    │
    └─ 인플루언서 탭 → GET /api/instagram/influencers
                       └─ 작성자별 그룹핑 + engagement 랭킹
```

## DB 스키마 (SQLite)

### collections — 수집 작업 이력

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동 증가 |
| type | TEXT | hashtag / profile / location / keyword |
| query | TEXT | 검색어 (쉼표 구분) |
| limit_per_item | INTEGER | 항목당 수집 건수 |
| status | TEXT | pending / running / completed / failed |
| total_collected | INTEGER | 실제 수집된 건수 |
| created_at | TEXT | ISO 8601 |

### posts — 수집된 게시물

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동 증가 |
| collection_id | INTEGER FK | collections.id |
| shortcode | TEXT UNIQUE | 인스타 게시물 고유 코드 |
| url | TEXT | 게시물 URL |
| caption | TEXT | 캡션 |
| owner_username | TEXT | 작성자 유저네임 |
| owner_fullname | TEXT | 작성자 이름 |
| likes | INTEGER | 좋아요 수 |
| comments | INTEGER | 댓글 수 |
| post_timestamp | TEXT | 게시물 작성 시각 |
| location | TEXT | 위치 태그 |
| hashtags | TEXT | JSON 배열 |
| post_type | TEXT | Image / Video / Sidecar |
| display_url | TEXT | 이미지 URL |
| search_tag | TEXT | 수집 시 사용된 검색어 |
| created_at | TEXT | 수집 시각 |

### influencers — 인플루언서 후보 (수집 시 자동 갱신)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| username | TEXT PK | 유저네임 |
| fullname | TEXT | 이름 |
| profile_url | TEXT | 프로필 링크 |
| post_count | INTEGER | 수집된 게시물 수 |
| avg_likes | REAL | 평균 좋아요 |
| avg_comments | REAL | 평균 댓글 |
| avg_engagement | REAL | avg_likes + avg_comments |
| hashtags | TEXT | JSON — 사용한 해시태그 목록 |
| last_updated | TEXT | 마지막 갱신 시각 |

## 탭별 기능

### 수집 탭

- **프리셋 버튼**: K-Beauty, 의료관광, 일본, 태국, 베트남
  - 클릭 시 해당 카테고리 해시태그가 입력 필드에 자동 추가
- **수집 방식 전환**: 해시태그 / 프로�� / 위치 / 키워드
  - 각각 다른 Apify Actor 호출
- **입력 필드**: 엔터로 태그 추가, ✕로 삭제
- **건수 설정**: 항목당 최대 수집 수 (기본 30)
- **예상 크레딧**: 입력 수 × 건수 기반 자동 계산
- **수집 시작 버튼**: API 호출 → 진행 상황 폴링
- **진행 상황**: 항목별 프로그레스바 (완료/수집중/대기)

### 결과 탭

- **게시물 테이블**: 캡션, 작성자, 좋아요, 댓글, 날짜, 해시태그
- **필터**: 수집 작업별, 해시태그별, 좋아요 수 범위
- **정렬**: 좋아요순, 댓글순, 최신순
- **페이지네이션**: 50건 단위
- **CSV 내보내기**

### 인플루언서 탭

- **랭킹 테이블**: engagement 높은 순 정렬
- **표시 정보**: 유저네임, 이름, 프로필 링크, 게시물 수, 평균 좋아요, 평균 댓글, engagement
- **샘플 게시물**: 상위 3개 미리보기
- **CSV 내보내기**

## Apify Actor 매핑

| 수집 방식 | Actor ID | 입력 파라미터 |
|-----------|----------|--------------|
| 해시태그 | `apify/instagram-hashtag-scraper` | `{ hashtags: [...], resultsLimit }` |
| 프로필 | `apify/instagram-scraper` | `{ usernames: [...], resultsLimit, resultsType: "posts" }` |
| 위치 | `apify/instagram-scraper` | `{ directUrls: ["https://instagram.com/explore/locations/..."], resultsLimit }` |
| 키워드 | `apify/instagram-search-scraper` | `{ search: "...", searchType: "hashtag", resultsLimit }` |

## 프리셋 정의

```typescript
const PRESETS = {
  kbeauty: ["kbeauty", "kbeautyskincare", "koreanbeauty", "koreanskincare"],
  medical_tourism: ["plasticsurgerykorea", "koreandermatology", "gangnamclinic", "koreamedical"],
  japan: ["韓国美容", "韓国皮膚科", "韓国整形"],
  thai: ["ศัลยกรรมเกาหลี", "คลินิกเกาหลี"],
  vietnam: ["thẩmmỹhànquốc", "dauhanquoc"],
}
```

## 파일 구조

```
app/admin/instagram/
  page.tsx                  — 메인 페이지 (탭 컨테이너 + 인증 체크)
  components/
    CollectTab.tsx           — ��집 탭
    ResultsTab.tsx           — 결과 탭
    InfluencerTab.tsx        — 인플루언서 탭
app/api/instagram/
  collect/route.ts           — POST: 수집 시작
  collect/status/route.ts    — GET: 수집 진행 상황 조회
  results/route.ts           — GET: 결과 조회 (필터/정렬/페이지네이션)
  results/export/route.ts    — GET: CSV 내보내기
  influencers/route.ts       — GET: 인플루언서 조회
  influencers/export/route.ts �� GET: CSV 내보내기
lib/
  db.ts                      — SQLite 초기화 + 쿼리 헬퍼
  apify.ts                   — Apify 클라이언트 래퍼 (Actor 매핑)
```

## 환경변수

```
APIFY_TOKEN=apify_api_xxxxx    # Apify API 토큰
```

## 추가 패키지

```
better-sqlite3       — SQLite 드���이버
@types/better-sqlite3 — 타입 정의
apify-client          — Apify API 클라이언트
```

## 인증

기�� `admin_session` 쿠키 기반 인증을 그대로 사용한다.
- `/admin/instagram` 페이지: 서버 컴포넌트에서 쿠키 체크 → 없으면 `/admin/login`으로 리다이렉트
- `/api/instagram/*` API: 요청 시 쿠키 검증 → 없으면 401
