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
import { useAuth } from '../AuthContext';

interface StockFormProps {
  onStockAdded: () => void;
}

const StockForm: React.FC<StockFormProps> = ({ onStockAdded }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [name, setName] = useState('');
  const [designationCode, setDesignationCode] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [pricePerUnit, setPricePerUnit] = useState<number>(0);
  const [retailPrice, setRetailPrice] = useState<number>(0);
  const [producerId, setProducerId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Uncategorized');
  const [threshold, setThreshold] = useState<number>(5);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [producers, setProducers] = useState<Producer[]>([]);

  useEffect(() => {
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
          region: p.region
        }));
        setProducers(transformed);
      } catch (err) {
        console.error('Error fetching producers:', err);
      }
    };
    fetchProducers();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isAdmin) return;

    try {
      setIsSubmitting(true);
      const response = await axios.post('/api/stocks', {
        name: name.trim(),
        designation_code: designationCode.trim(),
        ref_number: refNumber.trim(),
        quantity,
        price_per_unit: pricePerUnit,
        retail_price: retailPrice,
        producer_id: producerId === '' ? null : producerId,
        description: description.trim(),
        category,
        threshold
      });

      if (imageFile && response.data.id) {
        const formData = new FormData();
        formData.append('image', imageFile);
        await axios.post(`/api/stocks/${response.data.id}/image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      setName('');
      setDesignationCode('');
      setRefNumber('');
      setQuantity(0);
      setPricePerUnit(0);
      setRetailPrice(0);
      setProducerId('');
      setDescription('');
      setCategory('Uncategorized');
      setThreshold(5);
      setImageFile(null);
      setImagePreview(null);
      onStockAdded();
    } catch (error) {
      console.error('Error adding stock:', error);
      alert('Failed to add stock item');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
      <div className="flex items-center gap-2 mb-6 text-brand-blue">
        <PlusCircle size={24} />
        <h3 className="text-xl font-bold">{t('registerItem')}</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">{t('itemName')}</label>
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
            <label className="text-sm font-bold text-gray-700 block">{t('designationCode')}</label>
            <input
              type="text"
              placeholder="e.g. BW-001"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
              value={designationCode}
              onChange={(e) => setDesignationCode(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">{t('refNumber')}</label>
            <input
              type="text"
              placeholder="e.g. REF-12345"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">{t('category')}</label>
            <input
              type="text"
              placeholder="e.g. Electronics"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block text-brand-blue">{t('retailPrice')}</label>
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
            <label className="text-sm font-bold text-gray-700 block text-green-600">{t('sellPrice')}</label>
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
              <option value="">{t('selectProducer')}</option>
              {producers.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.region})</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">{t('initialQuantity')}</label>
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
              {t('alertThreshold')} <Info size={14} className="text-gray-400" />
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

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 block">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
            />
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700 block">{t('productDescription')}</label>
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
            {isSubmitting ? t('registering') : t('addToInventory')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockForm;
