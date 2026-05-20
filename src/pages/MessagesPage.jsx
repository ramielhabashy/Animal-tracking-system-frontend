import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch, storageUrl } from '../utils/api';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';

const PRIORITY_COLORS = { low: 'bg-gray-400', medium: 'bg-yellow-400', high: 'bg-orange-500', urgent: 'bg-red-500' };
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

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function MessagesPage() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const isRtl = dir === 'rtl';

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [textInput, setTextInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createDropdown, setCreateDropdown] = useState(false);
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [page, setPage] = useState(1);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const msgEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatAreaRef = useRef(null);

  const [form, setForm] = useState({
    type: 'direct', subject: '', body: '', priority: 'medium',
    participant_ids: [], link_type: '', link_id: '', file: null,
  });

  useEffect(() => {
    fetchConversations();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (routeId && conversations.length > 0) {
      const found = conversations.find(c => String(c.id) === String(routeId));
      if (found) selectConversation(found);
    }
  }, [routeId, conversations]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeConv]);

  const fetchConversations = async () => {
    setLoadingList(true);
    try {
      const res = await apiFetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch conversations', e);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await apiFetch('/api/users?per_page=100');
      if (res.ok) {
        const data = await res.json();
        const userId = user?.id;
        setUsers((data.data || []).filter(u => u.id !== userId));
      }
    } catch (e) {
    } finally {
      setLoadingUsers(false);
    }
  };

  const selectConversation = useCallback(async (conv) => {
    setActiveConv(conv);
    navigate(`/messages/${conv.id}`, { replace: true });
    setMessages([]);
    setLoadingMsgs(true);
    setPage(1);
    setHasMore(false);
    try {
      const res = await apiFetch(`/api/conversations/${conv.id}?page=1`);
      if (res.ok) {
        const resBody = await res.json();
        const convData = resBody.data || {};
        const msgs = convData.messages || [];
        const meta = convData.meta || {};
        setMessages(Array.isArray(msgs) ? [...msgs].reverse() : []);
        setHasMore(meta.current_page < meta.last_page);
        setPage(meta.current_page || 1);
      }
    } catch (e) {
    } finally {
      setLoadingMsgs(false);
    }
  }, [navigate]);

  const loadEarlier = async () => {
    if (!activeConv) return;
    const nextPage = page + 1;
    try {
      const res = await apiFetch(`/api/conversations/${activeConv.id}?page=${nextPage}`);
      if (res.ok) {
        const resBody = await res.json();
        const convData = resBody.data || {};
        const msgs = convData.messages || [];
        const meta = convData.meta || {};
        const newMsgs = Array.isArray(msgs) ? [...msgs].reverse() : [];
        setMessages(prev => [...newMsgs, ...prev]);
        setHasMore(meta.current_page < meta.last_page);
        setPage(nextPage);
      }
    } catch (e) {
    }
  };

  const sendMessage = async () => {
    if (!textInput.trim() && !selectedFile) return;
    if (!activeConv) return;
    setSending(true);
    const body = new FormData();
    body.append('body', textInput.trim());
    if (replyingTo) body.append('parent_id', replyingTo.id);
    if (selectedFile) body.append('file', selectedFile);
    try {
      const res = await apiFetch(`/api/conversations/${activeConv.id}/messages`, {
        method: 'POST', body,
      });
      if (res.ok) {
        const data = await res.json();
        const newMsg = data.data || data;
        setMessages(prev => [...prev, { ...newMsg, sender: user }]);
        setTextInput('');
        setSelectedFile(null);
        setReplyingTo(null);
        fetchConversations();
      }
    } catch (e) {
    } finally {
      setSending(false);
    }
  };

  const createConversation = async () => {
    if (!form.subject && form.type !== 'direct' || !form.body.trim()) return;
    try {
      const body = new FormData();
      body.append('type', form.type);
      if (form.subject) body.append('subject', form.subject);
      body.append('body', form.body.trim());
      if (form.type === 'ticket') body.append('priority', form.priority);
      form.participant_ids.forEach(id => body.append('participant_ids[]', id));
      if (form.link_type && form.link_id) {
        body.append('link_type', form.link_type);
        body.append('link_id', form.link_id);
      }
      if (form.file) body.append('file', form.file);
      const res = await apiFetch('/api/conversations', { method: 'POST', body });
      if (res.ok) {
        const data = await res.json();
        setShowNewMsg(false);
        setShowNewTicket(false);
        setShowCreate(false);
        resetForm();
        fetchConversations();
        if (data.data?.id) {
          selectConversation(data.data);
        }
      }
    } catch (e) {
    }
  };

  const markAsRead = async (convId) => {
    try {
      await apiFetch(`/api/conversations/${convId}/read`, { method: 'POST' });
      setConversations(prev => prev.map(c =>
        String(c.id) === String(convId) ? { ...c, unread_count: 0 } : c
      ));
    } catch (e) {
    }
  };

  const deleteMessage = async (msgId) => {
    try {
      const res = await apiFetch(`/api/messages/${msgId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== msgId));
        setShowDeleteConfirm(null);
      }
    } catch (e) {
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0] || null);
  };

  const resetForm = () => {
    setForm({
      type: 'direct', subject: '', body: '', priority: 'medium',
      participant_ids: [], link_type: '', link_id: '', file: null,
    });
  };

  const autoResize = (e) => {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    setTextInput(el.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleParticipant = (userId) => {
    setForm(prev => ({
      ...prev,
      participant_ids: prev.participant_ids.includes(userId)
        ? prev.participant_ids.filter(id => id !== userId)
        : [...prev.participant_ids, userId],
    }));
  };

  const filteredConversations = conversations.filter(c => {
    if (tab === 'unread' && c.unread_count === 0) return false;
    if (tab === 'tickets' && c.type !== 'ticket') return false;
    if (search) {
      const s = search.toLowerCase();
      const subj = (c.subject || '').toLowerCase();
      const lastMsg = (c.messages?.[0]?.body || '').toLowerCase();
      const names = (c.participants || []).map(p => p.name?.toLowerCase() || '').join(' ');
      return subj.includes(s) || lastMsg.includes(s) || names.includes(s);
    }
    return true;
  });

  const otherParticipants = activeConv
    ? (activeConv.participants || []).filter(p => String(p.id) !== String(user?.id))
    : [];

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-sm border border-surface-high overflow-hidden" dir={dir}>
      {/* Left sidebar */}
      <div className={`w-80 lg:w-96 flex-shrink-0 border-e border-surface-high flex flex-col bg-surface-light ${isRtl ? 'border-s' : 'border-e'}`}>
        <div className="p-4 border-b border-surface-high">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-brand-primary">{t('commCenter.messages') || 'Messages'}</h2>
            <div className="relative">
              <button
                onClick={() => setCreateDropdown(!createDropdown)}
                className="w-9 h-9 rounded-xl bg-brand-primary text-white flex items-center justify-center hover:bg-brand-secondary transition-colors"
              >
                <MaterialSymbol icon="edit" size={18} />
              </button>
              {createDropdown && (
                <div className={`absolute top-full mt-1 bg-white rounded-xl shadow-lg border border-surface-high py-1 z-50 min-w-[180px] ${isRtl ? 'start-0' : 'end-0'}`}>
                  <button
                    onClick={() => { setCreateDropdown(false); setShowNewMsg(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-light transition-colors"
                  >
                    <MaterialSymbol icon="chat" size={18} />
                    {t('commCenter.newMessage') || 'New Message'}
                  </button>
                  <button
                    onClick={() => { setCreateDropdown(false); setShowNewTicket(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-light transition-colors"
                  >
                    <MaterialSymbol icon="confirmation_number" size={18} />
                    {t('commCenter.newTicket') || 'New Ticket'}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="relative">
            <MaterialSymbol icon="search" size={18} className="absolute top-1/2 -translate-y-1/2 text-on-surface-variant/50 start-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('commCenter.searchConversations') || 'Search conversations...'}
              className={`w-full bg-white border border-surface-high rounded-xl py-2.5 text-sm text-on-surface-variant placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
            />
          </div>
          <div className="flex gap-1 mt-3">
            {['all', 'unread', 'tickets'].map(key => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  tab === key
                    ? 'bg-brand-primary text-white'
                    : 'text-on-surface-variant/60 hover:text-on-surface-variant hover:bg-surface-light'
                }`}
              >
                {key === 'all' ? (t('common.all') || 'All') : key === 'unread' ? (t('commCenter.unread') || 'Unread') : (t('commCenter.tickets') || 'Tickets')}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center h-32">
              <MaterialSymbol icon="progress_activity" size={24} className="text-brand-accent animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
              <MaterialSymbol icon="chat" size={40} className="text-on-surface-variant/20 mb-3" />
              <p className="text-sm text-on-surface-variant/50 font-medium">{t('commCenter.noConversations') || 'No conversations yet'}</p>
            </div>
          ) : (
            filteredConversations.map(conv => {
              const isActive = String(activeConv?.id) === String(conv.id);
              const priority = conv.priority || conv.messages?.[0]?.priority;
              const otherP = (conv.participants || []).find(p => String(p.id) !== String(user?.id));
              const displayName = conv.subject || otherP?.name || (t('commCenter.direct') || 'Direct Message');
              return (
                <button
                  key={conv.id}
                  onClick={() => { selectConversation(conv); markAsRead(conv.id); }}
                  className={`w-full text-start px-4 py-3 border-b border-surface-high/50 hover:bg-surface-light transition-colors relative ${isActive ? 'bg-surface-light border-s-[3px] border-s-accent' : ''} ${isRtl ? 'border-s-2' : 'border-s-2'}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: getAvatarColor(otherP?.id || conv.id) }}
                    >
                      {getInitials(displayName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="text-sm font-semibold text-brand-primary truncate flex-1">
                          {displayName}
                        </span>
                        <span className="text-[11px] text-on-surface-variant/50 whitespace-nowrap">
                          {relativeTime(conv.messages?.[0]?.created_at || conv.updated_at, t)}
                        </span>
                      </div>
                      <div className={`flex items-center gap-2 mt-0.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        {priority && (
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_COLORS[priority] || 'bg-gray-400'}`} />
                        )}
                        {conv.type === 'ticket' && (
                          <span className="text-[10px] font-semibold uppercase text-brand-accent flex-shrink-0">
                            {t('commCenter.ticket') || 'Ticket'}
                          </span>
                        )}
                        <span className="text-xs text-on-surface-variant/60 truncate flex-1">
                          {conv.messages?.[0]?.body || ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  {(conv.unread_count || 0) > 0 && (
                    <span className="absolute top-3 end-3 min-w-[18px] h-[18px] rounded-full bg-brand-primary text-white text-[10px] font-bold flex items-center justify-center px-1">
                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col">
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <MaterialSymbol icon="chat" size={64} className="text-on-surface-variant/10 mb-4" />
            <h3 className="text-lg font-bold text-on-surface-variant/40 mb-1">
              {t('commCenter.startConversation') || 'Start a new conversation'}
            </h3>
            <p className="text-sm text-on-surface-variant/30 max-w-xs">
              {t('commCenter.selectChat') || 'Select a conversation from the list or create a new one'}
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-5 py-4 border-b border-surface-high bg-white flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: getAvatarColor(activeConv.id) }}
              >
                {getInitials(activeConv.subject || 'DM')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-brand-primary truncate">
                    {activeConv.subject || (t('commCenter.direct') || 'Direct Message')}
                  </h3>
                  {activeConv.type === 'ticket' && (
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      activeConv.status === 'open' ? 'bg-green-100 text-green-700' :
                      activeConv.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      activeConv.status === 'resolved' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {t(`commCenter.${STATUS_LABELS[activeConv.status] || 'open'}`) || activeConv.status}
                    </span>
                  )}
                  {activeConv.priority && (
                    <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[activeConv.priority] || 'bg-gray-400'}`} />
                  )}
                </div>
                <p className="text-xs text-on-surface-variant/50 truncate mt-0.5">
              {otherParticipants.map(p => p.name).join(', ') || '—'}
              {(activeConv?.participants?.length || 0) > 0 && !otherParticipants.length && (
                <span className="italic">({t('commCenter.participants') || 'Participants'})</span>
              )}
                </p>
              </div>
              <button
                onClick={() => { navigate('/messages', { replace: true }); setActiveConv(null); }}
                className="w-8 h-8 rounded-xl text-on-surface-variant/50 hover:text-on-surface-variant hover:bg-surface-light flex items-center justify-center transition-colors"
              >
                <MaterialSymbol icon="close" size={18} />
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 bg-surface-light relative" ref={chatAreaRef} onScroll={e => {
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
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <MaterialSymbol icon="progress_activity" size={24} className="text-brand-accent animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {hasMore && (
                    <div className="text-center">
                      <button
                        onClick={loadEarlier}
                        className="text-xs font-semibold text-brand-accent hover:text-[#B8942F] transition-colors"
                      >
                        {t('common.loadMore') || 'Load earlier messages'}...
                      </button>
                    </div>
                  )}
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
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
                              <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''} ${isRtl ? 'flex-row-reverse' : ''}`}>
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
                              <div className={`mb-1 px-3 py-1.5 rounded-lg bg-surface-light border-s-2 border-s-[#D4AF37] text-xs text-on-surface-variant/60 italic max-w-[300px] truncate ${isRtl ? 'border-s-2' : 'border-s-2'}`}>
                                {msg.parent.body || ''}
                              </div>
                            )}
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isOwn
                                ? 'bg-brand-primary text-white rounded-br-md'
                                : 'bg-white text-on-surface-variant shadow-sm border border-surface-high rounded-bl-md'
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
                                onClick={() => setReplyingTo(msg)}
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
            {replyingTo && (
              <div className="px-5 py-2 bg-surface-light border-t border-surface-high flex items-center gap-2">
                <MaterialSymbol icon="reply" size={16} className="text-brand-accent" />
                <span className="text-xs text-on-surface-variant/60 truncate flex-1">
                  {t('commCenter.reply') || 'Reply'} to: {replyingTo.body || ''}
                </span>
                <button onClick={() => setReplyingTo(null)} className="text-on-surface-variant/40 hover:text-on-surface-variant">
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
                  value={textInput}
                  onChange={autoResize}
                  onKeyDown={handleKeyDown}
                  placeholder={t('commCenter.typeMessage') || 'Type your message...'}
                  rows={1}
                  className={`flex-1 bg-surface-light border border-surface-high rounded-xl px-4 py-2.5 text-sm text-on-surface-variant placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent resize-none max-h-[200px] ${isRtl ? 'text-right' : ''}`}
                />
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 rounded-xl text-on-surface-variant/50 hover:text-brand-primary hover:bg-surface-light flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <MaterialSymbol icon="attach_file" size={20} />
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!textInput.trim() && !selectedFile || sending}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                    (!textInput.trim() && !selectedFile) || sending
                      ? 'bg-surface-high text-on-surface-variant/30 cursor-not-allowed'
                      : 'bg-brand-primary text-white hover:bg-brand-secondary'
                  }`}
                >
                  <MaterialSymbol icon="send" size={18} fill />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Message Modal */}
      {showNewMsg && (
        <ModalOverlay onClose={() => { setShowNewMsg(false); resetForm(); }}>
          <CreateForm
            title={t('commCenter.newMessage') || 'New Message'}
            form={form} setForm={setForm} users={users} loadingUsers={loadingUsers}
            isRtl={isRtl} t={t} isTicket={false} user={user}
            onSubmit={createConversation}
            onCancel={() => { setShowNewMsg(false); resetForm(); }}
            toggleParticipant={toggleParticipant}
          />
        </ModalOverlay>
      )}

      {/* New Ticket Modal */}
      {showNewTicket && (
        <ModalOverlay onClose={() => { setShowNewTicket(false); resetForm(); }}>
          <CreateForm
            title={t('commCenter.newTicket') || 'New Ticket'}
            form={form} setForm={setForm} users={users} loadingUsers={loadingUsers}
            isRtl={isRtl} t={t} isTicket={true} user={user}
            onSubmit={createConversation}
            onCancel={() => { setShowNewTicket(false); resetForm(); }}
            toggleParticipant={toggleParticipant}
          />
        </ModalOverlay>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <ModalOverlay onClose={() => setShowDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
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
        </ModalOverlay>
      )}
    </div>
  );
}

function ModalOverlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

const ROLE_ORDER = ['Admin', 'Owner', 'Manager', 'Doctor', 'Shepherd'];

function CreateForm({ title, form, setForm, users, loadingUsers, isRtl, t, isTicket, onSubmit, onCancel, toggleParticipant, user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const groupedUsers = users.reduce((acc, u) => {
    const role = u.role || 'Other';
    if (!acc[role]) acc[role] = [];
    acc[role].push(u);
    return acc;
  }, {});

  const sortedRoles = Object.keys(groupedUsers).sort(
    (a, b) => (ROLE_ORDER.indexOf(a) === -1 ? 99 : ROLE_ORDER.indexOf(a)) - (ROLE_ORDER.indexOf(b) === -1 ? 99 : ROLE_ORDER.indexOf(b))
  );

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchTerm || (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const selectAllByRole = (role) => {
    const ids = users.filter(u => u.role === role).map(u => u.id);
    const allSelected = ids.every(id => form.participant_ids.includes(id));
    setForm(prev => ({
      ...prev,
      participant_ids: allSelected
        ? prev.participant_ids.filter(id => !ids.includes(id))
        : [...new Set([...prev.participant_ids, ...ids])],
    }));
  };

  const selectAllFiltered = () => {
    const ids = filteredUsers.map(u => u.id);
    const allSelected = ids.every(id => form.participant_ids.includes(id));
    setForm(prev => ({
      ...prev,
      participant_ids: allSelected
        ? prev.participant_ids.filter(id => !ids.includes(id))
        : [...new Set([...prev.participant_ids, ...ids])],
    }));
  };

  const isAdmin = user?.role === 'Admin';
  const isOwner = user?.role === 'Owner';
  const isTeamRole = !isAdmin && !isOwner; // Shepherd, Doctor, Manager, etc.
  const managedByOwner = user?.managed_by;

  const selectMyOwner = () => {
    if (!managedByOwner) return;
    setForm(prev => ({
      ...prev,
      participant_ids: prev.participant_ids.includes(managedByOwner)
        ? prev.participant_ids.filter(id => id !== managedByOwner)
        : [...prev.participant_ids, managedByOwner],
    }));
  };

  const selectMyTeam = () => {
    const teamIds = users
      .filter(u => u.managed_by === managedByOwner || u.id === managedByOwner)
      .map(u => u.id);
    const allSelected = teamIds.every(id => form.participant_ids.includes(id));
    setForm(prev => ({
      ...prev,
      participant_ids: allSelected
        ? prev.participant_ids.filter(id => !teamIds.includes(id))
        : [...new Set([...prev.participant_ids, ...teamIds])],
    }));
  };

  return (
    <div className="bg-white rounded-2xl w-[520px] max-w-[95vw] max-h-[90vh] overflow-y-auto shadow-xl" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="px-6 py-4 border-b border-surface-high flex items-center justify-between">
        <h3 className="text-lg font-bold text-brand-primary">{title}</h3>
        <button onClick={onCancel} className="w-8 h-8 rounded-xl text-on-surface-variant/50 hover:text-on-surface-variant hover:bg-surface-light flex items-center justify-center">
          <MaterialSymbol icon="close" size={18} />
        </button>
      </div>
      <div className="p-6 space-y-4">
        {isTicket && (
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant/70 mb-1.5">{t('commCenter.type') || 'Type'}</label>
            <select
              value={form.type}
              onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
              className="w-full bg-surface-light border border-surface-high rounded-xl px-4 py-2.5 text-sm text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent"
            >
              <option value="ticket">{t('commCenter.ticket') || 'Ticket'}</option>
            </select>
          </div>
        )}
        {!isTicket && (
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant/70 mb-1.5">{t('commCenter.type') || 'Type'}</label>
            <select
              value={form.type}
              onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
              className="w-full bg-surface-light border border-surface-high rounded-xl px-4 py-2.5 text-sm text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent"
            >
              <option value="direct">{t('commCenter.direct') || 'Direct Message'}</option>
              <option value="group">{t('commCenter.group') || 'Group'}</option>
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant/70 mb-1.5">{t('commCenter.subject') || 'Subject'}</label>
          <input
            type="text"
            value={form.subject}
            onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
            placeholder={isTicket ? (t('commCenter.ticketSubjectPlaceholder') || 'e.g., Device malfunction') : (t('commCenter.subjectPlaceholder') || 'e.g., Herd health update')}
            className="w-full bg-surface-light border border-surface-high rounded-xl px-4 py-2.5 text-sm text-on-surface-variant placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent"
          />
        </div>
        {isTicket && (
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant/70 mb-1.5">{t('commCenter.priority') || 'Priority'}</label>
            <select
              value={form.priority}
              onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full bg-surface-light border border-surface-high rounded-xl px-4 py-2.5 text-sm text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent"
            >
              {['low', 'medium', 'high', 'urgent'].map(p => (
                <option key={p} value={p}>{t(`commCenter.${p}`) || p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant/70 mb-1.5">{t('commCenter.participants') || 'Participants'}</label>

          {/* Role filter chips */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button onClick={() => setRoleFilter('')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                !roleFilter ? 'bg-brand-primary text-white' : 'bg-surface-light text-on-surface-variant hover:bg-surface-high'
              }`}>
              {t('common.all') || 'All'}
            </button>
            {sortedRoles.map(role => (
              <button key={role} onClick={() => setRoleFilter(role)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  roleFilter === role ? 'bg-brand-primary text-white' : 'bg-surface-light text-on-surface-variant hover:bg-surface-high'
                }`}>
                {role}
              </button>
            ))}
          </div>

          {/* Quick-select actions */}
          {isAdmin && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              <button onClick={() => selectAllByRole('Admin')}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-brand-accent/10 text-tertiary-container hover:bg-brand-accent/20 transition-colors">
                + {t('commCenter.techTeam') || 'Tech Team'}
              </button>
              <button onClick={() => selectAllByRole('Owner')}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-colors">
                + {t('commCenter.allOwners') || 'All Owners'}
              </button>
              <button onClick={() => selectAllByRole('Shepherd')}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary/20 transition-colors">
                + {t('commCenter.allShepherds') || 'All Shepherds'}
              </button>
              <button onClick={() => selectAllByRole('Doctor')}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                + {t('commCenter.allDoctors') || 'All Doctors'}
              </button>
              <button onClick={() => setForm(prev => ({ ...prev, participant_ids: [] }))}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                {t('common.clear') || 'Clear'}
              </button>
            </div>
          )}
          {isOwner && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              <button onClick={() => selectAllByRole('Manager')}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-brand-accent/10 text-tertiary-container hover:bg-brand-accent/20 transition-colors">
                + {t('commCenter.allManagers') || 'All Managers'}
              </button>
              <button onClick={() => selectAllByRole('Shepherd')}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary/20 transition-colors">
                + {t('commCenter.allShepherds') || 'All Shepherds'}
              </button>
              <button onClick={() => selectAllByRole('Doctor')}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                + {t('commCenter.allDoctors') || 'All Doctors'}
              </button>
              <button onClick={() => selectAllByRole('Admin')}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-colors">
                + {t('commCenter.adminTeam') || 'Admin Team'}
              </button>
              <button onClick={() => setForm(prev => ({ ...prev, participant_ids: [] }))}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                {t('common.clear') || 'Clear'}
              </button>
            </div>
          )}
          {isTeamRole && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {managedByOwner && (
                <button onClick={selectMyOwner}
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-brand-accent/10 text-tertiary-container hover:bg-brand-accent/20 transition-colors">
                  + {t('commCenter.myOwner') || 'My Owner'}
                </button>
              )}
              {managedByOwner && (
                <button onClick={selectMyTeam}
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary/20 transition-colors">
                  + {t('commCenter.myTeam') || 'My Team'}
                </button>
              )}
              <button onClick={() => selectAllByRole('Admin')}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-colors">
                + {t('commCenter.adminTeam') || 'Admin Team'}
              </button>
              <button onClick={() => setForm(prev => ({ ...prev, participant_ids: [] }))}
                className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                {t('common.clear') || 'Clear'}
              </button>
            </div>
          )}

          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={t('common.search') || 'Search...'}
            className="w-full bg-surface-light border border-surface-high rounded-xl px-4 py-2 text-sm text-on-surface-variant placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent mb-2"
          />

          {/* Select / deselect all visible */}
          {filteredUsers.length > 0 && (
            <button onClick={selectAllFiltered}
              className="text-[11px] font-medium text-brand-accent hover:underline mb-1.5 block">
              {filteredUsers.every(u => form.participant_ids.includes(u.id))
                ? (t('common.deselectAll') || 'Deselect all')
                : (t('common.selectAll') || `Select all (${filteredUsers.length})`)}
            </button>
          )}

          <div className="max-h-40 overflow-y-auto space-y-1">
            {loadingUsers ? (
              <div className="text-center py-2"><MaterialSymbol icon="progress_activity" size={16} className="text-brand-accent animate-spin inline" /></div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-xs text-on-surface-variant/40 text-center py-2">{t('common.noData') || 'No data'}</p>
            ) : (
              filteredUsers.map(u => {
                const selected = form.participant_ids.includes(u.id);
                return (
                  <label key={u.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                    selected ? 'bg-brand-primary/10' : 'hover:bg-surface-light'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleParticipant(u.id)}
                      className="w-4 h-4 rounded accent-[#002819]"
                    />
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                      style={{ backgroundColor: getAvatarColor(u.id) }}>
                      {getInitials(u.name || 'U')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-primary truncate">{u.name || u.email}</p>
                      <p className="text-[11px] text-on-surface-variant/50 truncate">{u.role || ''}</p>
                    </div>
                  </label>
                );
              })
            )}
            {form.participant_ids.length > 0 && (
              <p className="text-[10px] text-on-surface-variant/40 text-center pt-1">
                {form.participant_ids.length} {t('commCenter.selected') || 'selected'}
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant/70 mb-1.5">{t('commCenter.body') || 'Body'}</label>
          <textarea
            value={form.body}
            onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
            placeholder={t('commCenter.typeMessage') || 'Type your message...'}
            rows={4}
            className="w-full bg-surface-light border border-surface-high rounded-xl px-4 py-2.5 text-sm text-on-surface-variant placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent resize-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant/70 mb-1.5">{t('commCenter.attachments') || 'Attachments'}</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.onchange = (e) => {
                  const file = e.target.files[0];
                  if (file) setForm(prev => ({ ...prev, file }));
                };
                input.click();
              }}
              className="px-4 py-2 rounded-xl border border-surface-high text-sm text-on-surface-variant hover:bg-surface-light transition-colors flex items-center gap-2"
            >
              <MaterialSymbol icon="attach_file" size={16} />
              {t('commCenter.selectFile') || 'Select file'}
            </button>
            {form.file && (
              <span className="text-xs text-on-surface-variant/60 flex items-center gap-1">
                <MaterialSymbol icon="insert_drive_file" size={14} className="text-brand-accent" />
                {form.file.name}
                <button onClick={() => setForm(prev => ({ ...prev, file: null }))} className="text-red-400 hover:text-red-600 ml-1">
                  <MaterialSymbol icon="close" size={12} />
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
      <div className={`px-6 py-4 border-t border-surface-high flex gap-3 ${isRtl ? 'flex-row-reverse' : 'justify-end'}`}>
        <button onClick={onCancel} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-light transition-colors">
          {t('common.cancel') || 'Cancel'}
        </button>
        <button
          onClick={onSubmit}
          disabled={!form.body.trim()}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            !form.body.trim()
              ? 'bg-surface-high text-on-surface-variant/30 cursor-not-allowed'
              : 'bg-brand-primary text-white hover:bg-brand-secondary'
          }`}
        >
          {isTicket ? (t('commCenter.createTicket') || 'Create Ticket') : (t('commCenter.createConversation') || 'Create Conversation')}
        </button>
      </div>
    </div>
  );
}
