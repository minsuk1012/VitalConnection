import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY 없음' }, { status: 500 })

  const { headline, sub, tagline } = await req.json()

  try {
    const ai = new GoogleGenAI({ apiKey })

    const prompt = `You are a professional translator for Korean beauty clinic marketing.
Translate the following Korean texts into English (en), Japanese (ja), and Simplified Chinese (zh).
- Keep medical/aesthetic procedure names accurate (e.g. 울쎄라→Ulthera, 써마지→Thermage, 보톡스→Botox, 리쥬란→Rejuran)
- Maintain the short, punchy promotional tone
- If a field is empty string, return empty string

headline: "${headline}"
sub: "${sub}"
tagline: "${tagline}"`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            en: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                sub:      { type: Type.STRING },
                tagline:  { type: Type.STRING },
              },
              required: ['headline', 'sub', 'tagline'],
            },
            ja: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                sub:      { type: Type.STRING },
                tagline:  { type: Type.STRING },
              },
              required: ['headline', 'sub', 'tagline'],
            },
            zh: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                sub:      { type: Type.STRING },
                tagline:  { type: Type.STRING },
              },
              required: ['headline', 'sub', 'tagline'],
            },
          },
          required: ['en', 'ja', 'zh'],
        },
      },
    })

    const text = response.text
    if (!text) return NextResponse.json({ error: 'AI 응답 없음' }, { status: 500 })

    return NextResponse.json(JSON.parse(text))
  } catch (e: any) {
    console.error('[translate] error:', e)
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    )
  }
}
