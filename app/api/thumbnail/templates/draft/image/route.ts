// app/api/thumbnail/templates/draft/image/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import { checkAdmin } from '@/lib/auth'
import { getLayoutTokens, getEffectTokens } from '@/lib/thumbnail-compose'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const apiKey = process.env.GEMINI_THUMBNAIL_EDITOR_TRANSLATE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI API 키 없음' }, { status: 500 })

  const formData = await req.formData()
  const file = formData.get('image') as File | null
  if (!file) return NextResponse.json({ error: 'image 파일 필수' }, { status: 400 })

  const layouts = getLayoutTokens()
  const effects  = getEffectTokens()

  const layoutList = layouts.map(l => `- id: "${l.id}", 이름: "${l.name}", 설명: "${l.description}"`).join('\n')
  const effectList = effects.map(e => `- id: "${e.id}", 이름: "${e.name}", 설명: "${e.description}"`).join('\n')

  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp'

  const prompt = `당신은 K-Beauty 뷰티 광고 썸네일 디자인 전문가입니다.
이 이미지를 레퍼런스로 분석하여 가장 잘 어울리는 썸네일 템플릿 설정을 JSON으로 생성하세요.

분석 기준:
- 이미지의 전반적인 색감, 톤, 분위기
- 배경 밝기 및 텍스트 가독성
- 고급스러움/활동적/미니멀 등 스타일 특성

레이아웃 목록:
${layoutList}

이펙트 목록:
${effectList}

폰트 선택지: BlackHan (임팩트 고딕), Pretendard (모던 고딕), Playfair (세리프 럭셔리), Bebas (영문 임팩트), Montserrat (영문 모던), NotoSerif (세리프), Noto (기본 고딕)

텍스트는 K-Beauty 뷰티 시술 광고에 어울리는 한국어 샘플로 채워주세요.`

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64 } },
        ],
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            layoutTokenId:  { type: Type.STRING },
            effectTokenId:  { type: Type.STRING },
            fontFamily:     { type: Type.STRING },
            accentColor:    { type: Type.STRING },
            panelColor:     { type: Type.STRING },
            templateNameKo: { type: Type.STRING },
            reason:         { type: Type.STRING },
            texts: {
              type: Type.OBJECT,
              properties: {
                ko: {
                  type: Type.OBJECT,
                  properties: {
                    headline:    { type: Type.STRING },
                    subheadline: { type: Type.STRING },
                    price:       { type: Type.STRING },
                    brandKo:     { type: Type.STRING },
                    brandEn:     { type: Type.STRING },
                  },
                  required: ['headline', 'subheadline', 'price', 'brandKo', 'brandEn'],
                },
              },
              required: ['ko'],
            },
          },
          required: ['layoutTokenId', 'effectTokenId', 'fontFamily', 'accentColor', 'panelColor', 'templateNameKo', 'reason', 'texts'],
        },
      },
    })

    const text = response.text
    if (!text) return NextResponse.json({ error: 'AI 응답 없음' }, { status: 500 })

    const data = JSON.parse(text)

    const validLayoutIds = new Set(layouts.map(l => l.id))
    const validEffectIds = new Set(effects.map(e => e.id))
    if (!validLayoutIds.has(data.layoutTokenId)) data.layoutTokenId = layouts[0].id
    if (!validEffectIds.has(data.effectTokenId)) data.effectTokenId = effects[0].id

    return NextResponse.json(data)
  } catch (e: unknown) {
    const err = e as { message?: string }
    console.error('[draft/image] error:', e)
    return NextResponse.json({ error: err?.message ?? String(e) }, { status: 500 })
  }
}
