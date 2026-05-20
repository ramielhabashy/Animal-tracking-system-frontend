import React from 'react';
import { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../../utils/api';
import SettingsCard from './SettingsCard';

const ICON_OPTIONS = [
  'dashboard', 'pets', 'medical_services', 'sensors', 'map', 'gavel',
  'warning', 'task', 'credit_score', 'group', 'assessment', 'settings',
  'groups', 'fence', 'account_balance_wallet', 'payments', 'mail',
  'receipt_long', 'shopping_cart_checkout', 'inventory_2', 'local_shipping',
  'eco', 'track_changes', 'history', 'vaccines', 'analytics', 'api',
  'psychology', 'chat', 'sms', 'language', 'translate',
];

const ROLE_OPTIONS = ['Admin', 'Owner', 'Manager', 'Shepherd', 'Doctor'];

export default function MenuSettings({ dir }) {
  const isRtl = dir === 'rtl';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: '', label_key: '', icon: 'chevron_right', path: '/', parent_id: null, sort_order: 0, roles: [], is_active: true });
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await apiFetch('/api/admin/menu-items');
      if (res.ok) {
        const d = await res.json();
        setItems(d.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch menu items:', e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ label: '', label_key: '', icon: 'chevron_right', path: '/', parent_id: null, sort_order: 0, roles: [], is_active: true });
    setEditingItem(null);
    setShowForm(false);
  };

  const openEdit = (item) => {
    setForm({
      label: item.label,
      label_key: item.label_key || '',
      icon: item.icon || 'chevron_right',
      path: item.path,
      parent_id: item.parent_id,
      sort_order: item.sort_order || 0,
      roles: item.roles || [],
      is_active: item.is_active !== false,
    });
    setEditingItem(item);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.label || !form.path) {
      setMessage({ type: 'error', text: 'Label and path are required' });
      return;
    }
    try {
      const url = editingItem
        ? `/api/admin/menu-items/${editingItem.id}`
        : '/api/admin/menu-items';
      const method = editingItem ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: editingItem ? 'Menu item updated' : 'Menu item created' });
        resetForm();
        fetchItems();
      } else {
        const d = await res.json();
        setMessage({ type: 'error', text: d.message || 'Save failed' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.label}"?`)) return;
    try {
      const res = await apiFetch(`/api/admin/menu-items/${item.id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Menu item deleted' });
        fetchItems();
      } else {
        setMessage({ type: 'error', text: 'Delete failed' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const handleReorder = async (itemId, direction) => {
    const currentItems = [...items];
    const idx = currentItems.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= currentItems.length) return;

    const updated = currentItems.map((item, i) => {
      if (i === idx) return { ...item, sort_order: swapIdx };
      if (i === swapIdx) return { ...item, sort_order: idx };
      return item;
    });

    try {
      const payload = updated.map(item => ({
        id: item.id,
        sort_order: item.sort_order,
        parent_id: item.parent_id,
      }));
      await apiFetch('/api/admin/menu-items/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      });
      setItems(updated);
    } catch (e) {
      console.error('Reorder failed:', e);
    }
  };

  const toggleRole = (role) => {
    const roles = form.roles || [];
    if (roles.includes(role)) {
      setForm({ ...form, roles: roles.filter(r => r !== role) });
    } else {
      setForm({ ...form, roles: [...roles, role] });
    }
  };

  if (loading) {
    return (
      <SettingsCard icon="menu" title="Menu" description="Manage navigation menu items">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
        </div>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard icon="menu" title="Menu" description="Manage navigation menu items">
      {message && (
        <div className={`p-3 rounded-xl mb-4 flex items-center gap-2 text-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          <MaterialSymbol icon={message.type === 'success' ? 'check_circle' : 'error'} size={16} />
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto"><MaterialSymbol icon="close" size={16} /></button>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-brand-secondary transition"
        >
          <MaterialSymbol icon="add" size={18} />
          Add Item
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-on-surface-subtle">
          <MaterialSymbol icon="menu" size={48} className="mx-auto mb-2" />
          <p>No menu items yet. Add your first menu item.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.sort((a, b) => a.sort_order - b.sort_order).map((item, idx) => (
            <div key={item.id}>
              <div className="flex items-center gap-3 bg-surface-light rounded-xl p-3 group">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => handleReorder(item.id, 'up')} disabled={idx === 0} className="text-on-surface-subtle hover:text-brand-primary disabled:opacity-30">
                    <MaterialSymbol icon="expand_less" size={16} />
                  </button>
                  <button onClick={() => handleReorder(item.id, 'down')} disabled={idx === items.length - 1} className="text-on-surface-subtle hover:text-brand-primary disabled:opacity-30">
                    <MaterialSymbol icon="expand_more" size={16} />
                  </button>
                </div>
                <MaterialSymbol icon={item.icon || 'chevron_right'} size={20} className="text-brand-accent" />
                <div className="flex-1">
                  <p className="font-bold text-brand-primary text-sm">{item.label}</p>
                  <p className="text-xs text-on-surface-subtle">{item.path} {item.roles?.length > 0 && `· ${item.roles.join(', ')}`}</p>
                </div>
                {item.children?.length > 0 && (
                  <span className="text-xs text-on-surface-subtle bg-white px-2 py-0.5 rounded-full">{item.children.length} sub</span>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-white rounded-lg text-on-surface-subtle hover:text-brand-primary">
                    <MaterialSymbol icon="edit" size={16} />
                  </button>
                  <button onClick={() => handleDelete(item)} className="p-1.5 hover:bg-white rounded-lg text-on-surface-subtle hover:text-red-600">
                    <MaterialSymbol icon="delete" size={16} />
                  </button>
                </div>
              </div>
              {item.children?.length > 0 && (
                <div className={`${isRtl ? 'mr-8' : 'ml-8'} mt-1 space-y-1`}>
                  {item.children.sort((a, b) => a.sort_order - b.sort_order).map((child) => (
                    <div key={child.id} className="flex items-center gap-3 bg-brand-light rounded-xl p-2.5 group">
                      <MaterialSymbol icon={child.icon || 'chevron_right'} size={16} className="text-on-surface-subtle" />
                      <div className="flex-1">
                        <p className="font-medium text-brand-primary text-xs">{child.label}</p>
                        <p className="text-xs text-on-surface-subtle">{child.path}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => openEdit(child)} className="p-1 hover:bg-white rounded-lg text-on-surface-subtle hover:text-brand-primary">
                          <MaterialSymbol icon="edit" size={14} />
                        </button>
                        <button onClick={() => handleDelete(child)} className="p-1 hover:bg-white rounded-lg text-on-surface-subtle hover:text-red-600">
                          <MaterialSymbol icon="delete" size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-primary">{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg">
                <MaterialSymbol icon="close" size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Label *</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Dashboard"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Label Key (i18n)</label>
                <input
                  type="text"
                  value={form.label_key}
                  onChange={(e) => setForm({ ...form, label_key: e.target.value })}
                  placeholder="nav.dashboard"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Path *</label>
                <input
                  type="text"
                  value={form.path}
                  onChange={(e) => setForm({ ...form, path: e.target.value })}
                  placeholder="/dashboard"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Icon</label>
                <select
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3"
                >
                  {ICON_OPTIONS.map((ic) => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
                <div className="mt-2 flex items-center gap-2 text-sm text-on-surface-subtle">
                  <span>Preview:</span>
                  <MaterialSymbol icon={form.icon} size={20} className="text-brand-accent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Parent Item</label>
                <select
                  value={form.parent_id || ''}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3"
                >
                  <option value="">None (top-level)</option>
                  {items.filter(i => !i.parent_id).map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Sort Order</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">Visible to Roles</label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role}
                      onClick={() => toggleRole(role)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        (form.roles || []).includes(role)
                          ? 'bg-brand-primary text-white'
                          : 'bg-gray-100 text-on-surface-variant hover:bg-gray-200'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-on-surface-subtle mt-1">Leave empty to show to all roles</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-on-surface-variant">Active</label>
                <button
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`w-10 h-5 rounded-full transition relative ${
                    form.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition ${form.is_active ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <button
                onClick={handleSave}
                className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition"
              >
                {editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SettingsCard>
  );
}
