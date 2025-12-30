
import React, { useState } from 'react';
import { Product, Order, Customer, OrderItem, OrderStatus } from '../types';
import { ICONS } from '../constants';

interface SalesProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  customers: Customer[];
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

const Sales: React.FC<SalesProps> = ({ products, setProducts, customers, orders, setOrders }) => {
  const [view, setView] = useState<'history' | 'create' | 'edit'>('history');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const startCreating = () => {
    setCart([]);
    setSelectedCustomerId('');
    setOrderNotes('');
    setDeliveryDate('');
    setEditingOrderId(null);
    setView('create');
  };

  const startEditing = (order: Order) => {
    setCart(order.items);
    setSelectedCustomerId(order.customerId);
    setOrderNotes(order.notes || '');
    setDeliveryDate(order.deliveryDate || '');
    setEditingOrderId(order.id);
    setView('edit');
  };

  const addToCart = (product: Product) => {
    let availableStock = product.stock;
    if (editingOrderId) {
      const originalOrder = orders.find(o => o.id === editingOrderId);
      const originalItem = originalOrder?.items.find(it => it.productId === product.id);
      if (originalItem) availableStock += originalItem.quantity;
    }

    if (availableStock <= 0) {
      return alert(`Sản phẩm "${product.name}" hiện đã hết hàng trong kho.`);
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= availableStock) {
          alert(`Chỉ còn ${availableStock} sản phẩm trong kho.`);
          return prev;
        }
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product.id, productName: product.name, quantity: 1, price: product.salePrice }];
    });
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === id) {
        const product = products.find(p => p.id === id);
        let availableStock = product?.stock || 0;
        
        if (editingOrderId) {
          const originalOrder = orders.find(o => o.id === editingOrderId);
          const originalItem = originalOrder?.items.find(it => it.productId === id);
          if (originalItem) availableStock += originalItem.quantity;
        }

        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > availableStock) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    if (cart.length === 0) return alert('Giỏ hàng trống!');
    if (!selectedCustomerId) return alert('Vui lòng chọn khách hàng!');

    const customer = customers.find(c => c.id === selectedCustomerId);
    let totalProfit = 0;
    cart.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) totalProfit += (item.price - prod.baseCost) * item.quantity;
    });

    // Lưu địa chỉ chi tiết: Tên - SĐT - Địa chỉ
    const finalShippingAddress = customer ? `${customer.name} (${customer.phone}) - ${customer.address || 'Không có địa chỉ'}` : 'Khách lẻ';

    if (view === 'edit' && editingOrderId) {
      const originalOrder = orders.find(o => o.id === editingOrderId);
      if (originalOrder) {
        setProducts(prev => prev.map(p => {
          const originalItem = originalOrder.items.find(it => it.productId === p.id);
          if (originalItem) return { ...p, stock: p.stock + originalItem.quantity };
          return p;
        }));
      }
      setProducts(prev => prev.map(p => {
        const cartItem = cart.find(it => it.productId === p.id);
        if (cartItem) return { ...p, stock: p.stock - cartItem.quantity };
        return p;
      }));
      setOrders(prev => prev.map(o => o.id === editingOrderId ? {
        ...o,
        customerId: selectedCustomerId,
        customerName: customer?.name || 'Khách lẻ',
        items: cart,
        totalAmount,
        profit: totalProfit,
        notes: orderNotes,
        deliveryDate: deliveryDate,
        shippingAddress: finalShippingAddress
      } : o));
      alert('Đã cập nhật đơn hàng!');
    } else {
      const newOrder: Order = {
        id: Date.now().toString(),
        customerId: selectedCustomerId,
        customerName: customer?.name || 'Khách lẻ',
        items: cart,
        totalAmount,
        profit: totalProfit,
        status: OrderStatus.PENDING,
        notes: orderNotes,
        deliveryDate: deliveryDate,
        shippingAddress: finalShippingAddress,
        createdAt: new Date().toISOString()
      };
      setProducts(prev => prev.map(p => {
        const cartItem = cart.find(item => item.productId === p.id);
        if (cartItem) return { ...p, stock: p.stock - cartItem.quantity };
        return p;
      }));
      setOrders(prev => [...prev, newOrder]);
      alert('Đã tạo đơn hàng thành công!');
    }
    setCart([]);
    setView('history');
  };

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'bg-amber-100 text-amber-700 border-amber-200';
      case OrderStatus.SHIPPING: return 'bg-blue-100 text-blue-700 border-blue-200';
      case OrderStatus.COMPLETED: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case OrderStatus.CANCELLED: return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const currentSelectedCustomer = customers.find(c => c.id === selectedCustomerId);

  if (view === 'create' || view === 'edit') {
    return (
      <div className="h-full flex flex-col p-4 space-y-4 bg-slate-50 min-h-screen">
        <div className="flex justify-between items-center">
          <button onClick={() => setView('history')} className="text-slate-500 flex items-center justify-center gap-1 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            <span className="text-sm">Quay lại lịch sử</span>
          </button>
          <h1 className="text-lg font-bold text-slate-800 uppercase tracking-tight">{view === 'edit' ? 'Cập nhật đơn' : 'Tạo đơn mới'}</h1>
          <div className="w-10"></div>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <ICONS.Search />
          </div>
          <input type="text" placeholder="Tìm thành phẩm nhanh..." className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pb-80">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Chọn sản phẩm ({filteredProducts.length})</h2>
          {filteredProducts.map(p => {
             let stockToShow = p.stock;
             if (editingOrderId) {
               const originalOrder = orders.find(o => o.id === editingOrderId);
               const originalItem = originalOrder?.items.find(it => it.productId === p.id);
               if (originalItem) stockToShow += originalItem.quantity;
             }
             const isOutOfStock = stockToShow <= 0;
             return (
              <div 
                key={p.id} 
                className={`bg-white p-3 rounded-2xl border transition-all flex items-center gap-3 ${isOutOfStock ? 'opacity-60 border-slate-100 bg-slate-50 grayscale' : 'border-slate-100 shadow-sm active:bg-slate-50'}`} 
                onClick={() => !isOutOfStock && addToCart(p)}
              >
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isOutOfStock ? 'bg-slate-200 text-slate-400' : 'bg-indigo-50 text-indigo-500'}`}>
                   <ICONS.Home />
                 </div>
                 <div className="flex-1 min-w-0">
                   <h3 className={`text-sm font-bold truncate ${isOutOfStock ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{p.name}</h3>
                   <p className={`text-xs font-bold ${isOutOfStock ? 'text-slate-400' : 'text-indigo-600'}`}>{p.salePrice.toLocaleString()}đ</p>
                   <p className={`text-[10px] font-bold ${isOutOfStock ? 'text-rose-500' : 'text-slate-400'}`}>
                     {isOutOfStock ? 'HẾT HÀNG' : `Kho: ${stockToShow} ${p.unit}`}
                   </p>
                 </div>
                 <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${isOutOfStock ? 'border-slate-200 text-slate-300' : 'border-indigo-100 text-indigo-500'}`}>
                   <ICONS.Plus />
                 </div>
              </div>
            )
          })}
        </div>

        {cart.length > 0 && (
          <div className="fixed bottom-20 left-0 right-0 bg-white rounded-t-3xl border-t border-slate-200 p-5 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] space-y-4 z-40 max-w-3xl mx-auto overflow-y-auto max-h-[85vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Khách hàng</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                  <option value="">-- Chọn khách hàng --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Hẹn Ngày & Giờ giao</label>
                <input 
                  type="datetime-local" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700" 
                  value={deliveryDate} 
                  onChange={e => setDeliveryDate(e.target.value)} 
                />
              </div>
            </div>

            {selectedCustomerId && (
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
                <div className="text-amber-500 shrink-0 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">Xác nhận địa chỉ giao hàng</p>
                  <p className="text-xs font-bold text-slate-700 leading-tight">
                    {currentSelectedCustomer?.name} ({currentSelectedCustomer?.phone})<br/>
                    {currentSelectedCustomer?.address || 'Chưa cập nhật địa chỉ'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Ghi chú (Tùy chọn)</label>
              <textarea 
                rows={2}
                placeholder="Ví dụ: Giao trước 5h chiều, đóng gói kỹ..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                value={orderNotes}
                onChange={e => setOrderNotes(e.target.value)}
              />
            </div>

            <div className="max-h-24 overflow-y-auto space-y-2">
              {cart.map(item => (
                <div key={item.productId} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.productName}</p>
                    <p className="text-[10px] text-slate-400">{item.price.toLocaleString()}đ x {item.quantity}</p>
                  </div>
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shrink-0">
                     <button onClick={() => updateCartQuantity(item.productId, -1)} className="px-2 py-1 text-slate-400">-</button>
                     <span className="px-3 text-xs font-bold text-slate-700 border-x border-slate-100 min-w-[30px] text-center">{item.quantity}</span>
                     <button onClick={() => updateCartQuantity(item.productId, 1)} className="px-2 py-1 text-slate-400">+</button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t border-slate-100 gap-4">
              <div className="flex flex-col shrink-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Tổng đơn hàng</span>
                <span className="text-lg font-black text-indigo-600 tracking-tight">{totalAmount.toLocaleString()}đ</span>
              </div>
              <button onClick={handleCheckout} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 text-sm uppercase">
                {view === 'edit' ? 'Lưu đơn' : 'Xác nhận đơn'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24 min-h-screen bg-slate-50">
      <div className="flex justify-between items-center gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Lịch sử đơn hàng</h1>
          <p className="text-xs text-slate-500">Xem và quản lý các giao dịch</p>
        </div>
        <button onClick={startCreating} className="bg-indigo-600 text-white px-4 py-3 rounded-2xl text-[11px] font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-transform">
          <ICONS.Plus /> <span>TẠO ĐƠN MỚI</span>
        </button>
      </div>
      <div className="space-y-4">
        {orders.length > 0 ? (
          orders.slice().reverse().map(order => (
            <div key={order.id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3 relative">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 truncate">{order.customerName}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Mã đơn: #{order.id.slice(-6)} • {new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                   <p className="font-bold text-slate-800">{order.totalAmount.toLocaleString()}đ</p>
                   <p className="text-[10px] text-slate-400">{order.items.length} SP</p>
                </div>
              </div>

              {/* THÔNG TIN GIAO HÀNG & GHI CHÚ ĐƠN HÀNG */}
              <div className="space-y-2">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex items-start gap-2.5">
                  <div className="text-indigo-500 shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Thông tin giao hàng</p>
                    <p className="text-[11px] text-slate-600 font-bold leading-normal">
                      {order.shippingAddress || 'Chưa cập nhật địa chỉ'}
                    </p>
                  </div>
                </div>

                {order.notes && (
                  <div className="flex items-start gap-2.5 px-3 py-2.5 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm">
                    <div className="text-amber-500 shrink-0 mt-0.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Ghi chú từ khách</p>
                      <p className="text-[11px] text-amber-800 font-bold leading-normal italic">
                        {order.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {order.items.map((it, idx) => (
                  <span key={idx} className="flex-shrink-0 text-[10px] bg-white text-slate-500 px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                    {it.productName} (x{it.quantity})
                  </span>
                ))}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-50 gap-2">
                <div className="flex flex-col gap-1">
                  <span className={`text-[9px] w-fit px-2.5 py-1 rounded-full font-bold border ${getStatusStyle(order.status || OrderStatus.PENDING)}`}>
                    {(order.status || OrderStatus.PENDING).toUpperCase()}
                  </span>
                  {order.deliveryDate && (
                    <span className="text-[9px] text-indigo-600 font-bold">Hẹn: {new Date(order.deliveryDate).toLocaleString('vi-VN')}</span>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  {order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED && (
                    <>
                      <button onClick={() => startEditing(order)} className="p-2.5 text-indigo-500 bg-indigo-50 rounded-xl active:scale-90 border border-indigo-100/50 shadow-sm">
                        <ICONS.Edit />
                      </button>
                      <button onClick={() => updateOrderStatus(order.id, OrderStatus.COMPLETED)} className="text-[10px] bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold shadow-md active:scale-95 uppercase">
                        XONG
                      </button>
                    </>
                  )}
                  {order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.COMPLETED && (
                    <button onClick={() => updateOrderStatus(order.id, OrderStatus.CANCELLED)} className="text-[10px] bg-slate-100 text-slate-500 px-3 py-2.5 rounded-xl font-bold active:scale-95 uppercase border border-slate-200">
                      HỦY
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <ICONS.ShoppingCart />
            </div>
            <p className="text-sm font-medium">Chưa có dữ liệu đơn hàng</p>
            <button onClick={startCreating} className="mt-4 text-indigo-600 font-bold text-xs uppercase tracking-widest border-b border-indigo-200 pb-0.5">Tạo đơn đầu tiên ngay</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sales;
