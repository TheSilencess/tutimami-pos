export interface UserRole {
  role: {
    id: string;
    name: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  active: boolean;
  roles?: UserRole[];
  permissions?: string[];
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  salePrice: number;
  cost: number;
  stock: number;
  minStock: number;
  categoryId: string;
  category?: Category;
  barcode?: string;
  description?: string;
  active?: boolean;
}

export interface Customer {
  id: string;
  customerType: string;
  name: string;
  nit?: string;
  phone?: string;
  email?: string;
  address?: string;
  active?: boolean;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
  product?: Product;
}

export interface Sale {
  id: string;
  createdAt: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  customer: Customer;
  user?: { name: string };
  items: SaleItem[];
  payments?: { method: string; amount: number }[];
}

export interface DashboardData {
  today: number;
  month: number;
  salesCount: number;
  products: number;
  customers: number;
  lowStock: Product[];
  latestSales: Sale[];
  topProducts: {
    productId: string;
    productName: string;
    _sum: { quantity: number; total: number };
  }[];
}
