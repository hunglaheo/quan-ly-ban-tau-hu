
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- KHAI BÁO THÔNG TIN SUPABASE CỦA BẠN TẠI ĐÂY ---
const DEFAULT_SB_URL = 'https://gfptmlfrcvrxgmwrxkjm.supabase.co'; // Ví dụ: 'https://xyz.supabase.co'
const DEFAULT_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmcHRtbGZyY3ZyeGdtd3J4a2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNjM4MjgsImV4cCI6MjA4MjYzOTgyOH0.lM5ipNThnIH_D7dBW0e1FHcHi1WO3rodZUF7-ixYcp4'; // Ví dụ: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
// --------------------------------------------------

class SyncService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.initClient();
  }

  /**
   * Khởi tạo client Supabase từ hằng số, localStorage hoặc biến môi trường
   */
  public initClient() {
    const url = localStorage.getItem('SB_URL') || DEFAULT_SB_URL || (window as any).env?.SUPABASE_URL || '';
    const key = localStorage.getItem('SB_KEY') || DEFAULT_SB_KEY || (window as any).env?.SUPABASE_ANON_KEY || '';

    if (url && key) {
      try {
        this.supabase = createClient(url, key);
      } catch (e) {
        console.error("Lỗi khởi tạo Supabase Client:", e);
        this.supabase = null;
      }
    } else {
      this.supabase = null;
    }
  }

  public isConfigured(): boolean {
    return !!this.supabase;
  }

  public saveConfig(url: string, key: string) {
    localStorage.setItem('SB_URL', url);
    localStorage.setItem('SB_KEY', key);
    this.initClient();
  }

  public getConfig() {
    return {
      url: localStorage.getItem('SB_URL') || DEFAULT_SB_URL || '',
      key: localStorage.getItem('SB_KEY') || DEFAULT_SB_KEY || ''
    };
  }

  getDataSize(data: any): string {
    try {
      const str = JSON.stringify(data);
      const bytes = new Blob([str]).size;
      return (bytes / 1024).toFixed(2) + ' KB';
    } catch (e) {
      return '0 KB';
    }
  }

  async pushToCloud(data: any): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { customers, materials, products, orders, purchases } = data;

      // Đồng bộ từng bảng.
      const results = await Promise.all([
        customers.length > 0 ? this.supabase.from('customers').upsert(customers, { onConflict: 'id' }) : Promise.resolve({ error: null }),
        materials.length > 0 ? this.supabase.from('materials').upsert(materials, { onConflict: 'id' }) : Promise.resolve({ error: null }),
        products.length > 0 ? this.supabase.from('products').upsert(products, { onConflict: 'id' }) : Promise.resolve({ error: null }),
        orders.length > 0 ? this.supabase.from('orders').upsert(orders, { onConflict: 'id' }) : Promise.resolve({ error: null }),
        purchases.length > 0 ? this.supabase.from('purchases').upsert(purchases, { onConflict: 'id' }) : Promise.resolve({ error: null }),
      ]);

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('Supabase Sync Errors:', errors.map(e => e.error?.message).join(', '));
        return false;
      }

      return true;
    } catch (error) {
      console.error('Supabase Push Critical Error:', error);
      return false;
    }
  }

  async pullFromCloud(): Promise<any | null> {
    if (!this.supabase) return null;

    try {
      const [
        { data: customers, error: e1 },
        { data: materials, error: e2 },
        { data: products, error: e3 },
        { data: orders, error: e4 },
        { data: purchases, error: e5 }
      ] = await Promise.all([
        this.supabase.from('customers').select('*'),
        this.supabase.from('materials').select('*'),
        this.supabase.from('products').select('*'),
        this.supabase.from('orders').select('*'),
        this.supabase.from('purchases').select('*')
      ]);

      if (e1 || e2 || e3 || e4 || e5) {
        console.error("Fetch error:", e1 || e2 || e3 || e4 || e5);
        return null;
      }

      return {
        customers: customers || [],
        materials: materials || [],
        products: products || [],
        orders: orders || [],
        purchases: purchases || []
      };
    } catch (error) {
      console.error('Supabase Pull Error:', error);
      return null;
    }
  }

  async deleteFromCloud(table: string, id: string): Promise<boolean> {
    if (!this.supabase) return true;
    const { error } = await this.supabase.from(table).delete().eq('id', id);
    return !error;
  }
}

export const cloudSync = new SyncService();
