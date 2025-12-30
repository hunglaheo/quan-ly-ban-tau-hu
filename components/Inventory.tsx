
import React, { useState, useMemo } from 'react';
import { Product, Purchase, Material, RecipeItem } from '../types';
import { ICONS } from '../constants';

interface InventoryProps {
  materials: Material[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  purchases: Purchase[];
  setPurchases: React.Dispatch<React.SetStateAction<Purchase[]>>;
}

const Inventory: React.FC<InventoryProps> = ({ materials, setMaterials, products, setProducts, purchases, setPurchases }) => {
  const [tab, setTab] = useState<'materials' | 'products'>('materials');
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  
  // Modal chỉnh sửa thông tin chung
  const [showEditModal, setShowEditModal] = useState<{ 
    id: string, 
    name: string, 
    unit: string,
    stock: number, 
    price: number,
    type: 'material' | 'product' 
  } | null>(null);

  const [newMaterial, setNewMaterial] = useState<Partial<Material>>({ name: '', unit: 'kg', stock: 0, purchasePrice: 0 });
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', unit: 'Cái', salePrice: 0, recipe: [] });
  const [productionData, setProductionData] = useState({ productId: '', quantity: 1 });
  
  // Quản lý dữ liệu nhập hàng tạm thời
  const [purchaseData, setPurchaseData] = useState<{
    supplier: string,
    items: Record<string, { quantity: number, price: number }>
  }>({ supplier: '', items: {} });
  const [purchaseSearch, setPurchaseSearch] = useState('');

  // Kiểm tra nguyên liệu cần thiết cho lệnh sản xuất
  const productionCheck = useMemo(() => {
    if (!productionData.productId) return { canProduce: false, requirements: [] };
    const product = products.find(p => p.id === productionData.productId);
    if (!product) return { canProduce: false, requirements: [] };

    let canProduce = true;
    const requirements = product.recipe.map(ri => {
      const mat = materials.find(m => m.id === ri.materialId);
      const needed = ri.quantity * productionData.quantity;
      const available = mat?.stock || 0;
      const isShort = available < needed;
      if (isShort) canProduce = false;
      return {
        name: mat?.name || '?',
        needed,
        available,
        unit: mat?.unit || '',
        isShort
      };
    });

    return { canProduce, requirements };
  }, [productionData, products, materials]);

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const material: Material = {
      id: Date.now().toString(),
      name: newMaterial.name || '',
      unit: newMaterial.unit || 'kg',
      stock: Number(newMaterial.stock) || 0,
      purchasePrice: Number(newMaterial.purchasePrice) || 0
    };
    setMaterials(prev => [...prev, material]);
    setShowMaterialModal(false);
    setNewMaterial({ name: '', unit: 'kg', stock: 0, purchasePrice: 0 });
  };

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const itemsToSave = (Object.entries(purchaseData.items) as [string, { quantity: number, price: number }][])
      .filter(([_, val]) => val.quantity > 0)
      .map(([id, val]) => {
        const mat = materials.find(m => m.id === id);
        return {
          materialId: id,
          materialName: mat?.name || '?',
          quantity: val.quantity,
          price: val.price
        };
      });

    if (itemsToSave.length === 0) return alert('Vui lòng nhập số lượng cho ít nhất 1 nguyên liệu!');

    const totalCost = itemsToSave.reduce((sum, it) => sum + (it.price * it.quantity), 0);
    const purchase: Purchase = {
      id: Date.now().toString(),
      supplier: purchaseData.supplier,
      items: itemsToSave,
      totalCost,
      createdAt: new Date().toISOString()
    };

    setMaterials(prev => prev.map(m => {
      const item = itemsToSave.find(it => it.materialId === m.id);
      if (item) return { ...m, stock: m.stock + item.quantity, purchasePrice: item.price };
      return m;
    }));
    
    setPurchases(prev => [...prev, purchase]);
    setShowPurchaseModal(false);
    setPurchaseData({ supplier: '', items: {} });
    setPurchaseSearch('');
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.recipe || newProduct.recipe.length === 0) return alert('Vui lòng thêm công thức!');
    
    let baseCost = 0;
    newProduct.recipe.forEach(ri => {
      const mat = materials.find(m => m.id === ri.materialId);
      if (mat) baseCost += mat.purchasePrice * ri.quantity;
    });

    const product: Product = {
      id: Date.now().toString(),
      name: newProduct.name || '',
      unit: newProduct.unit || 'Cái',
      stock: 0,
      salePrice: Number(newProduct.salePrice) || 0,
      recipe: newProduct.recipe,
      baseCost: baseCost
    };
    setProducts(prev => [...prev, product]);
    setShowProductModal(false);
    setNewProduct({ name: '', unit: 'Cái', salePrice: 0, recipe: [] });
  };

  const handleProduce = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productionCheck.canProduce) return alert('Vui lòng kiểm tra lại nguyên liệu!');

    const product = products.find(p => p.id === productionData.productId);
    if (!product) return;

    setMaterials(prev => prev.map(m => {
      const ri = product.recipe.find(r => r.materialId === m.id);
      if (ri) return { ...m, stock: m.stock - (ri.quantity * productionData.quantity) };
      return m;
    }));

    setProducts(prev => prev.map(p => {
      if (p.id === product.id) return { ...p, stock: p.stock + productionData.quantity };
      return p;
    }));

    setShowProductionModal(false);
    alert(`Đã sản xuất thành công ${productionData.quantity} ${product.unit} ${product.name}`);
  };

  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;

    if (showEditModal.type === 'material') {
      setMaterials(prev => prev.map(m => m.id === showEditModal.id ? { 
        ...m, 
        name: showEditModal.name,
        unit: showEditModal.unit,
        stock: showEditModal.stock,
        purchasePrice: showEditModal.price
      } : m));
    } else {
      setProducts(prev => prev.map(p => p.id === showEditModal.id ? { 
        ...p, 
        name: showEditModal.name,
        unit: showEditModal.unit,
        stock: showEditModal.stock,
        salePrice: showEditModal.price
      } : p));
    }

    setShowEditModal(null);
  };

  const filteredMaterialsForPurchase = useMemo(() => {
    return materials.filter(m => m.name.toLowerCase().includes(purchaseSearch.toLowerCase()));
  }, [materials, purchaseSearch]);

  return (
    <div className="p-4 space-y-4 pb-24 bg-slate-50 min-h-screen">
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
        <button 
          onClick={() => setTab('materials')}
          className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${tab === 'materials' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
        >
          <ICONS.Package /> Nguyên liệu
        </button>
        <button 
          onClick={() => setTab('products')}
          className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${tab === 'products' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
        >
          <ICONS.Home /> Thành phẩm
        </button>
      </div>

      <div className="flex justify-between items-center gap-2">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">
          {tab === 'materials' ? 'Kho nguyên liệu' : 'Kho thành phẩm'}
        </h1>
        <div className="flex gap-2">
          {tab === 'materials' ? (
             <button onClick={() => {
               setPurchaseData({ supplier: '', items: {} });
               setPurchaseSearch('');
               setShowPurchaseModal(true);
             }} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-md active:scale-95 transition-transform">
               <ICONS.Plus /> NHẬP KHO
             </button>
          ) : (
             <button onClick={() => setShowProductionModal(true)} className="bg-amber-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-md active:scale-95 transition-transform">
               <ICONS.Package /> SẢN XUẤT
             </button>
          )}
          <button 
            onClick={() => tab === 'materials' ? setShowMaterialModal(true) : setShowProductModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-md active:scale-95 transition-transform"
          >
            <ICONS.Plus /> THÊM MỚI
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {tab === 'materials' ? (
          materials.map(m => (
            <div key={m.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-800 truncate">{m.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Giá nhập: {m.purchasePrice.toLocaleString()}đ/{m.unit}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right shrink-0">
                  <p className={`text-lg font-black tracking-tight ${m.stock < 10 ? 'text-rose-500' : 'text-slate-700'}`}>{m.stock}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{m.unit}</p>
                </div>
                <button 
                  onClick={() => setShowEditModal({ 
                    id: m.id, 
                    name: m.name, 
                    unit: m.unit, 
                    stock: m.stock, 
                    price: m.purchasePrice, 
                    type: 'material' 
                  })}
                  className="p-2 text-slate-300 hover:text-indigo-500 transition-colors flex items-center justify-center"
                >
                  <ICONS.Edit />
                </button>
              </div>
            </div>
          ))
        ) : (
          products.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 group">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-800 truncate">{p.name}</h3>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-[10px] text-indigo-600 font-bold">Bán: {p.salePrice.toLocaleString()}đ</span>
                    <span className="text-[10px] text-slate-400 font-medium">Vốn: {p.baseCost.toLocaleString()}đ</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-slate-800 tracking-tight">{p.stock}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{p.unit}</p>
                  </div>
                  <button 
                    onClick={() => setShowEditModal({ 
                      id: p.id, 
                      name: p.name, 
                      unit: p.unit, 
                      stock: p.stock, 
                      price: p.salePrice, 
                      type: 'product' 
                    })}
                    className="p-2 text-slate-300 hover:text-indigo-500 transition-colors flex items-center justify-center"
                  >
                    <ICONS.Edit />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {p.recipe.map((ri, i) => {
                   const m = materials.find(mat => mat.id === ri.materialId);
                   return (
                     <span key={i} className="text-[9px] bg-slate-50 text-slate-500 px-2 py-1 rounded-lg border border-slate-100">
                       {m?.name}: {ri.quantity}{m?.unit}
                     </span>
                   )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-800">Chỉnh sửa thông tin</h2>
              <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">{showEditModal.type === 'material' ? 'Nguyên liệu' : 'Thành phẩm'}</p>
            </div>
            <form onSubmit={handleUpdateItem} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tên gọi</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none" value={showEditModal.name} onChange={e => setShowEditModal({...showEditModal, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Đơn vị</label>
                    <input className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none" value={showEditModal.unit} onChange={e => setShowEditModal({...showEditModal, unit: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tồn kho</label>
                    <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-indigo-600 outline-none" value={showEditModal.stock} onChange={e => setShowEditModal({...showEditModal, stock: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{showEditModal.type === 'material' ? 'Giá nhập hiện tại' : 'Giá bán hiện tại'}</label>
                  <div className="relative">
                    <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none" value={showEditModal.price} onChange={e => setShowEditModal({...showEditModal, price: Number(e.target.value)})} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">VNĐ</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowEditModal(null)} className="flex-1 py-3 text-slate-500 font-bold text-sm">Hủy</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-3 rounded-2xl font-bold active:scale-95 transition-all text-sm">Lưu cập nhật</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPurchaseModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Nhập nguyên liệu</h2>
              <button onClick={() => { setShowPurchaseModal(false); setPurchaseSearch(''); }} className="text-slate-400 p-2">✕</button>
            </div>
            <form onSubmit={handlePurchase} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nhà cung cấp</label>
                <input placeholder="Tên nhà cung cấp..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none font-bold" value={purchaseData.supplier} onChange={e => setPurchaseData({...purchaseData, supplier: e.target.value})} required />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <ICONS.Search />
                </div>
                <input 
                  type="text" 
                  placeholder="Tìm nguyên liệu nhanh..." 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                  value={purchaseSearch} 
                  onChange={(e) => setPurchaseSearch(e.target.value)} 
                />
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-50 p-2 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Danh sách nguyên liệu</p>
                {filteredMaterialsForPurchase.length > 0 ? filteredMaterialsForPurchase.map(m => {
                  const currentItem = purchaseData.items[m.id] || { quantity: 0, price: m.purchasePrice };
                  return (
                    <div key={m.id} className="bg-white p-3 rounded-xl border border-slate-100 space-y-2 mb-2 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">{m.name}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">Kho: {m.stock} {m.unit}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 font-bold uppercase ml-1">Số lượng</label>
                          <div className="relative">
                            <input type="number" min="0" placeholder="0" className="w-full p-2 text-xs border border-slate-200 rounded-lg text-center font-bold text-emerald-600" 
                              value={currentItem.quantity || ''}
                              onChange={(e) => {
                                const qty = Number(e.target.value);
                                setPurchaseData({
                                  ...purchaseData,
                                  items: { ...purchaseData.items, [m.id]: { ...currentItem, quantity: qty } }
                                });
                              }} 
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-300 font-bold uppercase">{m.unit}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-400 font-bold uppercase ml-1">Giá nhập lô này</label>
                          <div className="relative">
                            <input type="number" placeholder="Giá" className="w-full p-2 text-xs border border-slate-200 rounded-lg text-center font-bold text-slate-600" 
                              value={currentItem.price} 
                              onChange={(e) => {
                                const price = Number(e.target.value);
                                setPurchaseData({
                                  ...purchaseData,
                                  items: { ...purchaseData.items, [m.id]: { ...currentItem, price } }
                                });
                              }} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-center py-4 text-[10px] text-slate-400 italic">Không tìm thấy nguyên liệu nào</p>
                )}
              </div>

              <div className="bg-indigo-50 p-4 rounded-2xl flex justify-between items-center">
                 <span className="text-xs font-bold text-indigo-600 uppercase">Tổng tiền nhập</span>
                 <span className="text-lg font-black text-indigo-700">
                    {(Object.values(purchaseData.items) as { quantity: number, price: number }[]).reduce((sum, it) => sum + (it.price * it.quantity), 0).toLocaleString()}đ
                 </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowPurchaseModal(false); setPurchaseSearch(''); }} className="flex-1 py-3 text-slate-500 font-bold text-sm">Hủy</button>
                <button type="submit" className="flex-[2] bg-emerald-600 text-white py-3 rounded-2xl font-bold text-sm active:scale-95 shadow-lg shadow-emerald-100">Xác nhận nhập kho</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Production Modal */}
      {showProductionModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800">Lệnh sản xuất</h2>
            <form onSubmit={handleProduce} className="space-y-4">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Chọn thành phẩm</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={productionData.productId}
                  onChange={e => setProductionData({...productionData, productId: e.target.value})}
                  required
                >
                  <option value="">-- Chọn thành phẩm --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Số lượng dự kiến</label>
                <input type="number" min="1" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" value={productionData.quantity} onChange={e => setProductionData({...productionData, quantity: Number(e.target.value)})} required />
              </div>

              {productionData.productId && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kiểm tra nguyên liệu</h3>
                  <div className="space-y-2">
                    {productionCheck.requirements.map((req, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-medium">{req.name}</span>
                        <div className="text-right">
                          <span className={`font-bold ${req.isShort ? 'text-rose-500' : 'text-emerald-600'}`}>
                            {req.available} / {req.needed}
                          </span>
                          <span className="ml-1 text-[10px] text-slate-400 uppercase">{req.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!productionCheck.canProduce && (
                    <div className="bg-rose-50 text-rose-600 p-2 rounded-lg text-[10px] font-bold flex items-center gap-2 border border-rose-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                      KHÔNG ĐỦ NGUYÊN LIỆU TRONG KHO
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowProductionModal(false)} className="flex-1 py-3 text-slate-500 font-bold text-sm">Hủy</button>
                <button 
                  type="submit" 
                  disabled={!productionCheck.canProduce}
                  className={`flex-[2] py-3 rounded-2xl font-bold shadow-lg transition-all text-sm ${productionCheck.canProduce ? 'bg-amber-600 text-white shadow-amber-100 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                >
                  Xác nhận sản xuất
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material & Product Creation Modals */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Thêm nguyên liệu mới</h2>
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest ml-1">Tên nguyên liệu</label>
                <input placeholder="Tên nguyên liệu..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500" value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest ml-1">Đơn vị</label>
                  <input placeholder="kg, gram, lít..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500" value={newMaterial.unit} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest ml-1">Giá nhập ước tính</label>
                  <input type="number" placeholder="Số tiền..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500" value={newMaterial.purchasePrice} onChange={e => setNewMaterial({...newMaterial, purchasePrice: Number(e.target.value)})} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowMaterialModal(false)} className="flex-1 py-3 text-slate-500 font-bold text-sm">Hủy</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all shadow-lg shadow-indigo-100">Lưu lại</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProductModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800">Thiết lập sản phẩm</h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <input placeholder="Tên sản phẩm..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Giá bán..." type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none" value={newProduct.salePrice} onChange={e => setNewProduct({...newProduct, salePrice: Number(e.target.value)})} required />
                <input placeholder="Đơn vị (Cái...)" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none" value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Công thức</p>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-50 p-2 rounded-xl">
                  {materials.map(m => (
                    <div key={m.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-100">
                      <span className="text-xs font-medium truncate flex-1">{m.name}</span>
                      <input type="number" placeholder="S.Lượng" className="w-16 p-1 text-xs border border-slate-200 rounded text-center" onChange={(e) => {
                          const qty = Number(e.target.value);
                          const recipe = [...(newProduct.recipe || [])].filter(r => r.materialId !== m.id);
                          if (qty > 0) recipe.push({ materialId: m.id, quantity: qty });
                          setNewProduct({...newProduct, recipe});
                        }}
                      />
                      <span className="text-[9px] text-slate-400 w-6 uppercase">{m.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowProductModal(false)} className="flex-1 py-3 text-slate-500 font-bold text-sm">Hủy</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-3 rounded-2xl font-bold text-sm">Tạo sản phẩm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
