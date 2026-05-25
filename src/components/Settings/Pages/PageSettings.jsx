import React from 'react';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../../utils/api';
import { MaterialSymbol } from 'react-material-symbols';

export default function PageSettings({ dir, message, setMessage }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/pages');
      if (res.ok) {
        const data = await res.json();
        setPages(data.data || []);
      }
    } catch (e) {
      console.error('Failed to load pages:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/pages/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editing.title,
          content: editing.content,
          is_published: editing.is_published,
        }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Page saved successfully' });
        loadPages();
        setEditing(null);
      } else {
        setMessage({ type: 'error', text: 'Failed to save page' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save page' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#002819] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-on-surface-subtle">Manage static pages: Privacy Policy and Terms of Service.</p>

      {pages.length === 0 && (
        <div className="text-center py-12 text-on-surface-subtle bg-surface-light rounded-2xl">
          <MaterialSymbol icon="description" size={48} className="mx-auto mb-3 opacity-50" />
          <p className="font-medium">No pages created yet</p>
          <p className="text-sm mt-1">Pages are auto-seeded with defaults. Refresh to see them.</p>
        </div>
      )}

      <div className="space-y-4">
        {(editing ? [editing] : pages).map((page) => (
          <div key={page.id} className="bg-white rounded-2xl border border-outline/10 overflow-hidden">
            <div className="p-6 border-b border-outline/5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-brand-primary text-lg">{page.title}</h3>
                <p className="text-xs text-on-surface-subtle mt-1">/{page.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${page.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {page.is_published ? 'Published' : 'Draft'}
                </span>
                {editing?.id === page.id ? (
                  <button onClick={() => setEditing(null)} className="text-sm text-on-surface-subtle hover:text-brand-primary">
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={() => setEditing({ ...page })}
                    className="text-sm font-semibold text-brand-primary hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
            {editing?.id === page.id ? (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1">Title</label>
                  <input
                    type="text"
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline/20 focus:ring-2 focus:ring-brand-accent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1">Content</label>
                  <textarea
                    rows={12}
                    value={editing.content}
                    onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-outline/20 focus:ring-2 focus:ring-brand-accent outline-none resize-y font-mono text-sm"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editing.is_published}
                      onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Published</span>
                  </label>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="ml-auto px-6 py-2 bg-brand-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <p className="text-sm text-on-surface leading-relaxed whitespace-pre-line line-clamp-4">
                  {page.content || 'No content'}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
