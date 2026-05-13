import React from 'react';
import { useI18n } from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';

export default function TierDistributionWidget({ dashboardData }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const { adminSubStats } = dashboardData;

  if (!isAdmin || !adminSubStats?.tier_distribution || adminSubStats.tier_distribution.length === 0) return null;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {adminSubStats.tier_distribution.map((tier) => {
          const total = adminSubStats.active_subscribers || 1;
          const pct = total > 0 ? ((tier.subscriber_count / total) * 100).toFixed(0) : 0;
          return (
            <div key={tier.id} className="card p-5 text-center">
              <p className="text-3xl font-black text-[#002819]">{tier.subscriber_count}</p>
              <p className="text-sm font-semibold text-[#404943] mt-1">{tier.name}</p>
              <div className="mt-3 h-2 bg-[#F4F4EF] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#002819] to-[#D4AF37] rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-[#717973] mt-1">{pct}%</p>
              {tier.price_monthly > 0 && (
                <p className="text-xs text-[#D4AF37] font-semibold mt-1">${tier.price_monthly}/mo</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
