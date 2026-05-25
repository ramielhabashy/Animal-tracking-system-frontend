import React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

const PROVIDER_LABELS = {
  disabled: 'Disabled',
  groq: 'Groq',
  gemini: 'Google Gemini',
  openai: 'OpenAI',
};

const PAGE_NAMES = {
  '/dashboard': 'Dashboard',
  '/animals': 'Animals List',
  '/devices': 'Devices List',
  '/map': 'Live Map',
  '/auctions': 'Auctions',
  '/tasks': 'Tasks',
  '/reports': 'Reports',
  '/transfers': 'Transfers',
  '/alerts': 'Alerts',
  '/medical-records': 'Medical Records',
  '/vaccination-schedule': 'Vaccination Schedule',
  '/geofences': 'Geofences',
  '/messages': 'Messages',
  '/settings': 'Settings',
  '/profile': 'Profile',
  '/subscription': 'Subscription',
  '/users': 'Users',
  '/team': 'Team',
  '/payments': 'Payments',
};

export default function AIAssistant() {
  const { t, dir, locale } = useI18n();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isRtl = dir === 'rtl';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [savedConversations, setSavedConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickActions, setQuickActions] = useState([]);
  const [isAvailable, setIsAvailable] = useState(null);
  const [provider, setProvider] = useState('');
  const [loadingStart, setLoadingStart] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const loadingTimerRef = useRef(null);

  const currentPageName = Object.entries(PAGE_NAMES)
    .find(([path]) => location.pathname.startsWith(path))?.[1] ?? null;

  useEffect(() => {
    if (isOpen) {
      checkAvailability();
      fetchQuickActions();
      loadConversations();
    }
  }, [isOpen, locale]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handler = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-ai-assistant', handler);
    return () => window.removeEventListener('toggle-ai-assistant', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.message) {
        setIsOpen(true);
        setTimeout(() => sendMessage(e.detail.message), 300);
      }
    };
    window.addEventListener('ai-send-message', handler);
    return () => window.removeEventListener('ai-send-message', handler);
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isLoading) {
      setLoadingStart(Date.now());
      setLoadingText(t('ai.thinking', 'Thinking...'));
      loadingTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - loadingStart;
        if (elapsed > 5000) setLoadingText(t('ai.stillWorking', 'Still working on it...'));
        else if (elapsed > 2000) setLoadingText(t('ai.processing', 'Processing your request...'));
      }, 1000);
    } else {
      clearInterval(loadingTimerRef.current);
      setLoadingText('');
    }
    return () => clearInterval(loadingTimerRef.current);
  }, [isLoading]);

  const checkAvailability = async () => {
    try {
      const res = await apiFetch('/api/ai/status');
      if (res?.ok) {
        const data = await res.json();
        setIsAvailable(data.available !== false);
        setProvider(data.provider || '');
      } else {
        setIsAvailable(false);
      }
    } catch {
      setIsAvailable(false);
    }
  };

  const fetchQuickActions = async () => {
    try {
      const res = await apiFetch(`/api/ai/quick-actions?lang=${locale}`);
      if (res?.ok) {
        const data = await res.json();
        setQuickActions(data.data || []);
      }
    } catch {}
  };

  const loadConversations = async () => {
    try {
      const res = await apiFetch('/api/ai/conversations');
      if (res?.ok) {
        const data = await res.json();
        setSavedConversations(data.data || []);
      }
    } catch {}
  };

  const loadConversation = async (id) => {
    try {
      const res = await apiFetch(`/api/ai/conversations/${id}`);
      if (res?.ok) {
        const data = await res.json();
        setMessages(data.data?.messages || []);
        setConversationId(id);
        setShowHistory(false);
      }
    } catch {}
  };

  const deleteConversation = async (id) => {
    try {
      await apiFetch(`/api/ai/conversations/${id}`, { method: 'DELETE' });
      setSavedConversations(prev => prev.filter(c => c.id !== id));
      if (conversationId === id) {
        setConversationId(null);
        setMessages([]);
      }
    } catch {}
  };

  const saveCurrentConversation = async () => {
    if (messages.length === 0) return;
    try {
      const body = {
        messages,
        page: location.pathname,
        pageName: currentPageName,
      };
      if (conversationId) {
        await apiFetch(`/api/ai/conversations/${conversationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        const res = await apiFetch('/api/ai/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res?.ok) {
          const data = await res.json();
          setConversationId(data.data?.id);
        }
      }
      loadConversations();
    } catch {}
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const handleDownload = async (format) => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    if (!lastAssistant) return;

    try {
      const res = await apiFetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: lastAssistant.content, format }),
      });
      if (res?.ok) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, '_blank');
        }
      }
    } catch {}
  };

  const sendMessage = async (messageText = input) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = { role: 'user', content: messageText, ts: Date.now() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setSuggestions([]);

    const conversationForApi = messages.map(m => ({
      role: m.role === 'error' ? 'user' : m.role,
      content: m.content,
    }));

    try {
      const res = await apiFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversation: conversationForApi,
          page: location.pathname,
          pageName: currentPageName,
          language: locale,
        }),
      });

      if (!res.ok) {
        let errorMsg = 'AI chat failed';
        try {
          const err = await res.json();
          errorMsg = err.message || err.error || errorMsg;
        } catch {
          errorMsg = res.status === 429 ? 'Too many requests. Please wait a moment.' : `Request failed (${res.status})`;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      const assistantMsg = { role: 'assistant', content: data.reply || 'No response generated.', ts: Date.now() };
      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);

      generateSuggestions(data.reply);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'error', content: error.message, ts: Date.now() }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const generateSuggestions = (reply) => {
    const lower = (reply || '').toLowerCase();
    const suggested = [];
    if (lower.includes('animal') || lower.includes('health') || lower.includes('vaccin')) {
      suggested.push({ label: 'Check vaccination schedule', prompt: 'Show me the vaccination schedule' });
    }
    if (lower.includes('battery') || lower.includes('device') || lower.includes('offline')) {
      suggested.push({ label: 'View device status', prompt: 'Show device status overview' });
    }
    if (lower.includes('task') || lower.includes('pending')) {
      suggested.push({ label: 'My pending tasks', prompt: 'What are my pending tasks?' });
    }
    if (lower.includes('alert') || lower.includes('geofence')) {
      suggested.push({ label: 'Active alerts', prompt: 'Show active alerts' });
    }
    if (lower.includes('report') || lower.includes('summary')) {
      suggested.push({ label: 'Download as PDF', prompt: null });
    }
    setSuggestions(suggested.slice(0, 3));
  };

  const retryLast = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      setMessages(prev => prev.filter(m => m.role !== 'error'));
      sendMessage(lastUserMsg.content);
    }
  };

  const clearChat = () => {
    if (messages.length > 0 && !window.confirm(t('ai.clearConfirm', 'Clear conversation?'))) return;
    setMessages([]);
    setConversationId(null);
    setSuggestions([]);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const markdownComponents = {
    a: ({ href, children }) => {
      if (href?.startsWith('/')) {
        return (
          <a
            href={href}
            onClick={(e) => { e.preventDefault(); navigate(href); setIsOpen(false); }}
            className="text-accent underline cursor-pointer"
          >
            {children}
          </a>
        );
      }
      return <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline">{children}</a>;
    },
    table: ({ children }) => (
      <div className="overflow-x-auto my-2">
        <table className="min-w-full text-xs border-collapse border border-outline">{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="border border-outline bg-brand-primary text-white px-2 py-1">{children}</th>,
    td: ({ children }) => <td className="border border-outline px-2 py-1">{children}</td>,
  };

  if (isAvailable === false) {
    return (
      <div className="group relative">
        <button
          disabled
          className={`fixed bottom-10 ${isRtl ? 'left-6' : 'right-6'} z-50 w-16 h-16 bg-on-surface-subtle rounded-full shadow-lg flex items-center justify-center cursor-not-allowed`}
          title="AI Assistant not configured — contact admin"
        >
          <MaterialSymbol icon="smart_toy" size={28} className="text-white/50" weight="fill" />
        </button>
        <div className={`fixed bottom-28 ${isRtl ? 'left-6' : 'right-6'} z-50 hidden group-hover:block bg-brand-primary text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg`}>
          AI Assistant not configured — contact admin
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-10 ${isRtl ? 'left-6' : 'right-6'} z-50 w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full shadow-2xl shadow-brand-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all group`}
      >
        {isOpen ? (
          <MaterialSymbol icon="close" size={28} className="text-white" />
        ) : (
          <MaterialSymbol icon="smart_toy" size={28} className="text-brand-accent" weight="fill" />
        )}
      </button>

      {isOpen && (
        <div className={`fixed bottom-28 ${isRtl ? 'left-6' : 'right-6'} z-50 w-[420px] max-w-[calc(100vw-3rem)] bg-surface rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[680px]`}>
          <div className="bg-gradient-to-r from-brand-primary to-brand-secondary p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-accent/20 rounded-xl flex items-center justify-center">
                <MaterialSymbol icon="smart_toy" size={24} className="text-brand-accent" weight="fill" />
              </div>
              <div>
                <h3 className="text-white font-bold">{t('ai.title', 'AI Assistant')}</h3>
                <p className="text-white/60 text-xs">
                  {provider ? `${t('ai.poweredBy', 'Powered by')} ${PROVIDER_LABELS[provider] || provider}` : (user?.name || '')}
                  {currentPageName && ` \u2022 ${currentPageName}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:bg-white/10 rounded-lg transition" title={t('ai.history', 'History')}>
                <MaterialSymbol icon="history" size={20} className="text-white/70" />
              </button>
              <button onClick={saveCurrentConversation} className="p-2 hover:bg-white/10 rounded-lg transition" title={t('ai.save', 'Save')}>
                <MaterialSymbol icon="save" size={20} className="text-white/70" />
              </button>
              <button onClick={clearChat} className="p-2 hover:bg-white/10 rounded-lg transition" title={t('ai.clear', 'Clear conversation')}>
                <MaterialSymbol icon="delete" size={20} className="text-white/70" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition" title={t('common.close', 'Close')}>
                <MaterialSymbol icon="close" size={20} className="text-white/70" />
              </button>
            </div>
          </div>

          {showHistory && (
            <div className="bg-white border-b border-outline max-h-40 overflow-y-auto">
              <div className="p-3">
                <h4 className="text-xs font-semibold text-on-surface-subtle mb-2">{t('ai.savedConversations', 'Saved Conversations')}</h4>
                {savedConversations.length === 0 && (
                  <p className="text-xs text-on-surface-subtle">{t('ai.noSavedConversations', 'No saved conversations')}</p>
                )}
                {savedConversations.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-surface-dim rounded-lg cursor-pointer group">
                    <button onClick={() => loadConversation(c.id)} className="text-xs text-brand-primary text-left flex-1 truncate">
                      {c.title || 'Conversation'}
                    </button>
                    <button onClick={() => deleteConversation(c.id)} className="opacity-0 group-hover:opacity-100 p-1">
                      <MaterialSymbol icon="close" size={14} className="text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface">
            {messages.length === 0 && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-secondary flex-shrink-0 flex items-center justify-center text-white shadow-md">
                  <MaterialSymbol icon="smart_toy" size={20} weight="fill" />
                </div>
                <div className="bg-surface-dim rounded-2xl rounded-tl-sm p-4 max-w-[80%]">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{t('ai.howCanHelp', 'How can I help you manage your herd today?')}</p>
                  {currentPageName && (
                    <p className="text-xs text-on-surface-subtle mt-2 italic">
                      {t('ai.viewingPage', 'You are viewing')}: <strong>{currentPageName}</strong>
                    </p>
                  )}
                  {quickActions.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {quickActions.slice(0, 8).map((action) => (
                        <button
                          key={action.id}
                          onClick={() => sendMessage(action.prompt)}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-surface-dim border border-outline/20 rounded-xl text-xs font-semibold text-brand-primary hover:bg-surface-dim transition-all min-h-[36px]"
                        >
                          <span className="material-symbols-rounded text-sm">{action.icon}</span>
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === 'error' ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 max-w-[90%]">
                      <div className="flex items-start gap-2">
                        <MaterialSymbol icon="error" size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-red-700 whitespace-pre-wrap">{msg.content}</p>
                          <button onClick={retryLast} className="mt-2 text-xs font-semibold text-red-600 hover:text-red-800 underline">
                            {t('ai.retry', 'Retry')}
                          </button>
                        </div>
                      </div>
                    </div>
                    {msg.ts && <span className="text-[10px] text-on-surface-subtle">{formatTime(msg.ts)}</span>}
                  </div>
                ) : (
                  <div className={`flex ${msg.role === 'user' ? (isRtl ? 'justify-start' : 'justify-end') : (isRtl ? 'justify-end' : 'justify-start')}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-10 h-10 rounded-full bg-brand-secondary flex-shrink-0 flex items-center justify-center text-white shadow-md me-2">
                        <MaterialSymbol icon="smart_toy" size={20} weight="fill" />
                      </div>
                    )}
                    {msg.role === 'assistant' && (
                      <div className={`bg-surface-dim text-on-surface rounded-2xl p-4 max-w-[80%] relative group ${isRtl ? 'rounded-se-sm' : 'rounded-ss-sm'}`}>
                        <div className="text-sm leading-relaxed prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                          <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          {msg.ts && <span className="text-[10px] text-on-surface-subtle">{formatTime(msg.ts)}</span>}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => copyToClipboard(msg.content)} className="p-1 hover:bg-surface-dim rounded" title={t('ai.copy', 'Copy')}>
                              <MaterialSymbol icon="content_copy" size={14} className="text-on-surface-subtle" />
                            </button>
                            {i === messages.length - 1 && (
                              <>
                                <button onClick={() => handleDownload('pdf')} className="p-1 hover:bg-surface-dim rounded" title={t('ai.downloadPdf', 'Download PDF')}>
                                  <MaterialSymbol icon="picture_as_pdf" size={14} className="text-on-surface-subtle" />
                                </button>
                                <button onClick={() => handleDownload('csv')} className="p-1 hover:bg-surface-dim rounded" title={t('ai.downloadCsv', 'Download CSV')}>
                                  <MaterialSymbol icon="table_chart" size={14} className="text-on-surface-subtle" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {msg.role === 'user' && (
                      <>
                        <div className={`bg-brand-primary text-white rounded-2xl p-4 max-w-[80%] ${isRtl ? 'rounded-ss-sm' : 'rounded-se-sm'}`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          {msg.ts && <p className="text-[10px] text-white/50 mt-1">{formatTime(msg.ts)}</p>}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-surface-dim flex-shrink-0 flex items-center justify-center text-[#0c1f16] shadow-md ms-2 overflow-hidden">
                          <span className="text-sm font-bold">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {msg.role === 'assistant' && suggestions.length > 0 && i === messages.length - 1 && (
                  <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                    {suggestions.map((s, si) => (
                      s.prompt ? (
                        <button
                          key={si}
                          onClick={() => sendMessage(s.prompt)}
                          className="whitespace-nowrap px-3 py-1.5 bg-white border border-outline text-brand-primary rounded-full text-xs hover:bg-brand-primary hover:text-white transition-all"
                        >
                          {s.label}
                        </button>
                      ) : (
                        <button
                          key={si}
                          onClick={() => handleDownload('pdf')}
                          className="whitespace-nowrap px-3 py-1.5 bg-white border border-brand-accent text-brand-accent rounded-full text-xs hover:bg-brand-accent hover:text-white transition-all"
                        >
                          <MaterialSymbol icon="picture_as_pdf" size={12} className="inline me-1" />
                          {s.label}
                        </button>
                      )
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className={`flex ${isRtl ? 'justify-end' : 'justify-start'}`}>
                <div className="w-10 h-10 rounded-full bg-brand-secondary flex-shrink-0 flex items-center justify-center text-white shadow-md me-2">
                  <MaterialSymbol icon="smart_toy" size={20} weight="fill" />
                </div>
                <div className={`bg-surface-dim rounded-2xl p-4 ${isRtl ? 'rounded-se-sm' : 'rounded-ss-sm'}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-brand-accent rounded-full animate-bounce delay-0" />
                      <div className="w-2 h-2 bg-brand-accent rounded-full animate-bounce delay-150" />
                      <div className="w-2 h-2 bg-brand-accent rounded-full animate-bounce delay-300" />
                    </div>
                    <span className="text-xs text-on-surface-subtle">{loadingText}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-surface/80 backdrop-blur-xl border-t border-outline">
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('ai.typeMessage', 'Ask your assistant...')}
                  disabled={isLoading}
                  maxLength={2000}
                  className="w-full px-4 py-3 bg-surface-dim text-on-surface border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#002819]/20 disabled:opacity-50 pr-16"
                />
                <span className="absolute right-3 bottom-3 text-[10px] text-on-surface-subtle pointer-events-none">
                  {input.length}/2000
                </span>
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-12 w-12 bg-brand-primary text-white rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(0,40,25,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <MaterialSymbol icon="send" size={20} />
                )}
              </button>
            </form>
          </div>
        </div>
      )}


    </>
  );
}
