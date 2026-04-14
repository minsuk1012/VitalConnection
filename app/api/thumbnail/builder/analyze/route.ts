// app/api/thumbnail/builder/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI, Type } from '@google/genai'
import { checkAdmin } from '@/lib/auth'
import { PATHS } from '@/lib/thumbnail'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const authError = await checkAdmin()
  if (authError) return authError

  const apiKey = process.env.GEMINI_THUMBNAIL_EDITOR_TRANSLATE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI API 키 없음' }, { status: 500 })

  const { imageType, selectedImageFile, layouts } = await req.json()
  if (!selectedImageFile || !layouts?.length) {
    return NextResponse.json({ error: 'selectedImageFile, layouts 필수' }, { status: 400 })
  }

  const dir     = imageType === 'cutout' ? PATHS.cutout : PATHS.models
  const imgFile = selectedImageFile
  const imgPath = path.join(dir, imgFile)
  if (!fs.existsSync(imgPath)) {
    return NextResponse.json({ error: `파일 없음: ${imgPath}` }, { status: 404 })
  }
  const imgData  = fs.readFileSync(imgPath).toString('base64')
  const mimeType = imgFile.endsWith('.png') ? 'image/png' : 'image/jpeg'

  const layoutList = layouts.map((l: { id: string; name: string; description: string }) =>
    `- id: "${l.id}", 이름: "${l.name}", 설명: "${l.description}"`
  ).join('\n')

  const prompt = `당신은 K-Beauty 뷰티 시술 광고 썸네일 디자인 전문가입니다.
아래 이미지를 분석하여 주어진 레이아웃 토큰 목록 중 가장 잘 어울리는 3개를 추천하세요.

분석 기준:
- 모델의 시선 방향과 여백 위치
- 피사체 구도 (상반신/전신/클로즈업)
- 이미지 전체 밝기와 색감 (어둡다면 overlay, 밝다면 split/solid)
- 텍스트가 가독성 있게 들어갈 수 있는 공간

레이아웃 토큰 목록:
${layoutList}

응답: confidence가 높은 순으로 3개 추천. fontFamily는 아래 중 하나 선택:
BlackHan (임팩트 고딕), Pretendard (모던 고딕), Playfair (세리프 럭셔리), Bebas (영문 전용 임팩트), Montserrat (영문 모던)`

  try {
    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: imgData } },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  layoutTokenId: { type: Type.STRING },
                  confidence:    { type: Type.NUMBER },
                  reason:        { type: Type.STRING },
                  fontFamily:    { type: Type.STRING },
                },
                required: ['layoutTokenId', 'confidence', 'reason', 'fontFamily'],
              },
            },
          },
          required: ['suggestions'],
        },
      },
    })

    const text = response.text
    if (!text) return NextResponse.json({ error: 'AI 응답 없음' }, { status: 500 })

    const data = JSON.parse(text)
    const validIds = new Set(layouts.map((l: { id: string }) => l.id))
    data.suggestions = data.suggestions.filter((s: { layoutTokenId: string }) => validIds.has(s.layoutTokenId))

    return NextResponse.json(data)
  } catch (e: any) {
    console.error('[builder/analyze] error:', e)
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
