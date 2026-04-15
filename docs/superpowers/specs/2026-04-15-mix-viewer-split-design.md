# Mix Viewer + Layer Split 설계

**Date:** 2026-04-15  
**Status:** Approved

---

## 목표

생성된 mix 이미지를 UI에서 확인하고, 마음에 드는 것을 승인 표시한 뒤 CLI로 텍스트 레이어 + 모델 레이어로 분리하는 워크플로 구축.

---

## 전체 흐름

```
[1] npm run thumbnail:mix         mix 이미지 생성
        ↓
[2] /admin/thumbnail/vocab        Mix 탭에서 이미지 확인
    → 마음에 드는 것 [승인] 버튼 클릭
    → POST /api/thumbnail/approve-mix
    → mixed/mix-001.webp → mixed/approved/mix-001.webp 이동
        ↓
[3] npm run thumbnail:split:mixed  CLI로 레이어 분리
    → references-layers/mixed/mix-001-text.webp
    → references-layers/mixed/mix-001-style.webp
```

---

## 1. vocab 페이지 — Mix 탭

**파일:** `app/admin/thumbnail/vocab/page.tsx`

### 탭 구조
현재 단일 뷰를 탭으로 변환:
- **[레퍼런스]** 탭 — 기존 레퍼런스 카드 갤러리 (변경 없음)
- **[Mix]** 탭 — 신규 mix 이미지 뷰어

### Mix 탭 카드
각 카드 표시 내용:
- mix 이미지 (`/api/thumbnail/asset/mixed/{filename}`)
- 파일명 (`mix-001`)
- 소스 다양성 (`5/5 distinct sources` — recipe.json에서 읽기)
- 승인 상태 (approved/ 폴더 존재 여부로 판단)
- **[승인] 버튼** — 미승인 상태일 때 활성

### 승인 버튼 동작
```
클릭 → POST /api/thumbnail/approve-mix { filename: 'mix-001.webp' }
     → 성공 시 카드에 ✅ 표시, 버튼 비활성화
```

### 데이터 로드
- 이미지 목록: `GET /api/thumbnail/mix-list` (신규)
- 승인 상태: 응답에 `approved: boolean` 포함
- recipe: `.recipe.json` 파일에서 `sourceDiversity` 추출

---

## 2. API 라우트

### `GET /api/thumbnail/mix-list` (신규)
`thumbnail/references-transformed/mixed/` 스캔 후 반환:
```json
[
  { "filename": "mix-001.webp", "approved": false, "sourceDiversity": "5/5 distinct sources" },
  { "filename": "mix-002.webp", "approved": true,  "sourceDiversity": "3/5 distinct sources" }
]
```
- `approved`: `mixed/approved/mix-001.webp` 존재 여부
- `sourceDiversity`: `mix-001.recipe.json`의 `recipe.sourceDiversity`

**파일:** `app/api/thumbnail/mix-list/route.ts`

### `POST /api/thumbnail/approve-mix` (신규)
```
Body: { filename: string }
동작: mixed/{filename} → mixed/approved/{filename} 이동 (fs.renameSync)
응답: 200 OK | 404 파일 없음 | 400 잘못된 요청
```

**파일:** `app/api/thumbnail/approve-mix/route.ts`

---

## 3. split-layers.ts 확장

**파일:** `scripts/thumbnail/split-layers.ts`

`--mixed` 플래그 추가:
```bash
npm run thumbnail:split:mixed
# → thumbnail/references-transformed/mixed/approved/*.webp 처리
# → thumbnail/references-layers/mixed/mix-*-text.webp
# → thumbnail/references-layers/mixed/mix-*-style.webp
```

`main()` 함수에 분기 추가:
```typescript
const isMixed = process.argv.includes('--mixed');
if (isMixed) {
  // mixed/approved/ 폴더 처리
  const mixedApprovedDir = path.join(APPROVED_BASE, 'mixed', 'approved');
  // ... 기존 processFile 재사용
}
```

**`package.json` 추가:**
```json
"thumbnail:split:mixed": "tsx scripts/thumbnail/split-layers.ts --mixed"
```

---

## 변경 파일 목록

| 파일 | 변경 유형 |
|------|---------|
| `app/admin/thumbnail/vocab/page.tsx` | 수정 — 탭 추가, Mix 탭 구현 |
| `app/api/thumbnail/mix-list/route.ts` | 신규 |
| `app/api/thumbnail/approve-mix/route.ts` | 신규 |
| `scripts/thumbnail/split-layers.ts` | 수정 — `--mixed` 플래그 추가 |
| `package.json` | 수정 — `thumbnail:split:mixed` 추가 |

---

## 제약 사항

- **asset 라우트** `mixed/` 베이스는 이미 추가됨 (`references-transformed/mixed/` 서빙)
- `approved/` 하위폴더 파일은 `/api/thumbnail/asset/mixed/approved/{filename}` 으로 접근 가능
- mix 이미지 생성은 여전히 CLI(`npm run thumbnail:mix`)로만 가능 — UI에서 생성 트리거는 이 스펙 범위 밖
