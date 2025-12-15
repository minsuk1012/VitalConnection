import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

const data = [
  { year: '2024', visitors: 120, label: '120만' },
  { year: '2025', visitors: 180, label: '180만' },
];

const VisitorChart: React.FC = () => {
  return (
    <div className="w-full h-[400px] bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 flex flex-col">
      <div className="mb-6">
           <h4 className="text-xl font-bold text-gray-900">연도별 방한 외래객 추이</h4>
           <p className="text-sm text-gray-500 mt-1">외래객 규모 지속 성장 전망 (단위: 만 명)</p>
      </div>
      
      <div className="flex-grow">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 30, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis 
            dataKey="year" 
            axisLine={false} 
            tickLine={false} 
            tick={{fill: '#4B5563', fontSize: 16, fontWeight: 700}} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{fill: '#9CA3AF', fontSize: 12}} 
            domain={[0, 200]}
            ticks={[0, 45, 90, 135, 180]}
          />
          <Tooltip 
             cursor={{fill: 'transparent'}}
             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
             formatter={(value: number) => [`${value}만 명`, '방한 외래객']}
          />
          <Bar dataKey="visitors" radius={[12, 12, 0, 0]} barSize={80}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index === 1 ? '#2563EB' : '#93C5FD'} />
            ))}
             <LabelList 
                dataKey="label" 
                position="top" 
                fill="#1F2937" 
                fontSize={16} 
                fontWeight="bold" 
                offset={10}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
};

export default VisitorChart;
