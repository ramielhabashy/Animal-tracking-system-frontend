import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch, storageUrl } from '../utils/api';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';

const PRIORITY_COLORS = { low: 'bg-gray-400', medium: 'bg-amber-400', high: 'bg-orange-500', urgent: 'bg-red-500' };
const PRIORITY_BG = { low: 'bg-gray-100 text-gray-600', medium: 'bg-amber-100 text-amber-700', high: 'bg-orange-100 text-orange-700', urgent: 'bg-red-100 text-red-700' };
const STATUS_COLORS = { open: 'bg-green-500', in_progress: 'bg-amber-500', resolved: 'bg-blue-500', closed: 'bg-gray-500' };
const STATUS_BG = { open: 'bg-green-100 text-green-700', in_progress: 'bg-amber-100 text-amber-700', resolved: 'bg-blue-100 text-blue-700', closed: 'bg-gray-100 text-gray-600' };
const STATUS_LABELS = { open: 'open', in_progress: 'inProgress', resolved: 'resolved', closed: 'closed' };
const AVATAR_COLORS = ['#002819', '#06402B', '#D4AF37', '#8B4513', '#2E5090', '#7B2D8B', '#B8860B', '#4A6741'];

function getInitials(name) {
  return (name || '?').split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(id) {
  return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length];
}

function relativeTime(dateStr, t) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('commCenter.justNow') || 'Just now';
  if (mins < 60) return (t('commCenter.minutesAgo') || '{count}m ago').replace('{count}', mins);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return (t('commCenter.hoursAgo') || '{count}h ago').replace('{count}', hours);
  const days = Math.floor(hours / 24);
  return (t('commCenter.daysAgo') || '{count}d ago').replace('{count}', days);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const isRtl = dir === 'rtl';

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [priorityUpdating, setPriorityUpdating] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [users, setUsers] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const msgEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatAreaRef = useRef(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const fetchTicket = useCallback(async () => {
    setLoadingTicket(true);
    try {
      const res = await apiFetch(`/api/conversations/${id}`);
      if (res.ok) {
        const resBody = await res.json();
        const payload = resBody.data || {};
        const conv = payload.conversation || payload;
        setTicket(conv);
      }
    } catch (e) {
      console.error('Failed to fetch ticket', e);
    } finally {
      setLoadingTicket(false);
    }
  }, [id]);

  const fetchMessages = useCallback(async (page = 1) => {
    setLoadingMessages(true);
    try {
      const res = await apiFetch(`/api/conversations/${id}/messages?page=${page}&per_page=50`);
      if (res.ok) {
        const resBody = await res.json();
        const payload = resBody.data || {};
        const msgs = payload.data || [];
        const meta = payload.meta || {};
        if (page === 1) {
          setMessages(msgs);
        } else {
          setMessages(prev => [...msgs, ...prev]);
        }
        setNextPage(meta.current_page < meta.last_page ? page + 1 : null);
        setHasMore(meta.current_page < meta.last_page);
      }
    } catch (e) {
      console.error('Failed to fetch messages', e);
    } finally {
      setLoadingMessages(false);
    }
  }, [id]);

  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/api/users?per_page=100');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || []);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (id) {
      fetchTicket();
      fetchMessages(1);
      fetchUsers();
    }
  }, [id, fetchTicket, fetchMessages]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [ticket]);

  const updateTicket = async (payload) => {
    try {
      const res = await apiFetch(`/api/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = data.data || data;
        setTicket(prev => ({ ...prev, ...updated }));
        return true;
      }
    } catch (e) {}
    return false;
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === ticket.status) return;
    setStatusUpdating(true);
    const ok = await updateTicket({ status: newStatus });
    if (ok) {
      showToast(t('commCenter.ticketDetail.statusChanged') || 'Status updated');
    }
    setStatusUpdating(false);
  };

  const handlePriorityChange = async (e) => {
    const newPriority = e.target.value;
    if (newPriority === ticket.priority) return;
    setPriorityUpdating(true);
    await updateTicket({ priority: newPriority });
    setPriorityUpdating(false);
  };

  const handleReassign = async (e) => {
    const newUserId = e.target.value;
    if (!newUserId) return;
    setReassigning(true);
    const ok = await updateTicket({ assigned_to_id: parseInt(newUserId) });
    if (ok) {
      showToast(t('commCenter.ticketDetail.reassignedSuccess') || 'Ticket reassigned');
    }
    setReassigning(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    setSending(true);
    const body = new FormData();
    body.append('body', newMessage.trim());
    if (replyTo) body.append('parent_id', replyTo.id);
    if (selectedFile) body.append('file', selectedFile);
    try {
      const res = await apiFetch(`/api/conversations/${id}/messages`, {
        method: 'POST', body,
      });
      if (res.ok) {
        const data = await res.json();
        const newMsg = data.data || data;
        setMessages(prev => [...prev, { ...newMsg, sender: user }]);
        setNewMessage('');
        setSelectedFile(null);
        setReplyTo(null);
        fetchTicket();
      }
    } catch (e) {
    } finally {
      setSending(false);
    }
  };

  const loadOlder = async () => {
    if (!hasMore || !nextPage) return;
    await fetchMessages(nextPage);
  };

  const deleteMessage = async (msgId) => {
    try {
      const res = await apiFetch(`/api/messages/${msgId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== msgId));
        setShowDeleteConfirm(null);
      }
    } catch (e) {}
  };

  let toastTimer;

  function showToast(msg) {
    const el = document.getElementById('ticket-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('opacity-0', 'translate-y-2');
    el.classList.add('opacity-100', 'translate-y-0');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove('opacity-100', 'translate-y-0');
      el.classList.add('opacity-0', 'translate-y-2');
    }, 2500);
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const autoResize = (e) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    setNewMessage(el.value);
  };

  if (loadingTicket) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-sm border border-surface-high" dir={dir}>
        <MaterialSymbol icon="progress_activity" size={32} className="text-brand-accent animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-sm border border-surface-high" dir={dir}>
        <MaterialSymbol icon="error" size={48} className="text-on-surface-variant/20 mb-3" />
        <p className="text-sm text-on-surface-variant/50 font-medium">{t('common.noData') || 'Ticket not found'}</p>
        <button onClick={() => navigate('/messages')} className="mt-4 px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-secondary transition-colors">
          {t('common.back') || 'Back'}
        </button>
      </div>
    );
  }

  const creator = ticket.creator || ticket.created_by || {};
  const assignee = ticket.assigned_to || {};
  const participants = ticket.participants || [];
  const linkType = ticket.link_type;
  const linkId = ticket.link_id;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-surface-high overflow-hidden" dir={dir}>
      <div id="ticket-toast" className="fixed top-4 end-4 z-[100] px-4 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-medium shadow-lg transition-all duration-300 opacity-0 translate-y-2 pointer-events-none" />

      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-high bg-white flex items-center gap-3">
        <button
          onClick={() => navigate('/messages')}
          className="w-9 h-9 rounded-xl text-on-surface-variant/50 hover:text-on-surface-variant hover:bg-surface-light flex items-center justify-center transition-colors flex-shrink-0"
        >
          <MaterialSymbol icon="arrow_back" size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-2 flex-wrap ${isRtl ? 'flex-row-reverse' : ''}`}>
            <h1 className="text-lg font-bold text-brand-primary truncate max-w-md">
              {ticket.subject || (t('commCenter.ticket') || 'Ticket')}
            </h1>
            <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${STATUS_BG[ticket.status] || 'bg-gray-100 text-gray-600'}`}>
              {t(`commCenter.${STATUS_LABELS[ticket.status] || 'open'}`) || ticket.status}
            </span>
            {ticket.priority && (
              <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full ${PRIORITY_BG[ticket.priority] || 'bg-gray-100 text-gray-600'}`}>
                {t(`commCenter.${ticket.priority}`) || ticket.priority}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-on-surface-variant/50">
              #{ticket.id}
            </span>
            <span className="text-xs text-on-surface-variant/30">·</span>
            <span className="text-xs text-on-surface-variant/50">
              {formatDate(ticket.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row">
        {/* Left column: Ticket details */}
        <div className={`w-full lg:w-80 xl:w-96 flex-shrink-0 border-b lg:border-b-0 lg:border-e border-surface-high bg-surface-light ${isRtl ? 'lg:border-s lg:border-e-0' : 'lg:border-e'}`}>
          <div className="p-5 space-y-5">
            {/* Created by */}
            <div>
              <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-2">
                {t('commCenter.ticketDetail.createdBy') || 'Created by'}
              </h4>
              <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(creator.id) }}
                >
                  {getInitials(creator.name || creator.email || 'U')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-primary truncate">{creator.name || creator.email || '-'}</p>
                  <p className="text-xs text-on-surface-variant/50 truncate">{creator.role || ''}</p>
                </div>
              </div>
            </div>

            {/* Assigned to */}
            <div>
              <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-2">
                {t('commCenter.ticketDetail.assignedTo') || 'Assigned to'}
              </h4>
              <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: getAvatarColor(assignee.id) }}
                >
                  {assignee.id ? getInitials(assignee.name || assignee.email || 'U') : '?'}
                </div>
                <div className="min-w-0 flex-1">
                  {assignee.id ? (
                    <>
                      <p className="text-sm font-semibold text-brand-primary truncate">{assignee.name || assignee.email}</p>
                      <p className="text-xs text-on-surface-variant/50 truncate">{assignee.role || ''}</p>
                    </>
                  ) : (
                    <p className="text-sm text-on-surface-variant/40 italic">{t('common.none') || 'None'}</p>
                  )}
                </div>
              </div>
              <select
                onChange={handleReassign}
                disabled={reassigning}
                value={assignee.id || ''}
                className="mt-2 w-full bg-white border border-surface-high rounded-xl px-3 py-2 text-xs text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent"
              >
                <option value="">{t('commCenter.ticketDetail.reassign') || 'Reassign'}...</option>
                {users.filter(u => String(u.id) !== String(creator.id)).map(u => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
            </div>

            {/* Participants */}
            {participants.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-2">
                  {t('commCenter.ticketDetail.participants') || 'Participants'} ({participants.length})
                </h4>
                <div className="space-y-2">
                  {participants.map(p => (
                    <div key={p.id} className={`flex items-center gap-2.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                        style={{ backgroundColor: getAvatarColor(p.id) }}
                      >
                        {getInitials(p.name || p.email || 'U')}
                      </div>
                      <span className="text-sm text-on-surface-variant truncate">{p.name || p.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div>
              <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-2">
                {t('common.date') || 'Date'}
              </h4>
              <div className="space-y-1">
                <div className={`flex items-center gap-2 text-xs ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <MaterialSymbol icon="calendar_today" size={14} className="text-on-surface-variant/40" />
                  <span className="text-on-surface-variant/70">
                    {t('common.created') || 'Created'}: {formatDate(ticket.created_at)}
                  </span>
                </div>
                <div className={`flex items-center gap-2 text-xs ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <MaterialSymbol icon="update" size={14} className="text-on-surface-variant/40" />
                  <span className="text-on-surface-variant/70">
                    {t('common.updated') || 'Updated'}: {formatDate(ticket.updated_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Linked entity */}
            <div>
              <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-2">
                {t('commCenter.ticketDetail.linkTo') || 'Linked to'}
              </h4>
              {linkType && linkId ? (
                <Link
                  to={`/${linkType === 'animal' ? 'animals' : linkType === 'task' ? 'tasks' : linkType}s/${linkId}`}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-surface-high text-xs text-brand-primary hover:border-brand-accent transition-colors ${isRtl ? 'flex-row-reverse' : ''}`}
                >
                  <MaterialSymbol icon="link" size={14} />
                  <span className="font-semibold">{linkType}#{linkId}</span>
                </Link>
              ) : (
                <p className="text-xs text-on-surface-variant/40 italic">
                  {t('commCenter.ticketDetail.noLink') || 'No linked item'}
                </p>
              )}
            </div>

            {/* Status change */}
            <div>
              <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-2">
                {t('commCenter.ticketDetail.changeStatus') || 'Change Status'}
              </h4>
              <select
                onChange={handleStatusChange}
                disabled={statusUpdating}
                value={ticket.status || 'open'}
                className="w-full bg-white border border-surface-high rounded-xl px-3 py-2 text-sm text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent"
              >
                {['open', 'in_progress', 'resolved', 'closed'].map(s => (
                  <option key={s} value={s}>
                    {t(`commCenter.${STATUS_LABELS[s]}`) || s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority change */}
            <div>
              <h4 className="text-xs font-semibold text-on-surface-variant/60 uppercase tracking-wider mb-2">
                {t('commCenter.ticketDetail.changePriority') || 'Change Priority'}
              </h4>
              <select
                onChange={handlePriorityChange}
                disabled={priorityUpdating}
                value={ticket.priority || 'medium'}
                className="w-full bg-white border border-surface-high rounded-xl px-3 py-2 text-sm text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent"
              >
                {['low', 'medium', 'high', 'urgent'].map(p => (
                  <option key={p} value={p}>
                    {t(`commCenter.${p}`) || p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right column: Conversation thread */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 bg-white max-h-[calc(100vh-20rem)] relative" ref={chatAreaRef} onScroll={e => {
            const el = e.target;
            setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 150);
          }}>
            {showScrollDown && (
              <button
                onClick={() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="absolute bottom-4 end-4 w-10 h-10 rounded-full bg-brand-primary text-white shadow-lg flex items-center justify-center hover:bg-brand-secondary transition-colors z-10"
              >
                <MaterialSymbol icon="expand_circle_down" size={20} />
              </button>
            )}
            {loadingMessages && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <MaterialSymbol icon="progress_activity" size={24} className="text-brand-accent animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {hasMore && (
                  <div className="text-center">
                    <button
                      onClick={loadOlder}
                      className="text-xs font-semibold text-brand-accent hover:text-[#B8942F] transition-colors"
                    >
                      {t('common.loadMore') || 'Load older messages'}...
                    </button>
                  </div>
                )}
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <MaterialSymbol icon="sms" size={32} className="text-on-surface-variant/20 mb-2" />
                    <p className="text-sm text-on-surface-variant/50">{t('commCenter.noMessages') || 'No messages yet'}</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isOwn = String(msg.sender?.id || msg.user_id) === String(user?.id);
                    const prevMsg = messages[idx - 1];
                    const isSameSender = prevMsg && (
                      String(prevMsg.sender?.id || prevMsg.user_id) === String(msg.sender?.id || msg.user_id)
                    );
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                          {!isSameSender && (
                            <div className={`flex items-center gap-2 mb-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                                style={{ backgroundColor: getAvatarColor(msg.sender?.id || msg.user_id) }}
                              >
                                {getInitials(msg.sender?.name || msg.sender_name || 'U')}
                              </div>
                              <span className="text-[11px] font-semibold text-on-surface-variant/60">
                                {isOwn ? (t('common.you') || 'You') : (msg.sender?.name || msg.sender_name || 'User')}
                              </span>
                              <span className="text-[10px] text-on-surface-variant/40">
                                {relativeTime(msg.created_at, t)}
                              </span>
                            </div>
                          )}
                          {isSameSender && (
                            <div className={`text-[10px] text-on-surface-variant/40 mb-1 ${isRtl ? 'text-end' : ''}`}>
                              {relativeTime(msg.created_at, t)}
                            </div>
                          )}
                          {msg.parent && (
                            <div className={`mb-1 px-3 py-1.5 rounded-lg bg-surface-light border-s-2 border-s-[#D4AF37] text-xs text-on-surface-variant/60 italic max-w-[300px] truncate`}>
                              {msg.parent.body || ''}
                            </div>
                          )}
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isOwn
                              ? 'bg-brand-primary text-white rounded-br-md'
                              : 'bg-surface-light text-on-surface-variant shadow-sm border border-surface-high rounded-bl-md'
                          }`}>
                            <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                          </div>
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className={`mt-1.5 space-y-1 ${isRtl ? 'text-end' : ''}`}>
                              {msg.attachments.map(att => (
                                <a
                                  key={att.id}
                                  href={storageUrl(att.file_path || att.path)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-light text-xs text-on-surface-variant/70 hover:text-brand-primary transition-colors"
                                >
                                  <MaterialSymbol icon="attach_file" size={14} />
                                  <span className="truncate max-w-[150px]">{att.original_name || att.name || 'File'}</span>
                                  <span className="text-on-surface-variant/40">({formatFileSize(att.file_size || att.size)})</span>
                                </a>
                              ))}
                            </div>
                          )}
                          <div className={`flex gap-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'} ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <button
                              onClick={() => setReplyTo(msg)}
                              className="text-[10px] text-on-surface-variant/40 hover:text-brand-accent transition-colors"
                            >
                              {t('commCenter.reply') || 'Reply'}
                            </button>
                            {isOwn && (
                              <button
                                onClick={() => setShowDeleteConfirm(msg.id)}
                                className="text-[10px] text-on-surface-variant/40 hover:text-red-500 transition-colors"
                              >
                                {t('common.delete') || 'Delete'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={msgEndRef} />
              </div>
            )}
          </div>

          {/* Reply indicator */}
          {replyTo && (
            <div className="px-5 py-2 bg-surface-light border-t border-surface-high flex items-center gap-2">
              <MaterialSymbol icon="reply" size={16} className="text-brand-accent" />
              <span className="text-xs text-on-surface-variant/60 truncate flex-1">
                {t('commCenter.reply') || 'Reply'} to: {replyTo.body || ''}
              </span>
              <button onClick={() => setReplyTo(null)} className="text-on-surface-variant/40 hover:text-on-surface-variant">
                <MaterialSymbol icon="close" size={14} />
              </button>
            </div>
          )}

          {/* Input area */}
          <div className="px-5 py-3 border-t border-surface-high bg-white">
            {selectedFile && (
              <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-light text-xs text-on-surface-variant">
                <MaterialSymbol icon="insert_drive_file" size={16} className="text-brand-accent" />
                <span className="truncate flex-1">{selectedFile.name}</span>
                <span className="text-on-surface-variant/40">({formatFileSize(selectedFile.size)})</span>
                <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-red-400 hover:text-red-600">
                  <MaterialSymbol icon="close" size={14} />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={autoResize}
                onKeyDown={handleKeyDown}
                placeholder={t('commCenter.typeMessage') || 'Type your message...'}
                rows={1}
                className={`flex-1 bg-surface-light border border-surface-high rounded-xl px-4 py-2.5 text-sm text-on-surface-variant placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent resize-none max-h-[200px] ${isRtl ? 'text-right' : ''}`}
              />
              <input type="file" ref={fileInputRef} onChange={e => setSelectedFile(e.target.files[0] || null)} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-xl text-on-surface-variant/50 hover:text-brand-primary hover:bg-surface-light flex items-center justify-center transition-colors flex-shrink-0"
              >
                <MaterialSymbol icon="attach_file" size={20} />
              </button>
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() && !selectedFile || sending}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                  (!newMessage.trim() && !selectedFile) || sending
                    ? 'bg-surface-high text-on-surface-variant/30 cursor-not-allowed'
                    : 'bg-brand-primary text-white hover:bg-brand-secondary'
                }`}
              >
                <MaterialSymbol icon="send" size={18} fill />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-brand-primary mb-2">{t('commCenter.confirmDelete') || 'Delete this message?'}</h3>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-light transition-colors">
                {t('common.cancel') || 'Cancel'}
              </button>
              <button onClick={() => deleteMessage(showDeleteConfirm)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors">
                {t('common.delete') || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
