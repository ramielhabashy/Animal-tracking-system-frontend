import React, { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../../utils/api';
import { useI18n } from '../../i18n';
import { SettingsCard, SubTabBar, InputField, SelectField, CheckboxField, ToggleSwitch, SaveButton } from './index';

const medicalIconOptions = [
  { value: 'medical_services', label: 'medical_services' },
  { value: 'vaccines', label: 'vaccines' },
  { value: 'local_hospital', label: 'local_hospital' },
  { value: 'healing', label: 'healing' },
  { value: 'emergency', label: 'emergency' },
  { value: 'checklist', label: 'checklist' },
  { value: 'monitor_heart', label: 'monitor_heart' },
  { value: 'biotech', label: 'biotech' },
];

const vaccinationIconOptions = [
  { value: 'vaccines', label: 'vaccines' },
  { value: 'refresh', label: 'refresh' },
  { value: 'emergency', label: 'emergency' },
  { value: 'ac_unit', label: 'ac_unit' },
  { value: 'medical_services', label: 'medical_services' },
  { value: 'healing', label: 'healing' },
  { value: 'monitor_heart', label: 'monitor_heart' },
  { value: 'biotech', label: 'biotech' },
];

const medicalTabs = [
  { id: 'recordTypes', label: 'Record Types', icon: 'medical_services' },
  { id: 'vaccinationTypes', label: 'Vaccination Types', icon: 'vaccines' },
];

export default function MedicalTypeSettings({ dir, message, setMessage }) {
  const { t } = useI18n();

  const [medicalRecordTypes, setMedicalRecordTypes] = useState([]);
  const [medicalTypeForm, setMedicalTypeForm] = useState({ name: '', slug: '', icon: 'medical_services', color: '#002819', is_active: true });
  const [editingMedicalType, setEditingMedicalType] = useState(null);

  const [vaccinationTypesList, setVaccinationTypesList] = useState([]);
  const [vaccinationTypeForm, setVaccinationTypeForm] = useState({ name: '', slug: '', icon: 'vaccines', color: '#002819', is_active: true });
  const [editingVaccinationType, setEditingVaccinationType] = useState(null);

  const [medicalSubTab, setMedicalSubTab] = useState('recordTypes');

  useEffect(() => {
    fetchMedicalTypes();
    fetchVaccinationTypes();
  }, []);

  const fetchMedicalTypes = async () => {
    const res = await apiFetch('/api/medical-record-types');
    if (res.ok) {
      const data = await res.json();
      setMedicalRecordTypes(data.data || []);
    }
  };

  const fetchVaccinationTypes = async () => {
    const res = await apiFetch('/api/admin/vaccination-types');
    if (res.ok) {
      const data = await res.json();
      setVaccinationTypesList(data.data || []);
    }
  };

  const handleSaveMedicalType = async () => {
    if (!medicalTypeForm.name.trim() || !medicalTypeForm.slug.trim()) return;
    const url = editingMedicalType ? `/api/admin/medical-record-types/${editingMedicalType}` : '/api/admin/medical-record-types';
    const method = editingMedicalType ? 'PUT' : 'POST';
    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(medicalTypeForm),
    });
    if (res.ok) {
      setMedicalTypeForm({ name: '', slug: '', icon: 'medical_services', color: '#002819', is_active: true });
      setEditingMedicalType(null);
      await fetchMedicalTypes();
      setMessage({ type: 'success', text: 'Medical type saved' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteMedicalType = async (id) => {
    if (!confirm('Delete this medical record type?')) return;
    await apiFetch(`/api/admin/medical-record-types/${id}`, { method: 'DELETE' });
    await fetchMedicalTypes();
    setMessage({ type: 'success', text: 'Medical type deleted' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveVaccinationType = async () => {
    if (!vaccinationTypeForm.name.trim() || !vaccinationTypeForm.slug.trim()) return;
    const url = editingVaccinationType ? `/api/admin/vaccination-types/${editingVaccinationType}` : '/api/admin/vaccination-types';
    const method = editingVaccinationType ? 'PUT' : 'POST';
    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vaccinationTypeForm),
    });
    if (res.ok) {
      setVaccinationTypeForm({ name: '', slug: '', icon: 'vaccines', color: '#002819', is_active: true });
      setEditingVaccinationType(null);
      await fetchVaccinationTypes();
      setMessage({ type: 'success', text: 'Vaccination type saved' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteVaccinationType = async (id) => {
    if (!confirm('Delete this vaccination type?')) return;
    await apiFetch(`/api/admin/vaccination-types/${id}`, { method: 'DELETE' });
    await fetchVaccinationTypes();
    setMessage({ type: 'success', text: 'Vaccination type deleted' });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <SettingsCard icon="vaccines" title="Medical Types" description="Manage medical record and vaccination categories">
      <SubTabBar tabs={medicalTabs} activeTab={medicalSubTab} onTabChange={setMedicalSubTab} />

      {medicalSubTab === 'recordTypes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="font-bold text-brand-primary mb-4">{editingMedicalType ? 'Edit Medical Type' : 'Add New Medical Type'}</h4>
            <div className="space-y-4 p-4 bg-surface-light rounded-xl">
              <InputField
                label="Name"
                value={medicalTypeForm.name}
                onChange={(e) => setMedicalTypeForm({ ...medicalTypeForm, name: e.target.value, slug: editingMedicalType ? medicalTypeForm.slug : e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g. Vaccination"
                inputClassName="bg-white"
              />
              <InputField
                label="Slug"
                value={medicalTypeForm.slug}
                onChange={(e) => setMedicalTypeForm({ ...medicalTypeForm, slug: e.target.value })}
                placeholder="e.g. vaccination"
                inputClassName="bg-white"
              />
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Icon"
                  value={medicalTypeForm.icon}
                  onChange={(e) => setMedicalTypeForm({ ...medicalTypeForm, icon: e.target.value })}
                  options={medicalIconOptions}
                />
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Color</label>
                  <input
                    type="color"
                    value={medicalTypeForm.color}
                    onChange={(e) => setMedicalTypeForm({ ...medicalTypeForm, color: e.target.value })}
                    className="w-full h-11 rounded-xl border-0 cursor-pointer"
                  />
                </div>
              </div>
              <ToggleSwitch
                label="Active"
                checked={medicalTypeForm.is_active}
                onChange={(e) => setMedicalTypeForm({ ...medicalTypeForm, is_active: e.target.checked })}
              />
              <div className="flex gap-2">
                <SaveButton
                  onClick={handleSaveMedicalType}
                  saving={false}
                  color="#002819"
                >
                  {editingMedicalType ? 'Update' : 'Add'}
                </SaveButton>
                {editingMedicalType && (
                  <button
                    onClick={() => { setEditingMedicalType(null); setMedicalTypeForm({ name: '', slug: '', icon: 'medical_services', color: '#002819', is_active: true }); }}
                    className="px-4 py-3 bg-on-surface-subtle text-white rounded-xl font-bold hover:bg-[#5a6265] transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-brand-primary mb-4">Existing Medical Record Types</h4>
            <div className="space-y-2">
              {medicalRecordTypes.length === 0 ? (
                <p className="text-on-surface-subtle text-sm">No medical record types defined</p>
              ) : (
                medicalRecordTypes.map((mt) => (
                  <div key={mt.id} className={`p-4 rounded-xl flex items-center justify-between ${mt.is_active ? 'bg-surface-light' : 'bg-surface-light/50 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: mt.color + '20' }}>
                        <MaterialSymbol icon={mt.icon || 'medical_services'} size={20} style={{ color: mt.color }} />
                      </div>
                      <div>
                        <p className="font-bold text-brand-primary">{mt.name}</p>
                        <p className="text-xs text-on-surface-subtle">{mt.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingMedicalType(mt.id); setMedicalTypeForm({ name: mt.name, slug: mt.slug, icon: mt.icon || 'medical_services', color: mt.color || '#002819', is_active: mt.is_active }); }}
                        className="p-2 text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition"
                      >
                        <MaterialSymbol icon="edit" size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteMedicalType(mt.id)}
                        className="p-2 text-danger hover:bg-danger/10 rounded-lg transition"
                      >
                        <MaterialSymbol icon="delete" size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {medicalSubTab === 'vaccinationTypes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="font-bold text-brand-primary mb-4">{editingVaccinationType ? 'Edit Vaccination Type' : 'Add New Vaccination Type'}</h4>
            <div className="space-y-4 p-4 bg-surface-light rounded-xl">
              <InputField
                label="Name"
                value={vaccinationTypeForm.name}
                onChange={(e) => setVaccinationTypeForm({ ...vaccinationTypeForm, name: e.target.value, slug: editingVaccinationType ? vaccinationTypeForm.slug : e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g. Booster"
                inputClassName="bg-white"
              />
              <InputField
                label="Slug"
                value={vaccinationTypeForm.slug}
                onChange={(e) => setVaccinationTypeForm({ ...vaccinationTypeForm, slug: e.target.value })}
                placeholder="e.g. booster"
                inputClassName="bg-white"
              />
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Icon"
                  value={vaccinationTypeForm.icon}
                  onChange={(e) => setVaccinationTypeForm({ ...vaccinationTypeForm, icon: e.target.value })}
                  options={vaccinationIconOptions}
                />
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Color</label>
                  <input
                    type="color"
                    value={vaccinationTypeForm.color}
                    onChange={(e) => setVaccinationTypeForm({ ...vaccinationTypeForm, color: e.target.value })}
                    className="w-full h-11 rounded-xl border-0 cursor-pointer"
                  />
                </div>
              </div>
              <ToggleSwitch
                label="Active"
                checked={vaccinationTypeForm.is_active}
                onChange={(e) => setVaccinationTypeForm({ ...vaccinationTypeForm, is_active: e.target.checked })}
              />
              <div className="flex gap-2">
                <SaveButton
                  onClick={handleSaveVaccinationType}
                  saving={false}
                  color="#002819"
                >
                  {editingVaccinationType ? 'Update' : 'Add'}
                </SaveButton>
                {editingVaccinationType && (
                  <button
                    onClick={() => { setEditingVaccinationType(null); setVaccinationTypeForm({ name: '', slug: '', icon: 'vaccines', color: '#002819', is_active: true }); }}
                    className="px-4 py-3 bg-on-surface-subtle text-white rounded-xl font-bold hover:bg-[#5a6265] transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-brand-primary mb-4">Existing Vaccination Types</h4>
            <div className="space-y-2">
              {vaccinationTypesList.length === 0 ? (
                <p className="text-on-surface-subtle text-sm">No vaccination types defined</p>
              ) : (
                vaccinationTypesList.map((vt) => (
                  <div key={vt.id} className={`p-4 rounded-xl flex items-center justify-between ${vt.is_active ? 'bg-surface-light' : 'bg-surface-light/50 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: vt.color + '20' }}>
                        <MaterialSymbol icon={vt.icon || 'vaccines'} size={20} style={{ color: vt.color }} />
                      </div>
                      <div>
                        <p className="font-bold text-brand-primary">{vt.name}</p>
                        <p className="text-xs text-on-surface-subtle">{vt.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingVaccinationType(vt.id); setVaccinationTypeForm({ name: vt.name, slug: vt.slug, icon: vt.icon || 'vaccines', color: vt.color || '#002819', is_active: vt.is_active }); }}
                        className="p-2 text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition"
                      >
                        <MaterialSymbol icon="edit" size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteVaccinationType(vt.id)}
                        className="p-2 text-danger hover:bg-danger/10 rounded-lg transition"
                      >
                        <MaterialSymbol icon="delete" size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </SettingsCard>
  );
}
