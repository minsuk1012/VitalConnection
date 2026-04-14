/**
 * 썸네일 생성기 공유 유틸리티
 * thumbnail-gen 프로젝트와 파일을 공유
 */
import fs from 'fs'
import path from 'path'

// vitalconnection 내부 thumbnail 디렉토리
export const THUMBNAIL_BASE =
  process.env.THUMBNAIL_BASE_DIR ??
  path.join(process.cwd(), 'thumbnail')

export const PATHS = {
  models:    path.join(THUMBNAIL_BASE, 'output/models'),       // 일반 모델
  modelsRaw: path.join(THUMBNAIL_BASE, 'output/models-raw'),   // 누끼 원본 (처리 대기)
  cutout:    path.join(THUMBNAIL_BASE, 'output/models-cutout'), // 누끼 완료본
  configs:   path.join(THUMBNAIL_BASE, 'configs'),
  templates: path.join(THUMBNAIL_BASE, 'templates'),
  registry:  path.join(THUMBNAIL_BASE, 'template-registry.json'),
  fonts:     path.join(THUMBNAIL_BASE, 'fonts'),
}

// 이미지 파일 재귀 스캔
export function listImagesRecursive(dir: string, base = ''): string[] {
  if (!fs.existsSync(dir)) return []
  const results: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      results.push(...listImagesRecursive(path.join(dir, entry.name), rel))
    } else if (/\.(webp|png|jpg|jpeg)$/i.test(entry.name)) {
      results.push(rel)
    }
  }
  return results
}

// 레지스트리 읽기
export function getRegistry() {
  if (!fs.existsSync(PATHS.registry)) return { templates: [] }
  return JSON.parse(fs.readFileSync(PATHS.registry, 'utf-8'))
}

// Config 읽기
export function getConfig(id: string) {
  const p = path.join(PATHS.configs, `${id}.json`)
  if (!fs.existsSync(p)) return null
  return JSON.parse(fs.readFileSync(p, 'utf-8'))
}

// Config 저장
export function saveConfig(id: string, data: object) {
  const p = path.join(PATHS.configs, `${id}.json`)
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8')
}

// ── 템플릿 HTML 빌드 ──

export interface TemplateInput {
  headline?:    string
  subheadline?: string
  brandEn?:     string
  brandKo?:     string
  tagline?:     string
  badge?:       string
  price?:       string
  priceUnit?:   string
  model?:       string        // 모델 이미지 파일 경로 (models/ 하위)
  cutout?:      string        // 누끼 이미지 파일 경로 (models-cutout/ 하위)
  baseUrl?:     string        // 서버 baseUrl (이미지 src용)
}

// ── 폰트 패밀리 목록 (에디터 select용) ──
export const FONT_OPTIONS = [
  { value: 'Noto',        label: 'Noto Sans KR',          style: 'normal', weight: '900' },
  { value: 'Pretendard',  label: 'Pretendard Bold',        style: 'normal', weight: '700' },
  { value: 'BlackHan',    label: 'Black Han Sans',          style: 'normal', weight: '400' },
  { value: 'Bebas',       label: 'Bebas Neue',              style: 'normal', weight: '400' },
  { value: 'Montserrat',  label: 'Montserrat',              style: 'normal', weight: '700' },
  { value: 'Playfair',    label: 'Playfair Display',        style: 'normal', weight: '700' },
  { value: 'PlayfairI',   label: 'Playfair Display Italic', style: 'italic', weight: '700' },
  { value: 'NotoSerif',   label: 'Noto Serif',              style: 'normal', weight: '700' },
] as const

/** CSS @font-face 블록 생성 (fontsUrl 기반) */
function buildFontFaces(fontsUrl: string): string {
  return `
    @font-face { font-family:'Bebas';        src:url('${fontsUrl}/BebasNeue-Regular.ttf');       font-weight:400; }
    @font-face { font-family:'Noto';         src:url('${fontsUrl}/NotoSansKR.ttf');               font-weight:100 900; }
    @font-face { font-family:'NotoSerif';    src:url('${fontsUrl}/NotoSerif-Regular.ttf');        font-weight:400 700; }
    @font-face { font-family:'BlackHan';     src:url('${fontsUrl}/BlackHanSans-Regular.ttf');     font-weight:400; }
    @font-face { font-family:'Playfair';     src:url('${fontsUrl}/PlayfairDisplay.ttf');          font-weight:100 900; font-style:normal; }
    @font-face { font-family:'PlayfairI';    src:url('${fontsUrl}/PlayfairDisplay-Italic.ttf');   font-weight:100 900; font-style:italic; }
    @font-face { font-family:'Montserrat';   src:url('${fontsUrl}/Montserrat.ttf');               font-weight:100 900; }
    @font-face { font-family:'Pretendard';   src:url('${fontsUrl}/Pretendard-Bold.woff2');        font-weight:700; }
    @font-face { font-family:'Anton';        src:url('${fontsUrl}/Anton-Regular.ttf');            font-weight:400; }
    @font-face { font-family:'Oswald';       src:url('${fontsUrl}/Oswald-Bold.ttf');              font-weight:700; }
    @font-face { font-family:'Cormorant';    src:url('${fontsUrl}/CormorantGaramond-Bold.ttf');   font-weight:700; }
    @font-face { font-family:'NanumGothic';     src:url('${fontsUrl}/NanumGothic.ttc');              font-weight:400 700; }
    @font-face { font-family:'GmarketSans';    src:url('${fontsUrl}/GmarketSans-Bold.otf');         font-weight:700; }
    @font-face { font-family:'NanumSquare';    src:url('${fontsUrl}/NanumSquare-Bold.ttf');         font-weight:700; }
    @font-face { font-family:'NanumRound';     src:url('${fontsUrl}/NanumSquareRound-Bold.ttf');    font-weight:700; }
  `
}

export function buildTemplateHtml(layoutId: string, input: TemplateInput): string {
  const templatePath = path.join(PATHS.templates, `${layoutId}.html`)
  const configPath   = path.join(PATHS.configs, `${layoutId}.json`)
  if (!fs.existsSync(templatePath)) throw new Error(`Template not found: ${layoutId}`)
  if (!fs.existsSync(configPath))   throw new Error(`Config not found: ${layoutId}`)

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  const cssVars = Object.entries(config.vars as Record<string, string>)
    .map(([k, v]) => `--${k}: ${v};`).join(' ')

  const base      = input.baseUrl ?? 'http://localhost:3000'
  // cutout 파라미터가 있으면 layout ID 무관하게 models-cutout 디렉토리 사용
  const modelFile = input.cutout ?? input.model
  const assetDir  = input.cutout ? 'models-cutout' : 'models'
  const modelUrl  = modelFile
    ? `${base}/api/thumbnail/asset/${assetDir}/${modelFile.split('/').map(encodeURIComponent).join('/')}`
    : ''
  const fontsUrl  = `${base}/api/thumbnail/asset/fonts`
  const hasPrice  = !!(input.price?.trim())

  const fontFaces = buildFontFaces(fontsUrl)

  let html = fs.readFileSync(templatePath, 'utf-8')
  return html
    .replace('{{CSS_VARS}}',            cssVars)
    .replace(/\{\{FONT_FACES\}\}/g,     fontFaces)
    .replace(/\{\{FONTS_DIR\}\}/g,      fontsUrl)
    .replace(/\{\{MODEL_PATH\}\}/g,     modelUrl)
    .replace(/\{\{HEADLINE\}\}/g,       esc(input.headline    ?? '시술명'))
    .replace(/\{\{SUBHEADLINE\}\}/g,    esc(input.subheadline ?? ''))
    .replace(/\{\{BRAND_EN\}\}/g,       esc(input.brandEn     ?? 'CLINIC'))
    .replace(/\{\{BRAND_KO\}\}/g,       esc(input.brandKo     ?? ''))
    .replace(/\{\{TAGLINE\}\}/g,        esc(input.tagline     ?? ''))
    .replace(/\{\{BADGE_TEXT\}\}/g,     esc(input.badge       ?? ''))
    .replace(/\{\{PRICE\}\}/g,          esc(input.price       ?? ''))
    .replace(/\{\{PRICE_UNIT\}\}/g,     esc(input.priceUnit   ?? '만원'))
    .replace(/\{\{BRAND_KO_DISPLAY\}\}/g, input.brandKo ? 'block' : 'none')
    .replace(/\{\{SUB_DISPLAY\}\}/g,    input.subheadline ? 'block' : 'none')
    .replace(/\{\{TAGLINE_DISPLAY\}\}/g,input.tagline    ? 'block' : 'none')
    .replace(/\{\{PRICE_DISPLAY\}\}/g,  hasPrice         ? 'block' : 'none')
    .replace(/\{\{BADGE_DISPLAY\}\}/g,  hasPrice         ? 'flex'  : 'none')
    .replace(/\{\{SPARKLE_DISPLAY\}\}/g,'inline')
    .replace(/\{\{PRICES_HTML\}\}/g,    '')
    .replace(/\{\{FOOTER_NOTE\}\}/g,    '')
    .replace(/\{\{FOOTER_DISPLAY\}\}/g, 'none')
    .replace(/\{\{PANEL_COLOR\}\}/g,    config.vars['panel-color']  ?? 'rgba(255,255,255,0.9)')
    .replace(/\{\{ACCENT_COLOR\}\}/g,   config.vars['accent-color'] ?? '#FF6B9D')
    .replace(/\{\{DARK_COLOR\}\}/g,     config.vars['panel-color']  ?? '#2C1A0E')
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
