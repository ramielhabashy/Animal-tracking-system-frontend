import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../utils/api';
import { useI18n } from '../../i18n';
import { SettingsCard, InputField, SelectField, SaveButton } from './index';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PROVIDER_OPTIONS = [
  { value: 'disabled', label: 'Disabled' },
  { value: 'groq', label: 'Groq (Default)' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
];

const PROVIDER_LABELS = {
  disabled: 'Disabled',
  groq: 'Groq',
  gemini: 'Google Gemini',
  openai: 'OpenAI',
};

const MODEL_OPTIONS = {
  groq: [
    { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    { value: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' },
    { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    { value: 'gemma2-9b-it', label: 'Gemma 2 9B' },
    { value: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 70B' },
  ],
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
};

const API_KEY_PLACEHOLDERS = {
  disabled: '',
  groq: 'gsk_... your Groq API key',
  gemini: 'AIza... your Google Gemini API key',
  openai: 'sk-... your OpenAI API key',
};

export default function AISettings({ dir, message, setMessage, saving, setSaving }) {
  const { t } = useI18n();

  const [aiSettings, setAiSettings] = useState({
    provider: 'disabled',
    api_key: '',
    model: 'llama-3.3-70b-versatile',
  });

  const [quickActions, setQuickActions] = useState([]);
  const [editingAction, setEditingAction] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ role: '', type: 'text', icon: 'smart_toy', label: '', prompt: '', sort_order: 0, is_active: true });

  useEffect(() => {
    loadSettings();
    loadQuickActions();
  }, []);

  const loadSettings = async () => {
    try {
      const [aiRes, geminiRes] = await Promise.all([
        apiFetch('/api/admin/settings/ai').catch(() => null),
        apiFetch('/api/admin/settings/gemini').catch(() => null),
      ]);
      if (aiRes?.ok) {
        const data = await aiRes.json();
        setAiSettings(prev => ({ ...prev, ...data.data }));
      } else if (geminiRes?.ok) {
        const data = await geminiRes.json();
        setAiSettings(prev => ({ ...prev, provider: data.data.enabled ? 'gemini' : 'disabled', api_key: data.data.api_key, model: data.data.model }));
      }
    } catch (e) {}
  };

  const loadQuickActions = async () => {
    try {
      const res = await apiFetch('/api/admin/ai/quick-actions');
      if (res?.ok) {
        const data = await res.json();
        setQuickActions(data.data || []);
      }
    } catch (e) {}
  };

  const handleSave = async () => {
    if (aiSettings.provider !== 'disabled' && !aiSettings.api_key.trim()) {
      setMessage({ type: 'error', text: 'API Key is required for the selected provider' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiSettings),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.saved') });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Failed to save' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({ role: '', type: 'text', icon: 'smart_toy', label: '', prompt: '', sort_order: 0, is_active: true });
    setEditingAction(null);
    setShowForm(false);
  };

  const handleEdit = (action) => {
    setForm({ role: action.role, type: action.type, icon: action.icon, label: action.label, prompt: action.prompt, sort_order: action.sort_order, is_active: action.is_active });
    setEditingAction(action);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quick action?')) return;
    try {
      const res = await apiFetch(`/api/admin/ai/quick-actions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadQuickActions();
        setMessage({ type: 'success', text: 'Quick action deleted' });
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.message || 'Failed to delete quick action' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const handleSaveAction = async (e) => {
    e.preventDefault();
    if (!form.label.trim()) {
      setMessage({ type: 'error', text: 'Label is required' });
      return;
    }
    if (!form.prompt.trim()) {
      setMessage({ type: 'error', text: 'Prompt is required' });
      return;
    }
    if (!form.role.trim()) {
      setMessage({ type: 'error', text: 'Role is required' });
      return;
    }
    try {
      const url = editingAction ? `/api/admin/ai/quick-actions/${editingAction.id}` : '/api/admin/ai/quick-actions';
      const method = editingAction ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        loadQuickActions();
        resetForm();
        setMessage({ type: 'success', text: editingAction ? 'Quick action updated' : 'Quick action created' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Failed to save quick action' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const roles = ['Admin', 'Support', 'Accountant', 'Customer Service', 'Owner', 'Manager', 'Shepherd', 'Doctor'];

  const modelOptions = MODEL_OPTIONS[aiSettings.provider];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = quickActions.findIndex(a => a.id === active.id);
    const newIndex = quickActions.findIndex(a => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...quickActions];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const updated = reordered.map((a, i) => ({ ...a, sort_order: i }));
    setQuickActions(updated);

    try {
      await apiFetch('/api/admin/ai/quick-actions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updated.map(a => ({ id: a.id, sort_order: a.sort_order })) }),
      });
    } catch (e) {
      loadQuickActions();
    }
  }, [quickActions]);

  function SortableQuickAction({ action, onEdit, onDelete }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: action.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 bg-surface-dim rounded-xl">
        <div className="flex items-center gap-3">
          <button {...attributes} {...listeners} className="p-1 cursor-grab active:cursor-grabbing hover:bg-surface-dim rounded-lg transition touch-none">
            <span className="material-symbols-rounded text-on-surface-subtle text-lg">drag_indicator</span>
          </button>
          <span className="material-symbols-rounded text-brand-accent">{action.icon}</span>
          <div>
            <p className="text-sm font-semibold text-brand-primary">{action.label}</p>
            <p className="text-xs text-on-surface-subtle">{action.role} • {action.type}{!action.is_active ? ' • Inactive' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(action)} className="p-1.5 hover:bg-surface-dim rounded-lg transition"><span className="material-symbols-rounded text-sm">edit</span></button>
          <button onClick={() => onDelete(action.id)} className="p-1.5 hover:bg-red-100 rounded-lg transition"><span className="material-symbols-rounded text-sm text-red-500">delete</span></button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SettingsCard icon="psychology" title={aiSettings.provider === 'disabled' ? 'AI Configuration' : `${PROVIDER_LABELS[aiSettings.provider] || 'AI'} Configuration`} description={aiSettings.provider === 'disabled' ? 'AI assistant is currently disabled' : `Configure ${PROVIDER_LABELS[aiSettings.provider] || 'AI'} for the AI assistant`}>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SelectField
            label={'AI Provider'}
            value={aiSettings.provider}
            onChange={(e) => {
              const provider = e.target.value;
              const models = MODEL_OPTIONS[provider] || MODEL_OPTIONS.groq;
              setAiSettings({ ...aiSettings, provider, model: models[0]?.value || '' });
            }}
            options={PROVIDER_OPTIONS}
          />
          <InputField
            label={`${PROVIDER_LABELS[aiSettings.provider] || 'AI'} API Key`}
            type="password"
            value={aiSettings.api_key}
            onChange={(e) => setAiSettings({ ...aiSettings, api_key: e.target.value })}
            placeholder={API_KEY_PLACEHOLDERS[aiSettings.provider] || 'API Key...'}
          />
          {aiSettings.provider !== 'disabled' && (
            <SelectField
              label={'Model'}
              value={aiSettings.model}
              onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
              options={modelOptions || []}
            />
          )}
        </div>
        <div className="mt-6">
          <SaveButton onClick={handleSave} saving={saving} />
        </div>
      </SettingsCard>

      <SettingsCard icon="flash_on" title={'Quick Actions'} description={'Drag to reorder. Role-specific suggested prompts shown in the AI chat panel'}>
        {showForm && (
          <form onSubmit={handleSaveAction} className="mb-6 p-4 bg-surface-dim rounded-2xl space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SelectField label={'Role'} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={roles.map(r => ({ value: r, label: r }))} />
              <InputField label={'Label'} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Find Animal" />
              <InputField label={'Icon'} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="material_symbol_name" />
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Prompt</label>
                <textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} rows={2} className="w-full px-4 py-2.5 border-2 border-outline rounded-xl text-sm focus:border-brand-accent focus:outline-none transition-colors" placeholder="The prompt sent to AI when this action is clicked" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-on-surface-variant">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Active
              </label>
              <button type="submit" className="px-4 py-2 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-brand-secondary transition-all">{editingAction ? 'Update' : 'Create'}</button>
              <button type="button" onClick={resetForm} className="px-4 py-2 text-on-surface-variant text-sm hover:text-brand-primary transition-all">Cancel</button>
            </div>
          </form>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={quickActions.map(a => a.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <SortableQuickAction key={action.id} action={action} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {!showForm && (
          <div className="mt-2">
            <button onClick={() => setShowForm(true)} className="w-full py-3 border-2 border-dashed border-outline rounded-xl text-sm text-on-surface-variant hover:border-brand-accent hover:text-brand-primary transition-all font-semibold">
              + Add Quick Action
            </button>
          </div>
        )}
      </SettingsCard>
    </div>
  );
}
