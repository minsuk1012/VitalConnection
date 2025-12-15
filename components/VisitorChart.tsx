import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { month: '24.11', visitors: 1361076 },
  { month: '12', visitors: 1270863 },
  { month: '25.01', visitors: 1117243 },
  { month: '02', visitors: 1138408 },
  { month: '03', visitors: 1614596 },
  { month: '04', visitors: 1707113 },
  { month: '05', visitors: 1629387 },
  { month: '06', visitors: 1619220 },
  { month: '07', visitors: 1733199 },
  { month: '08', visitors: 1820332 },
  { month: '09', visitors: 1702813 },
  { month: '10', visitors: 1739020 },
];

const VisitorChart: React.FC = () => {
  // Find max value to highlight
  const maxVisitors = Math.max(...data.map(d => d.visitors));

  return (
    <div className="w-full h-[300px] flex flex-col">
      <div className="flex-grow">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{fill: '#6B7280', fontSize: 11, fontWeight: 500}} 
            dy={10}
            interval={0}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{fill: '#9CA3AF', fontSize: 11}} 
            tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
          />
          <Tooltip 
             cursor={{fill: 'rgba(0,0,0,0.05)'}}
             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
             formatter={(value: number) => [new Intl.NumberFormat('ko-KR').format(value) + '명', '방한 외래객']}
             labelStyle={{ color: '#374151', fontWeight: 'bold' }}
          />
          <Bar dataKey="visitors" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.visitors === maxVisitors ? '#2563EB' : '#93C5FD'} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
};

export default VisitorChart;
