
import React, { useState, useMemo } from 'react';
import { Order, Purchase } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ReportsProps {
  orders: Order[];
  purchases: Purchase[];
}

type Timeframe = 'week' | 'month';

const Reports: React.FC<ReportsProps> = ({ orders, purchases }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('week');

  const data = useMemo(() => {
    const daysCount = timeframe === 'week' ? 7 : 30;
    const stats: Record<string, { date: string, label: string, revenue: number, profit: number, cost: number }> = {};
    
    const dates = Array.from({length: daysCount}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d;
    }).reverse();

    dates.forEach(d => {
        const dateKey = d.toLocaleDateString();
        stats[dateKey] = { 
          date: dateKey, 
          label: timeframe === 'week' ? d.toLocaleDateString('vi-VN', {weekday: 'short'}) : d.getDate().toString(),
          revenue: 0, 
          profit: 0, 
          cost: 0 
        };
    });

    orders.filter(o => o.status === 'Hoàn tất').forEach(o => {
        const d = new Date(o.createdAt).toLocaleDateString();
        if (stats[d]) {
            stats[d].revenue += o.totalAmount;
            stats[d].profit += o.profit; // Lợi nhuận đã tính dựa trên giá vốn công thức
        }
    });

    purchases.forEach(p => {
        const d = new Date(p.createdAt).toLocaleDateString();
        if (stats[d]) {
            stats[d].cost += p.totalCost; // Chi phí nhập nguyên liệu
        }
    });

    return Object.values(stats);
  }, [orders, purchases, timeframe]);

  const totalRevenue = useMemo(() => data.reduce((sum, d) => sum + d.revenue, 0), [data]);
  const totalProfit = useMemo(() => data.reduce((sum, d) => sum + d.profit, 0), [data]);
  const totalCost = useMemo(() => data.reduce((sum, d) => sum + d.cost, 0), [data]);

  return (
    <div className="p-4 space-y-6 bg-slate-50 min-h-screen pb-24">
      <header className="flex justify-between items-end">
        <div className="min-w-0 pr-2">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Thống kê sản xuất</h1>
          <p className="text-xs text-slate-500 truncate">Hạch toán doanh thu & nguyên liệu</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <button 
            onClick={() => setTimeframe('week')}
            className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${timeframe === 'week' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
          >
            TUẦN
          </button>
          <button 
            onClick={() => setTimeframe('month')}
            className={`px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all ${timeframe === 'month' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
          >
            THÁNG
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <ReportSummaryCard label="Doanh thu" value={totalRevenue.toLocaleString()} color="text-indigo-600" />
        <ReportSummaryCard label="Lợi nhuận gộp" value={totalProfit.toLocaleString()} color="text-emerald-600" />
        <ReportSummaryCard label="Nhập nguyên liệu" value={totalCost.toLocaleString()} color="text-rose-600" />
        <ReportSummaryCard label="Tỷ suất lời" value={totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) + '%' : '0%'} color="text-blue-600" />
      </div>

      <section className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Biểu đồ tăng trưởng</h3>
          <span className="text-[9px] text-slate-400 font-bold">VNĐ</span>
        </div>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#94a3b8'}} tickFormatter={(val) => val >= 1000 ? (val/1000).toFixed(0)+'k' : val} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px'}} />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]} barSize={12}>
                 {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.revenue > 0 ? '#4f46e5' : '#e2e8f0'} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest px-1">Lịch sử dòng tiền</h3>
        <div className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-50 overflow-hidden shadow-sm">
           {data.slice().reverse().filter(d => d.revenue > 0 || d.cost > 0).map((day, i) => (
              <div key={i} className="p-4 flex justify-between items-center">
                 <div>
                   <p className="text-sm font-bold text-slate-700">{day.date}</p>
                   <p className="text-[9px] text-slate-400 font-bold uppercase">{day.label}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-sm font-black text-indigo-600">+{day.revenue.toLocaleString()}đ</p>
                   <p className="text-[10px] text-rose-500 font-bold">-{day.cost.toLocaleString()}đ</p>
                 </div>
              </div>
           ))}
        </div>
      </section>
    </div>
  );
};

const ReportSummaryCard: React.FC<{ label: string, value: string, color: string }> = ({ label, value, color }) => (
  <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
    <p className="text-[9px] uppercase font-bold text-slate-400 mb-1 tracking-widest">{label}</p>
    <p className={`text-base font-black ${color} tracking-tight`}>{value}</p>
  </div>
);

export default Reports;
