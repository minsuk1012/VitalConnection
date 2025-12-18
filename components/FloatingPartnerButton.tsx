"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Sparkles } from 'lucide-react';

const FloatingPartnerButton = () => {
  return (
    <motion.a
      href="https://partner.k-beautypass.com/"
      target="_blank"
      rel="noopener noreferrer"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, type: "spring" }}
      className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-50 group"
    >
      <div className="relative flex items-center gap-3 bg-white pl-5 pr-2 py-2 rounded-full shadow-2xl border border-pink-100 hover:border-pink-200 transition-all duration-300">
        {/* Text Container */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-pink-500 tracking-wider">Partner Service</span>
          <span className="text-sm font-extrabold text-gray-800">뷰티패스 이동하기</span>
        </div>

        {/* Icon Circle */}
        <div className="w-10 h-10 bg-gradient-to-tr from-pink-500 to-rose-400 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
          <ExternalLink size={18} />
        </div>

        {/* Animated Badge/Tag */}
         <motion.div 
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-3 -right-2 bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border-2 border-white"
        >
          HOT
        </motion.div>
      </div>

      {/* Hover Tooltip/Description */}
      <div className="absolute bottom-full right-0 mb-3 w-64 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
        <div className="bg-gray-900/90 backdrop-blur-sm text-white text-xs p-3 rounded-xl shadow-xl relative">
          해외 환자 유치를 위한<br/>
          <span className="text-pink-300 font-bold">글로벌 뷰티 플랫폼</span> 서비스입니다.
          <div className="absolute -bottom-1 right-8 w-2 h-2 bg-gray-900/90 rotate-45" />
        </div>
      </div>
    </motion.a>
  );
};

export default FloatingPartnerButton;
