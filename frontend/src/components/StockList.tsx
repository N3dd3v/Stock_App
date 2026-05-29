/**
 * Stock List Component
 * 
 * Displays the inventory in a tabular format. It provides intuitive inline editing
 * for quantity updates and highlights items that have fallen below their threshold.
 * 
 * Connected to:
 * - App.tsx: Receives stocks array and onUpdate callback.
 * - backend API: Sends PATCH requests to /api/stocks/:id/quantity for updates.
 */

import React, { useState } from 'react';
import axios from 'axios';
import { Edit2, Save, X, AlertCircle, Trash2 } from 'lucide-react';
import { StockItem } from '../App';
import { useLanguage } from '../LanguageContext';

interface StockListProps {
  stocks: StockItem[];
  onUpdate: () => void;
}

const StockList: React.FC<StockListProps> = ({ stocks, onUpdate }) => {
  const { t } = useLanguage();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const handleUpdateQuantity = async (id: number) => {
    try {
      await axios.patch(`/api/stocks/${id}/quantity`, { quantity: editValue });
      setEditingId(null);
      onUpdate();
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('Failed to update quantity');
    }
  };

  const handleDeleteItem = async (id: number, name: string) => {
    if (window.confirm(`${t('confirm_delete')} "${name}"`)) {
      try {
        await axios.delete(`/api/stocks/${id}`);
        onUpdate();
      } catch (error) {
        console.error('Error deleting item:', error);
        alert('Failed to delete item');
      }
    }
  };

  const startEditing = (item: StockItem) => {
    setEditingId(item.id);
    setEditValue(item.quantity);
  };

  if (stocks.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <p className="text-lg">{t('no_items')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gray-50 text-brand-blue uppercase text-xs font-bold tracking-wider">
          <tr>
            <th className="px-6 py-4">{t('item_details')}</th>
            <th className="px-6 py-4">{t('status')}</th>
            <th className="px-6 py-4 text-center">{t('quantity')}</th>
            <th className="px-6 py-4 text-center">{t('unit_price')}</th>
            <th className="px-6 py-4 text-center">{t('total_price')}</th>
            <th className="px-6 py-4 text-right">{t('actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {stocks.map((item) => {
            const isLow = item.quantity <= item.low_stock_threshold;
            const isEditing = editingId === item.id;
            const totalPrice = item.quantity * item.retail_price;

            return (
              <tr key={item.id} className={`group relative hover:bg-blue-50 transition-colors ${isLow ? 'bg-yellow-50/50' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 cursor-help underline decoration-dotted decoration-gray-300 underline-offset-4">{item.name}</span>
                    <span className="text-xs text-gray-500 font-mono">{t('designation_code')}: {item.designation_code || 'N/A'}</span>
                    <span className="text-xs text-gray-500 font-mono">{t('ref_number')}: {item.ref_number || 'N/A'}</span>
                    <span className="text-xs text-blue-600 font-semibold mt-1">{t('from')}: {item.producer_name || t('no_producer')} ({item.producer_region || 'N/A'})</span>
                  </div>
                  
                  {/* Tooltip */}
                  {item.description && (
                    <div className="absolute left-1/4 top-0 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 mb-2">
                      <div className="bg-brand-blue text-white text-xs rounded-lg p-3 shadow-xl max-w-xs border border-blue-400">
                        <p className="font-bold border-b border-blue-400 mb-1 pb-1">{t('product_description')}</p>
                        {item.description}
                        <div className="absolute bottom-0 left-4 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-brand-blue"></div>
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {isLow ? (
                    <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-bold bg-brand-yellow text-brand-blue border border-yellow-400">
                      <AlertCircle size={14} /> {t('low_stock_alert')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                      {t('optimal')}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {isEditing ? (
                    <div className="flex items-center justify-center gap-2">
                      <input
                        type="number"
                        className="w-20 px-2 py-1 border rounded text-center focus:ring-2 focus:ring-brand-blue outline-none"
                        value={editValue}
                        onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className={`text-lg font-bold ${isLow ? 'text-red-600' : 'text-gray-700'}`}>
                        {item.quantity}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-tighter">{t('alert_threshold')}: {item.low_stock_threshold}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center text-xs">
                    <span className="text-blue-600 font-semibold" title={t('retail_price')}>{t('retail_price')}: {formatCurrency(item.retail_price)}</span>
                    <span className="text-green-700 font-bold" title={t('sell_price')}>{t('sell_price')}: {formatCurrency(item.price_per_unit)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-brand-blue font-bold">{formatCurrency(totalPrice)}</span>
                    <span className="text-[10px] text-green-600 font-semibold">{t('margin')}: {formatCurrency((item.quantity * item.price_per_unit) - totalPrice)}</span>
                  </div>
                </td>

                <td className="px-6 py-4 text-right">
                  {isEditing ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleUpdateQuantity(item.id)}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        title="Save"
                      >
                        <Save size={20} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEditing(item)}
                        className="p-2 text-brand-blue hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2"
                        title="Update Quantity"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                        title="Delete Item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default StockList;
