import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from 'lucide-react';

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onClick: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onClick }) => {
  return (
    <div className="border-b border-gray-100 last:border-none">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between py-6 text-left focus:outline-none group"
      >
        <span className={`text-lg font-bold transition-colors ${isOpen ? 'text-blue-600' : 'text-gray-800 group-hover:text-blue-600'}`}>
          Q. {question}
        </span>
        <div className={`p-2 rounded-full transition-colors ${isOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500'}`}>
          {isOpen ? <Minus size={20} /> : <Plus size={20} />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pb-6 text-gray-600 leading-relaxed pl-4 border-l-2 border-blue-100 ml-1">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "외국어 응대가 가능한 직원이 없는데 입점이 가능한가요?",
      answer: "네, 가능합니다. VitalConnection은 AI 번역 챗봇 시스템과 전담 코디네이터 지원 서비스를 제공합니다. 초기 상담부터 내원 예약까지 플랫폼에서 지원하므로, 병원에서는 진료와 시술에만 집중하실 수 있습니다."
    },
    {
      question: "마케팅 비용은 어떻게 산정되나요?",
      answer: "기본적인 입점은 무료이며, 실제 환자 유치 건에 대한 수수료 모델과 프리미엄 노출을 위한 월 구독 모델로 나뉩니다. 병원의 규모와 니즈에 맞춰 합리적인 플랜을 제안해 드립니다."
    },
    {
      question: "어떤 국가의 환자들이 주로 유입되나요?",
      answer: "현재 데이터상으로는 중국(40%), 일본(25%), 미국(15%), 동남아(10%) 순으로 유입이 많습니다. 병원의 주력 시술 과목에 따라(예: 성형외과는 중국/태국, 피부과는 일본/미국) 타겟 국가를 맞춤 설정해 드립니다."
    },
    {
      question: "계약 후 실제 환자가 방문하기까지 얼마나 걸리나요?",
      answer: "병원 콘텐츠 세팅 및 번역 작업에 약 1~2주가 소요되며, 이후 타겟 마케팅이 시작되면 통상적으로 1개월 이내에 첫 문의 및 예약이 발생합니다. 기존 파트너 병원들은 평균 3개월 차부터 유의미한 매출 증대를 경험하고 있습니다."
    },
    {
      question: "기존 마케팅 대행사와 다른 점은 무엇인가요?",
      answer: "단순 노출(블로그, SNS 포스팅)에 그치지 않습니다. VitalConnection은 '실제 내원'을 목표로 하는 전환 중심 플랫폼입니다. 또한, 자체 보유한 빅데이터를 통해 어떤 국적의 환자가 어떤 시술을 검색하는지 분석하여 과학적인 마케팅 솔루션을 제공합니다."
    }
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Background Icon */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gray-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 translate-x-1/2 translate-y-1/2" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16">
          {/* Header Area */}
          <div className="lg:w-1/3">
            <span className="text-blue-600 font-bold tracking-wide uppercase text-sm mb-2 block">FAQ</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              자주 묻는 질문
            </h2>
            <p className="text-gray-500 text-lg mb-8 leading-relaxed">
              파트너 병원 원장님들이 가장 궁금해하시는 내용을 정리했습니다. 
              더 자세한 내용은 무료 컨설팅을 통해 확인하실 수 있습니다.
            </p>
            <div className="hidden lg:block bg-blue-50 p-6 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-3 mb-2 text-blue-800 font-bold">
                <HelpCircle size={24} />
                <span>궁금증이 해결되지 않으셨나요?</span>
              </div>
              <p className="text-sm text-blue-600 mb-4">
                담당 매니저가 직접 친절하게 안내해 드립니다.
              </p>
              <button 
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-sm font-bold text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition w-full"
              >
                1:1 문의 바로가기
              </button>
            </div>
          </div>

          {/* Accordion List */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-2 md:p-8">
              {faqs.map((faq, index) => (
                <FAQItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openIndex === index}
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                />
              ))}
            </div>
            
            {/* Mobile Only Call to Action */}
            <div className="lg:hidden mt-8 text-center">
               <button 
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-sm font-bold text-blue-600 border border-blue-200 bg-blue-50 px-6 py-3 rounded-xl hover:bg-blue-100 transition"
              >
                더 궁금한 점 문의하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
