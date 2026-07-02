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
import { useAuth } from '../AuthContext';

interface StockListProps {
  stocks: StockItem[];
  onUpdate: () => void;
}

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;charset=UTF-8,'.concat(
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="%239CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="48" height="48" rx="4" fill="%23F3F4F6" stroke="%23E5E7EB"/><path d="M16 24h32M16 32h32M16 40h20"/></svg>'
  )
);

const StockList: React.FC<StockListProps> = ({ stocks, onUpdate }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<number>(0);

  const formatCurrency = (value?: number) => {
    if (value === undefined) return '';
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
    if (window.confirm(`${t('confirmDelete')} "${name}"`)) {
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
        <p className="text-lg">{t('noItems')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-gray-50 text-brand-blue uppercase text-xs font-bold tracking-wider">
          <tr>
            <th className="px-6 py-4">{t('itemDetails')}</th>
            <th className="px-6 py-4">{t('status')}</th>
            <th className="px-6 py-4 text-center">{t('quantity')}</th>
            {isAdmin && (
              <>
                <th className="px-6 py-4 text-center">{t('unitPrice')}</th>
                <th className="px-6 py-4 text-center">{t('totalPrice')}</th>
              </>
            )}
            <th className="px-6 py-4 text-right">{t('actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {stocks.map((item) => {
            const isLow = item.quantity <= item.lowStockThreshold;
            const isEditing = editingId === item.id;
            const totalPrice = item.retailPrice !== undefined ? item.quantity * item.retailPrice : undefined;

            return (
              <tr key={item.id} className={`group relative hover:bg-blue-50 transition-colors ${isLow ? 'bg-yellow-50/50' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-16 h-16 rounded-xl border border-gray-200 overflow-hidden cursor-pointer"
                      onClick={() => {
                        if (item.imageUrl) {
                          window.open(item.imageUrl, '_blank');
                        }
                      }}
                    >
                      <img
                        src={item.imageUrl || PLACEHOLDER_IMAGE}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 cursor-help underline decoration-dotted decoration-gray-300 underline-offset-4">{item.name}</span>
                      <span className="text-xs text-gray-500 font-mono">{t('designationCode')}: {item.designationCode || 'N/A'}</span>
                      <span className="text-xs text-gray-500 font-mono">{t('refNumber')}: {item.refNumber || 'N/A'}</span>
                      <span className="text-xs text-gray-500 font-mono">{t('category')}: {item.category || 'Uncategorized'}</span>
                      <span className="text-xs text-blue-600 font-semibold mt-1">{t('from')}: {item.producerName || t('noProducer')} ({item.producerRegion || 'N/A'})</span>
                    </div>
                  </div>
                  
                  {/* Tooltip */}
                  {item.description && (
                    <div className="absolute left-1/4 top-0 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 mb-2">
                      <div className="bg-brand-blue text-white text-xs rounded-lg p-3 shadow-xl max-w-xs border border-blue-400">
                        <p className="font-bold border-b border-blue-400 mb-1 pb-1">{t('productDescription')}</p>
                        {item.description}
                        <div className="absolute bottom-0 left-4 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-brand-blue"></div>
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {isLow ? (
                    <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-bold bg-brand-yellow text-brand-blue border border-yellow-400">
                      <AlertCircle size={14} /> {t('lowStockAlert')}
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
                      <span className="text-[10px] text-gray-400 uppercase tracking-tighter">{t('alertThreshold')}: {item.lowStockThreshold}</span>
                    </div>
                  )}
                </td>
                {isAdmin && (
                  <>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center text-xs">
                        <span className="text-blue-600 font-semibold" title={t('retailPrice')}>{t('retailPrice')}: {formatCurrency(item.retailPrice)}</span>
                        <span className="text-green-700 font-bold" title={t('sellPrice')}>{t('sellPrice')}: {formatCurrency(item.pricePerUnit)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-brand-blue font-bold">{formatCurrency(totalPrice)}</span>
                        {item.pricePerUnit !== undefined && item.retailPrice !== undefined && (
                          <span className="text-[10px] text-green-600 font-semibold">{t('margin')}: {formatCurrency((item.quantity * item.pricePerUnit) - (totalPrice || 0))}</span>
                        )}
                      </div>
                    </td>
                  </>
                )}

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
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                          title="Delete Item"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
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
