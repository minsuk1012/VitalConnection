# Thumbnail Builder — Step-by-Step Flow 설계 스펙

**날짜:** 2026-04-14  
**범위:** 기존 `/admin/thumbnail` 에디터와 공존하는 새 빌더 플로우  
**출력 언어:** 한국어·영어·일본어·중국어 썸네일 자동 생성

---

## 1. 개요

기존 에디터는 "템플릿 선택 → 텍스트 미세조정" 단일 플로우다.  
새 빌더는 썸네일 구성 요소를 **5개 원자 단위**로 쪼개고, 순서대로 쌓아가되 자유롭게 오가며 조립한다.  
Gemini API가 이미지를 분석해 텍스트 레이아웃을 추천하고, 4개 언어 텍스트 초안을 생성한다.

---

## 2. 원자 단위 (Atomic Units)

| 단위 | 역할 | 예시 |
|------|------|------|
| **ImageUnit** | AI 이미지 선택 | 아키타입(dewy-glow 등) + 변형 번호, 누끼/전체 타입 |
| **TextLayoutUnit** | 텍스트 위치·계층 | 좌측 하단, Playfair, 94% 적합 |
| **EffectUnit** | 시각적 처리 | 다크 오버레이, 원형 프레임, 스플릿 |
| **TextContentUnit** | 다국어 텍스트 | headline/sub/price/brand × ko·en·ja·zh |
| **StyleUnit** | 폰트·컬러 | Black Han Sans, accent #FF6B9D |

---

## 3. 5단계 플로우

### Step 1 — 이미지 선택

사용자 선택 순서: **이미지 타입** → **아키타입** → **변형**

```
ImageType:  'full' | 'cutout'
Archetype:  'dewy-glow' | 'clear-tone' | 'vline-sharp' | 'lip-gloss' | 'bold-eye' | 'body-line' | 'cutout-full' | 'cutout-half'
Variant:    1 | 2 | 3
```

- `cutout` 타입 선택 시 `requiresCutout: true` 템플릿만 이후 단계에서 노출
- 선택 즉시 우측 미리보기 업데이트

### Step 2 — Gemini 텍스트 레이아웃 추천

**입력:** 선택된 이미지 + 기존 템플릿 메타데이터 목록 (template-registry.json)

**Gemini 프롬프트 구조:**
```
이미지를 분석하여 아래 템플릿 목록 중 가장 잘 어울리는 3개를 추천하라.
- 모델의 시선 방향, 여백 위치, 피사체 구도를 고려
- 각 추천에 대해: templateId, confidence(0-100), reason(한국어 1문장), 권장 폰트 패밀리, 텍스트 위치를 반환
- JSON 형식으로 반환

템플릿 목록: [{ id, layout, tone, description }, ...]
```

**출력:** `LayoutSuggestion[]` — 기존 템플릿에 즉시 입혀서 GUI 미리보기 표시

```typescript
interface LayoutSuggestion {
  templateId: string      // 기존 template-registry.json의 id
  confidence: number      // 0-100
  reason: string          // 한국어 추천 이유
  fontFamily: string      // 권장 폰트
  textPosition: {
    x: 'left' | 'center' | 'right'
    y: 'top' | 'center' | 'bottom'
  }
}
```

- **재시도 버튼:** 동일 입력으로 Gemini 재호출 → 다른 추천 3종 반환
- 우측 패널에 추천 3종을 썸네일 미리보기로 동시 표시, 클릭으로 선택

### Step 3 — 효과/스타일 선택

기존 템플릿의 `layout` 필드 기준으로 카테고리 분류:

| 카테고리 | layout 값 | 예시 템플릿 |
|---------|-----------|------------|
| 오버레이 | `full-overlay`, `gradient-bg` | 다크 오버레이, 그라디언트 |
| 프레임 | `frame` | 원형 프레임, 아치, 카드 |
| 스플릿 | `split`, `diagonal` | 좌측 패널, 대각선 |
| 단색 배경 | `solid-bg` | 누끼 합성, 단색 스택 |

- Step 2에서 선택된 templateId를 기본 선택으로 프리셋
- 이 단계에서 다른 효과 선택 시 templateId 교체

### Step 4 — 텍스트 편집

**4개 언어 탭:** ko · en · ja · zh

**Gemini 텍스트 생성:**
- 입력: `시술명(ko)` + `병원명(ko)` + 대상 언어
- 출력: `{ headline, sub, price, brand }` × 4개 언어
- 재시도 가능, 수동 수정 가능

**스타일 조정:**
- 폰트 패밀리 선택 (FONT_OPTIONS 목록)
- 포인트 컬러 팔레트 (5종 + 커스텀 hex)

### Step 5 — 내보내기

- 선택된 설정 요약 표시 (이미지/레이아웃/효과/언어)
- 4개 언어 미리보기 그리드 (80px 썸네일)
- **렌더링:** 기존 `/api/thumbnail/render` 엔드포인트 재사용 × 4회 (언어별)
- 출력 경로: `thumbnail/output/renders/{timestamp}/`

---

## 4. 데이터 모델

### BuilderState (클라이언트 상태)

```typescript
interface BuilderState {
  // Step 1
  imageType:   'full' | 'cutout' | null
  archetype:   string | null           // archetypes.json id
  variantIdx:  number | null

  // Step 2
  suggestions: LayoutSuggestion[]

  // Step 3 (Step 2 선택을 기본값으로, 교체 가능)
  templateId:  string | null           // 최종 사용 templateId

  // Step 4
  texts:       Record<Lang, TextContent>
  fontFamily:  string
  accentColor: string

  // Step 5
  rendered:    boolean
}

type Lang = 'ko' | 'en' | 'ja' | 'zh'

interface TextContent {
  headline: string
  sub:      string
  price:    string
  brand:    string
}
```

---

## 5. API 설계

### 기존 재사용

| 엔드포인트 | 용도 |
|-----------|------|
| `GET /api/thumbnail/registry` | 템플릿 목록 |
| `GET /api/thumbnail/models?type=cutout\|models` | 이미지 목록 |
| `POST /api/thumbnail/render` | 최종 렌더링 |
| `GET /api/thumbnail/preview` | 실시간 미리보기 iframe |

### 신규 추가

| 엔드포인트 | 입력 | 출력 |
|-----------|------|------|
| `POST /api/thumbnail/builder/analyze` | `{ imageUrl, templates[] }` | `LayoutSuggestion[]` |
| `POST /api/thumbnail/builder/generate-text` | `{ procedure, brand, langs[] }` | `Record<Lang, TextContent>` |

---

## 6. 라우팅

```
/admin/thumbnail          — 기존 에디터 (유지)
/admin/thumbnail/builder  — 새 Step-by-Step 빌더 (신규)
/admin/thumbnail/gallery  — 이미지 갤러리 (공유)
```

기존 에디터 페이지에 "처음부터 만들기" 버튼 추가 → `/admin/thumbnail/builder`로 이동

---

## 7. 파일 구조 (신규 생성 대상)

```
app/
  admin/thumbnail/
    builder/
      page.tsx               — 빌더 메인 페이지 (BuilderState 관리)
      _components/
        StepSidebar.tsx      — 5단계 사이드바 네비게이션
        PreviewPane.tsx      — 우측 실시간 미리보기
        Step1ImageSelect.tsx
        Step2LayoutSuggest.tsx
        Step3EffectSelect.tsx
        Step4TextEdit.tsx
        Step5Export.tsx

app/api/thumbnail/builder/
  analyze/route.ts           — Gemini 이미지 분석 API
  generate-text/route.ts     — Gemini 텍스트 생성 API
```

---

## 8. 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| 기존 에디터 | 공존 유지 | 빠른 편집 시나리오 커버 |
| 스텝 내비게이션 | 자유 탐색 (B) | 이미 진입한 단계는 언제든 수정 |
| Gemini 추천 결과 | 기존 템플릿 매핑 + 파라미터 생성 | 기존 렌더 파이프라인 재사용 |
| 재시도 | Gemini analyze 재호출 | 동일 입력, 다른 추천 3종 반환 |
| 최종 출력 | Gemini 초안 → 수동 수정 → 렌더 | 언어별 품질 보장 |
| 렌더링 | 기존 Puppeteer 파이프라인 재사용 | 구현 범위 최소화 |
