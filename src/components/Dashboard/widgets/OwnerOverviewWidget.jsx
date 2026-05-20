import React from 'react';
import { Link } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';

export default function OwnerOverviewWidget({ dashboardData }) {
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const isRtl = dir === 'rtl';
  const isAdmin = user?.role === 'Admin';
  const { ownerStatsData, ownerStatsLoading } = dashboardData;

  if (!isAdmin || !ownerStatsData) return null;

  return (
    <div>
      <div className="flex justify-between items-center mb-5">
        <Link to="/users" className="text-sm font-bold text-brand-accent hover:underline flex items-center gap-1">
          {t('team.manageTeam')}
          <MaterialSymbol icon="arrow_forward" size={16} />
        </Link>
      </div>

      <div className="card overflow-hidden">
        {ownerStatsLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-high">
                  <th className="text-left py-4 px-5 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('user.name')}</th>
                  <th className="text-center py-4 px-3 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('dashboard.totalAnimals')}</th>
                  <th className="text-center py-4 px-3 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('nav.devices')}</th>
                  <th className="text-center py-4 px-3 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('team.teamMembers')}</th>
                  <th className="text-center py-4 px-3 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('subscription.tier')}</th>
                  <th className="text-center py-4 px-3 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('subscription.status')}</th>
                  <th className="text-center py-4 px-3 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('subscription.expiry')}</th>
                  <th className="text-right py-4 px-5 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {ownerStatsData.data?.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-on-surface-subtle">{t('common.noData')}</td>
                  </tr>
                )}
                {ownerStatsData.data?.map((owner) => {
                  const statusColor = {
                    active: 'bg-emerald-100 text-emerald-800',
                    paused: 'bg-amber-100 text-amber-800',
                    cancelled: 'bg-red-100 text-red-800',
                    pending_payment: 'bg-purple-100 text-purple-800',
                    past_due: 'bg-orange-100 text-orange-800',
                  }[owner.subscription_status] || 'bg-surface-light text-on-surface-subtle';

                  const expiryWarning = owner.subscription_days_remaining !== null && owner.subscription_days_remaining <= 7;
                  const isExpired = owner.subscription_days_remaining === 0 && owner.subscription_status === 'active';

                  return (
                    <tr key={owner.id} className="border-b border-[#F4F4EF] hover:bg-surface-light/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {owner.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-brand-primary">{owner.name}</p>
                            <p className="text-xs text-on-surface-subtle">{owner.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-4 px-3">
                        <span className="font-semibold text-brand-primary">{owner.animals_count}</span>
                      </td>
                      <td className="text-center py-4 px-3">
                        <span className="font-semibold text-brand-primary">{owner.devices_count}</span>
                      </td>
                      <td className="text-center py-4 px-3">
                        <span className="font-semibold text-brand-primary">{owner.team_count}</span>
                      </td>
                      <td className="text-center py-4 px-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-light text-on-surface-variant">{owner.tier_name}</span>
                      </td>
                      <td className="text-center py-4 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColor}`}>
                          {owner.subscription_status || 'none'}
                        </span>
                        {isExpired && (
                          <span className="block text-[10px] text-danger font-semibold mt-0.5">{t('subscription.expired')}</span>
                        )}
                        {expiryWarning && owner.subscription_days_remaining > 0 && (
                          <span className="block text-[10px] text-amber-600 font-semibold mt-0.5">{owner.subscription_days_remaining}d {t('subscription.remaining')}</span>
                        )}
                      </td>
                      <td className="text-center py-4 px-3 text-xs text-on-surface-subtle">
                        {owner.subscription_ends_at ? new Date(owner.subscription_ends_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="text-right py-4 px-5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Link to={`/users/${owner.id}/edit`} className="p-2 rounded-lg hover:bg-surface-light text-on-surface-subtle hover:text-brand-primary transition-colors" title={t('common.edit')}>
                            <MaterialSymbol icon="edit" size={16} />
                          </Link>
                          <Link to={`/animals?owner_id=${owner.id}`} className="p-2 rounded-lg hover:bg-surface-light text-on-surface-subtle hover:text-brand-primary transition-colors" title={t('dashboard.manageAnimals')}>
                            <MaterialSymbol icon="pets" size={16} />
                          </Link>
                          <Link to={`/devices?owner_id=${owner.id}`} className="p-2 rounded-lg hover:bg-surface-light text-on-surface-subtle hover:text-brand-primary transition-colors" title={t('nav.devices')}>
                            <MaterialSymbol icon="sensors" size={16} />
                          </Link>
                          <Link to={`/subscription?user_id=${owner.id}`} className="p-2 rounded-lg hover:bg-surface-light text-on-surface-subtle hover:text-brand-accent transition-colors" title={t('subscription.title')}>
                            <MaterialSymbol icon="stars" size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-surface-light">
                  <td className="py-4 px-5 font-bold text-brand-primary">{t('dashboard.total')}</td>
                  <td className="text-center py-4 px-3 font-bold text-brand-primary">{ownerStatsData.total_animals || 0}</td>
                  <td className="text-center py-4 px-3 font-bold text-brand-primary">{ownerStatsData.total_devices || 0}</td>
                  <td className="text-center py-4 px-3 font-bold text-brand-primary">{ownerStatsData.total_team || 0}</td>
                  <td colSpan="4" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
