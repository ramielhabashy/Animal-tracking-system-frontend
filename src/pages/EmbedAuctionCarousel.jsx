import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch, storageUrl } from '../utils/api';
import { useI18n } from '../i18n';

export default function EmbedAuctionCarousel() {
  const [searchParams] = useSearchParams();
  const { t, dir, setLocale } = useI18n();
  const isRtl = dir === 'rtl';
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

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

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 bg-surface-light">
        <div className="animate-spin w-6 h-6 border-3 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-surface-light">
        <p className="text-on-surface-subtle text-sm font-medium">No active auctions</p>
      </div>
    );
  }

  return (
    <div className="relative bg-surface-light py-4 px-2">
      <div className="flex items-center justify-between mb-3 px-2">
        <p className="text-sm font-bold text-brand-primary flex items-center gap-1">
          <MaterialSymbol icon="gavel" size={16} />
          {t('nav.auctions') || 'Auctions'}
        </p>
        <a
          href="/react.oasis/auctions"
          target="_top"
          className="text-[10px] font-medium text-brand-accent hover:underline"
        >
          {t('common.viewAll') || 'View All'}
        </a>
      </div>

      <div className="relative group">
        {auctions.length > 3 && (
          <>
            <button
              onClick={() => scroll('left')}
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 rounded-full shadow-md flex items-center justify-center hover:bg-white transition opacity-0 group-hover:opacity-100 ${isRtl ? 'right-0 left-auto' : ''}`}
            >
              <MaterialSymbol icon={isRtl ? 'chevron_right' : 'chevron_left'} size={20} className="text-brand-primary" />
            </button>
            <button
              onClick={() => scroll('right')}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 rounded-full shadow-md flex items-center justify-center hover:bg-white transition opacity-0 group-hover:opacity-100 ${isRtl ? 'left-0 right-auto' : ''}`}
            >
              <MaterialSymbol icon={isRtl ? 'chevron_left' : 'chevron_right'} size={20} className="text-brand-primary" />
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-1 no-scrollbar"
        >
          {auctions.map(auction => {
            const status = getStatusLabel(auction);
            const imageUrl = auction.animal?.image ? storageUrl(auction.animal.image) : null;
            return (
              <a
                key={auction.id}
                href={`/react.oasis/auctions/${auction.id}`}
                target="_top"
                className="flex-none w-56 bg-white rounded-xl border border-[#eeeee9] overflow-hidden hover:shadow-md hover:border-brand-accent/30 transition-all group/card"
              >
                <div className="h-28 bg-gradient-to-br from-[#f4f4ef] to-[#e8e8e0] relative overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt={auction.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MaterialSymbol icon="pets" size={32} className="text-brand-accent/30" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white flex items-center gap-1 ${status.color} ${status.pulse ? 'animate-pulse' : ''}`}>
                      {status.pulse && <span className="w-1 h-1 bg-white rounded-full" />}
                      {status.text}
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-brand-primary text-xs truncate group-hover/card:text-brand-accent transition-colors">
                    {auction.title || `${auction.animal?.species || 'Animal'} Auction`}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-[9px] text-on-surface-subtle uppercase tracking-wider">{t('common.currentBid') || 'Bid'}</p>
                      <p className="font-bold text-brand-primary text-sm">{formatPrice(auction.current_bid)}</p>
                    </div>
                    {auction.owner && (
                      <p className="text-[10px] text-on-surface-variant truncate max-w-[80px]">{auction.owner.name}</p>
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <div className="text-center mt-3 text-[9px] text-on-surface-subtle">
        {t('embedCodesSection.poweredBy') || 'Powered by'}{' '}
        <a href="/react.oasis/" target="_top" className="text-brand-primary font-semibold hover:underline">
          Oasis Trace
        </a>
      </div>
    </div>
  );
}
