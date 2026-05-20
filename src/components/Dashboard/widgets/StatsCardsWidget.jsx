import React from 'react';
import { Link } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';

function getSeverityLabel(alerts) {
  if (!alerts || alerts.length === 0) return { label: 'All Clear', cls: 'chip-success' };
  const high = alerts.filter(a => a.severity === 'High').length;
  const medium = alerts.filter(a => a.severity === 'Medium').length;
  if (high > 0) return { label: `${high} High`, cls: 'chip-danger' };
  if (medium > 0) return { label: 'Warning', cls: 'chip-warning' };
  return { label: 'All Clear', cls: 'chip-success' };
}

export default function StatsCardsWidget({ dashboardData }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const isRtl = dashboardData.dir === 'rtl';
  const userRole = user?.role;
  const isAdmin = userRole === 'Admin';
  const isOwner = userRole === 'Owner';
  const isAdminOrOwner = isAdmin || isOwner;

  const { stats, alerts, animals } = dashboardData;
  if (!stats) return null;

  const sev = getSeverityLabel(alerts);

  const temps = (animals || [])
    .map(a => parseFloat(a.baseline_temperature))
    .filter(t => !isNaN(t));
  const avgTemp = temps.length > 0 ? (temps.reduce((s, t) => s + t, 0) / temps.length).toFixed(1) : '--';
  const highTempCount = temps.filter(t => t > 39.5).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      <div className="stat-card group hover:shadow-[0_16px_48px_rgba(6,64,43,0.1)] transition-shadow duration-300">
        <div className="flex justify-between items-start mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <MaterialSymbol icon="pets" size={24} className="text-brand-accent" weight="fill" />
          </div>
          <span className="chip chip-success">{stats.totalAnimals > 0 ? ((stats.activeDevices / stats.totalAnimals) * 100).toFixed(1) + '%' : '0%'}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-on-surface-variant mb-1">{t('dashboard.totalAnimals')}</p>
          <h3 className="text-4xl font-black text-brand-primary">{stats.totalAnimals}</h3>
        </div>
      </div>

      <div className="stat-card group hover:shadow-[0_16px_48px_rgba(6,64,43,0.1)] transition-shadow duration-300">
        <div className="flex justify-between items-start mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <MaterialSymbol icon="sensors" size={24} className="text-brand-accent" weight="fill" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
            <span className="chip chip-success">{t('dashboard.live')}</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-on-surface-variant mb-1">{t('dashboard.activeDevices')}</p>
          <h3 className="text-4xl font-black text-brand-primary">{stats.activeDevices}</h3>
          {stats.realDataEnabled && (
            <div className="flex items-center gap-3 mt-1 text-xs">
              <span className="text-[#10B981] font-semibold">LIVE {stats.healthyCountReal || 0}</span>
              <span className="text-on-surface-subtle">/</span>
              <span className="text-brand-accent font-semibold">SIM {stats.healthyCountSimulated || 0}</span>
            </div>
          )}
        </div>
      </div>

      <div className="stat-card group hover:shadow-[0_16px_48px_rgba(6,64,43,0.1)] transition-shadow duration-300">
        <div className="flex justify-between items-start mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#BA1A1A]/90 to-[#BA1A1A]/70 flex items-center justify-center shadow-lg shadow-[#BA1A1A]/20">
            <MaterialSymbol icon="warning" size={24} className="text-white" weight="fill" />
          </div>
          <span className={`chip ${sev.cls}`}>{sev.label}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-on-surface-variant mb-1">{t('dashboard.alerts')}</p>
          <h3 className="text-4xl font-black text-danger">{stats.alerts}</h3>
        </div>
      </div>

      <div className="stat-card bg-gradient-to-br from-brand-secondary to-brand-primary text-white group hover:shadow-[0_16px_48px_rgba(6,64,43,0.1)] transition-shadow duration-300">
        <div className="flex justify-between items-start mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
            <MaterialSymbol icon="device_thermostat" size={24} className="text-brand-accent" weight="fill" />
          </div>
          {highTempCount > 0 ? (
            <span className="chip chip-danger">{highTempCount} High</span>
          ) : (
            <span className="chip chip-success">Normal</span>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-white/60 mb-1">{t('reportsPage.avgTemp')}</p>
          <h3 className="text-4xl font-black text-brand-accent">{avgTemp}{t('reportsPage.celsius')}</h3>
          <p className="text-xs text-white/60 mt-1">
            {highTempCount > 0 ? `${highTempCount} ${t('reportsPage.animalsAboveThreshold')}` : t('animals.healthy')}
          </p>
        </div>
      </div>

      {userRole !== 'Doctor' && userRole !== 'Shepherd' && (isAdmin && stats.subscription?.is_admin ? (
        <Link to="/users" className="stat-card bg-gradient-to-br from-brand-primary to-brand-secondary text-white group hover:shadow-[0_16px_48px_rgba(6,64,43,0.1)] transition-shadow duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <MaterialSymbol icon="admin_panel_settings" size={24} className="text-brand-accent" weight="fill" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-white/60 mb-1">{t('subscription.title')}</p>
            <div className="space-y-1">
              <p className="text-2xl font-black text-brand-accent">{stats.subscription.active_subscriptions || 0} {t('subscription.active')}</p>
              <p className="text-sm text-white/60">{stats.subscription.pending_payments || 0} {t('payments.pendingPayments')}</p>
            </div>
          </div>
        </Link>
      ) : isAdminOrOwner && stats.subscription ? (
        <Link to="/subscription" className="stat-card bg-gradient-to-br from-brand-primary to-brand-secondary text-white group hover:shadow-[0_16px_48px_rgba(6,64,43,0.1)] transition-shadow duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <MaterialSymbol icon="stars" size={24} className="text-brand-accent" weight="fill" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-white/60 mb-1">{t('subscription.title')}</p>
            <h3 className="text-3xl font-black text-brand-accent">
              {stats.subscription.tier_name || 'Free'}
            </h3>
            {stats.subscription.ends_at && (
              <p className="text-xs text-white/60 mt-1">
                Renews: {new Date(stats.subscription.ends_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </Link>
      ) : isAdminOrOwner && !stats.subscription ? (
        <Link to="/subscription" className="stat-card bg-gradient-to-br from-brand-primary to-brand-secondary text-white group hover:shadow-[0_16px_48px_rgba(6,64,43,0.1)] transition-shadow duration-300">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <MaterialSymbol icon="stars" size={24} className="text-brand-accent" weight="fill" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-white/60 mb-1">{t('subscription.title')}</p>
            <h3 className="text-2xl font-black text-brand-accent">{t('subscription.selectPlan')}</h3>
          </div>
        </Link>
      ) : (
        <div className="stat-card bg-gradient-to-br from-brand-primary to-brand-secondary text-white/80 group">
          <div className="flex justify-between items-start mb-6">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <MaterialSymbol icon="stars" size={24} className="text-brand-accent/60" weight="fill" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-white/60 mb-1">{t('subscription.title')}</p>
            <h3 className="text-2xl font-black text-white/40">{t('subscription.selectPlan')}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}
