# Mix Split Viewer 설계

**Date:** 2026-04-15  
**Status:** Approved

---

## 목표

승인된 mix 이미지의 레이어 분리 결과(텍스트 레이어 / 스타일 레이어 / 디자인 토큰)를 UI에서 확인. split 실행은 CLI 유지.

---

## 전체 흐름

```
[1] npm run thumbnail:split:mixed   CLI로 레이어 분리 실행
        ↓
[2] /admin/thumbnail/vocab → [Mix] 탭
    → 카드에 "분리됨" 뱃지 표시 (splitDone: true)
    → 카드 클릭 → MixModal 열림
    → 원본 / 텍스트 레이어 / 스타일 레이어 3장 비교
    → 디자인 토큰 표시
    → split 미완료 시: 레이어 자리 blank + CLI 안내 문구
```

---

## 1. mix-list API 변경

**파일:** `app/api/thumbnail/mix-list/route.ts`

`MixItem`에 `splitDone` 필드 추가:

```typescript
interface MixItem {
  filename: string
  approved: boolean
  sourceDiversity: string
  splitDone: boolean        // 신규
}
```

`splitDone` 판단: `thumbnail/references-layers/mixed/{stem}-text.webp` 존재 여부

```typescript
import { PATHS } from '@/lib/thumbnail'

const splitDone = fs.existsSync(
  path.join(PATHS.referencesLayers ?? path.join(THUMBNAIL_BASE, 'references-layers'), 'mixed', `${stem}-text.webp`)
)
```

실제로는 `path.join(THUMBNAIL_BASE, 'references-layers/mixed', stem + '-text.webp')` 직접 사용.

---

## 2. asset 라우트 확장

**파일:** `app/api/thumbnail/asset/[...slug]/route.ts`

`ALLOWED_BASES`에 두 항목 추가:

```typescript
'references-layers': path.join(THUMBNAIL_BASE, 'references-layers'),
'generated-tokens':  path.join(THUMBNAIL_BASE, 'templates/generated'),
```

접근 URL:
- `/api/thumbnail/asset/references-layers/mixed/mix-001-text.webp`
- `/api/thumbnail/asset/references-layers/mixed/mix-001-style.webp`
- `/api/thumbnail/asset/generated-tokens/mixed/mix-001.json`

---

## 3. MixModal 컴포넌트

**파일:** `app/admin/thumbnail/vocab/page.tsx`

### 열기 트리거
- Mix 탭 카드 클릭 → `selectedMix` state 설정 → 모달 표시
- 승인 여부 무관하게 모든 카드 클릭 가능

### 레이아웃

```
┌─────────────────────────────────────────────┐
│  mix-001  [분리됨 뱃지]                 [✕]  │
├──────────────┬──────────────┬──────────────┤
│    원본       │  텍스트 레이어  │  스타일 레이어  │
│   [image]    │ [img/blank]  │ [img/blank]  │
│   항상 있음   │ splitDone 시 │ splitDone 시 │
├──────────────┴──────────────┴──────────────┤
│  디자인 토큰 섹션                             │
│  splitDone: 토큰 fetch 후 표시              │
│  미완료: "npm run thumbnail:split:mixed     │
│           실행 후 확인 가능합니다"             │
└─────────────────────────────────────────────┘
```

### 토큰 표시 항목 (mix-001.json에서)
- `styleLayer`: layoutType, bgType, overlayType, primaryColor, accentColor, effectTokens, modelPresent, modelPosition
- `textLayer`: elements 목록 (type, position, sizeClass, color)

### 카드 변경
- `splitDone: true` 이면 카드 하단에 `분리됨` 뱃지 추가

---

## 변경 파일 목록

| 파일 | 변경 유형 |
|------|---------|
| `app/api/thumbnail/mix-list/route.ts` | 수정 — `splitDone` 필드 추가 |
| `app/api/thumbnail/asset/[...slug]/route.ts` | 수정 — `references-layers`, `generated-tokens` 베이스 추가 |
| `app/admin/thumbnail/vocab/page.tsx` | 수정 — `MixModal` 컴포넌트 추가, 카드에 뱃지 + 클릭 핸들러 |

---

## 제약 사항

- split 실행은 CLI 전용 (`npm run thumbnail:split:mixed`) — UI 트리거 없음
- 모달에서 레이어 이미지 없으면 blank 표시 (에러 상태 없음)
- 토큰 JSON fetch는 모달 열릴 때 on-demand (mix-list에 포함하지 않음)
