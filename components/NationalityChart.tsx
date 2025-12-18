import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

const data = [
  { country: '중국', visitors: 531, raw: '5,313,896', color: '#EF4444', flag: '🇨🇳' },
  { country: '일본', visitors: 358, raw: '3,577,043', color: '#3B82F6', flag: '🇯🇵' },
  { country: '대만', visitors: 181, raw: '1,807,323', color: '#10B981', flag: '🇹🇼' },
  { country: '미국', visitors: 145, raw: '1,449,861', color: '#6366F1', flag: '🇺🇸' },
  { country: '홍콩', visitors: 61, raw: '610,711', color: '#F59E0B', flag: '🇭🇰' },
];

const NationalityChart: React.FC = () => {
  return (
    <div className="w-full h-[500px] bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 flex flex-col">
      <div className="mb-6 text-center md:text-left">
           <h4 className="text-xl font-bold text-gray-900">국적별 방한 외래객 TOP 5</h4>
           <p className="text-sm text-gray-500 mt-1">주요 타겟 국가별 방문 규모 (2024~2025 기준)</p>
      </div>
      
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 40, right: 10, left: 10, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
            <XAxis 
              dataKey="country" 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#374151', fontSize: 14, fontWeight: 700}}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#9CA3AF', fontSize: 12}}
              domain={[0, 600]}
              ticks={[0, 100, 200, 300, 400, 500, 600]}
              tickFormatter={(value) => value === 0 ? '0' : `${value}만`} 
            />
            <Tooltip 
              cursor={{fill: '#F3F4F6'}}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              formatter={(value: number, name: string, props: any) => [`${props.payload.raw}명`, '방문객']}
            />
            <Bar dataKey="visitors" radius={[12, 12, 0, 0]} barSize={50} animationDuration={1500}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />
              ))}
              <LabelList 
                dataKey="flag" 
                position="top" 
                fontSize={32} 
                offset={10}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default NationalityChart;
