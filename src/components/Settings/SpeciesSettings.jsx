import React from 'react';
import { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../../utils/api';
import { useI18n } from '../../i18n';
import SettingsCard from './SettingsCard';
import { InputField } from './InputField';

export default function SpeciesSettings({ dir: _dir }) {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const [speciesList, setSpeciesList] = useState([]);
  const [newSpeciesName, setNewSpeciesName] = useState('');
  const [message, setMessage] = useState(null);

  const loadSpecies = async () => {
    const res = await apiFetch('/api/species');
    if (res.ok) {
      const data = await res.json();
      setSpeciesList(data.data || []);
    }
  };

  useEffect(() => {
    loadSpecies();
  }, []);

  const handleAddSpecies = async () => {
    if (!newSpeciesName.trim()) return;
    const res = await apiFetch('/api/species', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSpeciesName }),
    });
    if (res.ok) {
      setNewSpeciesName('');
      await loadSpecies();
    }
  };

  const handleDeleteSpecies = async (id) => {
    if (!confirm(t('common.confirmDelete') || 'Delete this species?')) return;
    await apiFetch(`/api/species/${id}`, { method: 'DELETE' });
    await loadSpecies();
  };

  const handleAddBreed = async (speciesId, name) => {
    if (!name.trim()) return;
    await apiFetch(`/api/species/${speciesId}/breeds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    await loadSpecies();
  };

  const handleDeleteBreed = async (breedId) => {
    await apiFetch(`/api/breeds/${breedId}`, { method: 'DELETE' });
    await loadSpecies();
  };

  return (
    <SettingsCard icon="pets" title="Species & Breeds" description="Manage animal species and their breeds">
      {message && (
        <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h4 className="font-bold text-brand-primary mb-4">Add New Species</h4>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newSpeciesName}
              onChange={(e) => setNewSpeciesName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSpecies();
              }}
              placeholder="Species name"
              className="flex-1 bg-surface-light border-none rounded-xl px-4 py-3 text-brand-primary font-semibold focus:ring-2 focus:ring-brand-secondary/20"
            />
            <button
              onClick={handleAddSpecies}
              className="px-4 py-2 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition"
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {speciesList.map((species) => (
              <div key={species.id} className="p-4 bg-surface-light rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-primary">{species.name}</span>
                  <button
                    onClick={() => handleDeleteSpecies(species.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    title={t('common.delete')}
                  >
                    <MaterialSymbol icon="delete" size={20} />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {species.breeds?.map((breed) => (
                    <span key={breed.id} className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-primary text-white rounded-full text-xs font-medium">
                      {breed.name}
                      <button
                        onClick={() => handleDeleteBreed(breed.id)}
                        className="text-white/70 hover:text-white ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="Add breed..."
                    className="flex-1 bg-white border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-secondary/20"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        await handleAddBreed(species.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
