import React from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';

export default function SubscriptionOverviewWidget({ dashboardData }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const { adminSubStats } = dashboardData;

  if (!isAdmin || !adminSubStats) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="stat-card bg-gradient-to-br from-[#002819] to-[#06402B] text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <MaterialSymbol icon="groups" size={20} className="text-[#D4AF37]" />
          </div>
        </div>
        <p className="text-sm text-white/60">{t('dashboard.totalOwners')}</p>
        <p className="text-3xl font-black text-white">{dashboardData.ownerStatsData?.total_owners || 0}</p>
      </div>
      <div className="stat-card bg-gradient-to-br from-[#06402B] to-[#002819] text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <MaterialSymbol icon="verified" size={20} className="text-emerald-400" />
          </div>
        </div>
        <p className="text-sm text-white/60">{t('subscription.active')}</p>
        <p className="text-3xl font-black text-emerald-400">{adminSubStats.active_subscribers || 0}</p>
      </div>
      <div className="stat-card bg-gradient-to-br from-[#735C00] to-[#D4AF37] text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <MaterialSymbol icon="payments" size={20} className="text-white" />
          </div>
        </div>
        <p className="text-sm text-white/60">MRR</p>
        <p className="text-3xl font-black text-white">${adminSubStats.mrr?.toLocaleString() || '0'}</p>
      </div>
      <div className="stat-card bg-gradient-to-br from-[#BA1A1A]/90 to-[#BA1A1A]/70 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
            <MaterialSymbol icon="hourglass" size={20} className="text-white" />
          </div>
        </div>
        <p className="text-sm text-white/60">{t('payments.pendingPayments')}</p>
        <p className="text-3xl font-black text-white">{adminSubStats.pending_payments || 0}</p>
      </div>
      <div className="stat-card bg-white border border-[#E3E3DE]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#F4F4EF] flex items-center justify-center">
            <MaterialSymbol icon="trending_up" size={20} className="text-[#002819]" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-[#717973]">{t('subscription.newThisMonth')}</p>
            <p className="text-xl font-black text-[#10b981]">+{adminSubStats.new_this_month || 0}</p>
          </div>
          <div className="w-px h-8 bg-[#E3E3DE]" />
          <div>
            <p className="text-xs text-[#717973]">{t('subscription.churnedThisMonth')}</p>
            <p className="text-xl font-black text-[#BA1A1A]">{adminSubStats.churned_this_month || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
