import { GoogleGenAI, Type } from "@google/genai";
import { MarketAnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeMarketPotential = async (specialty: string): Promise<MarketAnalysisResult> => {
  try {
    const prompt = `
      You are a world-class medical tourism marketing consultant.
      A Korean clinic specializing in "${specialty}" wants to attract international patients.
      
      Provide a brief analysis with the following structure:
      - Specialty name
      - 3 Trends (Short & punchy)
      - One actionable, high-impact marketing tip
      
      Keep the tone professional, encouraging, and insightful. Write in Korean.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            specialty: { type: Type.STRING },
            trends: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            marketingTip: { type: Type.STRING }
          },
          required: ["specialty", "trends", "marketingTip"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const parsed = JSON.parse(text);
    return parsed as MarketAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Fallback data in case of error
    return {
      specialty: specialty,
      trends: [
        "글로벌 수요가 지속적으로 증가하고 있습니다.",
        "K-뷰티에 대한 관심이 높은 국가를 타겟팅하세요.",
        "비대면 상담 시스템이 중요한 경쟁력입니다."
      ],
      marketingTip: "해당 시술의 전후 사진을 활용한 숏폼 콘텐츠를 제작해보세요."
    };
  }
};