import React, { useState } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../../../i18n';
import { apiFetch } from '../../../utils/api';
import TranslateButton from '../../TranslateButton';

const getSeverityClass = (severity) => {
  switch (severity) {
    case 'High': return 'bg-danger/10 text-danger';
    case 'Medium': return 'bg-brand-accent/15 text-tertiary-container';
    case 'Low': return 'bg-surface-light text-on-surface-variant';
    default: return 'bg-surface-light text-on-surface-subtle';
  }
};

const getSeverityIcon = (alert) => {
  if (alert.type === 'temperature') return 'device_thermostat';
  switch (alert.severity) {
    case 'High': return 'warning';
    case 'Medium': return 'signal_cellular_alt_1_bar';
    default: return 'check_circle';
  }
};

const getSeverityBg = (severity) => {
  switch (severity) {
    case 'High': return 'bg-danger/10';
    case 'Medium': return 'bg-brand-accent/15';
    default: return 'bg-[#10b981]/15';
  }
};

export default function AlertsPanelWidget({ dashboardData }) {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const { alerts, notifications, unreadCount, setUnreadCount, setNotifications } = dashboardData;
  const [rightTab, setRightTab] = useState('alerts');

  return (
    <div>
      <div className="flex gap-1 bg-surface-light rounded-xl p-1 mb-5">
        <button
          onClick={() => setRightTab('alerts')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            rightTab === 'alerts'
              ? 'bg-white text-brand-primary shadow-sm'
              : 'text-on-surface-subtle hover:text-on-surface-variant'
          }`}
        >
          <MaterialSymbol icon="warning" size={16} />
          {t('dashboard.alerts')}
          {alerts && alerts.filter(a => a.severity === 'High').length > 0 && (
            <span className="w-5 h-5 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
              {alerts.filter(a => a.severity === 'High').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setRightTab('notifications')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            rightTab === 'notifications'
              ? 'bg-white text-brand-primary shadow-sm'
              : 'text-on-surface-subtle hover:text-on-surface-variant'
          }`}
        >
          <MaterialSymbol icon="notifications" size={16} />
          {t('common.notifications')}
          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-brand-accent text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {rightTab === 'alerts' && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {(!alerts || alerts.length === 0) ? (
            <div className="text-center py-8 text-on-surface-subtle text-sm">{t('common.noData')}</div>
          ) : (
            alerts.map((alert, index) => (
              <div key={index} className={`p-4 rounded-2xl ${getSeverityClass(alert.severity)}`}>
                <div className={`flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${getSeverityBg(alert.severity)}`}>
                    <MaterialSymbol
                      icon={getSeverityIcon(alert)}
                      size={18}
                      className={alert.severity === 'High' ? 'text-danger' : alert.severity === 'Medium' ? 'text-tertiary-container' : 'text-[#10b981]'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase mb-0.5 opacity-70">{alert.severity}</p>
                    <p className="text-sm font-bold text-brand-primary truncate">{alert.animal}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{alert.message}</p>
                  </div>
                  <span className="text-xs text-on-surface-subtle whitespace-nowrap shrink-0">{alert.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {rightTab === 'notifications' && (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {notifications && notifications.length > 0 && (
            <div className="flex justify-end mb-2">
              <button
                onClick={async () => {
                  await apiFetch('/api/notifications/read-all', { method: 'POST' });
                  if (setUnreadCount) setUnreadCount(0);
                  if (setNotifications) setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
                }}
                className="text-xs font-semibold text-brand-accent hover:underline"
              >
                {t('common.markAllRead')}
              </button>
            </div>
          )}
          {(!notifications || notifications.length === 0) ? (
            <div className="text-center py-8 text-on-surface-subtle text-sm">{t('common.noNotifications')}</div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl cursor-pointer transition-colors ${
                  notif.read_at ? 'bg-surface-light/50' : 'bg-surface-light border border-brand-accent/30'
                }`}
                onClick={async () => {
                  if (!notif.read_at) {
                    await apiFetch(`/api/notifications/${notif.id}/read`, { method: 'PATCH' });
                    if (setNotifications) setNotifications(prev => prev.map(n =>
                      n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n
                    ));
                    if (setUnreadCount) setUnreadCount(prev => Math.max(0, prev - 1));
                  }
                }}
              >
                <div className={`flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    notif.type === 'subscription_expiring' ? 'bg-amber-100' : notif.type === 'task_assigned' || notif.type === 'task_completed' ? 'bg-blue-100' : notif.type === 'invitation_accepted' ? 'bg-purple-100' : notif.type === 'auction_new' ? 'bg-amber-100' : notif.type === 'auction_won' ? 'bg-yellow-100' : notif.type === 'auction_payment_verified' ? 'bg-emerald-100' : notif.type === 'auction_payment_rejected' || notif.type === 'auction_cancelled' || notif.type === 'bidder_disqualified' ? 'bg-red-100' : notif.type === 'auction_bid' || notif.type === 'payment_proof_submitted' ? 'bg-blue-100' : notif.type === 'auction_outbid' ? 'bg-red-100' : notif.type === 'auction_ended' ? 'bg-gray-100' : 'bg-blue-100'
                  }`}>
                    <MaterialSymbol
                      icon={notif.type === 'subscription_expiring' ? 'hourglass' : notif.type === 'task_assigned' ? 'assignment' : notif.type === 'task_completed' ? 'task_alt' : notif.type === 'invitation_accepted' ? 'person_add' : notif.type === 'auction_new' ? 'gavel' : notif.type === 'auction_bid' ? 'add' : notif.type === 'auction_outbid' ? 'trending_down' : notif.type === 'auction_won' ? 'emoji_events' : notif.type === 'auction_ended' ? 'timer_off' : notif.type === 'auction_cancelled' ? 'block' : notif.type === 'auction_payment_verified' ? 'verified' : notif.type === 'auction_payment_rejected' ? 'block' : notif.type === 'bidder_disqualified' ? 'person_remove' : notif.type === 'payment_proof_submitted' ? 'upload' : 'circle_notifications'}
                      size={18}
                      className={notif.type === 'subscription_expiring' ? 'text-amber-700' : notif.type === 'invitation_accepted' ? 'text-purple-700' : notif.type === 'auction_new' ? 'text-amber-700' : notif.type === 'auction_won' ? 'text-yellow-700' : notif.type === 'auction_payment_verified' ? 'text-emerald-700' : notif.type === 'auction_payment_rejected' || notif.type === 'auction_cancelled' || notif.type === 'bidder_disqualified' || notif.type === 'auction_outbid' ? 'text-red-700' : notif.type === 'auction_bid' || notif.type === 'payment_proof_submitted' ? 'text-blue-700' : notif.type === 'auction_ended' ? 'text-gray-600' : 'text-blue-700'}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-brand-primary">{notif.title} <TranslateButton text={notif.title} /></p>
                      {!notif.read_at && <span className="w-2 h-2 rounded-full bg-brand-accent shrink-0" />}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">{notif.body} <TranslateButton text={notif.body} /></p>
                    <p className="text-[10px] text-on-surface-subtle mt-1">
                      {new Date(notif.created_at).toLocaleDateString()} {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
