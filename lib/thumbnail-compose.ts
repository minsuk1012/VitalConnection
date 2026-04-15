/**
 * 토큰 기반 썸네일 합성 함수
 * composeHtml(layoutTokenId, effectTokenId, input) → HTML 문자열
 * 기존 buildTemplateHtml()과 독립적으로 공존한다.
 */
import fs from 'fs'
import path from 'path'
import { THUMBNAIL_BASE, type TemplateInput } from './thumbnail'
import { elementsToCssVars, type ElementInstance } from './thumbnail-element-schema'

export const COMPOSE_PATHS = {
  base:         path.join(THUMBNAIL_BASE, 'templates/base.html'),
  layouts:      path.join(THUMBNAIL_BASE, 'templates/layouts'),
  effects:      path.join(THUMBNAIL_BASE, 'templates/effects'),
  layoutTokens: path.join(THUMBNAIL_BASE, 'layout-tokens.json'),
  effectTokens: path.join(THUMBNAIL_BASE, 'effect-tokens.json'),
}

export interface LayoutToken {
  id:                 string
  name:               string
  description:        string
  cssFile:            string
  compatibleEffects:  string[]
  requiresCutout?:    boolean
}

export interface EffectToken {
  id:          string
  category:    'overlay' | 'split' | 'frame' | 'gradient' | 'solid'
  name:        string
  description: string
  cssFile:     string
}

export function getLayoutTokens(): LayoutToken[] {
  return JSON.parse(fs.readFileSync(COMPOSE_PATHS.layoutTokens, 'utf-8'))
}

export function getEffectTokens(): EffectToken[] {
  return JSON.parse(fs.readFileSync(COMPOSE_PATHS.effectTokens, 'utf-8'))
}

export interface ComposeInput extends TemplateInput {
  elements?: ElementInstance[]
}

export function composeHtml(
  layoutTokenId: string,
  effectTokenId: string,
  input: ComposeInput,
): string {
  if (!fs.existsSync(COMPOSE_PATHS.base)) {
    throw new Error('base.html 없음: thumbnail/templates/base.html')
  }

  const layoutCssPath = path.join(COMPOSE_PATHS.layouts, `${layoutTokenId}.css`)
  const effectCssPath = path.join(COMPOSE_PATHS.effects, `${effectTokenId}.css`)

  if (!fs.existsSync(layoutCssPath)) throw new Error(`레이아웃 토큰 없음: ${layoutTokenId}`)
  if (!fs.existsSync(effectCssPath)) throw new Error(`효과 토큰 없음: ${effectTokenId}`)

  const base      = fs.readFileSync(COMPOSE_PATHS.base, 'utf-8')
  const layoutCss = fs.readFileSync(layoutCssPath, 'utf-8')
  const effectCss = fs.readFileSync(effectCssPath, 'utf-8')

  const baseUrl    = input.baseUrl ?? 'http://localhost:3000'
  const modelFile  = input.cutout ?? input.model
  const assetDir   = input.cutout ? 'models-cutout' : 'models'
  const modelUrl   = modelFile
    ? `${baseUrl}/api/thumbnail/asset/${assetDir}/${modelFile.split('/').map(encodeURIComponent).join('/')}`
    : ''
  const fontsUrl   = `${baseUrl}/api/thumbnail/asset/fonts`
  const hasPrice   = !!(input.price?.trim())

  const cssVars = buildCssVars(input)
  const fontFaces = buildComposeFontFaces(fontsUrl)

  return base
    .replace(/\{\{LAYOUT_CSS\}\}/g,     layoutCss)
    .replace(/\{\{EFFECT_CSS\}\}/g,      effectCss)
    .replace(/\{\{FONT_FACES\}\}/g,      fontFaces)
    .replace(/\{\{CSS_VARS\}\}/g,        cssVars)
    .replace(/\{\{MODEL_PATH\}\}/g,      modelUrl)
    .replace(/\{\{HEADLINE\}\}/g,           esc(input.headline    ?? '시술명'))
    .replace(/\{\{HEADLINE_KO\}\}/g,        esc(input.headlineKo  ?? ''))
    .replace(/\{\{SUBHEADLINE\}\}/g,        esc(input.subheadline ?? ''))
    .replace(/\{\{BRAND_EN\}\}/g,           esc(input.brandEn     ?? 'CLINIC'))
    .replace(/\{\{BRAND_KO\}\}/g,           esc(input.brandKo     ?? ''))
    .replace(/\{\{PRICE\}\}/g,              esc(input.price       ?? ''))
    .replace(/\{\{PRICE_UNIT\}\}/g,         esc(input.priceUnit   ?? '만원'))
    .replace(/\{\{BRAND_KO_DISPLAY\}\}/g,   input.brandKo    ? 'block' : 'none')
    .replace(/\{\{HEADLINE_KO_DISPLAY\}\}/g, input.headlineKo ? 'block' : 'none')
    .replace(/\{\{SUB_DISPLAY\}\}/g,        input.subheadline  ? 'block' : 'none')
    .replace(/\{\{PRICE_DISPLAY\}\}/g,      hasPrice           ? 'flex'  : 'none')
}

function buildCssVars(input: ComposeInput): string {
  const vars: string[] = []

  // panelColor는 body 배경 수준 변수
  if (input.panelColor) vars.push(`--panel-color: ${input.panelColor}`)

  // 하위 호환: 기존 단일 var 필드 (마이그레이션 완료 전까지)
  if (input.fontFamily)  vars.push(`--headline-font: '${input.fontFamily}'`)
  if (input.accentColor) vars.push(`--accent-color: ${input.accentColor}`)
  if (input.textColor)   vars.push(`--text-color: ${input.textColor}`)
  if (input.subColor)    vars.push(`--sub-color: ${input.subColor}`)

  // 신규: elements 배열에서 CSS var 생성
  if (input.elements?.length) {
    vars.push(elementsToCssVars(input.elements))
  }

  return vars.join('; ')
}

function buildComposeFontFaces(fontsUrl: string): string {
  return `
    @font-face { font-family:'Bebas';       src:url('${fontsUrl}/BebasNeue-Regular.ttf');      font-weight:400; }
    @font-face { font-family:'Noto';        src:url('${fontsUrl}/NotoSansKR.ttf');              font-weight:100 900; }
    @font-face { font-family:'NotoSerif';   src:url('${fontsUrl}/NotoSerif-Regular.ttf');       font-weight:400 700; }
    @font-face { font-family:'BlackHan';    src:url('${fontsUrl}/BlackHanSans-Regular.ttf');    font-weight:400; }
    @font-face { font-family:'Playfair';    src:url('${fontsUrl}/PlayfairDisplay.ttf');         font-weight:100 900; }
    @font-face { font-family:'PlayfairI';   src:url('${fontsUrl}/PlayfairDisplay-Italic.ttf');  font-weight:100 900; font-style:italic; }
    @font-face { font-family:'Montserrat';  src:url('${fontsUrl}/Montserrat.ttf');              font-weight:100 900; }
    @font-face { font-family:'Pretendard';  src:url('${fontsUrl}/Pretendard-Bold.woff2');       font-weight:700; }
  `
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
