import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'

const meta: Meta = {
  title: 'Design/ThumbnailBuilder',
}
export default meta
type Story = StoryObj<typeof meta>

// ── 공통 목업 컴포넌트 ──

const STEPS = [
  { id: 'image',    label: '이미지 선택',    icon: '🖼' },
  { id: 'layout',   label: '텍스트 레이아웃', icon: '✦' },
  { id: 'effect',   label: '효과/스타일',     icon: '🎨' },
  { id: 'text',     label: '텍스트 편집',     icon: '✏️' },
  { id: 'export',   label: '내보내기',        icon: '⬇' },
]

function StepSidebar({ active }: { active: string }) {
  return (
    <div className="w-52 shrink-0 border-r border-gray-100 bg-white flex flex-col py-4 gap-1">
      <div className="px-4 pb-3 mb-1 border-b border-gray-100">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Thumbnail Builder</span>
      </div>
      {STEPS.map((s, i) => (
        <div key={s.id}
          className={`mx-2 px-3 py-2.5 rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors
            ${s.id === active
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:bg-gray-50'}`}>
          <span className="text-base">{s.icon}</span>
          <div className="flex flex-col">
            <span className="text-[11px] font-medium">{s.label}</span>
            <span className="text-[9px] opacity-50">Step {i + 1}</span>
          </div>
          {s.id === active && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-80" />
          )}
        </div>
      ))}
    </div>
  )
}

function PreviewPane({ label = '1080×1080 미리보기' }: { label?: string }) {
  return (
    <div className="flex-1 bg-gray-50 flex flex-col items-center justify-center gap-3">
      <div className="w-72 h-72 bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl shadow-lg flex items-center justify-center relative overflow-hidden">
        {/* 모델 플레이스홀더 */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
        <div className="absolute bottom-4 left-4 text-white">
          <div className="text-xs font-bold opacity-80">피부과 시술명</div>
          <div className="text-xl font-black leading-tight">보톡스 시술</div>
          <div className="text-sm font-semibold text-pink-300">3.9만원</div>
        </div>
        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl">🖼</div>
      </div>
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  )
}

// ── Step 1: 이미지 선택 ──

const IMAGE_TYPES = [
  { id: 'cutout', label: '누끼 이미지', desc: '배경 제거된 모델', icon: '✂️', tags: ['누끼', '합성'] },
  { id: 'full',   label: '전체 이미지', desc: '배경 포함 완성 컷', icon: '📷', tags: ['풀샷', '배경'] },
]

const ARCHETYPES = [
  { id: 'dewy-glow',  label: 'Dewy Glow',     color: '#F9C6D0', emoji: '✨', procedures: '물광주사, 스킨부스터' },
  { id: 'clear-tone', label: 'Clear Tone',     color: '#FAF7F0', emoji: '🌿', procedures: '레이저토닝, 기미' },
  { id: 'vline',      label: 'V-Line Sharp',   color: '#E8E8E8', emoji: '💎', procedures: '울쎄라, 리프팅' },
  { id: 'lip-gloss',  label: 'Lip Gloss',      color: '#F9A8C9', emoji: '💄', procedures: '입술필러' },
  { id: 'bold-eye',   label: 'Bold Eye',       color: '#D8C9E8', emoji: '👁', procedures: '쌍꺼풀, 눈매교정' },
  { id: 'body-line',  label: 'Body Line',      color: '#E8D5F0', emoji: '💪', procedures: '지방흡입, 바디' },
]

function Step1ImageSelect() {
  const [imageType, setImageType] = useState<string | null>(null)
  const [archetype, setArchetype] = useState<string | null>(null)
  const [variant, setVariant] = useState<number | null>(null)

  return (
    <div className="flex h-full">
      <StepSidebar active="image" />

      {/* 메인 패널 */}
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="flex-1 p-6 space-y-6">

          {/* 이미지 타입 선택 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">이미지 타입</h3>
            <div className="grid grid-cols-2 gap-3">
              {IMAGE_TYPES.map(t => (
                <button key={t.id}
                  onClick={() => setImageType(t.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all
                    ${imageType === t.id
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="text-2xl mb-2">{t.icon}</div>
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div className={`text-xs mt-0.5 ${imageType === t.id ? 'text-gray-300' : 'text-gray-400'}`}>{t.desc}</div>
                  <div className="flex gap-1 mt-2">
                    {t.tags.map(tag => (
                      <span key={tag}
                        className={`text-[9px] px-1.5 py-0.5 rounded-full
                          ${imageType === t.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI 이미지 카테고리 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">시술 카테고리</h3>
            <p className="text-xs text-gray-400 mb-3">시술과 어울리는 AI 이미지 아키타입 선택</p>
            <div className="grid grid-cols-3 gap-2">
              {ARCHETYPES.map(a => (
                <button key={a.id}
                  onClick={() => setArchetype(a.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all
                    ${archetype === a.id ? 'border-gray-900 ring-2 ring-gray-900/10' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div
                    className="w-full h-12 rounded-lg mb-2 flex items-center justify-center text-xl"
                    style={{ background: a.color }}>
                    {a.emoji}
                  </div>
                  <div className="text-[11px] font-semibold text-gray-800">{a.label}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5 truncate">{a.procedures}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 변형 선택 */}
          {archetype && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">이미지 변형 선택</h3>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map(i => (
                  <button key={i}
                    onClick={() => setVariant(i)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square
                      ${variant === i ? 'border-gray-900 ring-2 ring-gray-900/20' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-3xl">
                      🖼
                    </div>
                    <div className="absolute bottom-1 right-1 text-[9px] bg-black/50 text-white px-1 rounded">
                      Var {i}
                    </div>
                    {variant === i && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
                        <span className="text-[8px] text-white">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="border-t border-gray-100 bg-white p-4 flex justify-end">
          <button
            disabled={!imageType || !archetype || variant === null}
            className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold
              disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors">
            다음: 텍스트 레이아웃 추천 →
          </button>
        </div>
      </div>

      <PreviewPane label="이미지 선택 시 미리보기 업데이트" />
    </div>
  )
}

// ── Step 2: Gemini 텍스트 레이아웃 추천 ──

const LAYOUT_SUGGESTIONS = [
  {
    id: 'layout-a',
    name: '좌측 패널 + 세리프',
    confidence: 94,
    reason: '모델 시선이 우측 → 좌측 텍스트 배치 자연스러움',
    font: 'Playfair Display',
    textPos: '좌측 하단',
    colorScheme: 'Dark panel',
    preview: { bg: '#1A1A2E', accent: '#FF6B9D' },
  },
  {
    id: 'layout-b',
    name: '하단 배너 + 고딕',
    confidence: 87,
    reason: '전신 이미지 → 하단 배너로 여백 활용 극대화',
    font: 'Black Han Sans',
    textPos: '하단 배너',
    colorScheme: 'Bold color',
    preview: { bg: '#FF6B9D', accent: '#FFD700' },
  },
  {
    id: 'layout-c',
    name: '중앙 오버레이 + 모던',
    confidence: 78,
    reason: '대칭 구도 이미지 → 중앙 정렬 타이포 강조',
    font: 'Bebas Neue',
    textPos: '중앙 하단',
    colorScheme: 'Gradient overlay',
    preview: { bg: '#2d2d2d', accent: '#00D4AA' },
  },
]

function Step2LayoutSuggest() {
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  return (
    <div className="flex h-full">
      <StepSidebar active="layout" />

      <div className="flex-1 flex flex-col overflow-auto">
        <div className="flex-1 p-6 space-y-5">

          {/* Gemini 분석 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Gemini 레이아웃 추천</h3>
              <p className="text-xs text-gray-400 mt-0.5">이미지를 분석해 최적 텍스트 배치를 제안합니다</p>
            </div>
            <button
              onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1200) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
              {loading
                ? <><span className="animate-spin">⟳</span> 분석 중...</>
                : <><span>⟳</span> 재시도</>}
            </button>
          </div>

          {/* 추천 카드 목록 */}
          <div className="space-y-3">
            {LAYOUT_SUGGESTIONS.map((s, idx) => (
              <button key={s.id}
                onClick={() => setSelected(s.id)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all
                  ${selected === s.id ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className="flex items-start gap-3">
                  {/* 색상 프리뷰 */}
                  <div
                    className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white text-lg font-black"
                    style={{ background: s.preview.bg }}>
                    <span style={{ color: s.preview.accent }}>{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-gray-800">{s.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        {s.confidence}% 적합
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">{s.reason}</p>
                    <div className="flex gap-3 mt-2">
                      <span className="text-[10px] text-gray-400">폰트: <b className="text-gray-600">{s.font}</b></span>
                      <span className="text-[10px] text-gray-400">위치: <b className="text-gray-600">{s.textPos}</b></span>
                    </div>
                  </div>
                  {selected === s.id && (
                    <div className="w-5 h-5 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                      <span className="text-[9px] text-white">✓</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white p-4 flex justify-between">
          <button className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            ← 이미지 재선택
          </button>
          <button
            disabled={!selected}
            className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold
              disabled:opacity-30 disabled:cursor-not-allowed">
            다음: 효과 선택 →
          </button>
        </div>
      </div>

      {/* 우측 미리보기 — 선택 시 해당 레이아웃 프리뷰 */}
      <div className="w-80 bg-gray-50 flex flex-col">
        <div className="p-3 border-b border-gray-100 bg-white">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Live Preview</span>
        </div>
        <div className="flex-1 flex flex-col gap-2 p-3 overflow-auto">
          {LAYOUT_SUGGESTIONS.map(s => (
            <div key={s.id}
              className={`w-full aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all
                ${selected === s.id ? 'border-gray-900 scale-[1.02]' : 'border-transparent opacity-60 hover:opacity-80'}`}
              onClick={() => setSelected(s.id)}>
              <div
                className="w-full h-full flex items-end p-3"
                style={{ background: `linear-gradient(to top, ${s.preview.bg}, ${s.preview.bg}88, transparent)` }}>
                <div className="text-white">
                  <div className="text-[8px] opacity-70 uppercase tracking-wider">CLINIC</div>
                  <div className="text-sm font-black leading-tight">보톡스 시술</div>
                  <div className="text-xs font-bold" style={{ color: s.preview.accent }}>3.9만원</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step 3: 효과/스타일 선택 ──

const EFFECTS = [
  {
    category: '오버레이',
    items: [
      { id: 'overlay-dark',     label: '다크 오버레이',   preview: 'from-gray-900/80 to-transparent', icon: '🌑' },
      { id: 'overlay-light',    label: '라이트 오버레이', preview: 'from-white/70 to-transparent',    icon: '🌕' },
      { id: 'overlay-gradient', label: '그라디언트',       preview: 'from-pink-500/70 to-purple-500/70', icon: '🌈' },
    ],
  },
  {
    category: '프레임',
    items: [
      { id: 'frame-circle', label: '원형 프레임',   preview: 'from-pink-200/50 to-pink-400/50', icon: '⭕' },
      { id: 'frame-arch',   label: '아치 프레임',   preview: 'from-amber-100/50 to-amber-300/50', icon: '🏛' },
      { id: 'frame-card',   label: '카드 프레임',   preview: 'from-red-800/50 to-red-900/50', icon: '🃏' },
    ],
  },
  {
    category: '스플릿',
    items: [
      { id: 'split-left',  label: '좌측 패널',     preview: 'from-white to-white/0', icon: '◧' },
      { id: 'split-diag',  label: '대각선 분할',   preview: 'from-gray-900 to-gray-900/0', icon: '◪' },
      { id: 'split-gold',  label: '골드 프레임',   preview: 'from-yellow-600/40 to-yellow-400/40', icon: '✨' },
    ],
  },
]

function Step3EffectSelect() {
  const [selected, setSelected] = useState<string>('overlay-dark')

  return (
    <div className="flex h-full">
      <StepSidebar active="effect" />

      <div className="flex-1 flex flex-col overflow-auto">
        <div className="flex-1 p-6 space-y-6">
          {EFFECTS.map(cat => (
            <div key={cat.category}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{cat.category}</h3>
              <div className="grid grid-cols-3 gap-2">
                {cat.items.map(eff => (
                  <button key={eff.id}
                    onClick={() => setSelected(eff.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all
                      ${selected === eff.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className={`w-full h-14 rounded-lg mb-2 bg-gradient-to-br ${eff.preview} bg-pink-100`} />
                    <div className="text-[11px] font-semibold">{eff.label}</div>
                    <div className="text-lg mt-0.5">{eff.icon}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 bg-white p-4 flex justify-between">
          <button className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            ← 레이아웃 변경
          </button>
          <button className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold">
            다음: 텍스트 편집 →
          </button>
        </div>
      </div>

      <PreviewPane />
    </div>
  )
}

// ── Step 4: 텍스트 편집 + 다국어 ──

const LANGS = [
  { id: 'ko', flag: '🇰🇷', label: 'KO' },
  { id: 'en', flag: '🇺🇸', label: 'EN' },
  { id: 'ja', flag: '🇯🇵', label: 'JA' },
  { id: 'zh', flag: '🇨🇳', label: 'ZH' },
]

const SAMPLE_TEXTS: Record<string, Record<string, string>> = {
  ko: { headline: '보톡스 시술', sub: '자연스럽게 환해지는 얼굴', price: '3.9만원', brand: 'OO피부과' },
  en: { headline: 'Botox Treatment', sub: 'Natural, Radiant Results', price: '₩39,000', brand: 'OO Clinic' },
  ja: { headline: 'ボトックス施術', sub: '自然に輝く肌へ', price: '3.9万ウォン', brand: 'OOクリニック' },
  zh: { headline: '肉毒素治疗', sub: '自然亮丽的效果', price: '3.9万韩元', brand: 'OO诊所' },
}

function Step4TextEdit() {
  const [lang, setLang] = useState('ko')
  const [generating, setGenerating] = useState(false)
  const texts = SAMPLE_TEXTS[lang]

  return (
    <div className="flex h-full">
      <StepSidebar active="text" />

      <div className="flex-1 flex flex-col overflow-auto">
        <div className="flex-1 p-6 space-y-5">

          {/* 언어 탭 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">언어별 텍스트</h3>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-4">
              {LANGS.map(l => (
                <button key={l.id}
                  onClick={() => setLang(l.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                    ${lang === l.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>

            {/* Gemini 생성 버튼 */}
            <div className="flex items-center justify-between mb-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100">
              <div>
                <div className="text-[11px] font-semibold text-blue-800">Gemini AI 텍스트 생성</div>
                <div className="text-[10px] text-blue-600 mt-0.5">시술명 입력 시 4개 언어 자동 생성</div>
              </div>
              <button
                onClick={() => { setGenerating(true); setTimeout(() => setGenerating(false), 1500) }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors">
                {generating ? '생성 중...' : '✦ 생성'}
              </button>
            </div>

            {/* 텍스트 필드들 */}
            <div className="space-y-3">
              {[
                { key: 'headline', label: '메인 헤드라인', placeholder: '시술명을 입력하세요' },
                { key: 'sub',      label: '서브 카피',     placeholder: '서브 텍스트' },
                { key: 'price',    label: '가격',           placeholder: '예: 3.9만원' },
                { key: 'brand',    label: '브랜드/병원명', placeholder: '병원명' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{f.label}</label>
                  <input
                    defaultValue={texts[f.key]}
                    placeholder={f.placeholder}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-800
                      focus:outline-none focus:border-gray-400 bg-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 폰트/컬러 조정 */}
          <div className="pt-2 border-t border-gray-100">
            <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">폰트 스타일</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-500 w-20">헤드라인 폰트</span>
                <select className="flex-1 h-8 text-xs rounded-lg border border-gray-200 px-2 bg-white">
                  <option>Black Han Sans (추천)</option>
                  <option>Bebas Neue</option>
                  <option>Pretendard Bold</option>
                  <option>Playfair Display</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-500 w-20">포인트 컬러</span>
                <div className="flex gap-2">
                  {['#FF6B9D', '#FFD700', '#00D4AA', '#FF4757', '#7B68EE'].map(c => (
                    <div key={c} className="w-6 h-6 rounded-full cursor-pointer border-2 border-white ring-1 ring-gray-200 hover:ring-gray-400"
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white p-4 flex justify-between">
          <button className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            ← 효과 변경
          </button>
          <button className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold">
            다음: 내보내기 →
          </button>
        </div>
      </div>

      <PreviewPane />
    </div>
  )
}

// ── Step 5: 내보내기 ──

function Step5Export() {
  const [rendering, setRendering] = useState(false)
  const [done, setDone] = useState(false)

  return (
    <div className="flex h-full">
      <StepSidebar active="export" />

      <div className="flex-1 flex flex-col overflow-auto">
        <div className="flex-1 p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-1">내보내기 설정</h3>
            <p className="text-xs text-gray-400 mb-4">4개 언어 × 선택된 스타일로 렌더링합니다</p>

            {/* 요약 카드 */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3 mb-5">
              {[
                { label: '이미지',    value: 'Dewy Glow — Variant 1 (누끼)' },
                { label: '레이아웃',  value: '좌측 패널 + Playfair' },
                { label: '효과',      value: '다크 오버레이' },
                { label: '언어',      value: 'KO / EN / JA / ZH' },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="text-[10px] font-semibold text-gray-400 w-16">{r.label}</span>
                  <span className="text-xs text-gray-700">{r.value}</span>
                </div>
              ))}
            </div>

            {/* 언어별 출력 미리보기 */}
            <div className="grid grid-cols-4 gap-2 mb-5">
              {LANGS.map(l => (
                <div key={l.id} className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-pink-100 to-purple-100 relative">
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 to-transparent" />
                  <div className="absolute bottom-2 left-2 text-white">
                    <div className="text-[8px] opacity-60">{l.flag} {l.label}</div>
                    <div className="text-[10px] font-black leading-tight">
                      {l.id === 'ko' ? '보톡스' : l.id === 'en' ? 'Botox' : l.id === 'ja' ? 'ボトックス' : '肉毒素'}
                    </div>
                  </div>
                  {done && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-[8px] text-white">✓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 렌더링 버튼 */}
            {!done ? (
              <button
                onClick={() => { setRendering(true); setTimeout(() => { setRendering(false); setDone(true) }, 2000) }}
                disabled={rendering}
                className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold
                  disabled:opacity-60 hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
                {rendering ? <><span className="animate-spin">⟳</span> 렌더링 중...</> : '⬇ 4개 언어 전체 렌더링'}
              </button>
            ) : (
              <div className="text-center p-4 rounded-xl bg-green-50 border border-green-200">
                <div className="text-2xl mb-1">✓</div>
                <div className="text-sm font-semibold text-green-800">렌더링 완료</div>
                <div className="text-xs text-green-600 mt-0.5">thumbnail/output/renders/ 에 저장됨</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <PreviewPane label="최종 렌더 미리보기" />
    </div>
  )
}

// ── 전체 플로우 인터랙티브 ──

function FullBuilderFlow() {
  const [activeStep, setActiveStep] = useState('image')

  const stepComponents: Record<string, React.ReactNode> = {
    image:   <Step1ImageSelect />,
    layout:  <Step2LayoutSuggest />,
    effect:  <Step3EffectSelect />,
    text:    <Step4TextEdit />,
    export:  <Step5Export />,
  }

  return (
    <div className="flex flex-col h-screen bg-white font-sans">
      {/* 상단 헤더 */}
      <div className="h-10 border-b border-gray-100 bg-white flex items-center px-4 gap-3 shrink-0">
        <span className="text-xs text-gray-400">← 썸네일 에디터</span>
        <span className="text-gray-200">|</span>
        <span className="text-[11px] font-semibold text-gray-700">새 썸네일 만들기</span>

        {/* 스텝 인디케이터 */}
        <div className="flex items-center gap-1 ml-4">
          {STEPS.map((s, i) => (
            <button key={s.id}
              onClick={() => setActiveStep(s.id)}
              className={`px-2.5 py-0.5 rounded text-[10px] font-medium transition-colors
                ${s.id === activeStep ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
              {i + 1}. {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {stepComponents[activeStep]}
      </div>
    </div>
  )
}

// ── Story exports ──

export const Step1_이미지선택: Story = {
  render: () => (
    <div className="h-screen bg-white font-sans">
      <Step1ImageSelect />
    </div>
  ),
}

export const Step2_레이아웃추천: Story = {
  render: () => (
    <div className="h-screen bg-white font-sans">
      <Step2LayoutSuggest />
    </div>
  ),
}

export const Step3_효과선택: Story = {
  render: () => (
    <div className="h-screen bg-white font-sans">
      <Step3EffectSelect />
    </div>
  ),
}

export const Step4_텍스트편집: Story = {
  render: () => (
    <div className="h-screen bg-white font-sans">
      <Step4TextEdit />
    </div>
  ),
}

export const Step5_내보내기: Story = {
  render: () => (
    <div className="h-screen bg-white font-sans">
      <Step5Export />
    </div>
  ),
}

export const 전체플로우_인터랙티브: Story = {
  render: () => <FullBuilderFlow />,
}
