# 썸네일 템플릿 라이브러리 설계

**날짜:** 2026-04-15  
**범위:** `/admin/thumbnail` 에디터를 BuilderState 기반 통합 템플릿 라이브러리로 개편

---

## 배경 및 목표

현재 `/admin/thumbnail`은 CSS 변수 기반의 36개 고정 템플릿을 편집하는 에디터다.
`/admin/thumbnail/builder`는 레이아웃 토큰 + 이펙트 토큰 기반의 새 방식으로 썸네일을 생성한다.

두 시스템의 데이터 포맷이 달라 장기적으로 유지가 어렵다.
이번 개편은 다음을 목표로 한다:

1. `/admin/thumbnail`을 BuilderState 기반 템플릿 라이브러리로 전환
2. LLM(텍스트 또는 이미지)으로 템플릿 초안 생성 기능 추가
3. 빌더 결과를 템플릿으로 저장하는 연결 고리 추가
4. 기존 CSS 변수 템플릿은 legacy로 유지하며 점진적 마이그레이션

---

## 아키텍처 개요

### 레이아웃 구조 (4패널, 기존 유지)

```
┌──────────────────────────────────────────────────────────────────┐
│ Toolbar: [Admin] [LLM 초안 생성 ▼] [갤러리] [새 썸네일 만들기]  │
├────────────┬──────────────────┬─────────────┬────────────────────┤
│ 좌측       │ 중앙 (교체)      │ 미리보기    │ 앱 컨텍스트        │
│ 템플릿     │ ─ Layout 토큰    │ iframe      │ (기존 유지)        │
│ 브라우저   │ ─ Effect 토큰    │ 480×480     │                    │
│ (기존 유지)│ ─ 폰트/색상      │             │                    │
│            │ ─ 텍스트 필드    │             │                    │
└────────────┴──────────────────┴─────────────┴────────────────────┘
```

변경 범위:
- 중앙 패널: CSS 변수 컨트롤 → BuilderState 컨트롤로 교체
- 미리보기 API: `/api/thumbnail/preview` → `/api/thumbnail/builder/preview` 전환
- 기존 36개 템플릿: `source: 'legacy'` 태그 추가, 신규와 병존

---

## 데이터 모델

### 템플릿 설정 (`thumbnail/configs/{id}.json`)

기존 CSS 변수 딕셔너리 대신 BuilderState 구조로 저장:

```typescript
interface TemplateConfig {
  layoutTokenId: string    // 'bottom-text-stack'
  effectTokenId: string    // 'overlay-dark'
  fontFamily: string       // 'BlackHan'
  accentColor: string      // '#FF6B9D'
  panelColor: string       // '#1A1A2E'
  texts: {
    ko: { headline: string; subheadline: string; price: string; brandKo: string; brandEn: string }
    en?: { headline: string; subheadline: string; price: string; brandKo: string; brandEn: string }
    ja?: { headline: string; subheadline: string; price: string; brandKo: string; brandEn: string }
    zh?: { headline: string; subheadline: string; price: string; brandKo: string; brandEn: string }
  }
}
```

### 템플릿 메타 (`thumbnail/template-registry.json` 확장)

기존 필드에 다음을 추가:

```typescript
interface TemplateEntry {
  id: string
  nameKo: string
  name: string
  source: 'llm-text' | 'llm-image' | 'builder' | 'legacy'  // 생성 경로
  layoutTokenId?: string   // 카드 미리보기용 (legacy는 없을 수 있음)
  effectTokenId?: string
  accentColor: string      // 대표색 (기존 color 필드 대체)
  createdAt: string
  // 기존 필드 (legacy 호환)
  layout?: string
  tone?: string
  priceStyle?: string
  requiresCutout?: boolean
}
```

기존 36개 템플릿: `source: 'legacy'` 추가, 나머지 기존 필드 유지.

---

## LLM 초안 생성

### 진입점

툴바 "LLM 초안 생성 ▼" 드롭다운:
- 텍스트로 생성
- 이미지로 생성

### A. 텍스트 → 초안

```
모달: 텍스트 입력 ("프리미엄 다크, 울쎄라 시술")
  ↓
POST /api/thumbnail/templates/draft/text
  ↓
Gemini: layoutTokenId, effectTokenId, fontFamily, accentColor,
        panelColor, templateNameKo, texts.ko, reason 생성
  ↓
중앙 에디터에 결과 채워짐 (미저장 상태)
  ↓
사용자 수정 후 저장
```

### B. 이미지 → 초안

```
모달: 레퍼런스 이미지 업로드 (경쟁사 광고, 무드보드 등)
  ↓
POST /api/thumbnail/templates/draft/image
  ↓
Gemini Vision: 이미지 분석 → 동일 출력 구조
  ↓
중앙 에디터에 결과 채워짐
```

### Gemini 출력 스키마 (두 플로우 공통)

```typescript
{
  layoutTokenId: string
  effectTokenId: string
  fontFamily: string
  accentColor: string
  panelColor: string
  templateNameKo: string
  texts: {
    ko: { headline, subheadline, price, brandKo, brandEn }
  }
  reason: string  // UI에 간단히 표시
}
```

### 빌더 Step 5 연결

Step 5에 "템플릿으로 저장" 버튼 추가:

```
버튼 클릭 → 인라인 이름 입력 (기본값: 헤드라인 텍스트)
  ↓
POST /api/thumbnail/templates { source: 'builder', ...BuilderState }
  ↓
/admin/thumbnail 으로 이동, 방금 저장된 템플릿 선택 상태
```

---

## 중앙 플랫 에디터

기존 CSS 변수 슬라이더/색상피커 패널을 BuilderState 컨트롤로 교체.

### UI 구조

```
┌─────────────────────────────────────┐
│ 언어 탭: KO | EN | JA | ZH  [번역] │
├─────────────────────────────────────┤
│ ▼ 레이아웃 (5종 카드 그리드)        │
│  [bottom-text] [left-text] ...      │
├─────────────────────────────────────┤
│ ▼ 이펙트 (5종 카드 그리드)          │
│  [overlay-dark] [split-light] ...   │
├─────────────────────────────────────┤
│ ▼ 스타일                            │
│  폰트      [BlackHan ▼]             │
│  포인트색  [●] #FF6B9D              │
│  패널색    [●] #1A1A2E              │
├─────────────────────────────────────┤
│ ▼ 텍스트                            │
│  헤드라인  [____________]           │
│  서브      [____________]           │
│  가격      [____________]           │
│  브랜드KO  [____________]           │
│  브랜드EN  [____________]           │
├─────────────────────────────────────┤
│ [템플릿 이름: ________]  [저장]     │
└─────────────────────────────────────┘
```

### 컴포넌트 재사용

- 레이아웃/이펙트 카드: 빌더 `Step2LayoutSuggest`, `Step3EffectSelect` 컴포넌트 재사용
- 미리보기: `/api/thumbnail/builder/preview` 엔드포인트 재사용 (composeHtml)
- 번역: `/api/thumbnail/builder/generate-text` 재사용

### Legacy 템플릿 처리

Legacy 템플릿 선택 시 중앙 패널 상단에 배너 표시:

```
⚠️ 이 템플릿은 구형 포맷입니다. 새 포맷으로 변환하시겠습니까? [변환]
```

변환 클릭 시: 기존 CSS 변수에서 가장 가까운 layoutTokenId/effectTokenId를 매핑하여 새 포맷으로 전환 후 저장.

---

## 신규 API

| 메서드 | 경로 | 역할 |
|--------|------|------|
| `POST` | `/api/thumbnail/templates/draft/text` | 텍스트 → BuilderState 초안 |
| `POST` | `/api/thumbnail/templates/draft/image` | 이미지 → BuilderState 초안 |
| `POST` | `/api/thumbnail/templates` | 템플릿 저장 (신규) |
| `PUT` | `/api/thumbnail/templates/[id]` | 템플릿 수정 저장 |

기존 API 유지:
- `GET /api/thumbnail/config/[id]`: 새 포맷도 읽을 수 있게 확장
- `POST /api/thumbnail/config/[id]`: 새 포맷으로 저장하도록 변경
- `GET /api/thumbnail/registry`: 기존 유지

---

## 구현 순서

1. 데이터 모델 확정 — TemplateConfig 타입, registry 확장
2. 신규 API 4개 구현
3. 중앙 플랫 에디터 컴포넌트 작성 (빌더 컴포넌트 재조합)
4. `/admin/thumbnail/page.tsx` 중앙 패널 교체
5. 미리보기 API 전환
6. LLM 초안 생성 모달 구현
7. 빌더 Step 5에 "템플릿으로 저장" 버튼 추가
8. Legacy 변환 배너 구현

---

## 마이그레이션 전략

- 기존 36개 템플릿: `source: 'legacy'` 태그만 추가, 기존 동작 유지
- 신규 템플릿: 새 포맷으로 저장
- Legacy → 신규 변환: 사용자가 직접 요청 시 또는 편집 저장 시 자동 변환
- CSS 변수 기반 미리보기 API: 신규 전환 후 deprecated, legacy용으로만 유지
