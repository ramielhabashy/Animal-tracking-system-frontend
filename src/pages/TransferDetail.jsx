import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { TransferStatusBadge } from '../components/Transfers';

const AVATAR_COLORS = ['#002819', '#06402B', '#D4AF37', '#8B4513', '#2E5090', '#7B2D8B', '#B8860B', '#4A6741'];

function getInitials(name) {
  return (name || '?').split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(id) {
  return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TransferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const isRtl = dir === 'rtl';

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchTransfer = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/transfers/${id}`);
      if (res.ok) {
        const d = await res.json();
        setTransfer(d.data || d);
      } else {
        setError(t('errors.not_found') || 'Transfer not found');
      }
    } catch (e) {
      setError(t('errors.networkError') || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfer();
  }, [id]);

  const handleAction = async (action) => {
    setActionLoading(action);
    try {
      const body = {};
      if (action === 'reject' && rejectionReason.trim()) body.rejection_reason = rejectionReason.trim();
      const res = await apiFetch(`/api/transfers/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t(`transfers.${action}Success`) || `Transfer ${action}ed successfully` });
        setShowRejectModal(false);
        setRejectionReason('');
        fetchTransfer();
      } else {
        const d = await res.json();
        setMessage({ type: 'error', text: d.message || `Failed to ${action} transfer` });
      }
    } catch (e) {
      setMessage({ type: 'error', text: t('errors.networkError') || 'Network error' });
    } finally {
      setActionLoading(null);
    }
  };

  const userId = String(user?.id);
  const fromId = String(transfer?.from_user?.id || transfer?.sender?.id || '');
  const toId = String(transfer?.to_user?.id || transfer?.receiver?.id || '');
  const isAdmin = user?.role === 'Admin';
  const canCancel = transfer?.status === 'pending' && fromId === userId;
  const canAcceptReject = transfer?.status === 'pending' && toId === userId;
  const canManageCommission = isAdmin && transfer?.status === 'accepted';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-sm border border-surface-high" dir={dir}>
        <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-sm border border-surface-high" dir={dir}>
        <MaterialSymbol icon="error" size={48} className="text-on-surface-variant/20 mb-3" />
        <p className="text-sm text-on-surface-variant/50 font-medium">{error || t('common.noData') || 'Not found'}</p>
        <button onClick={() => navigate('/transfers')} className="mt-4 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors">
          {t('common.back') || 'Back to Transfers'}
        </button>
      </div>
    );
  }

  const fromUser = transfer.from_user || transfer.sender || {};
  const toUser = transfer.to_user || transfer.receiver || {};
  const animals = transfer.animals || [];

  return (
    <div className="space-y-6" dir={dir}>
      <div id="transfer-toast" className={`fixed top-4 end-4 z-[100] px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 opacity-0 translate-y-2 pointer-events-none ${
        message?.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      }`}>
        {message?.text || ''}
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <MaterialSymbol icon={message.type === 'success' ? 'check_circle' : 'error'} size={20} />
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto">
            <MaterialSymbol icon="close" size={18} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-surface-high p-6">
        <div className={`flex items-start gap-4 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => navigate('/transfers')}
            className="w-9 h-9 rounded-xl text-on-surface-variant/50 hover:text-on-surface-variant hover:bg-surface-light flex items-center justify-center transition-colors flex-shrink-0"
          >
            <MaterialSymbol icon="arrow_back" size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className={`flex items-center gap-3 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}>
              <h1 className="text-xl font-bold text-brand-primary">{t('transfers.transfer') || 'Transfer'} #{transfer.id}</h1>
              <TransferStatusBadge status={transfer.status} t={t} />
            </div>
            <p className="text-sm text-on-surface-subtle mt-1">{formatDate(transfer.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Users & Animals */}
        <div className="lg:col-span-2 space-y-6">
          {/* From / To cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-surface-high p-5">
              <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-3">{t('transfers.from') || 'From'}</h4>
              <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(fromUser.id) }}
                >
                  {getInitials(fromUser.name || fromUser.email || '?')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-primary truncate">{fromUser.name || '—'}</p>
                  <p className="text-xs text-on-surface-variant/50 truncate">{fromUser.email || ''}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-surface-high p-5">
              <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-3">{t('transfers.to') || 'To'}</h4>
              <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(toUser.id) }}
                >
                  {getInitials(toUser.name || toUser.email || '?')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-primary truncate">{toUser.name || '—'}</p>
                  <p className="text-xs text-on-surface-variant/50 truncate">{toUser.email || ''}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Animals list */}
          <div className="bg-white rounded-2xl shadow-sm border border-surface-high p-5">
            <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-3">
              {t('transfers.animals') || 'Animals'} ({animals.length})
            </h4>
            {animals.length === 0 ? (
              <p className="text-sm text-on-surface-variant/40 italic">{t('common.none') || 'None'}</p>
            ) : (
              <div className="space-y-2">
                {animals.map(animal => (
                  <div key={animal.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-light ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <MaterialSymbol icon="pets" size={18} className="text-brand-accent" />
                    <span className="text-sm font-medium text-brand-primary flex-1">{animal.name || `#${animal.animal_id}`}</span>
                    <span className="text-xs text-on-surface-variant/50">{animal.species || ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {transfer.notes && (
            <div className="bg-white rounded-2xl shadow-sm border border-surface-high p-5">
              <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-2">{t('transfers.notes') || 'Notes'}</h4>
              <p className="text-sm text-on-surface-variant whitespace-pre-wrap">{transfer.notes}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-2xl shadow-sm border border-surface-high p-5">
            <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-4">{t('transfers.timeline') || 'Timeline'}</h4>
            <div className="space-y-4">
              {[
                { label: t('transfers.statusCreated') || 'Created', key: 'created_at', icon: 'add_circle' },
                { label: t('transfers.statusAccepted') || 'Accepted', key: 'accepted_at', icon: 'check_circle' },
                { label: t('transfers.statusCompleted') || 'Completed', key: 'completed_at', icon: 'task_alt' },
              ].map((step, idx) => {
                const dateVal = transfer[step.key];
                const isPast = !!dateVal;
                return (
                  <div key={step.key} className={`flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex flex-col items-center ${isRtl ? 'ml-3' : 'mr-3'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isPast ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <MaterialSymbol icon={step.icon} size={16} />
                      </div>
                      {idx < 2 && <div className={`w-0.5 h-6 ${isPast ? 'bg-brand-primary/30' : 'bg-gray-200'}`} />}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className={`text-sm font-medium ${isPast ? 'text-brand-primary' : 'text-on-surface-variant/40'}`}>{step.label}</p>
                      {dateVal && <p className="text-xs text-on-surface-subtle mt-0.5">{formatDate(dateVal)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column - Details & Actions */}
        <div className="space-y-6">
          {/* Price */}
          {transfer.agreed_price && (
            <div className="bg-white rounded-2xl shadow-sm border border-surface-high p-5">
              <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-2">{t('transfers.agreedPrice') || 'Agreed Price'}</h4>
              <p className="text-2xl font-bold text-brand-primary">SAR {parseFloat(transfer.agreed_price).toFixed(2)}</p>
            </div>
          )}

          {/* Transfer Type */}
          <div className="bg-white rounded-2xl shadow-sm border border-surface-high p-5">
            <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-3">{t('transfers.transferType') || 'Transfer Type'}</h4>
            {transfer.transfer_type === 'auction' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-accent/10 text-[#B8860B] text-xs font-semibold">
                    <MaterialSymbol icon="gavel" size={14} />
                    {t('transfers.typeAuction') || 'From Auction'}
                  </span>
                </div>
                {transfer.linked_auction && (
                  <div className="mt-2 p-3 rounded-xl bg-surface-light border border-surface-high">
                    <p className="text-xs font-medium text-brand-primary mb-1">{transfer.linked_auction.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-on-surface-subtle">
                      <span>{t('auctionsPage.paymentStatus') || 'Status'}: {transfer.linked_auction.status}</span>
                      {transfer.linked_auction.current_price && (
                        <span>· SAR {parseFloat(transfer.linked_auction.current_price).toFixed(0)}</span>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(`/auctions/${transfer.linked_auction.id}`)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-accent hover:text-[#B8860B]"
                    >
                      <MaterialSymbol icon="open_in_new" size={13} />
                      {t('transfers.viewAuction') || 'View Auction'}
                    </button>
                  </div>
                )}
              </div>
            ) : transfer.linked_group ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                    <MaterialSymbol icon="group" size={14} />
                    {t('transfers.typeGroup') || 'Group Transfer'}
                  </span>
                </div>
                <div className="mt-2 p-3 rounded-xl bg-surface-light border border-surface-high">
                  <span className="text-xs font-medium text-brand-primary">{transfer.linked_group.name}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-light text-on-surface-variant text-xs font-semibold">
                  <MaterialSymbol icon="swap_horiz" size={14} />
                  {t('transfers.typeManual') || 'Manual Transfer'}
                </span>
              </div>
            )}
          </div>

          {/* Commission */}
          {transfer.commission_amount > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-surface-high p-5">
              <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-2">{t('transfers.commission') || 'Commission'}</h4>
              <div className="space-y-2">
                <div className={`flex items-center justify-between text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className="text-on-surface-variant/70">{t('transfers.commissionPercentage') || 'Percentage'}</span>
                  <span className="font-semibold text-brand-primary">{parseFloat(transfer.commission_percentage || 5).toFixed(1)}%</span>
                </div>
                <div className={`flex items-center justify-between text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className="text-on-surface-variant/70">{t('transfers.commissionAmount') || 'Amount'}</span>
                  <span className="font-semibold text-brand-primary">SAR {parseFloat(transfer.commission_amount || 0).toFixed(2)}</span>
                </div>
                <div className={`flex items-center justify-between text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className="text-on-surface-variant/70">{t('transfers.commissionPaid') || 'Paid'}</span>
                  <span className={`font-semibold ${transfer.commission_paid ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {transfer.commission_paid ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {(canCancel || canAcceptReject || canManageCommission) && (
            <div className="bg-white rounded-2xl shadow-sm border border-surface-high p-5 space-y-3">
              <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-1">{t('common.actions') || 'Actions'}</h4>
              {canAcceptReject && (
                <>
                  <button
                    onClick={() => handleAction('accept')}
                    disabled={actionLoading === 'accept'}
                    className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold text-sm hover:bg-emerald-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading === 'accept' ? (
                      <MaterialSymbol icon="progress_activity" size={18} className="animate-spin" />
                    ) : (
                      <MaterialSymbol icon="check_circle" size={18} />
                    )}
                    {t('transfers.accept') || 'Accept Transfer'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading === 'reject'}
                    className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <MaterialSymbol icon="cancel" size={18} />
                    {t('transfers.reject') || 'Reject Transfer'}
                  </button>
                </>
              )}
              {canCancel && (
                <button
                  onClick={() => handleAction('cancel')}
                  disabled={actionLoading === 'cancel'}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === 'cancel' ? (
                    <MaterialSymbol icon="progress_activity" size={18} className="animate-spin" />
                  ) : (
                    <MaterialSymbol icon="close" size={18} />
                  )}
                  {t('transfers.cancel') || 'Cancel Transfer'}
                </button>
              )}
              {canManageCommission && !transfer.commission_paid && (
                <button
                  onClick={async () => {
                    setActionLoading('commission');
                    try {
                      const res = await apiFetch(`/api/admin/transfers/${id}/commission`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ commission_paid: true }),
                      });
                      if (res.ok) fetchTransfer();
                    } finally {
                      setActionLoading(null);
                    }
                  }}
                  disabled={actionLoading === 'commission'}
                  className="w-full py-3 bg-brand-primary text-white rounded-xl font-semibold text-sm hover:bg-brand-secondary transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <MaterialSymbol icon="paid" size={18} />
                  {t('transfers.markCommissionPaid') || 'Mark Commission Paid'}
                </button>
              )}
              {transfer.status === 'accepted' && !transfer.commission_paid && (
                <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
                  <MaterialSymbol icon="info" size={16} />
                  {t('transfers.commissionPending') || 'Commission payment is pending'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reject reason modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowRejectModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-brand-primary">{t('transfers.rejectTransfer') || 'Reject Transfer'}</h3>
              <button onClick={() => setShowRejectModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <MaterialSymbol icon="close" size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">{t('transfers.rejectionReason') || 'Reason (optional)'}</label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder={t('transfers.rejectionReasonPlaceholder') || 'Enter reason...'}
                  className="w-full bg-surface-light border border-surface-high rounded-xl px-4 py-2.5 text-sm text-on-surface-variant placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-3 bg-surface-light text-brand-primary rounded-xl font-semibold text-sm hover:bg-surface-high transition"
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  disabled={actionLoading === 'reject'}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === 'reject' ? (
                    <MaterialSymbol icon="progress_activity" size={18} className="animate-spin" />
                  ) : null}
                  {t('transfers.reject') || 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
