
import React, { useState } from 'react';
import { Customer, CustomerType, Order } from '../types';
import { ICONS } from '../constants';
import { cloudSync } from '../services/syncService';

interface CustomersProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  orders: Order[];
}

const Customers: React.FC<CustomersProps> = ({ customers, setCustomers, orders }) => {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '', phone: '', address: '', type: CustomerType.LE, notes: ''
  });

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', address: '', type: CustomerType.LE, notes: '' });
    setShowModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({ ...customer });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCustomer) {
      // Cập nhật khách hàng hiện có
      setCustomers(prev => prev.map(c => 
        c.id === editingCustomer.id 
          ? { ...c, ...formData as Customer } 
          : c
      ));
    } else {
      // Thêm khách hàng mới
      const newCustomer: Customer = {
        id: Date.now().toString(),
        name: formData.name || '',
        phone: formData.phone || '',
        address: formData.address || '',
        type: formData.type as CustomerType,
        notes: formData.notes,
        createdAt: new Date().toISOString()
      };
      setCustomers(prev => [...prev, newCustomer]);
    }
    
    setShowModal(false);
  };

  const deleteCustomer = async (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa khách hàng này?')) {
      // Xóa ở giao diện trước
      setCustomers(prev => prev.filter(c => c.id !== id));
      // Xóa ở cloud để đảm bảo đồng bộ
      await cloudSync.deleteFromCloud('customers', id);
    }
  };

  const getCustomerStats = (id: string) => {
    const custOrders = orders.filter(o => o.customerId === id);
    const totalSpent = custOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    return { count: custOrders.length, totalSpent };
  };

  return (
    <div className="p-4 space-y-4 pb-24 min-h-screen bg-slate-50">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Khách hàng</h1>
          <p className="text-xs text-slate-500">Quản lý {customers.length} khách hàng</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <ICONS.Plus /> Thêm mới
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
          <ICONS.Search />
        </div>
        <input 
          type="text" 
          placeholder="Tìm tên hoặc số điện thoại..."
          className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {filtered.length > 0 ? filtered.map(c => {
          const stats = getCustomerStats(c.id);
          return (
            <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative group overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-slate-800">{c.name}</h3>
                  <p className="text-xs text-indigo-500 font-medium">{c.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    c.type === CustomerType.VIP ? 'bg-amber-100 text-amber-600' : 
                    c.type === CustomerType.QUEN ? 'bg-indigo-100 text-indigo-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {c.type}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3 truncate pr-10">{c.address || 'Chưa cập nhật địa chỉ'}</p>
              
              <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Số đơn</p>
                    <p className="text-sm font-bold text-slate-700">{stats.count}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Tổng chi</p>
                    <p className="text-sm font-bold text-indigo-600">{stats.totalSpent.toLocaleString()}đ</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => openEditModal(c)} 
                    className="p-2.5 text-indigo-600 bg-indigo-50 rounded-xl active:scale-90 transition-all border border-indigo-100"
                    aria-label="Sửa"
                  >
                    <ICONS.Edit />
                  </button>
                  <button 
                    onClick={() => deleteCustomer(c.id)} 
                    className="p-2.5 text-rose-600 bg-rose-50 rounded-xl active:scale-90 transition-all border border-rose-100"
                    aria-label="Xóa"
                  >
                    <ICONS.Trash />
                  </button>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-sm text-slate-400 italic">Không tìm thấy khách hàng nào</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-slide-up overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800">
                {editingCustomer ? 'Sửa thông tin khách' : 'Thêm khách hàng mới'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 p-2 hover:bg-slate-50 rounded-full">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest ml-1">Họ và tên</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest ml-1">Số điện thoại</label>
                  <input 
                    required
                    type="tel"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="09xx xxx xxx"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest ml-1">Địa chỉ</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    placeholder="Số nhà, tên đường..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest ml-1">Phân loại</label>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as CustomerType})}
                      >
                        {Object.values(CustomerType).map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                   </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest ml-1">Ghi chú</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 min-h-[80px]"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    placeholder="Sở thích, lưu ý đặc biệt..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 text-slate-500 font-bold text-sm"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all text-sm uppercase tracking-wide"
                >
                  {editingCustomer ? 'Lưu thay đổi' : 'Tạo khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
