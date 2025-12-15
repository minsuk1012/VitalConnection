import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Sparkles, TrendingUp, Lightbulb } from 'lucide-react';
import { analyzeMarketPotential } from '../services/geminiService';
import { MarketAnalysisResult } from '../types';

const MarketAnalyzer: React.FC = () => {
  const [specialty, setSpecialty] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MarketAnalysisResult | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialty.trim()) return;

    setLoading(true);
    setResult(null);
    try {
      const data = await analyzeMarketPotential(specialty);
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-blue-100 relative">
      <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
        <Sparkles size={100} className="text-blue-500" />
      </div>

      <div className="p-8 md:p-12">
        <div className="text-center mb-8">
          <span className="inline-block py-1 px-3 rounded-full bg-blue-100 text-blue-600 text-sm font-bold mb-3">
            AI Market Insights
          </span>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">
            우리 병원의 <span className="text-blue-600">글로벌 경쟁력</span>은?
          </h3>
          <p className="text-gray-500">
            주력 진료과목을 입력하면 Gemini AI가 현재 글로벌 트렌드와 마케팅 팁을 분석해드립니다.
          </p>
        </div>

        <form onSubmit={handleAnalyze} className="relative max-w-xl mx-auto mb-10">
          <input
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="예: 코 성형, 안티에이징, 모발이식"
            className="w-full pl-6 pr-32 py-4 rounded-full border-2 border-blue-100 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 text-lg shadow-sm transition-all"
          />
          <button
            type="submit"
            disabled={loading || !specialty}
            className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><Search size={20} /> 분석하기</>}
          </button>
        </form>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 md:p-8 border border-blue-100 shadow-inner"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600">
                  <Sparkles size={24} />
                </div>
                <h4 className="text-xl font-bold text-gray-800">
                  <span className="text-blue-600">{result.specialty}</span> 분야 분석 결과
                </h4>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h5 className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
                    <TrendingUp size={18} className="text-emerald-500" />
                    주요 글로벌 트렌드
                  </h5>
                  <ul className="space-y-2">
                    {result.trends.map((trend, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-white p-3 rounded-xl shadow-sm text-gray-600 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                          {idx + 1}
                        </span>
                        {trend}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5 className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
                    <Lightbulb size={18} className="text-amber-500" />
                    추천 마케팅 전략
                  </h5>
                  <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-amber-400 h-full flex flex-col justify-center">
                    <p className="text-gray-700 italic font-medium leading-relaxed">
                      "{result.marketingTip}"
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-400">
                  * 위 분석은 Google Gemini AI를 통해 실시간으로 생성되었습니다.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MarketAnalyzer;
