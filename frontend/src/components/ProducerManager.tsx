import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Factory, Plus, Trash2, MapPin, Phone, Mail } from 'lucide-react';
import { Producer } from '../App';
import { useLanguage } from '../LanguageContext';

const ProducerManager: React.FC = () => {
  const { t } = useLanguage();
  const [producers, setProducers] = useState<Producer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const fetchProducers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/stocks/producers');
      const nextProducers = Array.isArray(res.data) ? res.data : [];
      setProducers(nextProducers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/stocks/producers', {
        name, region, phone_number: phone, email, address
      });
      setName(''); setRegion(''); setPhone(''); setEmail(''); setAddress('');
      setShowForm(false);
      fetchProducers();
    } catch (err) {
      alert('Error adding producer');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (window.confirm(`${t('delete')} "${name}"?`)) {
      try {
        await axios.delete(`/api/stocks/producers/${id}`);
        fetchProducers();
      } catch (err) {
        alert('Error deleting producer');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-brand-blue flex items-center gap-2">
          <Factory /> {t('producer_management')}
        </h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-blue text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} /> {showForm ? t('cancel') : t('add_producer')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700">{t('item_name')}</label>
            <input required className="w-full p-2 border rounded" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700">{t('region')}</label>
            <input required className="w-full p-2 border rounded" value={region} onChange={e => setRegion(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700">{t('phone')}</label>
            <input className="w-full p-2 border rounded" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-700">{t('email')}</label>
            <input type="email" className="w-full p-2 border rounded" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-sm font-bold text-gray-700">{t('address')}</label>
            <textarea className="w-full p-2 border rounded" rows={2} value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <button type="submit" className="md:col-span-2 bg-brand-yellow text-brand-blue font-bold py-2 rounded hover:bg-yellow-400">
            {t('save_producer')}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(Array.isArray(producers) ? producers : []).map(p => (
          <div key={p.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
            <button 
              onClick={() => handleDelete(p.id, p.name)}
              className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors"
            >
              <Trash2 size={18} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-3 pr-8">{p.name}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="flex items-center gap-2"><MapPin size={14} className="text-brand-blue" /> {p.region}</p>
              <p className="flex items-center gap-2"><Phone size={14} className="text-brand-blue" /> {p.phone_number || 'N/A'}</p>
              <p className="flex items-center gap-2"><Mail size={14} className="text-brand-blue" /> {p.email || 'N/A'}</p>
              <p className="text-xs text-gray-400 mt-2 italic">{p.address}</p>
            </div>
          </div>
        ))}
      </div>

      {(Array.isArray(producers) ? producers : []).length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed">
          {t('no_producers')}
        </div>
      )}
    </div>
  );
};

export default ProducerManager;
