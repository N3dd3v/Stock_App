import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, TrendingUp, DollarSign, Package, Factory, PieChart } from 'lucide-react';
import { StockItem, Producer } from '../App';
import { useLanguage } from '../LanguageContext';

const AnalyticsDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<{
    stocks: StockItem[],
    producers: Producer[]
  }>({ stocks: [], producers: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [s, p] = await Promise.all([
          axios.get('/api/stocks'),
          axios.get('/api/stocks/producers')
        ]);
        setData({ 
          stocks: Array.isArray(s.data) ? s.data : [], 
          producers: Array.isArray(p.data) ? p.data : [] 
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const safeStocks = Array.isArray(data.stocks) ? data.stocks : [];
  const totalInventoryValue = safeStocks.reduce((acc, s) => acc + (s.quantity * s.retail_price), 0);
  const totalPotentialRevenue = safeStocks.reduce((acc, s) => acc + (s.quantity * s.price_per_unit), 0);
  const totalPotentialProfit = totalPotentialRevenue - totalInventoryValue;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  if (loading) return <div className="p-12 text-center text-brand-blue animate-pulse">{t('calculating')}</div>;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-brand-blue flex items-center gap-2">
        <BarChart3 /> {t('business_analytics')}
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="bg-blue-100 text-brand-blue p-2 rounded-lg w-fit"><DollarSign size={20} /></div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{t('stock_assets')}</p>
          <p className="text-2xl font-black text-gray-900">{formatCurrency(totalInventoryValue)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="bg-green-100 text-green-600 p-2 rounded-lg w-fit"><TrendingUp size={20} /></div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{t('potential_profit')}</p>
          <p className="text-2xl font-black text-gray-900">{formatCurrency(totalPotentialProfit)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="bg-yellow-100 text-brand-yellow p-2 rounded-lg w-fit"><Package size={20} /></div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{t('total_items')}</p>
          <p className="text-2xl font-black text-gray-900">{safeStocks.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Inventory Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <PieChart size={20} className="text-brand-blue" /> {t('inventory_distribution')}
          </h3>
          <div className="space-y-4">
            {Array.isArray(data.producers) && data.producers.map(p => {
              const producerStocks = safeStocks.filter(s => s.producer_id === p.id);
              const count = producerStocks.length;
              const percentage = safeStocks.length > 0 ? (count / safeStocks.length) * 100 : 0;
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-gray-700">{p.name}</span>
                    <span className="text-gray-500">{count} {t('total_items')} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-brand-blue h-full transition-all" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
