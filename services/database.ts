
import { Customer, Product, Order, Purchase, Material } from '../types';

const DB_NAME = 'QuickSalesDB';
const DB_VERSION = 1;

export class DatabaseService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('customers')) db.createObjectStore('customers', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('materials')) db.createObjectStore('materials', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('products')) db.createObjectStore('products', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('orders')) db.createObjectStore('orders', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('purchases')) db.createObjectStore('purchases', { keyPath: 'id' });
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => reject('Lỗi khởi tạo Database');
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB chưa khởi tạo');
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(`Lỗi lấy dữ liệu từ ${storeName}`);
    });
  }

  async saveAll(storeName: string, items: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB chưa khởi tạo');
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      store.clear();
      items.forEach(item => store.put(item));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(`Lỗi lưu dữ liệu vào ${storeName}`);
    });
  }

  async exportFullData(): Promise<any> {
    const data: any = {};
    const stores = ['customers', 'materials', 'products', 'orders', 'purchases'];
    for (const store of stores) {
      data[store] = await this.getAll(store);
    }
    return data;
  }

  async importFullData(data: any): Promise<void> {
    const stores = ['customers', 'materials', 'products', 'orders', 'purchases'];
    for (const store of stores) {
      if (data[store]) {
        await this.saveAll(store, data[store]);
      }
    }
  }
}

export const dbService = new DatabaseService();
