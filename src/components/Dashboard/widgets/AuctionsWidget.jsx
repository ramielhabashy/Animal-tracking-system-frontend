import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';
import { apiFetch } from '../../../utils/api';

export default function AuctionsWidget({ dashboardData }) {
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const isRtl = dir === 'rtl';
  const role = user?.role;
  const isAdmin = role === 'Admin';
  const isOwner = role === 'Owner';
  const isManager = role === 'Manager';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuctionStats();
  }, []);

  const fetchAuctionStats = async () => {
    try {
      let activeRes, myRes, wonRes, bidsRes;
      activeRes = await apiFetch('/api/auctions?status=active&per_page=1');

      if (isAdmin) {
        const [soldRes, cancelledRes] = await Promise.all([
          apiFetch('/api/auctions?status=sold&per_page=1'),
          apiFetch('/api/auctions?status=cancelled&per_page=1'),
        ]);
        const soldData = soldRes.ok ? await soldRes.json() : { data: [], meta: { total: 0 } };
        const cancelledData = cancelledRes.ok ? await cancelledRes.json() : { data: [], meta: { total: 0 } };
        const activeData = activeRes.ok ? await activeRes.json() : { data: [], meta: { total: 0 } };
        setData({
          active: activeData.meta?.total || activeData.total || 0,
          sold: soldData.meta?.total || soldData.total || 0,
          cancelled: cancelledData.meta?.total || cancelledData.total || 0,
        });
      } else {
        [myRes, wonRes, bidsRes] = await Promise.all([
          apiFetch('/api/auctions/my?per_page=1'),
          apiFetch('/api/auctions/won'),
          apiFetch('/api/auctions/my-bids?per_page=1'),
        ]);
        const myData = myRes.ok ? await myRes.json() : { data: [], meta: { total: 0 } };
        const wonData = wonRes.ok ? await wonRes.json() : { data: [] };
        const bidsData = bidsRes.ok ? await bidsRes.json() : { data: [], meta: { total: 0 } };
        const activeData = isAdmin ? null : (activeRes.ok ? await activeRes.json() : { data: [], meta: { total: 0 } });
        setData({
          myAuctions: myData.meta?.total || myData.total || 0,
          won: Array.isArray(wonData.data) ? wonData.data.length : 0,
          myBids: bidsData.meta?.total || bidsData.total || 0,
          active: isAdmin ? 0 : (activeData?.meta?.total || activeData?.total || 0),
        });
      }
    } catch (error) {
      console.error('Failed to fetch auction stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return null;

  const formatCount = (val) => (val || 0).toLocaleString();

  if (isAdmin) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <Link to="/auctions?status=active" className={`p-4 rounded-2xl bg-brand-primary/5 hover:bg-brand-primary/10 transition-colors ${isRtl ? 'text-right' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center mb-3">
            <MaterialSymbol icon="gavel" size={20} className="text-brand-accent" />
          </div>
          <p className="text-2xl font-black text-brand-primary">{formatCount(data.active)}</p>
          <p className="text-xs font-medium text-on-surface-variant mt-1">{t('auctions.activeAuctions')}</p>
        </Link>
        <Link to="/auctions?status=sold" className={`p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 transition-colors ${isRtl ? 'text-right' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center mb-3">
            <MaterialSymbol icon="check_circle" size={20} className="text-white" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{formatCount(data.sold)}</p>
          <p className="text-xs font-medium text-emerald-600 mt-1">{t('auctions.soldAuctions')}</p>
        </Link>
        <Link to="/payments" className={`p-4 rounded-2xl bg-amber-50 hover:bg-amber-100 transition-colors ${isRtl ? 'text-right' : ''}`}>
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center mb-3">
            <MaterialSymbol icon="block" size={20} className="text-white" />
          </div>
          <p className="text-2xl font-black text-amber-700">{formatCount(data.cancelled)}</p>
          <p className="text-xs font-medium text-amber-600 mt-1">{t('auctionsPage.ended')}</p>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      <Link to="/auctions" className={`p-4 rounded-2xl bg-brand-primary/5 hover:bg-brand-primary/10 transition-colors ${isRtl ? 'text-right' : ''}`}>
        <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center mb-3">
          <MaterialSymbol icon="gavel" size={20} className="text-brand-accent" />
        </div>
        <p className="text-2xl font-black text-brand-primary">{formatCount(data.myAuctions)}</p>
        <p className="text-xs font-medium text-on-surface-variant mt-1">{t('auctions.myAuctions')}</p>
      </Link>
      <Link to="/auctions?all" className={`p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors ${isRtl ? 'text-right' : ''}`}>
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-3">
          <MaterialSymbol icon="add" size={20} className="text-white" />
        </div>
        <p className="text-2xl font-black text-blue-700">{formatCount(data.myBids)}</p>
        <p className="text-xs font-medium text-blue-600 mt-1">{t('auctionsPage.bids')}</p>
      </Link>
      <Link to="/my-payments" className={`p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 transition-colors ${isRtl ? 'text-right' : ''}`}>
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center mb-3">
          <MaterialSymbol icon="emoji_events" size={20} className="text-white" />
        </div>
        <p className="text-2xl font-black text-emerald-700">{formatCount(data.won)}</p>
        <p className="text-xs font-medium text-emerald-600 mt-1">{t('auctions.winner')}</p>
      </Link>
    </div>
  );
}
