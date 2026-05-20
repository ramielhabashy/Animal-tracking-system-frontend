import React from 'react';
import { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../../utils/api';
import { useI18n } from '../../i18n';
import SettingsCard from './SettingsCard';
import { InputField, SaveButton } from './InputField';

export default function CountrySettings({ dir, message, setMessage, saving, setSaving }) {
  const { t } = useI18n();
  const isRtl = dir === 'rtl';
  const [countries, setCountries] = useState(['Saudi Arabia']);
  const [newCountry, setNewCountry] = useState('');

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const res = await apiFetch('/api/admin/settings/countries');
      if (res.ok) {
        const d = await res.json();
        if (d.data && d.data.length > 0) setCountries(d.data);
      }
    } catch (e) {
      console.error('Failed to load countries:', e);
    }
  };

  const addCountry = () => {
    const trimmed = newCountry.trim();
    if (!trimmed) return;
    if (countries.includes(trimmed)) {
      setMessage?.({ type: 'error', text: 'Country already exists' });
      return;
    }
    setCountries([...countries, trimmed]);
    setNewCountry('');
  };

  const removeCountry = (index) => {
    if (countries.length <= 1) {
      setMessage?.({ type: 'error', text: 'At least one country is required' });
      return;
    }
    setCountries(countries.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving?.(true);
    try {
      const res = await apiFetch('/api/admin/settings/countries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countries }),
      });
      if (res.ok) {
        setMessage?.({ type: 'success', text: 'Countries saved successfully' });
      } else {
        const d = await res.json();
        setMessage?.({ type: 'error', text: d.message || 'Save failed' });
      }
    } catch (e) {
      setMessage?.({ type: 'error', text: 'Network error' });
    } finally {
      setSaving?.(false);
    }
  };

  return (
    <SettingsCard icon="globe" title="Shipping Countries" description="Manage countries available for checkout shipping address">
      <div className="space-y-4">
        <div className={`flex gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className="flex-1">
            <InputField
              label="Add Country"
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value)}
              placeholder="e.g. Saudi Arabia"
              onKeyDown={(e) => e.key === 'Enter' && addCountry()}
            />
          </div>
          <button
            onClick={addCountry}
            className="mt-6 px-4 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition flex items-center gap-2"
          >
            <MaterialSymbol icon="add" size={18} />
            Add
          </button>
        </div>

        <div className="space-y-2">
          {countries.map((country, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-surface-light rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <MaterialSymbol icon="flag" size={18} className="text-brand-accent" />
                <span className="font-medium text-brand-primary">{country}</span>
              </div>
              <button
                onClick={() => removeCountry(idx)}
                className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition"
              >
                <MaterialSymbol icon="close" size={18} />
              </button>
            </div>
          ))}
        </div>

        <SaveButton onClick={handleSave} saving={saving} label="Save Countries" />
      </div>
    </SettingsCard>
  );
}
