import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { year: '2020', patients: 15 },
  { year: '2021', patients: 25 },
  { year: '2022', patients: 45 },
  { year: '2023', patients: 80 },
  { year: '2024', patients: 150 },
  { year: '2025', patients: 220 },
];

const GrowthChart: React.FC = () => {
  return (
    <div className="w-full h-[300px] bg-white rounded-2xl p-4 shadow-sm">
      <h4 className="text-lg font-bold text-gray-800 mb-4 text-center">파트너 병원 평균 해외 환자 유입 추이</h4>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#9CA3AF'}} />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
          />
          <Area 
            type="monotone" 
            dataKey="patients" 
            stroke="#2563EB" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorPatients)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GrowthChart;
