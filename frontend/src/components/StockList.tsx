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

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Edit2, Save, X, AlertCircle, Trash2 } from 'lucide-react';
import type { Producer, StockItem } from '../App';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../AuthContext';

interface StockListProps {
  stocks: StockItem[];
  onUpdate: () => void;
  viewMode: 'list' | 'grid';
}

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;charset=UTF-8,'.concat(
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="%239CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="48" height="48" rx="4" fill="%23F3F4F6" stroke="%23E5E7EB"/><path d="M16 24h32M16 32h32M16 40h20"/></svg>'
  )
);

const StockList: React.FC<StockListProps> = ({ stocks, onUpdate, viewMode }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editError, setEditError] = useState('');
  const [isSavingQuantity, setIsSavingQuantity] = useState(false);
  const [producers, setProducers] = useState<Producer[]>([]);
  const [adminEditForm, setAdminEditForm] = useState<{
    name: string;
    designationCode: string;
    refNumber: string;
    category: string;
    retailPrice: number;
    pricePerUnit: number;
    producerId: number | '';
    quantity: number;
    lowStockThreshold: number;
    description: string;
  }>({
    name: '',
    designationCode: '',
    refNumber: '',
    category: 'Uncategorised',
    retailPrice: 0,
    pricePerUnit: 0,
    producerId: '',
    quantity: 0,
    lowStockThreshold: 5,
    description: '',
  });
  const [adminError, setAdminError] = useState('');
  const [isSavingAdminEdit, setIsSavingAdminEdit] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchProducers = async () => {
      try {
        const res = await axios.get('/api/stocks/producers');
        const data = Array.isArray(res.data) ? res.data : [];
        const transformed = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          phoneNumber: p.phone_number,
          address: p.address,
          email: p.email,
          region: p.region,
        }));
        setProducers(transformed);
      } catch (error) {
        console.error('Error fetching producers:', error);
      }
    };

    fetchProducers();
  }, [isAdmin]);

  const formatCurrency = (value?: number) => {
    if (value === undefined) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getApiErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }
    return fallback;
  };

  const resetAdminEditState = () => {
    setEditingId(null);
    setAdminError('');
    setImageFile(null);
    setImagePreview(null);
  };

  const handleUpdateQuantity = async (id: number) => {
    try {
      setIsSavingQuantity(true);
      setEditError('');
      await axios.patch(`/api/stocks/${id}/quantity`, { quantity: editValue });
      setEditingId(null);
      onUpdate();
    } catch (error) {
      console.error('Error updating quantity:', error);
      setEditError(getApiErrorMessage(error, 'Failed to update quantity'));
    } finally {
      setIsSavingQuantity(false);
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
    setEditError('');
    setAdminError('');

    if (isAdmin) {
      setEditingId(item.id);
      setAdminEditForm({
        name: item.name,
        designationCode: item.designationCode,
        refNumber: item.refNumber,
        category: item.category,
        retailPrice: item.retailPrice ?? 0,
        pricePerUnit: item.pricePerUnit ?? 0,
        producerId: item.producerId ?? '',
        quantity: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
        description: item.description,
      });
      setImageFile(null);
      setImagePreview(item.imageUrl);
      return;
    }

    setEditingId(item.id);
    setEditValue(item.quantity);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdminEditChange = (
    field: keyof typeof adminEditForm,
    value: string | number | ''
  ) => {
    setAdminEditForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveAdminEdit = async () => {
    if (editingId === null) return;

    try {
      setIsSavingAdminEdit(true);
      setAdminError('');

      await axios.patch(`/api/stocks/${editingId}`, {
        name: adminEditForm.name.trim(),
        designation_code: adminEditForm.designationCode.trim(),
        ref_number: adminEditForm.refNumber.trim(),
        quantity: adminEditForm.quantity,
        price_per_unit: adminEditForm.pricePerUnit,
        retail_price: adminEditForm.retailPrice,
        producer_id: adminEditForm.producerId === '' ? null : adminEditForm.producerId,
        description: adminEditForm.description.trim(),
        category: adminEditForm.category.trim(),
        low_stock_threshold: adminEditForm.lowStockThreshold,
      });

      if (imageFile) {
        try {
          const formData = new FormData();
          formData.append('image', imageFile);
          await axios.post(`/api/stocks/${editingId}/image`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        } catch (error) {
          onUpdate();
          setAdminError(getApiErrorMessage(error, 'Product details were saved, but the image upload failed'));
          return;
        }
      }

      resetAdminEditState();
      onUpdate();
    } catch (error) {
      console.error('Error updating item:', error);
      setAdminError(getApiErrorMessage(error, 'Failed to update product'));
    } finally {
      setIsSavingAdminEdit(false);
    }
  };

  if (stocks.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <p className="text-lg">{t('noItems')}</p>
      </div>
    );
  }

  const renderStatusBadge = (isLow: boolean) =>
    isLow ? (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400 bg-brand-yellow px-3 py-1 text-xs font-bold text-brand-blue">
        <AlertCircle size={14} /> {t('lowStockAlert')}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
        {t('optimal')}
      </span>
    );

  const renderGridView = () => (
    <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 xl:grid-cols-3">
      {stocks.map((item) => {
        const isLow = item.quantity <= item.lowStockThreshold;
        const isEditing = editingId === item.id;

        return (
          <article
            key={item.id}
            className={`overflow-hidden rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
              isLow ? 'border-yellow-300 bg-yellow-50/40' : 'border-gray-100 bg-white'
            }`}
          >
            <div className="relative">
              <div
                className="aspect-[4/3] w-full cursor-pointer overflow-hidden bg-gray-100"
                onClick={() => {
                  if (item.imageUrl) {
                    window.open(item.imageUrl, '_blank');
                  }
                }}
              >
                <img
                  src={item.imageUrl || PLACEHOLDER_IMAGE}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute left-4 top-4">{renderStatusBadge(isLow)}</div>
            </div>

            <div className="space-y-4 p-5">
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-gray-900">{item.name}</h4>
                <p className="text-xs font-mono text-gray-500">{t('designationCode')}: {item.designationCode || 'N/A'}</p>
                <p className="text-xs font-mono text-gray-500">{t('refNumber')}: {item.refNumber || 'N/A'}</p>
                <p className="text-xs font-mono text-gray-500">{t('category')}: {item.category || 'Uncategorized'}</p>
                <p className="text-xs font-semibold text-blue-600">{t('from')}: {item.producerName || t('noProducer')} ({item.producerRegion || 'N/A'})</p>
              </div>

              {item.description && (
                <p className="line-clamp-2 text-sm text-gray-600">{item.description}</p>
              )}

              <div className={`grid gap-3 ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{t('quantity')}</p>
                  {isEditing && !isAdmin ? (
                    <input
                      type="number"
                      className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-center outline-none focus:ring-2 focus:ring-brand-blue"
                      value={editValue}
                      onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                    />
                  ) : (
                    <>
                      <p className={`mt-2 text-3xl font-black ${isLow ? 'text-red-600' : 'text-gray-800'}`}>{item.quantity}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">
                        {t('alertThreshold')}: {item.lowStockThreshold}
                      </p>
                    </>
                  )}
                </div>

                {isAdmin && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-brand-blue">{t('unitPrice')}</p>
                    <p className="mt-2 text-sm font-semibold text-blue-700">{t('retailPrice')}: {formatCurrency(item.retailPrice)}</p>
                    <p className="mt-1 text-base font-bold text-green-700">{t('sellPrice')}: {formatCurrency(item.pricePerUnit)}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                {isEditing && !isAdmin ? (
                  <>
                    <button
                      onClick={() => handleUpdateQuantity(item.id)}
                      disabled={isSavingQuantity}
                      className="rounded-lg p-2 text-green-600 transition-colors hover:bg-green-100"
                      title="Save"
                    >
                      <Save size={20} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditError('');
                      }}
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100"
                      title="Cancel"
                    >
                      <X size={20} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(item)}
                      className="flex items-center gap-2 rounded-lg p-2 text-brand-blue transition-colors hover:bg-blue-100"
                      title="Update Quantity"
                    >
                      <Edit2 size={18} />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="flex items-center gap-2 rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                        title="Delete Item"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );

  if (viewMode === 'grid') {
    return (
      <div>
        {renderGridView()}

        {!isAdmin && editingId !== null && editError && (
          <div className="mx-6 mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
            {editError}
          </div>
        )}

        {isAdmin && editingId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-blue/40 p-4">
            <div className="w-full max-w-5xl rounded-2xl border border-gray-100 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-8 py-5">
                <div>
                  <h3 className="text-xl font-bold text-brand-blue">{t('save')} {adminEditForm.name || t('itemName')}</h3>
                  <p className="text-sm text-gray-500">{t('inventoryOverview')}</p>
                </div>
                <button
                  onClick={resetAdminEditState}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  title={t('cancel')}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[80vh] overflow-y-auto px-8 py-6">
                {adminError && (
                  <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
                    {adminError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">{t('itemName')}</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                      value={adminEditForm.name}
                      onChange={(e) => handleAdminEditChange('name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">{t('designationCode')}</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                      value={adminEditForm.designationCode}
                      onChange={(e) => handleAdminEditChange('designationCode', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">{t('refNumber')}</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                      value={adminEditForm.refNumber}
                      onChange={(e) => handleAdminEditChange('refNumber', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">{t('category')}</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                      value={adminEditForm.category}
                      onChange={(e) => handleAdminEditChange('category', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-brand-blue">{t('retailPrice')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-blue-200 py-3 pl-8 pr-4 outline-none focus:ring-2 focus:ring-brand-blue"
                        value={adminEditForm.retailPrice}
                        onChange={(e) => handleAdminEditChange('retailPrice', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-green-600">{t('sellPrice')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-green-200 py-3 pl-8 pr-4 outline-none focus:ring-2 focus:ring-brand-blue"
                        value={adminEditForm.pricePerUnit}
                        onChange={(e) => handleAdminEditChange('pricePerUnit', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">{t('producer')}</label>
                    <select
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-blue"
                      value={adminEditForm.producerId}
                      onChange={(e) => handleAdminEditChange('producerId', e.target.value === '' ? '' : Number(e.target.value))}
                    >
                      <option value="">{t('selectProducer')}</option>
                      {producers.map((producer) => (
                        <option key={producer.id} value={producer.id}>
                          {producer.name} ({producer.region})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">{t('quantity')}</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                      value={adminEditForm.quantity}
                      onChange={(e) => handleAdminEditChange('quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">{t('alertThreshold')}</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                      value={adminEditForm.lowStockThreshold}
                      onChange={(e) => handleAdminEditChange('lowStockThreshold', parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                    />
                    {imagePreview && (
                      <img
                        src={imagePreview}
                        alt={adminEditForm.name || 'Preview'}
                        className="h-24 w-24 rounded-lg border border-gray-200 object-cover"
                      />
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <label className="block text-sm font-bold text-gray-700">{t('productDescription')}</label>
                  <textarea
                    rows={4}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                    value={adminEditForm.description}
                    onChange={(e) => handleAdminEditChange('description', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-8 py-5">
                <button
                  onClick={resetAdminEditState}
                  className="rounded-lg border border-gray-200 px-5 py-3 font-bold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSaveAdminEdit}
                  disabled={isSavingAdminEdit}
                  className="flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-6 py-3 font-bold text-white shadow-md transition-all hover:bg-blue-700 disabled:bg-gray-400"
                >
                  <Save size={18} />
                  {isSavingAdminEdit ? t('registering') : t('save')}
                </button>
              </div>
            </div>
          </div>
        )}
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
                  {renderStatusBadge(isLow)}
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
                  {isEditing && !isAdmin ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleUpdateQuantity(item.id)}
                        disabled={isSavingQuantity}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                        title="Save"
                      >
                        <Save size={20} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditError('');
                        }}
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

      {!isAdmin && editingId !== null && editError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {editError}
        </div>
      )}

      {isAdmin && editingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-blue/40 p-4">
          <div className="w-full max-w-5xl rounded-2xl border border-gray-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-8 py-5">
              <div>
                <h3 className="text-xl font-bold text-brand-blue">{t('save')} {adminEditForm.name || t('itemName')}</h3>
                <p className="text-sm text-gray-500">{t('inventoryOverview')}</p>
              </div>
              <button
                onClick={resetAdminEditState}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                title={t('cancel')}
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto px-8 py-6">
              {adminError && (
                <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
                  {adminError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">{t('itemName')}</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                    value={adminEditForm.name}
                    onChange={(e) => handleAdminEditChange('name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">{t('designationCode')}</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                    value={adminEditForm.designationCode}
                    onChange={(e) => handleAdminEditChange('designationCode', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">{t('refNumber')}</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                    value={adminEditForm.refNumber}
                    onChange={(e) => handleAdminEditChange('refNumber', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">{t('category')}</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                    value={adminEditForm.category}
                    onChange={(e) => handleAdminEditChange('category', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-brand-blue">{t('retailPrice')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-blue-200 py-3 pl-8 pr-4 outline-none focus:ring-2 focus:ring-brand-blue"
                      value={adminEditForm.retailPrice}
                      onChange={(e) => handleAdminEditChange('retailPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-green-600">{t('sellPrice')}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-green-200 py-3 pl-8 pr-4 outline-none focus:ring-2 focus:ring-brand-blue"
                      value={adminEditForm.pricePerUnit}
                      onChange={(e) => handleAdminEditChange('pricePerUnit', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">{t('producer')}</label>
                  <select
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-blue"
                    value={adminEditForm.producerId}
                    onChange={(e) => handleAdminEditChange('producerId', e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">{t('selectProducer')}</option>
                    {producers.map((producer) => (
                      <option key={producer.id} value={producer.id}>
                        {producer.name} ({producer.region})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">{t('quantity')}</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                    value={adminEditForm.quantity}
                    onChange={(e) => handleAdminEditChange('quantity', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">{t('alertThreshold')}</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                    value={adminEditForm.lowStockThreshold}
                    onChange={(e) => handleAdminEditChange('lowStockThreshold', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                  />
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt={adminEditForm.name || 'Preview'}
                      className="h-24 w-24 rounded-lg border border-gray-200 object-cover"
                    />
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <label className="block text-sm font-bold text-gray-700">{t('productDescription')}</label>
                <textarea
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 px-4 py-3 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-brand-blue"
                  value={adminEditForm.description}
                  onChange={(e) => handleAdminEditChange('description', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-8 py-5">
              <button
                onClick={resetAdminEditState}
                className="rounded-lg border border-gray-200 px-5 py-3 font-bold text-gray-600 transition-colors hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveAdminEdit}
                disabled={isSavingAdminEdit}
                className="flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-6 py-3 font-bold text-white shadow-md transition-all hover:bg-blue-700 disabled:bg-gray-400"
              >
                <Save size={18} />
                {isSavingAdminEdit ? t('registering') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockList;
