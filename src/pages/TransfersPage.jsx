import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { TransferStatusBadge, TransferCreateModal } from '../components/Transfers';
import Pagination from '../components/Pagination';

const AVATAR_COLORS = ['#002819', '#06402B', '#D4AF37', '#8B4513', '#2E5090', '#7B2D8B', '#B8860B', '#4A6741'];
const STATUS_OPTIONS = ['all', 'pending', 'accepted', 'completed', 'rejected', 'cancelled', 'expired'];

function getInitials(name) {
  return (name || '?').split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(id) {
  return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function Avatar({ user, size = 8 }) {
  if (!user?.id) return <div className={`w-${size} h-${size} rounded-full bg-gray-200 flex-shrink-0`} />;
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}
      style={{ backgroundColor: getAvatarColor(user.id) }}
    >
      {getInitials(user.name || user.email || '?')}
    </div>
  );
}

export default function TransfersPage() {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const isRtl = dir === 'rtl';
  const isAdmin = user?.role === 'Admin';

  const [tab, setTab] = useState('sent');
  const [transfers, setTransfers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [transferType, setTransferType] = useState('');
  const [search, setSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [owners, setOwners] = useState([]);
  const searchTimer = useRef(null);

  const tabs = [
    { id: 'sent', label: t('transfers.sent') || 'Sent' },
    { id: 'received', label: t('transfers.received') || 'Received' },
    { id: 'history', label: t('transfers.history') || 'History' },
  ];

  useEffect(() => {
    if (!isAdmin) return;
    apiFetch('/api/users/owners/list').then(r => r.ok && r.json()).then(d => {
      setOwners(d.data || d || []);
    }).catch(() => {});
  }, []);

  const buildParams = () => {
    const params = new URLSearchParams({ page, per_page: perPage });
    if (tab === 'sent') params.append('type', 'sent');
    else if (tab === 'received') params.append('type', 'received');
    else params.append('status', 'completed,rejected,cancelled,expired');
    if (statusFilter !== 'all') {
      if (tab === 'history') {
        params.set('status', statusFilter);
      } else {
        params.append('status', statusFilter);
      }
    }
    if (ownerFilter) params.append('owner_id', ownerFilter);
    if (transferType) params.append('transfer_type', transferType);
    if (search) params.append('search', search);
    return params;
  };

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const url = `/api/transfers?${buildParams()}`;
      const res = await apiFetch(url);
      if (res.ok) {
        const d = await res.json();
        setTransfers(d.data || []);
        setMeta(d.meta || null);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchTransfers();
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => {
    setPage(1);
    fetchTransfers();
  }, [tab, statusFilter, transferType, perPage, ownerFilter]);

  useEffect(() => {
    if (page > 1) fetchTransfers();
  }, [page]);

  const handleAction = async (transferId, action) => {
    setActionLoading(`${action}-${transferId}`);
    try {
      const res = await apiFetch(`/api/transfers/${transferId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) fetchTransfers();
    } catch (e) {
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = meta?.last_page || 1;
  const userId = user?.id;

  return (
    <div className="space-y-6" dir={dir}>
      <div>
        <nav className={`flex text-xs text-[#4f6357] mb-2 uppercase tracking-widest font-bold ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span>{t('nav.transfers') || 'Transfers'}</span>
        </nav>
        <h2 className="text-3xl font-bold text-brand-primary">{t('transfers.title') || 'Ownership Transfers'}</h2>
        <p className="text-on-surface-variant mt-1">{t('transfers.subtitle') || 'Manage animal ownership transfers'}</p>
      </div>

      {/* Tabs + Search + Actions row */}
      <div className={`flex flex-wrap items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="flex flex-wrap gap-2 bg-surface-light p-1 rounded-xl w-fit">
          {tabs.map(tabItem => (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition ${tab === tabItem.id ? 'bg-white text-brand-primary shadow-sm' : 'text-on-surface-variant hover:text-brand-primary'}`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>
        {isAdmin && (
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs font-semibold text-stone-600 focus:outline-none"
          >
            <option value="">{t('transfers.allOwners') || 'All Owners'}</option>
            {owners.map(o => (
              <option key={o.id} value={o.id}>{o.name || o.email}</option>
            ))}
          </select>
        )}
        <div className={`flex items-center gap-2 bg-white border border-[#e0e0e0] rounded-xl px-3 py-1.5 ${isRtl ? 'flex-row-reverse' : ''} ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
          <MaterialSymbol icon="search" size={16} className="text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('transfers.searchTransfers') || 'Search by animal, sender, receiver...'}
            className="bg-transparent border-none text-xs font-medium text-stone-600 px-1 py-0.5 focus:outline-none w-[180px] placeholder:text-stone-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-stone-400 hover:text-stone-600">
              <MaterialSymbol icon="close" size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white rounded-xl font-semibold text-sm hover:bg-brand-secondary transition-colors flex-shrink-0"
        >
          <MaterialSymbol icon="add" size={18} />
          {t('transfers.createNew') || 'New Transfer'}
        </button>
      </div>

      {/* Status filter pills */}
      <div className={`bg-surface-light p-1.5 rounded-xl flex flex-wrap items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
        {STATUS_OPTIONS.map((s) => {
          const label = s === 'all' ? (t('common.all') || 'All') : (t(`transfers.status${s.charAt(0).toUpperCase() + s.slice(1)}`) || s.charAt(0).toUpperCase() + s.slice(1));
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? 'bg-brand-primary text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Transfer type filter dropdown */}
      <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <select
          value={transferType}
          onChange={(e) => { setTransferType(e.target.value); setPage(1); }}
          className="bg-white border border-[#e0e0e0] rounded-xl px-3 py-2 text-xs font-semibold text-stone-600 focus:outline-none"
        >
          <option value="">{t('transfers.filterAllTransfers') || 'All Transfers'}</option>
          <option value="manual">{t('transfers.filterManual') || 'Manual'}</option>
          <option value="auction">{t('transfers.filterAuction') || 'From Auction'}</option>
        </select>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
        </div>
      ) : transfers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-surface-high flex flex-col items-center justify-center py-16">
          <MaterialSymbol icon="swap_horiz" size={48} className="text-on-surface-subtle mb-3" />
          <p className="text-on-surface-variant font-medium">{t('transfers.noTransfers') || 'No transfers found'}</p>
          <p className="text-sm text-on-surface-subtle mt-1">{t('transfers.noTransfersHint') || 'Create a new transfer to get started'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-surface-high overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-high">
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">{t('common.id') || 'ID'}</th>
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">{t('transfers.from') || 'From'}</th>
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">{t('transfers.to') || 'To'}</th>
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">{t('transfers.animals') || 'Animals'}</th>
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">{t('transfers.transferType') || 'Type'}</th>
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">{t('transfers.agreedPrice') || 'Price'}</th>
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">{t('common.status') || 'Status'}</th>
                  <th className="text-left p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider">{t('common.date') || 'Date'}</th>
                  <th className={`p-4 text-xs font-bold text-on-surface-subtle uppercase tracking-wider ${isRtl ? 'text-left' : 'text-right'}`}>{t('common.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map(transfer => {
                  const fromUser = transfer.from_user || transfer.sender || {};
                  const toUser = transfer.to_user || transfer.receiver || {};
                  const animals = transfer.animals || [];
                  const isSender = String(fromUser.id) === String(userId);
                  const isReceiver = String(toUser.id) === String(userId);
                  const canCancel = (isSender || isAdmin) && transfer.status === 'pending';
                  const canAcceptReject = (isReceiver || isAdmin) && transfer.status === 'pending';
                  return (
                    <tr
                      key={transfer.id}
                      onClick={() => navigate(`/transfers/${transfer.id}`)}
                      className="border-b border-surface-high last:border-0 hover:bg-brand-light/50 cursor-pointer"
                    >
                      <td className="p-4 font-bold text-brand-primary text-sm">#{transfer.id}</td>
                      <td className="p-4">
                        <div className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <Avatar user={fromUser} size={8} />
                          <span className="text-sm text-on-surface-variant truncate max-w-[120px]">{fromUser.name || '—'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <Avatar user={toUser} size={8} />
                          <span className="text-sm text-on-surface-variant truncate max-w-[120px]">{toUser.name || '—'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-semibold text-brand-primary">{animals.length} {t('transfers.animals') || 'animals'}</span>
                          {animals.length > 0 && (
                            <span className="text-[10px] text-on-surface-subtle truncate max-w-[150px]">
                              {animals.map(a => a.name || a.animal_id).join(', ')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {transfer.transfer_type === 'auction' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-accent/10 text-[#B8860B] text-[10px] font-semibold w-fit">
                              <MaterialSymbol icon="gavel" size={11} />
                              {t('transfers.typeAuction') || 'From Auction'}
                            </span>
                            {transfer.linked_auction && (
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/auctions/${transfer.linked_auction.id}`); }}
                                className="text-[10px] text-brand-accent hover:text-[#B8860B] hover:underline text-left truncate max-w-[140px]"
                              >
                                {transfer.linked_auction.title}
                              </button>
                            )}
                          </div>
                        ) : transfer.linked_group ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold w-fit">
                              <MaterialSymbol icon="group" size={11} />
                              {t('transfers.typeGroup') || 'Group Transfer'}
                            </span>
                            <span className="text-[10px] text-on-surface-subtle truncate max-w-[140px]">
                              {transfer.linked_group.name}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-light text-on-surface-variant text-[10px] font-semibold">
                            <MaterialSymbol icon="swap_horiz" size={11} />
                            {t('transfers.typeManual') || 'Manual Transfer'}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-semibold text-brand-primary">
                          {transfer.agreed_price ? `SAR ${parseFloat(transfer.agreed_price).toFixed(0)}` : '—'}
                        </span>
                      </td>
                      <td className="p-4">
                        <TransferStatusBadge status={transfer.status} t={t} />
                      </td>
                      <td className="p-4 text-sm text-on-surface-subtle">{formatDate(transfer.created_at)}</td>
                      <td className="p-4" onClick={e => e.stopPropagation()}>
                        <div className={`flex items-center gap-1.5 ${isRtl ? 'flex-row-reverse' : ''} ${isRtl ? '' : 'justify-end'}`}>
                          {canAcceptReject && (
                            <>
                              <button
                                onClick={() => handleAction(transfer.id, 'accept')}
                                disabled={actionLoading === `accept-${transfer.id}`}
                                className="px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-600 transition disabled:opacity-50 flex items-center gap-1"
                              >
                                {actionLoading === `accept-${transfer.id}` ? (
                                  <MaterialSymbol icon="progress_activity" size={12} className="animate-spin" />
                                ) : <MaterialSymbol icon="check" size={12} />}
                                {t('transfers.accept') || 'Accept'}
                              </button>
                              <button
                                onClick={() => handleAction(transfer.id, 'reject')}
                                disabled={actionLoading === `reject-${transfer.id}`}
                                className="px-2.5 py-1.5 bg-red-500 text-white rounded-lg text-[10px] font-bold hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-1"
                              >
                                <MaterialSymbol icon="close" size={12} />
                                {t('transfers.reject') || 'Reject'}
                              </button>
                            </>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => handleAction(transfer.id, 'cancel')}
                              disabled={actionLoading === `cancel-${transfer.id}`}
                              className="px-2.5 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-[10px] font-bold hover:bg-gray-200 transition disabled:opacity-50 flex items-center gap-1"
                            >
                              {actionLoading === `cancel-${transfer.id}` ? (
                                <MaterialSymbol icon="progress_activity" size={12} className="animate-spin" />
                              ) : <MaterialSymbol icon="close" size={12} />}
                              {t('transfers.cancel') || 'Cancel'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            perPage={perPage}
            total={meta?.total || 0}
            dir={dir}
            onPageChange={(p) => { setPage(p); }}
            onPerPageChange={(v) => { setPerPage(v); setPage(1); }}
          />
        </div>
      )}

      {showCreate && (
        <TransferCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => fetchTransfers()}
        />
      )}
    </div>
  );
}
