/**
 * Stock Form Component
 * 
 * Provides a user-friendly interface for registering new items in the inventory.
 * includes validation for required fields and numeric inputs.
 * 
 * Connected to:
 * - App.tsx: Receives onStockAdded callback to refresh the main list.
 * - backend API: Sends POST requests to /api/stocks to create new items.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusCircle, Info } from 'lucide-react';
import { Producer } from '../App';
import { useLanguage } from '../LanguageContext';

interface StockFormProps {
  onStockAdded: () => void;
}

const StockForm: React.FC<StockFormProps> = ({ onStockAdded }) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [designationCode, setDesignationCode] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [pricePerUnit, setPricePerUnit] = useState<number>(0);
  const [retailPrice, setRetailPrice] = useState<number>(0);
  const [producerId, setProducerId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [threshold, setThreshold] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [producers, setProducers] = useState<Producer[]>([]);

  useEffect(() => {
    const fetchProducers = async () => {
      try {
        const res = await axios.get('/api/stocks/producers');
        const nextProducers = Array.isArray(res.data) ? res.data : [];
        setProducers(nextProducers);
      } catch (err) {
        console.error('Error fetching producers:', err);
      }
    };
    fetchProducers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      await axios.post('/api/stocks', {
        name: name.trim(),
        designation_code: designationCode.trim(),
        ref_number: refNumber.trim(),
        quantity,
        price_per_unit: pricePerUnit,
        retail_price: retailPrice,
        producer_id: producerId === '' ? null : producerId,
        description: description.trim(),
        threshold
      });
      setName('');
      setDesignationCode('');
      setRefNumber('');
      setQuantity(0);
      setPricePerUnit(0);
      setRetailPrice(0);
      setProducerId('');
      setDescription('');
      setThreshold(5);
      onStockAdded();
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Failed to add stock item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      <div className="flex items-center gap-2 mb-6 text-brand-blue">
        <PlusCircle size={24} />
        <h3 className="text-xl font-bold">{t('register_item')}</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">{t('item_name')}</label>
            <input
              type="text"
              required
              placeholder="e.g. Blue Widgets"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">{t('designation_code')}</label>
            <input
              type="text"
              placeholder="e.g. BW-001"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
              value={designationCode}
              onChange={(e) => setDesignationCode(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">{t('ref_number')}</label>
            <input
              type="text"
              placeholder="e.g. REF-12345"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block text-brand-blue">{t('retail_price')}</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className="w-full pl-8 pr-4 py-3 rounded-lg border border-blue-200 focus:ring-2 focus:ring-brand-blue outline-none"
                value={retailPrice}
                onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block text-green-600">{t('sell_price')}</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-400">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className="w-full pl-8 pr-4 py-3 rounded-lg border border-green-200 focus:ring-2 focus:ring-brand-blue outline-none"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">{t('producer')}</label>
            <select
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue outline-none bg-white"
              value={producerId}
              onChange={(e) => setProducerId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">{t('select_producer')}</option>
              {(Array.isArray(producers) ? producers : []).map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.region})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">{t('initial_quantity')}</label>
            <input
              type="number"
              min="0"
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block flex items-center gap-1">
              {t('alert_threshold')} <Info size={14} className="text-gray-400" />
            </label>
            <input
              type="number"
              min="1"
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 block">{t('product_description')}</label>
          <textarea
            placeholder="Enter full product description details..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>


        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto bg-brand-blue text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-all shadow-md flex items-center justify-center gap-2"
          >
            {isSubmitting ? t('registering') : t('add_to_inventory')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockForm;
