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
      question: "브로커와 무엇이 다른가요? 병원 브랜드에 악영향은 없나요?",
      answer: "브로커 방식은 환자 한 명 단위로 커미션이 움직여 유입이 들쭉날쭉하고, 병원이 통제할 수 없는 리스크가 큽니다.\nVitalConnection은 병원 내부에 남는 구조를 만드는 것이 핵심입니다.\n• 병원 브랜딩 기반의 콘텐츠·전략\n• 국가별 유입 구조 설계\n• 장기적인 환자 신뢰 확보\n즉, 브로커 방식처럼 병원을 소모시키지 않고, 병원이 스스로 성장하는 시스템을 구축합니다."
    },
    {
      question: "외국인 상담·통역은 누가 담당하나요? 병원 인력 채용이 필요한가요?",
      answer: "병원에서 별도로 외국인 직원을 채용할 필요가 없습니다.\n전담 상담팀이 중국어·영어로 문의 대응, 예약 조율, 사후관리까지 모두 진행합니다.\n병원은 진료와 운영 의사결정에 집중하시면 됩니다."
    },
    {
      question: "샤오홍슈 운영도 함께 해주시나요? 콘텐츠는 누가 제작하나요?",
      answer: " 네. 샤오홍슈 공식 계정 개설·인증·운영까지 모두 포함되어 있습니다.\n• 콘텐츠 기획, 촬영, 편집, 업로드\n• 브랜드 톤에 맞춘 바이럴 디자인\n 체험단·왕홍(인플루언서) 협업\n병원 색을 해치지 않도록, 브랜딩 기반의 콘텐츠를 제작합니다."
    },
    {
      question: "우리 병원의 브랜드 방향성이 훼손되진 않을까요?",
      answer: "방향성이 흐려지거나 과잉 마케팅으로 노출되는 방식은 지양합니다.\n초기 브랜드 진단을 기반으로 병원의 톤과 콘셉트에 맞는 콘텐츠·전략만 적용하며\n모든 유출 지점에서 브랜드 일관성이 유지되도록 관리합니다."
    },
    {
      question: "기존 마케팅 대행사와 다른 점은 무엇인가요?",
      answer: "가격 투명성·진료 기준·리뷰 대응이 중요합니다.\n이를 위해 다국어 안내·진료 기준 가이드·리뷰 관리 프로세스를 함께 설계합니다.\n과도한 할인/유인 구조를 사용하지 않기 때문에\n병원의 평판과 신뢰를 손상시키지 않습니다."
    },
    {
      question: "비용 구조는 어떻게 되나요? 초기 비용이 많이 드나요?",
      answer: "초기 부담을 줄인 정액제 또는 성과 기반 구조 중 선택 가능합니다.\n브로커식 30% 수준의 높은 커미션 구조가 아니라, 병원 수익성이 보장되는 방식으로 설계됩니다."
    },
    {
      question: "샤오홍슈 왕홍(인플루언서)·체험단 섭외도 가능할까요?",
      answer: "가능합니다.\n중화권·영어권 인플루언서를 상황에 맞게 연결하며,\n촬영–편집–업로드–바이럴까지 전 과정이 포함됩니다. "
    },
    {
      question: "병원 내부 외국인 환자 동선·운영 준비는 어떻게 해야 하나요?",
      answer: "원내 대응이 가능하도록 다국어 동의서·안내문·CS 응대 가이드를 제공합니다.\n예약–내원–시술–사후관리까지 고객 여정이 안정적으로 흘러가도록\n병원 내부 운영까지 세팅해드립니다."
    },
    {
      question: "외국인 환자 유입이 단기적으로 끝나지 않을까요?",
      answer: "\단기 유입보다 지속 가능한 구조 구축이 목적입니다.\n• 플랫폼 → 상담 → 내원 → 리뷰 → 온라인 확산\n환자 경험이 다시 유입으로 이어지는 선순환 구조를 만들기 때문에\n병원이 플랫폼·브로커에 의존하지 않는 흐름이 형성됩니다."
    },
    {
      question: "우리 병원 상황에 맞춰 전략 조정이 가능한가요?",
      answer: "가능합니다.\n병원별로 기반 상황이 다르기 때문에\n시술 포트폴리오·가격 구조·환자 유형·시장 포지션을 반영해\n맞춤형 전략을 주기적으로 조정합니다."
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
