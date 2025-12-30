
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ICONS } from './constants';
import { Customer, Product, Order, Purchase, Material } from './types';
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Reports from './components/Reports';
import Settings from './components/Settings';
import { dbService } from './services/database';
import { cloudSync } from './services/syncService';

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  // 1. Khởi tạo và Tải dữ liệu từ Cloud
  useEffect(() => {
    const initApp = async () => {
      await dbService.init();
      
      setSyncStatus('syncing');
      const cloudData = await cloudSync.pullFromCloud();
      
      if (cloudData) {
        await dbService.importFullData(cloudData);
        setCustomers(cloudData.customers || []);
        setMaterials(cloudData.materials || []);
        setProducts(cloudData.products || []);
        setOrders(cloudData.orders || []);
        setPurchases(cloudData.purchases || []);
        setSyncStatus('synced');
      } else {
        const [c, m, p, o, pur] = await Promise.all([
          dbService.getAll<Customer>('customers'),
          dbService.getAll<Material>('materials'),
          dbService.getAll<Product>('products'),
          dbService.getAll<Order>('orders'),
          dbService.getAll<Purchase>('purchases'),
        ]);
        setCustomers(c);
        setMaterials(m);
        setProducts(p);
        setOrders(o);
        setPurchases(pur);
        setSyncStatus('error');
      }
      setIsReady(true);
    };
    initApp();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const syncToCloud = async () => {
      setSyncStatus('syncing');
      const data = { customers, materials, products, orders, purchases };
      await dbService.importFullData(data);
      const success = await cloudSync.pushToCloud(data);
      setSyncStatus(success ? 'synced' : 'error');
    };

    const timer = setTimeout(syncToCloud, 1000);
    return () => clearTimeout(timer);
  }, [customers, materials, products, orders, purchases, isReady]);

  const handleRestoreData = async (data: any) => {
    await dbService.importFullData(data);
    setCustomers(data.customers || []);
    setMaterials(data.materials || []);
    setProducts(data.products || []);
    setOrders(data.orders || []);
    setPurchases(data.purchases || []);
  };

  if (!isReady) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Đang tải dữ liệu...</p>
      </div>
    </div>
  );

  return (
    <Router>
      <div className="flex flex-col min-h-screen pb-20 bg-slate-50">
        <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none pt-2">
           <div className={`px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-2 shadow-sm border backdrop-blur-md ${
             syncStatus === 'synced' ? 'bg-emerald-50/90 text-emerald-600 border-emerald-100' : 
             syncStatus === 'syncing' ? 'bg-indigo-50/90 text-indigo-600 border-indigo-100' : 
             'bg-rose-50/90 text-rose-600 border-rose-100'
           }`}>
             <div className={`w-1.5 h-1.5 rounded-full ${
               syncStatus === 'synced' ? 'bg-emerald-500' : 
               syncStatus === 'syncing' ? 'bg-indigo-500 animate-pulse' : 
               'bg-rose-500'
             }`}></div>
             {syncStatus === 'synced' ? 'ĐÃ ĐỒNG BỘ' : syncStatus === 'syncing' ? 'ĐANG LƯU...' : 'NGOẠI TUYẾN'}
           </div>
        </div>

        <main className="flex-1 overflow-x-hidden pt-6">
          <Routes>
            <Route path="/" element={<Dashboard orders={orders} products={products} />} />
            <Route path="/customers" element={<Customers customers={customers} setCustomers={setCustomers} orders={orders} />} />
            <Route path="/inventory" element={<Inventory materials={materials} setMaterials={setMaterials} products={products} setProducts={setProducts} purchases={purchases} setPurchases={setPurchases} />} />
            <Route path="/sales" element={<Sales products={products} setProducts={setProducts} customers={customers} orders={orders} setOrders={setOrders} />} />
            <Route path="/reports" element={<Reports orders={orders} purchases={purchases} />} />
            <Route path="/settings" element={<Settings data={{customers, materials, products, orders, purchases}} onRestore={handleRestoreData} />} />
          </Routes>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-slate-200 px-1 py-1 flex justify-around items-stretch safe-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.03)] z-50 backdrop-blur-md">
          <NavItem to="/" icon={<ICONS.Home />} label="Tổng quan" />
          <NavItem to="/customers" icon={<ICONS.Users />} label="Khách" />
          <NavItem to="/sales" icon={<ICONS.ShoppingCart />} label="Đơn hàng" />
          <NavItem to="/inventory" icon={<ICONS.Package />} label="Kho" />
          <NavItem to="/reports" icon={<ICONS.BarChart />} label="Báo cáo" />
          <NavItem to="/settings" icon={<ICONS.Settings />} label="Cài đặt" />
        </nav>
      </div>
    </Router>
  );
};

const NavItem: React.FC<{ to: string, icon: React.ReactNode, label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link to={to} className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${isActive ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-400 hover:text-slate-600'}`}>
      <span className={`flex items-center justify-center transition-transform ${isActive ? 'scale-110' : ''}`}>{icon}</span>
      <span className="text-[9px] font-bold mt-1 text-center truncate w-full">{label}</span>
    </Link>
  );
};

export default App;
