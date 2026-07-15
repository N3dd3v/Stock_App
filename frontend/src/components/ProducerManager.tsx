import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Edit2, Factory, Mail, MapPin, Phone, Plus, Save, Trash2, X } from 'lucide-react';
import type { Producer } from '../App';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../AuthContext';

const ProducerManager: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProducerId, setEditingProducerId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const transformProducer = (producer: any): Producer => ({
    id: producer.id,
    name: producer.name,
    phoneNumber: producer.phone_number ?? '',
    address: producer.address ?? '',
    email: producer.email ?? '',
    region: producer.region ?? '',
  });

  const resetForm = () => {
    setEditingProducerId(null);
    setName('');
    setRegion('');
    setPhone('');
    setEmail('');
    setAddress('');
  };

  const getApiErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 409) {
        return 'This supplier is in use by existing products and cannot be deleted yet.';
      }

      const apiMessage = error.response?.data?.error;
      if (typeof apiMessage === 'string' && apiMessage.trim()) {
        return apiMessage;
      }
    }

    return fallback;
  };

  const fetchProducers = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const response = await axios.get('/api/stocks/producers');
      const nextProducers = Array.isArray(response.data) ? response.data : [];
      setProducers(nextProducers.map(transformProducer));
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setErrorMessage('Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchProducers();
  }, [isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const payload = {
        name: name.trim(),
        region: region.trim(),
        phone_number: phone.trim(),
        email: email.trim(),
        address: address.trim(),
      };

      if (editingProducerId === null) {
        await axios.post('/api/stocks/producers', payload);
      } else {
        await axios.patch(`/api/stocks/producers/${editingProducerId}`, payload);
      }

      resetForm();
      await fetchProducers();
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          editingProducerId === null ? 'Failed to add supplier.' : 'Failed to update supplier.'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number, producerName: string) => {
    if (!window.confirm(`${t('delete')} "${producerName}"?`)) {
      return;
    }

    try {
      setErrorMessage('');
      await axios.delete(`/api/stocks/producers/${id}`);
      await fetchProducers();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Failed to delete supplier.'));
    }
  };

  const handleStartEdit = (producer: Producer) => {
    setEditingProducerId(producer.id);
    setName(producer.name);
    setRegion(producer.region);
    setPhone(producer.phoneNumber);
    setEmail(producer.email);
    setAddress(producer.address);
    setErrorMessage('');
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-brand-blue flex items-center gap-2">
            <Factory size={24} /> {t('producerManagement')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage suppliers used by your products.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setErrorMessage('');
          }}
          className="bg-brand-blue text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors font-bold shadow-md"
        >
          {editingProducerId === null ? <Plus size={18} /> : <X size={18} />}
          {editingProducerId === null ? t('addProducer') : t('cancel')}
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center gap-2 text-brand-blue">
          {editingProducerId === null ? <Plus size={22} /> : <Edit2 size={22} />}
          <h3 className="text-xl font-bold">
            {editingProducerId === null ? t('addProducer') : `${t('update')} ${t('producer').toLowerCase()}`}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">{t('itemName')}</label>
            <input
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">{t('region')}</label>
            <input
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">{t('phone')}</label>
            <input
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">{t('email')}</label>
            <input
              type="email"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-bold text-gray-700">{t('address')}</label>
            <textarea
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {(editingProducerId !== null || name || region || phone || email || address) && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setErrorMessage('');
              }}
              className="px-5 py-3 rounded-lg border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <X size={18} />
              {t('cancel')}
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-brand-yellow text-brand-blue font-bold py-3 px-6 rounded-lg hover:bg-yellow-400 transition-colors shadow-md disabled:bg-gray-300 disabled:text-gray-600 flex items-center gap-2"
          >
            <Save size={18} />
            {editingProducerId === null ? t('saveProducer') : t('save')}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-900">{t('producers')}</h3>
          <span className="text-sm font-medium text-gray-400">{producers.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-brand-blue uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">{t('producer')}</th>
                <th className="px-6 py-4">{t('region')}</th>
                <th className="px-6 py-4">{t('phone')}</th>
                <th className="px-6 py-4">{t('email')}</th>
                <th className="px-6 py-4">{t('address')}</th>
                <th className="px-6 py-4 text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {producers.map((producer) => (
                <tr key={producer.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center">
                        <Factory size={18} />
                      </div>
                      <span className="font-bold text-gray-900">{producer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <span className="inline-flex items-center gap-2">
                      <MapPin size={14} className="text-brand-blue" />
                      {producer.region}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <span className="inline-flex items-center gap-2">
                      <Phone size={14} className="text-brand-blue" />
                      {producer.phoneNumber || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <span className="inline-flex items-center gap-2">
                      <Mail size={14} className="text-brand-blue" />
                      {producer.email || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                    <span className="line-clamp-2">{producer.address || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleStartEdit(producer)}
                        className="p-2 text-brand-blue hover:bg-blue-100 rounded-lg transition-colors"
                        title={t('update')}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(producer.id, producer.name)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {producers.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed">
          {t('noProducers')}
        </div>
      )}
    </div>
  );
};

export default ProducerManager;
