// lib/thumbnail-element-schema.ts

export interface ControlDef {
  type:     'range' | 'color' | 'select'
  label:    string
  unit?:    string
  min?:     number
  max?:     number
  step?:    number
  options?: { value: string; label: string }[]
}

export const FONT_OPTIONS = [
  { value: 'BlackHan',    label: 'Black Han Sans' },
  { value: 'Noto',        label: 'Noto Sans KR' },
  { value: 'Pretendard',  label: 'Pretendard Bold' },
  { value: 'Bebas',       label: 'Bebas Neue' },
  { value: 'Montserrat',  label: 'Montserrat' },
  { value: 'Playfair',    label: 'Playfair Display' },
  { value: 'PlayfairI',   label: 'Playfair Italic' },
  { value: 'NotoSerif',   label: 'Noto Serif' },
] as const

/** 모든 prop의 컨트롤 정의 */
export const PROP_META: Record<string, ControlDef> = {
  // 공통
  opacity:       { type: 'range',  label: '불투명도',  min: 0,    max: 1,    step: 0.05, unit: '' },
  zIndex:        { type: 'range',  label: '레이어',    min: 0,    max: 20,   step: 1,    unit: '' },
  // 텍스트
  fontSize:      { type: 'range',  label: '폰트 크기',  min: 12,  max: 200,  step: 1,    unit: 'px' },
  color:         { type: 'color',  label: '색상',       unit: '' },
  fontFamily:    { type: 'select', label: '폰트',        unit: '', options: [...FONT_OPTIONS] },
  maxWidth:      { type: 'range',  label: '최대 너비',  min: 100, max: 1080, step: 10,   unit: 'px' },
  lineHeight:    { type: 'range',  label: '줄 간격',    min: 0.8, max: 2.0,  step: 0.05, unit: '' },
  letterSpacing: { type: 'range',  label: '자간',       min: -5,  max: 20,   step: 0.5,  unit: 'px' },
  bgColor:       { type: 'color',  label: '배경색',     unit: '' },
  // 가격 전용
  unitSize:      { type: 'range',  label: '단위 크기',  min: 12,  max: 80,   step: 1,    unit: 'px' },
  unitColor:     { type: 'color',  label: '단위 색상',  unit: '' },
  skew:          { type: 'range',  label: '기울기',     min: -30, max: 30,   step: 1,    unit: 'deg' },
  // 이미지 전용
  brightness:    { type: 'range',  label: '밝기',       min: 0.3, max: 1.5,  step: 0.05, unit: '' },
}

/** 요소 타입별 허용 prop 목록 */
export const ELEMENT_TYPES: Record<string, { label: string; props: string[] }> = {
  text: {
    label: '텍스트',
    props: ['fontSize', 'color', 'fontFamily', 'maxWidth', 'lineHeight', 'letterSpacing', 'bgColor', 'opacity'],
  },
  price: {
    label: '가격',
    props: ['fontSize', 'color', 'unitSize', 'unitColor', 'skew', 'opacity'],
  },
  image: {
    label: '이미지',
    props: ['brightness', 'opacity', 'zIndex'],
  },
}

export interface ElementInstance {
  type:      'text' | 'price' | 'image'
  cssTarget: string
  label:     string
  props:     Record<string, string | number>
}

/** camelCase prop + cssTarget → CSS 변수명
 * propToCssVar('headline', 'fontSize') → '--headline-font-size'
 * propToCssVar('headline-ko', 'color') → '--headline-ko-color'
 */
export function propToCssVar(cssTarget: string, prop: string): string {
  const kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase()
  return `--${cssTarget}-${kebab}`
}

/** prop 값을 CSS 값 문자열로 변환 */
export function formatPropValue(prop: string, value: string | number): string {
  if (prop === 'fontFamily') return `'${value}'`
  const meta = PROP_META[prop]
  const unit = meta?.unit ?? ''
  return `${value}${unit}`
}

/** elements 배열 → CSS 변수 문자열 */
export function elementsToCssVars(elements: ElementInstance[]): string {
  const vars: string[] = []
  for (const el of elements) {
    for (const [prop, value] of Object.entries(el.props)) {
      vars.push(`${propToCssVar(el.cssTarget, prop)}: ${formatPropValue(prop, value)}`)
    }
  }
  return vars.join('; ')
}
