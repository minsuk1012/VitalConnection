"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, 
  MessageCircle, 
  TrendingUp, 
  Users, 
  X,
  Menu, // Added Menu import which seemed missing in original or implicit
  Plane,
  Mail,
  MapPin
} from 'lucide-react';
import VisitorChart from '../components/VisitorChart';
import NationalityChart from '../components/NationalityChart';
import ProcessInfographic from '../components/ProcessInfographic';
import FAQSection from '../components/FAQSection';
import PhoneMockupSection from '../components/PhoneMockupSection';
import FloatingPartnerButton from '../components/FloatingPartnerButton';
import { submitInquiry } from './actions';

const App: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    hospital: '',
    phone: '',
    email: ''
  });

  const handleScroll = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitInquiry(formData);
      alert("문의가 접수되었습니다. 담당자가 곧 연락드리겠습니다.");
      setFormData({ name: '', hospital: '', phone: '', email: '' });
    } catch (error) {
      console.error(error);
      alert("문의 접수 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const floatAnimation = {
    y: [0, -15, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  };  

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-2xl">
            {/* Logo Replacement: Coded Icon instead of missing image */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white">
              <img src="/favicon.png" className="w-full h-full object-contain" alt="VitalConnection Logo" />
            </div>
            <span className="tracking-tight">VitalConnection</span>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 font-medium text-gray-600">
            <button onClick={() => handleScroll('about')} className="hover:text-blue-600 transition">서비스 소개</button>
            <button onClick={() => handleScroll('process')} className="hover:text-blue-600 transition">진행 과정</button>
            <button onClick={() => handleScroll('market-insight')} className="hover:text-blue-600 transition">시장 분석</button>

            <button 
              onClick={() => handleScroll('contact')}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-full hover:bg-blue-700 transition shadow-lg hover:shadow-blue-500/30"
            >
              무료 상담 신청
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="md:hidden bg-white border-t"
          >
            <div className="flex flex-col p-6 gap-4 font-medium">
              <button onClick={() => handleScroll('about')}>서비스 소개</button>
              <button onClick={() => handleScroll('process')}>진행 과정</button>
              <button onClick={() => handleScroll('market-insight')}>시장 분석</button>

              <button onClick={() => handleScroll('contact')} className="text-blue-600 font-bold">무료 상담 신청</button>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-gradient-to-b from-blue-50 to-white">
        {/* Background Decorative Blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-200/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:w-1/2 text-center lg:text-left"
            >
              <div className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 font-semibold rounded-full mb-6 text-sm">
                병원 전문 글로벌 마케팅 에이전시
              </div>
              <h1 className="text-4xl lg:text-6xl font-black leading-tight mb-6 text-gray-900">
                대한민국의 의료기술, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                  세계와 연결합니다.
                </span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                외국인 환자 유치, 더 이상 고민하지 마세요. 
                VitalConnection의 데이터 기반 올인원 솔루션으로 
                귀원의 글로벌 브랜딩을 시작하세요.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button 
                  onClick={() => handleScroll('contact')}
                  className="px-8 py-4 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 transition shadow-xl hover:shadow-blue-500/40 transform hover:-translate-y-1"
                >
                  입점 문의하기
                </button>
                <button 
                  onClick={() => handleScroll('about')}
                  className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-full font-bold text-lg hover:bg-gray-50 transition"
                >
                  서비스 더보기
                </button>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="lg:w-1/2 relative"
            >
              {/* Central Illustration Placeholder */}
              <motion.div 
                animate={floatAnimation}
                className="relative z-10"
              >
                <img 
                  src="/image.png" 
                  alt="Global Marketing 3D" 
                  className="rounded-3xl shadow-2xl w-full object-cover h-[400px] lg:h-[500px]"
                />
                
                {/* Floating Card 1: Stats */}
                <div className="absolute -left-4 md:-left-12 top-10 bg-white p-4 rounded-2xl shadow-xl w-48 md:w-64 z-20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">월간 문의</p>
                      <p className="font-bold text-gray-800">+245%</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[70%]" />
                  </div>
                </div>

                {/* Floating Card 2: Global Reach */}
                <div className="absolute -right-4 md:-right-8 bottom-20 bg-white p-4 rounded-2xl shadow-xl z-20">
                   <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                      <Plane size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Global Patients</p>
                      <p className="text-xs text-gray-500">12 Countries Connected</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* New Process Infographic Section */}
      <section id="process" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <ProcessInfographic />
        </div>
      </section>

      {/* Services Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-blue-600 font-bold tracking-wide uppercase text-sm">Our Expertise</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 text-gray-900">
              병원 맞춤형 <span className="text-blue-600">All-in-One</span> 솔루션
            </h2>
            <p className="text-gray-500 mt-4 max-w-2xl mx-auto">
              단순 광고 대행이 아닙니다. 병원의 특장점을 분석하여 
              진성 환자를 유입시키는 전략적 파트너입니다.
            </p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {[
              { title: "타겟 국가 최적화", desc: "국가별 선호 시술 데이터 분석 및 현지화 마케팅", icon: <Globe size={32} /> },
              { title: "다국어 SEO/SEM", desc: "구글 상위 노출 및 키워드 점유 전략", icon: <TrendingUp size={32} /> },
              { title: "인플루언서 연계", desc: "해외 뷰티 유튜버/틱톡커 협업 콘텐츠 제작", icon: <Users size={32} /> },
              { title: "실시간 상담 지원", desc: "AI 챗봇 및 현지 코디네이터 연결 시스템", icon: <MessageCircle size={32} /> },
            ].map((service, idx) => (
              <motion.div 
                key={idx}
                variants={itemVariants}
                whileHover={{ y: -10 }}
                className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 hover:border-blue-200 transition-all group"
              >
                <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-800">{service.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{service.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Phone Mockup Section */}
      <PhoneMockupSection />

      {/* NEW SECTION: Nationality Breakdown */}
      <section className="py-24 bg-gray-50 border-t border-gray-200" id="market-insight">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="lg:w-1/2 space-y-6">
              <span className="inline-block py-1 px-3 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
                GLOBAL TARGETING
              </span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                어디서 온 환자를 <br/>
                <span className="text-emerald-600">집중 공략</span>해야 할까요?
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                중국과 일본은 여전히 가장 큰 비중을 차지하는 핵심 시장입니다.
                하지만 최근 <span className="font-bold text-gray-900">대만과 미국의 성장세</span> 또한 무시할 수 없습니다.
              </p>
              
              <ul className="space-y-4 mt-4">
                <li className="flex items-start gap-3">
                  <div className="bg-white p-2 rounded-full shadow-sm text-red-500">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <strong className="block text-gray-900">중화권 (중국/대만/홍콩)</strong>
                    <span className="text-sm text-gray-500">쁘띠 시술 및 안티에이징 수요 집중, SNS 마케팅 필수</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-white p-2 rounded-full shadow-sm text-blue-500">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <strong className="block text-gray-900">일본</strong>
                    <span className="text-sm text-gray-500">피부 관리 및 성형외과 재방문율 1위, 꼼꼼한 후기 관리 중요</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="bg-white p-2 rounded-full shadow-sm text-indigo-500">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <strong className="block text-gray-900">미국/영어권</strong>
                    <span className="text-sm text-gray-500">고단가 수술 및 웰니스 관광 수요 증가, 검색엔진 최적화(SEO) 유리</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="lg:w-1/2 w-full">
              <NationalityChart />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gradient-to-br from-gray-900 to-blue-900 text-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2">
              <h2 className="text-4xl font-bold mb-6">지금 바로 시작하세요</h2>
              <p className="text-blue-200 text-lg mb-8">
                글로벌 환자 유치, 망설이는 순간에도 경쟁 병원은 앞서가고 있습니다.
                무료 진단 컨설팅을 신청하시면 귀원의 해외 진출 가능성을 분석해드립니다.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                  <div className="bg-blue-600 p-3 rounded-full">
                    <Mail size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-blue-200">Email Us</p>
                    <p className="font-bold">vitalconnect@naver.com</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                   <div className="bg-emerald-600 p-3 rounded-full">
                    <MessageCircle size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-blue-200">파트너십 문의</p>
                    <p className="font-bold">010-5769-2138</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 w-full bg-white text-gray-800 rounded-3xl p-8 lg:p-10 shadow-2xl">
              <h3 className="text-2xl font-bold mb-6">입점 및 제휴 문의</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">병원명</label>
                  <input 
                    type="text" 
                    name="hospital"
                    value={formData.hospital}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="예: 바이탈 성형외과"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담당자 성함</label>
                  <input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="010-0000-0000"
                    required
                  />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="example@hospital.com"
                    required
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition transform hover:scale-[1.02] mt-2"
                >
                  무료 컨설팅 신청하기
                </button>
                <p className="text-center text-xs text-gray-400 mt-4">
                  보내주신 정보는 상담 목적으로만 사용되며, 안전하게 보호됩니다.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 font-bold text-xl text-white">
              {/* Footer Logo Replacement */}
              <div className="w-7 h-7 rounded-md flex items-center justify-center text-white">
                <img src="/favicon.png" alt="Logo" />
              </div>
              <span>VitalConnection</span>
            </div>
            <div className="flex gap-8 text-sm">
              <a href="#" className="hover:text-white transition">이용약관</a>
              <a href="#" className="hover:text-white transition">개인정보처리방침</a>
              <a href="#" className="hover:text-white transition">FAQ</a>
            </div>
            <div className="text-sm">
              &copy; 2024 VitalConnection Inc. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
      <FloatingPartnerButton />
    </div>
  );
};

export default App;
