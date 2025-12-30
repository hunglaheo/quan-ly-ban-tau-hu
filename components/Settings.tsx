
import React, { useMemo, useState, useEffect } from 'react';
import { ICONS } from '../constants';
import { Customer, Product, Order, Purchase, Material } from '../types';
import { cloudSync } from '../services/syncService';

interface SettingsProps {
  data: {
    customers: Customer[];
    materials: Material[];
    products: Product[];
    orders: Order[];
    purchases: Purchase[];
  };
  onRestore: (importedData: any) => void;
}

const Settings: React.FC<SettingsProps> = ({ data, onRestore }) => {
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    const config = cloudSync.getConfig();
    setSbUrl(config.url);
    setSbKey(config.key);
  }, []);

  const currentSize = useMemo(() => cloudSync.getDataSize(data), [data]);

  const handleSaveCloudConfig = () => {
    cloudSync.saveConfig(sbUrl, sbKey);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
    // Reload data if needed
    window.location.reload(); 
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `quicksales_backup_${new Date().toISOString().slice(0, 10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    if (!file) return;

    fileReader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content);
        if (parsedData.customers && parsedData.products) {
          if (confirm('Khôi phục từ file JSON sẽ thay thế dữ liệu hiện tại. Tiếp tục?')) {
            onRestore(parsedData);
            alert('Đã cập nhật dữ liệu mới!');
          }
        }
      } catch (error) {
        alert('File không hợp lệ!');
      }
    };
    fileReader.readAsText(file);
  };

  const handleArchive = () => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const oldOrders = data.orders.filter(o => new Date(o.createdAt) < threeMonthsAgo);
    
    if (oldOrders.length === 0) {
      return alert('Không có đơn hàng nào cũ hơn 3 tháng để dọn dẹp.');
    }

    if (confirm(`Tìm thấy ${oldOrders.length} đơn hàng cũ. Bạn nên "Xuất file sao lưu" trước khi dọn dẹp. Hệ thống sẽ xóa các đơn này. Tiếp tục?`)) {
      const newData = {
        ...data,
        orders: data.orders.filter(o => new Date(o.createdAt) >= threeMonthsAgo)
      };
      onRestore(newData);
      alert('Đã dọn dẹp dữ liệu cũ!');
    }
  };

  return (
    <div className="p-4 space-y-6 bg-slate-50 min-h-screen pb-24">
      <header>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Cài đặt</h1>
        <p className="text-sm text-slate-500">Quản lý dữ liệu và kết nối Cloud</p>
      </header>

      {/* Cloud Connection Configuration */}
      <section className="bg-white rounded-3xl border border-indigo-100 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${cloudSync.isConfigured() ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            <ICONS.Download />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Cấu hình kết nối Cloud</h2>
            <p className="text-[10px] font-bold uppercase tracking-tight">
              {cloudSync.isConfigured() ? 'Đang bật đồng bộ' : 'Chưa cấu hình Supabase'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Project URL</label>
            <input 
              type="text" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="https://xyz.supabase.co"
              value={sbUrl}
              onChange={e => setSbUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">API Key (Anon Key)</label>
            <input 
              type="password" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Dán anon key của bạn vào đây..."
              value={sbKey}
              onChange={e => setSbKey(e.target.value)}
            />
          </div>
          <button 
            onClick={handleSaveCloudConfig}
            className={`w-full py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 ${saveStatus === 'saved' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'}`}
          >
            {saveStatus === 'saved' ? 'ĐÃ LƯU CẤU HÌNH!' : 'LƯU VÀ KẾT NỐI'}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 italic">
          Lưu ý: Bạn cần chạy SQL trong file <code className="bg-slate-100 px-1">supabase_schema.txt</code> trên Supabase Dashboard trước khi kết nối.
        </p>
      </section>

      <section className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center">
               <ICONS.Package />
             </div>
             <div>
               <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Trạng thái dữ liệu</h2>
               <p className="text-[10px] text-indigo-600 font-bold uppercase">Kích thước: {currentSize}</p>
             </div>
          </div>
        </div>
        
        <div className="space-y-3 pt-2">
          <button 
            onClick={handleExport}
            className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-sm shadow-md"
          >
            <ICONS.Download /> XUẤT FILE SAO LƯU (.JSON)
          </button>
          
          <button 
            onClick={handleArchive}
            className="w-full bg-amber-50 text-amber-700 border border-amber-200 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-sm"
          >
            <ICONS.Trash /> DỌN DẸP ĐƠN HÀNG CŨ (>3 THÁNG)
          </button>

          <div className="relative pt-2">
            <input type="file" accept=".json" onChange={handleImport} className="hidden" id="import-file" />
            <label htmlFor="import-file" className="w-full bg-slate-100 text-slate-600 border border-slate-200 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 cursor-pointer active:bg-slate-200 text-[11px] uppercase tracking-widest">
              Khôi phục từ file JSON
            </label>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
