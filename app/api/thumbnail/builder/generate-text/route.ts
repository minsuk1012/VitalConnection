// app/api/thumbnail/builder/generate-text/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import { checkAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const apiKey = process.env.GEMINI_THUMBNAIL_EDITOR_TRANSLATE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI API 키 없음' }, { status: 500 })

  const { ko, targetLang } = await req.json()
  if (!ko?.headline || !targetLang) {
    return NextResponse.json({ error: 'ko.headline, targetLang 필수' }, { status: 400 })
  }

  const LANG_NAMES: Record<string, string> = { en: 'English', ja: 'Japanese', zh: 'Simplified Chinese' }
  const langName = LANG_NAMES[targetLang]
  if (!langName) return NextResponse.json({ error: `지원하지 않는 targetLang: ${targetLang}. 허용값: en, ja, zh` }, { status: 400 })

  const prompt = `You are a professional translator for Korean beauty clinic marketing.
Translate the following Korean beauty clinic thumbnail texts into ${langName}.

Rules:
- Keep medical/aesthetic procedure names accurate (e.g. 울쎄라→Ulthera, 써마지→Thermage, 보톡스→Botox, 리쥬란→Rejuran, 필러→Filler)
- Maintain the short, punchy promotional tone suitable for social media thumbnails
- brandKo: translate to appropriate romanization or local equivalent
- price: keep as-is (just copy the Korean price string)
- If a field is empty string, return empty string

Korean input:
- headline: ${JSON.stringify(ko.headline)}
- subheadline: ${JSON.stringify(ko.subheadline ?? '')}
- price: ${JSON.stringify(ko.price ?? '')}
- brandEn: ${JSON.stringify(ko.brandEn ?? '')}
- brandKo: ${JSON.stringify(ko.brandKo ?? '')}`

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline:    { type: Type.STRING },
            subheadline: { type: Type.STRING },
            price:       { type: Type.STRING },
            brandEn:     { type: Type.STRING },
            brandKo:     { type: Type.STRING },
          },
          required: ['headline', 'subheadline', 'price', 'brandEn', 'brandKo'],
        },
      },
    })

    const text = response.text
    if (!text) return NextResponse.json({ error: 'AI 응답 없음' }, { status: 500 })

    return NextResponse.json(JSON.parse(text))
  } catch (e: any) {
    console.error('[builder/generate-text] error:', e)
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
