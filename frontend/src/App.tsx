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
  Factory, BarChart3, Menu, X, Globe 
} from 'lucide-react';
import StockList from './components/StockList';
import StockForm from './components/StockForm';
import ProducerManager from './components/ProducerManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import { useLanguage } from './LanguageContext';
import { Language } from './translations';


export interface StockItem {
  id: number;
  name: string;
  designation_code: string;
  ref_number: string;
  quantity: number;
  price_per_unit: number; // Sell Price
  retail_price: number;   // Purchase Price
  producer_id: number | null;
  producer_name?: string;
  producer_region?: string;
  description: string;
  category: string;
  image_url: string | null;
  low_stock_threshold: number;
  updated_at: string;
}

export interface Producer {
  id: number;
  name: string;
  phone_number: string;
  address: string;
  email: string;
  region: string;
}

const App: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stocks' | 'producers' | 'analytics'>('stocks');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/stocks');
      const nextStocks = Array.isArray(response.data) ? response.data : [];
      setStocks(nextStocks);
    } catch (error) {
      console.error('Error fetching stocks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  const safeStocks = Array.isArray(stocks) ? stocks : [];
  const lowStockCount = safeStocks.filter(item => item.quantity <= item.low_stock_threshold).length;

  const NavItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
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
          <NavItem id="analytics" label={t('analytics')} icon={BarChart3} />
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
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('management_system')}</h2>
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

            {activeTab === 'stocks' && (
              <button 
                onClick={() => setShowForm(!showForm)}
                className="bg-brand-yellow text-brand-blue font-black py-2 px-6 rounded-xl flex items-center gap-2 hover:bg-yellow-400 transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus size={20} />
                {showForm ? t('close_form') : t('register_item')}
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
                  <div><p className="text-xs font-bold text-gray-400 uppercase">{t('total_items')}</p><p className="text-2xl font-black text-gray-900">{stocks.length}</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="bg-yellow-100 p-4 rounded-2xl text-brand-yellow"><AlertTriangle size={24} /></div>
                  <div><p className="text-xs font-bold text-gray-400 uppercase">{t('low_stock')}</p><p className="text-2xl font-black text-gray-900">{lowStockCount}</p></div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="bg-green-100 p-4 rounded-2xl text-green-600"><RefreshCw size={24} /></div>
                  <div><p className="text-xs font-bold text-gray-400 uppercase">{t('sync_status')}</p><p className="text-sm font-black text-gray-900">{t('live_updates')}</p></div>
                </div>
              </div>

              {showForm && <StockForm onStockAdded={() => { fetchStocks(); setShowForm(false); }} />}

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">{t('inventory_overview')}</h3>
                  <button onClick={fetchStocks} className="text-gray-400 hover:text-brand-blue transition-colors">
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                  </button>
                </div>
                    <StockList stocks={safeStocks} onUpdate={fetchStocks} />
              </div>
            </div>
          )}

          {activeTab === 'producers' && <ProducerManager />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
        </main>
      </div>
    </div>
  );
};

export default App;
