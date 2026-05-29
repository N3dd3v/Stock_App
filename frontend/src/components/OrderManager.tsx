import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, Plus, Package, Calendar, MapPin, User, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { Client, StockItem, Order } from '../App';
import { useLanguage } from '../LanguageContext';

const OrderManager: React.FC = () => {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [clientId, setClientId] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [shipmentDate, setShipmentDate] = useState('');
  const [status, setStatus] = useState('Pending');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ stock_id: number, quantity: number, unit_price: number }[]>([]);
  
  const [stocks, setStocks] = useState<StockItem[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, clientsRes, stocksRes] = await Promise.all([
        axios.get('/api/stocks/orders'),
        axios.get('/api/stocks/clients'),
        axios.get('/api/stocks')
      ]);
      setOrders(ordersRes.data);
      setClients(clientsRes.data);
      setStocks(stocksRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const billPrice = selectedItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);

  const addItemToOrder = () => {
    setSelectedItems([...selectedItems, { stock_id: 0, quantity: 1, unit_price: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...selectedItems];
    if (field === 'stock_id') {
      const stock = stocks.find(s => s.id === Number(value));
      newItems[index] = { ...newItems[index], stock_id: Number(value), unit_price: stock?.price_per_unit || 0 };
    } else {
      newItems[index] = { ...newItems[index], [field]: Number(value) };
    }
    setSelectedItems(newItems);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    try {
      await axios.patch(`/api/stocks/orders/${id}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || selectedItems.length === 0) return;
    try {
      await axios.post('/api/stocks/orders', {
        client_id: clientId,
        location,
        bill_price: billPrice,
        shipment_date: shipmentDate || null,
        status,
        items: selectedItems
      });
      setClientId(''); setLocation(''); setShipmentDate(''); setStatus('Pending'); setSelectedItems([]);
      setShowForm(false);
      fetchData();
    } catch (err) {
      alert('Error creating order');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-brand-blue flex items-center gap-2">
          <ShoppingCart /> {t('order_history')}
        </h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-blue text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} /> {showForm ? t('cancel') : t('create_new_order')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-gray-100 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">{t('client')}</label>
              <select required className="w-full p-2 border rounded" value={clientId} onChange={e => setClientId(Number(e.target.value))}>
                <option value="">{t('select_client')}</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">{t('delivery_location')}</label>
              <input required className="w-full p-2 border rounded" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">{t('shipment_date')}</label>
              <input type="date" className="w-full p-2 border rounded" value={shipmentDate} onChange={e => setShipmentDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-gray-700">{t('status')}</label>
              <select className="w-full p-2 border rounded" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="Pending">{t('status_pending')}</option>
                <option value="Shipped">{t('status_shipped')}</option>
                <option value="Delivered">{t('status_delivered')}</option>
                <option value="Cancelled">{t('status_cancelled')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="font-bold text-gray-700 flex items-center gap-2"><Package size={18}/> {t('order_items')}</h4>
              <button type="button" onClick={addItemToOrder} className="text-brand-blue font-bold text-sm flex items-center gap-1 hover:underline">
                <Plus size={16}/> {t('add_item')}
              </button>
            </div>
            
            {selectedItems.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50 p-3 rounded-lg">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-gray-500">{t('inventory')}</label>
                  <select 
                    required 
                    className="w-full p-2 border rounded bg-white" 
                    value={item.stock_id} 
                    onChange={e => updateItem(index, 'stock_id', e.target.value)}
                  >
                    <option value="0">{t('select_product')}</option>
                    {stocks.map(s => <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.price_per_unit)})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500">{t('quantity')}</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="w-full p-2 border rounded bg-white" 
                    value={item.quantity} 
                    onChange={e => updateItem(index, 'quantity', e.target.value)} 
                  />
                </div>
                <button type="button" onClick={() => removeItem(index)} className="text-red-500 p-2 hover:bg-red-50 rounded w-fit">
                  <Trash2 size={18}/>
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-lg font-black text-brand-blue">
              {t('total_bill')}: {formatCurrency(billPrice)}
            </div>
            <button type="submit" className="bg-brand-yellow text-brand-blue font-black py-2 px-8 rounded-xl hover:bg-yellow-400 shadow-md">
              {t('confirm_order')}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-brand-blue uppercase text-xs font-bold">
            <tr>
              <th className="px-6 py-4">{t('order_id')}</th>
              <th className="px-6 py-4">{t('client')}</th>
              <th className="px-6 py-4">{t('delivery_location')}</th>
              <th className="px-6 py-4">{t('amount')}</th>
              <th className="px-6 py-4">{t('date')}</th>
              <th className="px-6 py-4">{t('status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-blue-50 transition-colors">
                <td className="px-6 py-4 font-mono text-sm text-gray-500">#{order.id.toString().padStart(5, '0')}</td>
                <td className="px-6 py-4 font-bold text-gray-900">{order.client_name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1"><MapPin size={12} /> {order.location}</div>
                </td>
                <td className="px-6 py-4 font-bold text-brand-blue">{formatCurrency(order.bill_price)}</td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1"><Calendar size={12} /> {new Date(order.order_date).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4">
                  <select 
                    value={order.status} 
                    onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                    className={`text-[10px] font-bold uppercase rounded-full px-2 py-1 border-none focus:ring-2 focus:ring-brand-blue outline-none cursor-pointer ${
                      order.status === 'Delivered' ? 'bg-green-100 text-green-700' : 
                      order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' : 
                      order.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    <option value="Pending">{t('status_pending')}</option>
                    <option value="Shipped">{t('status_shipped')}</option>
                    <option value="Delivered">{t('status_delivered')}</option>
                    <option value="Cancelled">{t('status_cancelled')}</option>
                  </select>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && !loading && (
          <div className="p-12 text-center text-gray-400">{t('no_orders')}</div>
        )}
      </div>
    </div>
  );
};

export default OrderManager;
