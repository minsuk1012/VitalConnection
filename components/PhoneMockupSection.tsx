import React from 'react';
import { motion } from 'framer-motion';
import VisitorChart from './VisitorChart';

const PhoneMockupSection: React.FC = () => {
  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          
          {/* Market Insight Section */}
          <div className="lg:w-1/2 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <span className="text-blue-600 font-bold tracking-wide uppercase text-sm">
                MARKET INSIGHT
              </span>
              <h2 className="text-3xl md:text-5xl font-black mt-4 text-gray-900 leading-tight">
                급증하는 <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                  방한 외래관광객
                </span>
              </h2>
              <p className="text-lg text-gray-600 mt-6 leading-relaxed pb-4">
                2024년 11월부터 2025년 10월까지의 데이터는 폭발적인 관광객 증가세를 보여줍니다. 
                지금이 바로 글로벌 환자 유치 마케팅을 시작할 최적의 타이밍입니다.
              </p>
              < VisitorChart />
            </motion.div>
          </div>

          {/* Phone Mockup */}
          <motion.div 
            className="lg:w-1/2 flex justify-center perspective-1000"
            initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
            whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, type: "spring" }}
          >
            <div className="relative mx-auto border-gray-900 bg-gray-900 border-[14px] rounded-[2.5rem] h-[800px] w-[400px] shadow-2xl flex flex-col items-center select-none overflow-hidden z-20">
              {/* Dynamic Island / Notch */}
              <div className="absolute top-0 w-1/3 h-[30px] bg-gray-900 z-30 rounded-b-xl flex justify-center items-center">
                 <div className="w-16 h-4 bg-black rounded-full" />
              </div>
              
              {/* Screen Content */}
              <div className="w-full h-full rounded-[2rem] overflow-hidden bg-black relative">
                 <video 
                   src="/mobile_demo.mp4" 
                   className="w-full h-full object-cover"
                   autoPlay 
                   muted 
                   loop 
                   playsInline
                 />
                 
                 {/* Optional Overlay Gradient for text readability if needed */}
                 <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
              </div>

              {/* Side Buttons (Pure CSS decoration) */}
              <div className="h-[32px] w-[3px] bg-gray-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
              <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
              <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>
            </div>
            
            {/* Background Decor Elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[640px] bg-blue-400/20 rounded-full blur-3xl -z-10" />
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default PhoneMockupSection;
