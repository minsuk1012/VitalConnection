import React from 'react';
import { motion } from 'framer-motion';
import { Globe, MessageCircle, Plane, ArrowRight } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: "정밀 타겟팅",
    desc: "현지 검색 트렌드와 빅데이터를 분석하여 한국 의료에 관심 있는 잠재 고객을 발굴합니다.",
    icon: <Globe size={32} className="text-white" />,
    color: "from-blue-400 to-blue-600",
    shadow: "shadow-blue-500/30"
  },
  {
    id: 2,
    title: "1:1 밀착 상담",
    desc: "AI 번역 시스템과 전문 코디네이터가 언어 장벽 없이 내원 전 신뢰를 구축합니다.",
    icon: <MessageCircle size={32} className="text-white" />,
    color: "from-indigo-400 to-indigo-600",
    shadow: "shadow-indigo-500/30"
  },
  {
    id: 3,
    title: "내원 및 케어",
    desc: "공항 픽업부터 진료, 사후 관리까지 끊김 없는(Seamless) 경험을 제공합니다.",
    icon: <Plane size={32} className="text-white" />,
    color: "from-purple-400 to-purple-600",
    shadow: "shadow-purple-500/30"
  }
];

const ProcessInfographic: React.FC = () => {
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <span className="inline-block py-1 px-3 rounded-full bg-blue-100 text-blue-600 text-sm font-bold mb-3">
          HOW IT WORKS
        </span>
        <h3 className="text-3xl md:text-4xl font-bold text-gray-900">
          환자가 병원에 도착하기까지<br />
          <span className="text-blue-600">VitalConnection의 3-Step 시스템</span>
        </h3>
      </div>

      <div className="relative grid md:grid-cols-3 gap-8 px-4">
        {/* Connecting Line (Desktop) */}
        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-1 bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 -z-10 rounded-full" />

        {steps.map((step, idx) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.2 }}
            className="relative"
          >
            {/* Floating Card Animation */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: idx * 1.5 // Stagger the floating effect
              }}
              className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex flex-col items-center text-center h-full relative z-10 hover:border-blue-300 transition-colors"
            >
              {/* 3D Badge Icon */}
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-lg ${step.shadow} transform -rotate-3 border-4 border-white ring-1 ring-gray-100`}>
                {step.icon}
              </div>

              <h4 className="text-xl font-bold text-gray-800 mb-3">{step.title}</h4>
              <p className="text-gray-500 leading-relaxed text-sm">
                {step.desc}
              </p>

              {/* Mobile Arrow (Visual connector for mobile only) */}
              {idx < steps.length - 1 && (
                <div className="md:hidden absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-gray-300">
                  <ArrowRight size={24} className="rotate-90" />
                </div>
              )}
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ProcessInfographic;
