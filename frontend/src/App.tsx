/**
 * Main App Component
 * 
 * This is the root component of the frontend. It manages the global state for stocks,
 * handles API fetching, and coordinates the layout between the header, stats, and content area.
 * 
 * Connected to:
 * - backend API: Fetches all stocks via GET /api/stocks.
 * - StockForm: Toggles visibility and provides a refresh callback.
 * - StockList: Passes the stock data and update callback.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Package, AlertTriangle, Plus, RefreshCw, LayoutDashboard, 
  Factory, BarChart3, Menu, X, Globe, Bell 
} from 'lucide-react';
import StockList from './components/StockList';
import StockForm from './components/StockForm';
import ProducerManager from './components/ProducerManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';
import { Language } from './translations';

export interface StockItem {
  id: number;
  name: string;
  designationCode: string;
  refNumber: string;
  quantity: number;
  pricePerUnit?: number; // Sell Price
  retailPrice?: number;   // Purchase Price
  producerId: number | null;
  producerName?: string;
  producerRegion?: string;
  description: string;
  category: string;
  imageUrl: string | null;
  lowStockThreshold: number;
  updatedAt: string;
}

export interface Producer {
  id: number;
  name: string;
  phoneNumber: string;
  address: string;
  email: string;
  region: string;
}

const App: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'stocks' | 'producers' | 'analytics'>('stocks');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);

  const transformStock = (item: any): StockItem => ({
    id: item.id,
    name: item.name,
    designationCode: item.designation_code,
    refNumber: item.ref_number,
    quantity: item.quantity,
    pricePerUnit: item.price_per_unit,
    retailPrice: item.retail_price,
    producerId: item.producer_id,
    producerName: item.producer_name,
    producerRegion: item.producer_region,
    description: item.description,
    category: item.category,
    imageUrl: item.image_url,
    lowStockThreshold: item.low_stock_threshold,
    updatedAt: item.updated_at,
  });

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const params = selectedCategory ? { category: selectedCategory } : {};
      const response = await axios.get('/api/stocks', { params });
      const rawStocks = Array.isArray(response.data) ? response.data : [];
      setStocks(rawStocks.map(transformStock));
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/stocks/categories');
      const data = Array.isArray(response.data) ? response.data : [];
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchLowStock = async () => {
    try {
      const response = await axios.get('/api/stocks/alerts/low-stock');
      const data = Array.isArray(response.data) ? response.data : [];
      setLowStockItems(data);
    } catch (error) {
      console.error('Error fetching low stock:', error);
    }
  };

  useEffect(() => {
    fetchStocks();
    fetchCategories();
    fetchLowStock();
    const interval = setInterval(() => {
      fetchLowStock();
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedCategory]);

  const safeStocks = Array.isArray(stocks) ? stocks : [];
  const lowStockCount = safeStocks.filter(item => item.quantity <= item.lowStockThreshold).length;

  const NavItem = ({ id, label, icon: Icon, visible = true }: { id: typeof activeTab, label: string, icon: any, visible?: boolean }) => {
    if (!visible) return null;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${
          activeTab === id 
            ? 'bg-brand-yellow text-brand-blue shadow-md scale-[1.02]' 
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`}
      >
        <Icon size={20} />
        <span className={isSidebarOpen ? 'block' : 'hidden'}>{label}</span>
      </button>
    );
  };

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'it', label: 'Italiano' },
    { code: 'es', label: 'Español' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-brand-blue transition-all duration-300 flex flex-col shadow-2xl z-20`}>
        <div className="p-6 flex items-center gap-3 text-white border-b border-white/10 mb-6">
          <LayoutDashboard size={32} className="text-brand-yellow shrink-0" />
          <h1 className={`font-black text-xl tracking-tighter ${isSidebarOpen ? 'block' : 'hidden'}`}>STOCK ERP</h1>
        </div>

        <nav className="flex-1 px-3 space-y-2">
          <NavItem id="stocks" label={t('inventory')} icon={Package} />
          <NavItem id="producers" label={t('producers')} icon={Factory} />
          {isAdmin && <NavItem id="analytics" label={t('analytics')} icon={BarChart3} />}
        </nav>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-4 text-white/50 hover:text-white transition-colors flex justify-center border-t border-white/10"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 h-20 flex items-center justify-between px-8 shadow-sm shrink-0">
          <div>
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('managementSystem')}</h2>
            <p className="text-xl font-black text-brand-blue capitalize">{t(activeTab as any)}</p>
          </div>

          <div className="flex items-center gap-6">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    language === lang.code
                      ? 'bg-white text-brand-blue shadow-sm'
                      : 'text-gray-400 hover:text-brand-blue hover:bg-gray-50'
                  }`}
                >
                  {lang.code.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Alerts */}
            <div className="relative">
              <button 
                onClick={() => setShowAlerts(!showAlerts)}
                className="relative p-2 text-gray-600 hover:text-brand-blue transition-colors"
              >
                <Bell size={24} />
                {lowStockItems.length > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {lowStockItems.length}
                  </span>
                )}
              </button>
              {showAlerts && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900">{t('lowStockAlert')}</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {lowStockItems.map((item) => (
                      <div key={item.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                        <p className="font-bold text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          {t('quantity')}: {item.quantity} / {t('threshold')}: {item.low_stock_threshold}
                        </p>
                      </div>
                    ))}
                    {lowStockItems.length === 0 && (
                      <div className="p-4 text-center text-gray-600">
                        {t('noItems')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {activeTab === 'stocks' && isAdmin && (
              <button 
                onClick={() => setShowForm(!showForm)}
                className="bg-brand-yellow text-brand-blue font-black py-2 px-6 rounded-xl flex items-center gap-2 hover:bg-yellow-400 transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus size={20} />
                {showForm ? t('closeForm') : t('registerItem')}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'stocks' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="bg-blue-100 p-4 rounded-2xl text-brand-blue"><Package size={24} /></div>
                  <div><p className="text-xs font-bold text-gray-400 uppercase">{t('totalItems')}</p><p className="text-2xl font-black text-gray-900">{stocks.length}</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="bg-yellow-100 p-4 rounded-2xl text-brand-yellow"><AlertTriangle size={24} /></div>
                  <div><p className="text-xs font-bold text-gray-400 uppercase">{t('lowStock')}</p><p className="text-2xl font-black text-gray-900">{lowStockCount}</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="bg-green-100 p-4 rounded-2xl text-green-600"><RefreshCw size={24} /></div>
                  <div><p className="text-xs font-bold text-gray-400 uppercase">{t('syncStatus')}</p><p className="text-sm font-black text-gray-900">{t('liveUpdates')}</p></div>
                </div>
              </div>

              {/* Category Filter */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-700">{t('category')}:</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                  >
                    <option value="">All</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              {showForm && isAdmin && <StockForm onStockAdded={() => { fetchStocks(); fetchCategories(); setShowForm(false); }} />}

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">{t('inventoryOverview')}</h3>
                  <button onClick={fetchStocks} className="text-gray-400 hover:text-brand-blue transition-colors">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>
                    <StockList stocks={safeStocks} onUpdate={() => { fetchStocks(); fetchLowStock(); }} />
              </div>
            </div>
          )}

          {activeTab === 'producers' && <ProducerManager />}
          {isAdmin && activeTab === 'analytics' && <AnalyticsDashboard />}
        </main>
      </div>
    </div>
  );
};

export default App;
