
export enum CustomerType {
  LE = 'Khách lẻ',
  QUEN = 'Khách quen',
  VIP = 'Khách VIP'
}

// Added missing Customer interface to resolve import errors in other components
export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  type: CustomerType;
  notes?: string;
  createdAt: string;
}

export enum OrderStatus {
  PENDING = 'Lên đơn',
  SHIPPING = 'Vận chuyển',
  COMPLETED = 'Hoàn tất',
  CANCELLED = 'Đã hủy'
}

export interface Material {
  id: string;
  name: string;
  unit: string;
  stock: number;
  purchasePrice: number; // Giá nhập gần nhất để tính giá vốn sản phẩm
}

export interface RecipeItem {
  materialId: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  stock: number;
  salePrice: number;
  recipe: RecipeItem[]; // Công thức cấu thành từ nguyên liệu
  baseCost: number; // Giá vốn tính toán từ nguyên liệu
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  profit: number;
  status: OrderStatus;
  notes?: string;
  deliveryDate?: string;
  shippingAddress?: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  supplier: string;
  items: { materialId: string, materialName: string, quantity: number, price: number }[];
  totalCost: number;
  createdAt: string;
}

export interface ProductionLog {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  createdAt: string;
}

export interface SalesInsight {
  summary: string;
  suggestions: string[];
}
