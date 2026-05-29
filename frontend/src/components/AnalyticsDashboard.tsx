import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, TrendingUp, DollarSign, Package, User, Factory, PieChart } from 'lucide-react';
import { StockItem, Order, Client, Producer } from '../App';
import { useLanguage } from '../LanguageContext';

const AnalyticsDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [data, setData] = useState<{
    stocks: StockItem[],
    orders: any[],
    clients: Client[],
    producers: Producer[]
  }>({ stocks: [], orders: [], clients: [], producers: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [s, o, c, p] = await Promise.all([
          axios.get('/api/stocks'),
          axios.get('/api/stocks/orders'),
          axios.get('/api/stocks/clients'),
          axios.get('/api/stocks/producers')
        ]);
        setData({ stocks: s.data, orders: o.data, clients: c.data, producers: p.data });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const totalInventoryValue = data.stocks.reduce((acc, s) => acc + (s.quantity * s.retail_price), 0);
  const totalPotentialRevenue = data.stocks.reduce((acc, s) => acc + (s.quantity * s.price_per_unit), 0);
  const totalSalesRevenue = data.orders.reduce((acc, o) => acc + o.bill_price, 0);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="bg-blue-100 text-brand-blue p-2 rounded-lg w-fit"><DollarSign size={20} /></div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{t('total_sales')}</p>
          <p className="text-2xl font-black text-gray-900">{formatCurrency(totalSalesRevenue)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="bg-green-100 text-green-600 p-2 rounded-lg w-fit"><TrendingUp size={20} /></div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{t('potential_profit')}</p>
          <p className="text-2xl font-black text-gray-900">{formatCurrency(totalPotentialProfit)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="bg-yellow-100 text-brand-yellow p-2 rounded-lg w-fit"><Package size={20} /></div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{t('stock_assets')}</p>
          <p className="text-2xl font-black text-gray-900">{data.stocks.length} {t('total_items')}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
          <div className="bg-purple-100 text-purple-600 p-2 rounded-lg w-fit"><User size={20} /></div>
          <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{t('active_clients')}</p>
          <p className="text-2xl font-black text-gray-900">{data.clients.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Inventory Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <PieChart size={20} className="text-brand-blue" /> {t('inventory_distribution')}
          </h3>
          <div className="space-y-4">
            {data.producers.map(p => {
              const producerStocks = data.stocks.filter(s => s.producer_id === p.id);
              const count = producerStocks.length;
              const percentage = (count / data.stocks.length) * 100 || 0;
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

        {/* Top Clients */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-green-600" /> {t('sales_by_client')}
          </h3>
          <div className="space-y-4">
            {data.clients.map(c => {
              const clientOrders = data.orders.filter(o => o.client_id === c.id);
              const total = clientOrders.reduce((acc, o) => acc + o.bill_price, 0);
              const maxTotal = Math.max(...data.clients.map(cl => data.orders.filter(o => o.client_id === cl.id).reduce((acc, o) => acc + o.bill_price, 0)), 1);
              const barWidth = (total / maxTotal) * 100;
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-bold text-gray-700">{c.name}</span>
                    <span className="text-brand-blue font-bold">{formatCurrency(total)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-green-500 h-full transition-all" style={{ width: `${barWidth}%` }}></div>
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
