import React from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch, storageUrl } from '../utils/api';
import { useI18n } from '../i18n';

export default function EmbedAuctionList() {
  const [searchParams] = useSearchParams();
  const { t, dir, setLocale } = useI18n();
  const isRtl = dir === 'rtl';
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const lang = searchParams.get('lang');
    if (lang && setLocale) setLocale(lang);
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      const res = await apiFetch('/api/embed/auctions');
      if (res.ok) {
        const data = await res.json();
        setAuctions(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch auctions:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (price == null || price === 0) return 'Free';
    return `$${parseFloat(price).toLocaleString()}`;
  };

  const getStatusLabel = (auction) => {
    const status = auction.status;
    if (status === 'live') return { text: 'Live', color: 'bg-red-500', pulse: true };
    if (status === 'active') return { text: 'Active', color: 'bg-green-500', pulse: false };
    if (status === 'ended') return { text: 'Ended', color: 'bg-gray-400', pulse: false };
    if (status === 'sold') return { text: 'Sold', color: 'bg-blue-500', pulse: false };
    return { text: status, color: 'bg-gray-400', pulse: false };
  };

  return (
    <div className="min-h-screen bg-surface-light">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-brand-primary">
              <MaterialSymbol icon="gavel" size={20} className="inline align-text-bottom mr-1" />
              Auctions
            </h1>
            <p className="text-xs text-on-surface-subtle mt-0.5">Live animal marketplace</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-6 h-6 border-3 border-brand-primary border-t-transparent rounded-full" />
          </div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#eeeee9]">
            <MaterialSymbol icon="gavel" size={48} className="text-[#E3E3DE] mx-auto mb-3" />
            <p className="text-on-surface-subtle font-medium">No active auctions</p>
            <p className="text-xs text-on-surface-subtle mt-1">Check back later for new listings</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {auctions.map(auction => {
              const status = getStatusLabel(auction);
              const imageUrl = auction.animal?.image ? storageUrl(auction.animal.image) : null;
              return (
                <a
                  key={auction.id}
                  href={`/react.oasis/auctions/${auction.id}`}
                  target="_top"
                  className="bg-white rounded-2xl border border-[#eeeee9] overflow-hidden hover:shadow-lg hover:border-brand-accent/40 transition-all group block"
                >
                  <div className="h-36 bg-gradient-to-br from-[#f4f4ef] to-[#e8e8e0] relative overflow-hidden">
                    {imageUrl ? (
                      <img src={imageUrl} alt={auction.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MaterialSymbol icon="pets" size={48} className="text-brand-accent/40" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1 ${status.color} ${status.pulse ? 'animate-pulse' : ''}`}>
                        {status.pulse && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        {status.text}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-brand-primary text-sm truncate group-hover:text-brand-accent transition-colors">
                      {auction.title || `${auction.animal?.species || 'Animal'} Auction`}
                    </h3>
                    {auction.animal && (
                      <p className="text-xs text-on-surface-subtle mt-0.5">
                        {auction.animal.animal_id}{auction.animal.breed ? ` · ${auction.animal.breed}` : ''}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#f0f0eb]">
                      <div>
                        <p className="text-[10px] text-on-surface-subtle uppercase tracking-wider">Current Bid</p>
                        <p className="font-bold text-brand-primary">{formatPrice(auction.current_bid)}</p>
                      </div>
                      {auction.owner && (
                        <div className="text-right">
                          <p className="text-[10px] text-on-surface-subtle uppercase tracking-wider">Seller</p>
                          <p className="text-xs font-medium text-on-surface-variant">{auction.owner.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        <div className="text-center mt-6 text-[10px] text-on-surface-subtle">
          {t('embedCodesSection.poweredBy') || 'Powered by'}{' '}
          <a href="/react.oasis/" target="_top" className="text-brand-primary font-semibold hover:underline">
            Oasis Trace
          </a>
        </div>
      </div>
    </div>
  );
}
