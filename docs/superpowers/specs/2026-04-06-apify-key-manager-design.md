# Apify API 키 매니저 설계서

## 목적
여러 Apify 무료 계정($5/월)의 API 키를 등록하고, 잔액 기반으로 자동 선택하여 무료 크레딧을 극대화한다.

## 스키마

```sql
CREATE TABLE apify_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,           -- 관리자가 지정하는 이름 (예: "계정1")
  monthly_limit REAL DEFAULT 5.0,
  current_usage REAL DEFAULT 0,
  remaining REAL DEFAULT 5.0,
  is_active INTEGER DEFAULT 1,  -- 비활성화 가능
  last_checked TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 핵심 로직: getBestKey()

```
1. DB에서 is_active=1인 키 전체 조회
2. 각 키의 last_checked가 10분 이상 경과했으면:
   - GET /v2/users/me/limits (해당 키의 토큰으로)
   - remaining = monthly_limit - current_usage 갱신
   - last_checked 갱신
3. remaining > $0.50인 키만 필터
4. remaining 내림차순 정렬 → 첫 번째 키 반환
5. 사용 가능한 키 없으면 → .env.local의 APIFY_TOKEN fallback
6. fallback도 없으면 → 에러
```

## getClient() 수정

기존:
```typescript
function getClient() {
  const token = process.env.APIFY_TOKEN
  return new ApifyClient({ token })
}
```

변경:
```typescript
async function getClient() {
  const token = await getBestKey()  // DB 우선, fallback env
  return new ApifyClient({ token })
}
```

**영향:** getClient()가 async로 바뀜 → collectFromInstagram, analyzeProfile, collectReels, collectComments 모두 이미 async이므로 `await getClient()` 변경만 필요.

## API 엔드포인트

| Method | Path | 기능 |
|---|---|---|
| GET | `/api/admin/apify-keys` | 키 목록 + 잔액 (토큰은 마스킹) |
| POST | `/api/admin/apify-keys` | 키 추가 (토큰 유효성 검증 포함) |
| DELETE | `/api/admin/apify-keys` | 키 삭제 (body: { id }) |
| POST | `/api/admin/apify-keys/refresh` | 전체 키 잔액 새로고침 |

### 키 추가 시 유효성 검증

```
POST body: { token: "apify_api_xxx", label: "계정1" }

1. GET /v2/users/me/limits (해당 토큰으로)
2. 성공 → monthly_limit, current_usage 저장
3. 실패 (401) → "유효하지 않은 토큰" 에러 반환
```

### 토큰 마스킹

DB에는 원본 저장. API 응답에서만 마스킹:
```
apify_api_abcdef123456 → apify_api_***456
```

## Admin UI

`/admin/instagram` 페이지 내 또는 별도 `/admin/settings` — 카드 컴포넌트:

```
┌─ Apify API 키 관리 ─────────────────────────────┐
│                                                  │
│  계정1 (***aaa)    $4.97 / $5.00  ████████░░  │
│  계정2 (***bbb)    $3.20 / $5.00  ██████░░░░  │  [삭제]
│  계정3 (***ccc)    $5.00 / $5.00  ██████████  │  [삭제]
│                                                  │
│  총 잔액: $13.17 / $15.00                        │
│                                                  │
│  [토큰 입력...]  [라벨 입력...]  [추가]           │
│                                    [잔액 새로고침] │
└──────────────────────────────────────────────────┘
```

- 잔액 바: remaining / monthly_limit 비율로 프로그레스 바
- $1 이하: 빨강, $1~3: 노랑, $3+: 초록
- 현재 자동 선택된 키 표시 (별 또는 하이라이트)
- 심층 분석 confirm 메시지에 실시간 잔액 표시

## 파일 구조

| 파일 | 변경 |
|---|---|
| `lib/schema.ts` | apifyKeys 테이블 추가 |
| `lib/db.ts` | CREATE TABLE + CRUD (addApifyKey, getApifyKeys, deleteApifyKey, updateKeyBalance) |
| `lib/apify.ts` | getClient() async 변경 + getBestKey() 추가 |
| `app/api/admin/apify-keys/route.ts` | 신규: GET/POST |
| `app/api/admin/apify-keys/refresh/route.ts` | 신규: POST (잔액 새로고침) |
| `app/admin/instagram/components/ApifyKeyManager.tsx` | 신규: 키 관리 UI |
| `app/admin/instagram/candidates/page.tsx` 또는 레이아웃 | ApifyKeyManager 배치 |

## 기존 .env.local APIFY_TOKEN 호환

- DB에 키가 0개이면 → .env.local의 APIFY_TOKEN 사용 (기존 동작 유지)
- DB에 키가 1개 이상이면 → DB 키 우선 사용
- .env.local 키를 Admin UI에서 "가져오기" 가능 (옵션)
