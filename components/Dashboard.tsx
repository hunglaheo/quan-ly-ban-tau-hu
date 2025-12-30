
import React, { useEffect, useState } from 'react';
import { Order, Product, SalesInsight } from '../types';
import { geminiService } from '../services/geminiService';

interface DashboardProps {
  orders: Order[];
  products: Product[];
}

const Dashboard: React.FC<DashboardProps> = ({ orders, products }) => {
  const [insight, setInsight] = useState<SalesInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const stats = React.useMemo(() => {
    const today = new Date().toLocaleDateString();
    const todayOrders = orders.filter(o => new Date(o.createdAt).toLocaleDateString() === today);
    const revenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const profit = todayOrders.reduce((sum, o) => sum + o.profit, 0);
    const lowStockCount = products.filter(p => p.stock < 10).length;

    return { revenue, profit, lowStockCount, orderCount: todayOrders.length };
  }, [orders, products]);

  useEffect(() => {
    const fetchInsight = async () => {
      setLoadingInsight(true);
      const res = await geminiService.getSalesInsights(orders, products);
      setInsight(res);
      setLoadingInsight(false);
    };
    if (orders.length > 0) fetchInsight();
  }, []);

  return (
    <div className="p-4 space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">QuickSales Pro</h1>
          <p className="text-sm text-slate-500 font-medium">Kinh doanh hiệu quả hơn mỗi ngày</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-100">
          AD
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Doanh thu hôm nay" value={stats.revenue.toLocaleString() + 'đ'} color="bg-indigo-600" />
        <StatCard label="Lợi nhuận gộp" value={stats.profit.toLocaleString() + 'đ'} color="bg-emerald-600" />
        <StatCard label="Đơn thành công" value={stats.orderCount.toString()} color="bg-blue-500" />
        <StatCard label="Cảnh báo kho" value={stats.lowStockCount.toString()} color="bg-rose-500" />
      </div>

      <section className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Trợ lý Phân Tích AI</h2>
        </div>
        
        {loadingInsight ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-100 rounded-lg w-3/4"></div>
            <div className="h-4 bg-slate-100 rounded-lg w-1/2"></div>
          </div>
        ) : insight ? (
          <div className="space-y-4">
            <p className="text-slate-700 text-sm leading-relaxed font-medium">{insight.summary}</p>
            <div className="flex flex-wrap gap-2">
              {insight.suggestions.map((s, i) => (
                <span key={i} className="text-[10px] bg-slate-50 text-slate-600 px-3 py-1.5 rounded-full font-bold border border-slate-100">
                  {s}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-xs italic">Đang cập nhật phân tích thị trường...</p>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Đơn hàng mới nhất</h3>
        </div>
        <div className="space-y-3">
          {orders.slice(-3).reverse().map(order => (
            <div key={order.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
              <div className="flex justify-between items-center">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{order.customerName}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <p className="font-black text-indigo-600">{order.totalAmount.toLocaleString()}đ</p>
              </div>
              {order.shippingAddress && (
                <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg truncate font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span className="truncate">{order.shippingAddress}</span>
                </div>
              )}
            </div>
          ))}
          {orders.length === 0 && (
            <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-400 italic">Hệ thống đang chờ đơn hàng đầu tiên...</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: string, color: string }> = ({ label, value, color }) => (
  <div className={`${color} p-4 rounded-3xl text-white shadow-xl shadow-indigo-100/10`}>
    <p className="text-[9px] uppercase font-bold opacity-70 mb-1 tracking-widest">{label}</p>
    <p className="text-lg font-black tracking-tight">{value}</p>
  </div>
);

export default Dashboard;
