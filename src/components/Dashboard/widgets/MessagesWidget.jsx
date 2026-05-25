import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../../../utils/api';
import { useI18n } from '../../../i18n';

export default function MessagesWidget({ dashboardData }) {
  const { t } = useI18n();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await apiFetch('/api/conversations?per_page=5');
      if (res.ok) {
        const d = await res.json();
        setConversations(d.data || []);
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-brand-primary text-lg flex items-center gap-2">
          <MaterialSymbol icon="chat" size={20} className="text-brand-accent" />
          {t('nav.messages')}
        </h3>
        <Link to="/messages" className="text-xs font-bold text-brand-accent hover:underline">
          {t('common.viewAll')}
        </Link>
      </div>
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-surface-light rounded-xl" />)}
        </div>
      ) : conversations.length === 0 ? (
        <p className="text-sm text-on-surface-subtle text-center py-8">{t('common.noMessages') || 'No conversations'}</p>
      ) : (
        <div className="space-y-1">
          {conversations.slice(0, 5).map(conv => (
            <Link key={conv.id} to={`/messages/${conv.id}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-light transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
                <MaterialSymbol icon="person" size={20} className="text-brand-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-brand-primary truncate">{conv.title || conv.subject || 'Conversation'}</p>
                {conv.last_message && (
                  <p className="text-xs text-on-surface-variant truncate">{conv.last_message.body || conv.last_message}</p>
                )}
              </div>
              {conv.unread_count > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center flex-shrink-0">
                  {conv.unread_count}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
