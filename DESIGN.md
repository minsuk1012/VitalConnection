# Design System — VitalConnection Admin

## 1. Visual Theme & Atmosphere

VitalConnection Admin은 shadcn/ui의 neutral 테마를 기반으로 한 라이트 모드 퍼스트 어드민 대시보드입니다. 깨끗하고 밀도 높은 데이터 인터페이스를 지향하며, 불필요한 장식 없이 콘텐츠에 집중합니다. 배경은 순백(`#ffffff`)이며 카드와 서피스는 미세한 ring shadow로 구분됩니다.

**Key Characteristics:**
- 라이트 모드 기본, 순백 배경 위에 neutral 그레이 계층
- Geist Sans + Noto Sans KR 조합 (라틴/한글)
- shadcn/ui base-nova 스타일, neutral 베이스 컬러
- 장식 최소화, 데이터 밀도 우선
- oklch 기반 컬러 시스템
- 아이콘: Lucide React (최소한으로 사용)

## 2. Color Palette & Roles

### Background Surfaces
| Token | Value | Role |
|-------|-------|------|
| background | `oklch(1 0 0)` / `#ffffff` | 페이지 배경 |
| card | `oklch(1 0 0)` / `#ffffff` | 카드, 패널 배경 |
| muted | `oklch(0.97 0 0)` / `#f5f5f5` | 로그인 배경, 확장 행, 서브틀 서피스 |
| secondary | `oklch(0.97 0 0)` / `#f5f5f5` | 보조 버튼 배경, 뱃지 배경 |
| accent | `oklch(0.97 0 0)` / `#f5f5f5` | 호버 상태, 액티브 서피스 |
| sidebar | `oklch(0.985 0 0)` / `#fafafa` | 사이드바 배경 |

### Text & Content
| Token | Value | Role |
|-------|-------|------|
| foreground | `oklch(0.145 0 0)` / `#1a1a1a` | 기본 텍스트, 헤딩 |
| secondary-foreground | `oklch(0.205 0 0)` / `#333333` | 보조 텍스트 |
| muted-foreground | `oklch(0.556 0 0)` / `#737373` | 플레이스홀더, 메타 정보, 비활성 |

### Interactive
| Token | Value | Role |
|-------|-------|------|
| primary | `oklch(0.205 0 0)` / `#1a1a1a` | CTA 버튼 배경, 기본 뱃지 |
| primary-foreground | `oklch(0.985 0 0)` / `#fafafa` | CTA 버튼 텍스트 |
| destructive | `oklch(0.577 0.245 27.325)` | 에러, 삭제 액션 |
| ring | `oklch(0.708 0 0)` | 포커스 링 |

### Status Colors (Tailwind utilities)
| Color | Class | Role |
|-------|-------|------|
| Green | `text-green-600` / `bg-green-500` | 성공, 완료, 높은 점수 (>=70) |
| Yellow | `text-yellow-600` / `bg-yellow-500` | 경고, 중간 점수 (>=40) |
| Red | `text-destructive` / `bg-red-500` | 에러, 낮은 잔액 |

### Border & Divider
| Token | Value | Role |
|-------|-------|------|
| border | `oklch(0.922 0 0)` / `#e5e5e5` | 카드 테두리, 구분선 |
| input | `oklch(0.922 0 0)` / `#e5e5e5` | 입력 필드 테두리 |
| ring/10 | `foreground/10` | 카드 ring shadow |

## 3. Typography Rules

### Font Family
- **Primary**: `Geist Sans` (라틴), fallback: system-ui
- **Korean**: `Noto Sans KR` (한글 본문)
- **Monospace**: 시스템 모노스페이스 (ui-monospace)

### Hierarchy
| Role | Size | Weight | Notes |
|------|------|--------|-------|
| Page Title | text-xl (20px) | font-semibold (600) | 로그인 타이틀 |
| Section Title | text-base (16px) | font-medium (500) | 카드 헤더, 섹션 제목 |
| Card Value | text-2xl (24px) | font-bold (700) | 대시보드 수치 |
| Body | text-sm (14px) | font-normal (400) | 기본 본문, 테이블 셀 |
| Label | text-sm (14px) | font-medium (500) | 폼 라벨, 네비게이션 |
| Meta | text-xs (12px) | font-normal (400) | 타임스탬프, 부가 정보 |
| Button | text-sm (14px) | font-medium (500) | 버튼 텍스트 |

### Principles
- 한글 본문은 Noto Sans KR, 라틴은 Geist Sans 자동 폴백
- font-semibold(600)은 브랜드명과 주요 타이틀에만 사용
- font-bold(700)은 대시보드 수치 강조에만 사용
- 기본 텍스트는 text-sm (14px) — shadcn 표준

## 4. Component Stylings

### Buttons
| Variant | Style | Use |
|---------|-------|-----|
| default | `bg-primary text-primary-foreground` | CTA: 수집 시작, 로그인, 추가 |
| outline | `border-border bg-background hover:bg-muted` | 보조: CSV 내보내기, 정렬 토글 |
| ghost | `hover:bg-muted` | 삭제, 접기/펼치기 |
| destructive | `bg-destructive/10 text-destructive` | 위험 액션 |

- Height: h-8 (32px) 기본, h-7 (28px) sm, h-6 (24px) xs
- Radius: rounded-lg (10px)
- Padding: px-2.5 기본

### Cards
- Background: `bg-card` (white)
- Border: `ring-1 ring-foreground/10` (ring shadow 방식)
- Radius: `rounded-xl` (16px)
- Padding: `py-4`, content `px-4`
- Hover: 없음 (정적 카드)
- Footer: `bg-muted/50 border-t`

### Inputs
- Height: h-8 (32px)
- Background: `bg-transparent`, dark에서 `bg-input/30`
- Border: `border-input`
- Radius: `rounded-lg` (10px)
- Focus: `border-ring ring-3 ring-ring/50`
- Placeholder: `text-muted-foreground`

### Tables
- Header: `text-foreground font-medium`, h-10
- Row: `border-b`, hover `bg-muted/50`
- Cell: `p-2 align-middle`
- 확장 행: `bg-muted/50 px-8 py-4`

### Badges
- Default: `bg-primary text-primary-foreground` — 해시태그 뱃지
- Secondary: `bg-secondary text-secondary-foreground` — 상태 태그, 언어 분포
- Radius: `rounded-4xl` (pill이 아닌 둥근 사각형)
- Height: h-5, text-xs, font-medium

### Select
- Trigger: `border-input bg-transparent`, h-8
- Content: `bg-popover ring-1 ring-foreground/10 shadow-md`
- Item hover: `bg-accent text-accent-foreground`

### Toggle Group
- 수집 방식 선택 (해시태그/위치/키워드)
- 활성: `bg-muted text-foreground`

### Progress
- Track: `bg-muted h-1`
- Indicator: `bg-primary`
- 상태별: 완료 `bg-green-500`, 에러 `bg-destructive`, 수집중 `animate-pulse`

## 5. Layout Principles

### Spacing
- 기본 단위: 4px (Tailwind spacing scale)
- 페이지 패딩: `py-4 px-4 md:py-6 lg:px-6`
- 카드 간격: `gap-4 md:gap-6`
- 폼 요소 간격: `gap-2` (8px)
- 섹션 간격: `space-y-4` or `space-y-6`

### Grid
- 대시보드 카드: `grid-cols-2 lg:grid-cols-4`
- 확장 프로필: `grid-cols-2 md:grid-cols-4 gap-4`
- 필터 바: `flex flex-wrap items-center gap-3`

### Sidebar
- Width: `calc(var(--spacing) * 72)` = 288px
- Header height: `calc(var(--spacing) * 12)` = 48px
- variant: `inset` (배경 약간 들여쓴 스타일)

### Border Radius Scale
| Size | Value | Use |
|------|-------|-----|
| sm | `calc(0.625rem - 4px)` = 6px | 작은 요소 |
| md | `calc(0.625rem - 2px)` = 8px | 버튼 sm, 인풋 |
| lg | `0.625rem` = 10px | 버튼, 인풋, 기본 |
| xl | 16px | 카드 |

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | 없음 | 페이지 배경, 테이블 |
| Surface | `ring-1 ring-foreground/10` | 카드, 패널 |
| Muted | `bg-muted/50` | 확장 행, 호버 상태 |
| Elevated | `shadow-md` | 드롭다운, 팝오버 |
| Overlay | 없음 | 모달 (현재 미사용) |

**Depth Philosophy**: box-shadow 대신 ring shadow(`ring-1 ring-foreground/10`)로 카드 경계를 표현합니다. 가볍고 균일한 깊이감을 주며, 라이트/다크 모드 모두에서 자연스럽습니다.

## 7. Do's and Don'ts

### Do
- shadcn/ui 컴포넌트를 그대로 사용 (커스텀 최소화)
- `text-muted-foreground`로 메타 정보/보조 텍스트 표현
- 상태 색상은 Tailwind 유틸리티 (green-600, yellow-600) 사용
- 카드 내부 데이터는 `text-sm` 기본
- 아이콘은 기능적 위치(사이드바, 카드 헤더)에만 사용
- 한글 UI 텍스트 사용 (버튼, 라벨, 상태 모두 한국어)

### Don't
- 커스텀 컬러 변수 추가하지 않기 — oklch 시스템 유지
- 아이콘을 장식용으로 남발하지 않기
- font-weight 700 이상 남용하지 않기 — 수치 강조에만
- 탭 중첩 사용하지 않기 — 페이지 라우팅으로 분리
- 로그인 페이지에 사이드바 표시하지 않기
- 그라데이션, 글로우 효과 사용하지 않기

## 8. Responsive Behavior

### Breakpoints (Tailwind defaults)
| Name | Width | Key Changes |
|------|-------|-------------|
| sm | 640px | - |
| md | 768px | 카드 2열, 패딩 확대 |
| lg | 1024px | 카드 4열, 사이드바 패딩 확대 |

### Collapsing Strategy
- 대시보드 카드: 4열 -> 2열 -> 1열
- 사이드바: 모바일에서 시트(오버레이)로 전환
- 테이블: 가로 스크롤 (`overflow-x-auto`)
- 필터 바: `flex-wrap`으로 자연스럽게 줄바꿈

## 9. Agent Prompt Guide

### Quick Token Reference
- Page Background: `bg-background` (`#ffffff`)
- Card: `bg-card` + `ring-1 ring-foreground/10` + `rounded-xl`
- Primary Button: `bg-primary text-primary-foreground rounded-lg h-8 px-2.5`
- Outline Button: `border-border bg-background hover:bg-muted rounded-lg`
- Body Text: `text-sm text-foreground`
- Muted Text: `text-sm text-muted-foreground`
- Meta Text: `text-xs text-muted-foreground`
- Border: `border-border` (`#e5e5e5`)
- Focus Ring: `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`

### Example Component Prompts
- "대시보드 통계 카드: `bg-card rounded-xl ring-1 ring-foreground/10 py-4 px-4`. 제목 `text-sm font-medium`, 수치 `text-2xl font-bold`, 부가설명 `text-xs text-muted-foreground`."
- "데이터 테이블: `Table` 컴포넌트 사용. 헤더 `font-medium text-foreground`. 행 `border-b hover:bg-muted/50`. 링크 `text-primary hover:underline`."
- "필터 바: `Card` 안에 `flex flex-wrap items-center gap-3 pt-6`. Select, Input, Button outline 조합."
- "폼: `Label text-sm` + `Input h-8 rounded-lg border-input`. 버튼 `Button w-full`."

### Iteration Guide
1. shadcn/ui 컴포넌트를 먼저 사용하고, 커스텀은 최소화
2. 색상은 CSS 변수 토큰 (`bg-primary`, `text-muted-foreground`) 사용 — 하드코딩 hex 지양
3. 상태 표시는 Tailwind 색상 유틸리티 (`text-green-600`) 허용
4. 간격은 Tailwind spacing (`gap-4`, `p-2`, `space-y-6`)
5. 한글 텍스트 우선, 기술 용어만 영어 유지
6. 아이콘은 Lucide React에서 기능적 용도로만 선택
