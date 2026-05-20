import React, { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

export default function InvitationsPage() {
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const isRtl = dir === 'rtl';
  const isAdmin = user?.role === 'Admin';

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [filterRoles, setFilterRoles] = useState([]);
  const [message, setMessage] = useState(null);
  const [actingId, setActingId] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, roleFilter]);

  useEffect(() => {
    fetchData();
  }, [currentPage, perPage, debouncedSearch, statusFilter, roleFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: perPage, page: currentPage });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (roleFilter !== 'all') params.set('role', roleFilter);

      const res = await apiFetch(`/api/invitations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.data.invitations || []);
        setTotal(data.data.meta?.total || 0);
        setLastPage(data.data.meta?.last_page || 1);
        setFilterRoles(data.data.filter_roles || []);
      }
    } catch (err) {
      console.error('Failed to load invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (id) => {
    setActingId(id);
    setMessage(null);
    try {
      const res = await apiFetch(`/api/invitations/${id}/resend`, { method: 'POST' });
      const data = await res.json();
      setMessage({ type: res.ok ? 'success' : 'error', text: data.message || (res.ok ? 'Resent' : 'Failed') });
      if (res.ok) fetchData();
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setActingId(null);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this invitation?')) return;
    setActingId(id);
    setMessage(null);
    try {
      const res = await apiFetch(`/api/invitations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      setMessage({ type: res.ok ? 'success' : 'error', text: data.message || (res.ok ? 'Cancelled' : 'Failed') });
      if (res.ok) fetchData();
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setActingId(null);
    }
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    setMessage({ type: 'success', text: 'Link copied!' });
    setTimeout(() => setMessage(null), 2000);
  };

  const statusBadge = (status) => {
    const styles = {
      pending: 'bg-[#fff3cd] text-[#856404]',
      used: 'bg-[#cfe5d6] text-brand-primary',
      expired: 'bg-[#ffdad6] text-[#93000a]',
    };
    return styles[status] || 'bg-surface-dim text-on-surface-variant';
  };

  const statusIcon = (status) => {
    const icons = {
      pending: 'schedule',
      used: 'check_circle',
      expired: 'timer_off',
    };
    return icons[status] || 'help';
  };

  return (
    <div className="space-y-8">
      <div className={`flex flex-col md:flex-row md:items-end justify-between gap-4 ${isRtl ? 'text-right' : ''}`}>
        <div>
          <h2 className="text-4xl font-black text-brand-primary">Invitations</h2>
          <p className="text-on-surface-variant mt-2 font-medium">Manage pending, used, and expired invitations.</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-[#cfe5d6] text-brand-primary' : 'bg-[#ffdad6] text-[#93000a]'}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <MaterialSymbol icon="search" size={20} className={`absolute top-1/2 -translate-y-1/2 text-on-surface-subtle ${isRtl ? 'right-4 left-auto' : 'left-4'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email or role..."
            className={`w-full bg-white border-none rounded-xl py-3 text-sm shadow-sm focus:ring-2 focus:ring-brand-secondary/10 ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white rounded-xl px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-brand-secondary/10 cursor-pointer"
        >
          <option value="all">Status — All</option>
          <option value="pending">Pending</option>
          <option value="used">Used</option>
          <option value="expired">Expired</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-white rounded-xl px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-brand-secondary/10 cursor-pointer"
        >
          <option value="all">Role — All</option>
          {filterRoles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full ${isRtl ? 'text-right' : 'text-left'}`}>
            <thead>
              <tr className="bg-surface-light/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Email</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Role</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Sent</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Expires</th>
                <th className={`px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant ${isRtl ? 'text-left' : 'text-right'}`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F4EF]">
              {invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-surface-light/30 transition-colors">
                  <td className="px-6 py-5">
                    <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-bold text-sm shadow-md">
                        {inv.email?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-brand-primary">{inv.email}</p>
                        {inv.creator && (
                          <p className="text-xs text-on-surface-subtle">by {inv.creator.name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-surface-dim text-on-surface-variant">
                      {inv.role}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusBadge(inv.status)}`}>
                      <MaterialSymbol icon={statusIcon(inv.status)} size={14} />
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-on-surface-subtle">
                    {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-5 text-sm text-on-surface-subtle">
                    {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '-'}
                  </td>
                  <td className={`px-6 py-5 ${isRtl ? 'text-left' : 'text-right'}`}>
                    <div className={`flex items-center gap-1 ${isRtl ? 'justify-start' : 'justify-end'}`}>
                      {inv.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleResend(inv.id)}
                            disabled={actingId === inv.id}
                            className="p-3 text-on-surface-subtle hover:text-brand-primary hover:bg-surface-light rounded-xl transition-all disabled:opacity-50"
                            title="Resend"
                          >
                            <MaterialSymbol icon="refresh" size={20} />
                          </button>
                          <button
                            onClick={() => copyLink(inv.invitation_link)}
                            className="p-3 text-on-surface-subtle hover:text-brand-primary hover:bg-surface-light rounded-xl transition-all"
                            title="Copy link"
                          >
                            <MaterialSymbol icon="content_copy" size={20} />
                          </button>
                          <button
                            onClick={() => handleCancel(inv.id)}
                            disabled={actingId === inv.id}
                            className="p-3 text-on-surface-subtle hover:text-danger hover:bg-danger/50 rounded-xl transition-all disabled:opacity-50"
                            title="Cancel"
                          >
                            <MaterialSymbol icon="delete" size={20} />
                          </button>
                        </>
                      )}
                      {inv.status === 'used' && (
                        <span className="text-xs text-on-surface-subtle italic">Completed</span>
                      )}
                      {inv.status === 'expired' && (
                        <button
                          onClick={() => handleResend(inv.id)}
                          disabled={actingId === inv.id}
                          className="p-3 text-on-surface-subtle hover:text-brand-primary hover:bg-surface-light rounded-xl transition-all disabled:opacity-50"
                          title="Resend (renew)"
                        >
                          <MaterialSymbol icon="refresh" size={20} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && invitations.length === 0 && (
          <div className="p-12 text-center text-on-surface-subtle">
            <MaterialSymbol icon="mail_off" size={48} className="mx-auto mb-4 opacity-50" />
            <p>No invitations found</p>
          </div>
        )}
        {loading && (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full mx-auto" />
          </div>
        )}
        {invitations.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={lastPage}
            perPage={perPage}
            total={total}
            dir={dir}
            onPageChange={setCurrentPage}
            onPerPageChange={(value) => { setPerPage(value); setCurrentPage(1); }}
          />
        )}
      </div>
    </div>
  );
}
