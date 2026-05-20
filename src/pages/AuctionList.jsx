import React from 'react';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch, storageUrl } from '../utils/api';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import TranslateButton from '../components/TranslateButton';

function getComputedStatus(auction) {
  if (auction.status === 'sold') return 'sold';
  if (auction.status === 'cancelled') return 'cancelled';
  if (auction.status === 'ended') return 'ended';
  if (auction.status === 'active' && auction.ends_at) {
    const end = new Date(auction.ends_at);
    const now = new Date();
    if (end - now <= 0) return 'ended';
  }
  return auction.status;
}

export default function AuctionList() {
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const isRtl = dir === 'rtl';
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState([]);
  const [myAuctions, setMyAuctions] = useState([]);
  const [enrolledAuctions, setEnrolledAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const isAdmin = user?.role === 'Admin';
  const [viewMode, setViewMode] = useState('tiles');
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState(null);
  const [pendingAuctions, setPendingAuctions] = useState([]);
  const [paymentAuctions, setPaymentAuctions] = useState([]);
  const [rejectAuctionId, setRejectAuctionId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchAuctions();
  }, [filter]);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      let url;
      if (filter === 'all') {
        url = '/api/auctions?view=all';
      } else if (filter === 'mine') {
        url = '/api/auctions/my';
      } else if (filter === 'pending') {
        url = '/api/admin/auctions/pending-approval';
      } else if (filter === 'payments') {
        url = '/api/admin/auctions/payments';
      } else {
        url = `/api/auctions?status=${filter}`;
      }
      const response = await apiFetch(url);
      if (response.ok) {
        const data = await response.json();
        if (filter === 'all' && data.my_auctions) {
          setMyAuctions(data.my_auctions || []);
          setEnrolledAuctions(data.enrolled_auctions || []);
          setAuctions([]);
          setPendingAuctions([]);
          setPaymentAuctions([]);
        } else if (filter === 'pending') {
          setPendingAuctions(data.data || []);
          setAuctions([]);
          setMyAuctions([]);
          setEnrolledAuctions([]);
          setPaymentAuctions([]);
        } else if (filter === 'payments') {
          setPaymentAuctions(data.data || []);
          setAuctions([]);
          setMyAuctions([]);
          setEnrolledAuctions([]);
          setPendingAuctions([]);
        } else if (filter === 'mine') {
          setAuctions(data.data || []);
          setMyAuctions([]);
          setEnrolledAuctions([]);
          setPendingAuctions([]);
          setPaymentAuctions([]);
        } else {
          setAuctions(data.data || []);
          setMyAuctions([]);
          setEnrolledAuctions([]);
          setPendingAuctions([]);
          setPaymentAuctions([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  const openBidModal = (auction) => {
    setSelectedAuction(auction);
    setBidAmount(Math.ceil(auction.current_price) + 1);
    setMessage(null);
    setShowBidModal(true);
  };

  const placeBid = async () => {
    if (!bidAmount || !selectedAuction) return;
    
    setPlacing(true);
    setMessage(null);
    
    try {
      const response = await apiFetch(`/api/auctions/${selectedAuction.id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(bidAmount) }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({ type: 'success', text: t('auctionsPage.bidSuccess') });
        setTimeout(() => {
          setShowBidModal(false);
          fetchAuctions();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: data.message || t('auctionsPage.bidFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('auctionsPage.bidFailed') });
    } finally {
      setPlacing(false);
    }
  };

  const approveAuction = async (auctionId) => {
    try {
      const response = await apiFetch(`/api/admin/auctions/${auctionId}/approve`, {
        method: 'POST',
      });
      if (response.ok) {
        setMessage({ type: 'success', text: t('auctionsPage.approved') });
        fetchAuctions();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || t('auctionsPage.failedApprove') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('auctionsPage.failedApprove') });
    }
  };

  const rejectAuction = async () => {
    try {
      const response = await apiFetch(`/api/admin/auctions/${rejectAuctionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: rejectNotes }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: t('auctionsPage.rejected') });
        setShowRejectModal(false);
        setRejectNotes('');
        setRejectAuctionId(null);
        fetchAuctions();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || t('auctionsPage.failedReject') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('auctionsPage.failedReject') });
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getTimeRemaining = (auction) => {
    if (!auction.ends_at) return t('auctionsPage.noLimit');
    const end = new Date(auction.ends_at);
    const now = new Date();
    const diff = end - now;
    
    if (diff <= 0) return t('auctionsPage.ended');
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const filteredAuctions = React.useMemo(() => {
    if (filter === 'all') return [];
    if (filter === 'mine') return auctions;
    return auctions.filter(a => getComputedStatus(a) === filter);
  }, [auctions, filter]);

  const searchedAuctions = React.useMemo(() => {
    if (!debouncedSearch) return filteredAuctions;
    const q = debouncedSearch.toLowerCase();
    return filteredAuctions.filter(a =>
      a.title?.toLowerCase().includes(q) ||
      a.animal?.animal_id?.toLowerCase().includes(q) ||
      a.animal?.species?.toLowerCase().includes(q) ||
      a.animal?.breed?.toLowerCase().includes(q) ||
      a.owner?.name?.toLowerCase().includes(q)
    );
  }, [filteredAuctions, debouncedSearch]);

  const displayAuctions = filter === 'mine' ? searchedAuctions : searchedAuctions;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex text-xs text-[#4f6357] mb-2 uppercase tracking-widest font-bold">
            <span>{t('auctionsPage.marketplace')}</span>
            <span className="mx-2">/</span>
            <span className="text-brand-primary">{t('auctionsPage.camelAuctions')}</span>
          </nav>
          <h2 className="text-4xl font-['Manrope'] font-extrabold text-brand-primary tracking-tight">
            {filter === 'all' ? t('auctions.allAuctions') : filter === 'active' ? t('auctionsPage.liveAuctions') : filter === 'mine' ? t('auctions.myAuctions') : filter === 'sold' ? t('auctionsPage.sold') : t('auctionsPage.ended')}
          </h2>
          <p className="text-on-surface-variant mt-1">{filteredAuctions.length} {filter === 'active' ? t('auctionsPage.live') : ''} {t('auctionsPage.auctions')}</p>
        </div>
        <Link
          to="/auctions/new"
          className={`px-6 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}
        >
          <MaterialSymbol icon="add" size={20} />
          {t('auctionsPage.startAuction')}
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        {['active', 'mine', 'ended', 'sold', 'all', ...(isAdmin ? ['pending', 'payments'] : [])].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              filter === status
                ? 'bg-brand-primary text-white'
                : 'bg-white text-on-surface-variant hover:bg-surface-dim border border-outline/30'
            }`}
          >
            {status === 'mine' ? t('auctions.myAuctions') : status === 'pending' ? t('auctionsPage.pendingApproval') : status === 'payments' ? t('auctionsPage.payments') : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className={`flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${isRtl ? 'sm:flex-row-reverse' : ''}`}>
        <div className="relative flex-1 w-full sm:max-w-md">
          <MaterialSymbol icon="search" size={18} className={`absolute top-1/2 -translate-y-1/2 text-on-surface-subtle ${isRtl ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search')}
            className={`w-full py-2.5 bg-surface-light rounded-xl border-none text-sm ${isRtl ? 'pr-10 pl-3 text-right' : 'pl-10 pr-3 text-left'} placeholder:text-on-surface-subtle/60 focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 transition-all`}
          />
        </div>
        <div className="flex items-center gap-2 bg-surface-light rounded-xl p-1">
          <button
            onClick={() => setViewMode('tiles')}
            className={`p-2 rounded-lg text-sm transition-all ${viewMode === 'tiles' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
            title={t('common.grid')}
          >
            <MaterialSymbol icon="grid_view" size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg text-sm transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
            title={t('common.list')}
          >
            <MaterialSymbol icon="table_rows" size={18} />
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-[#cfe5d6] text-brand-primary' : 'bg-[#ffdad6] text-[#93000a]'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-10">
          {filter === 'all' && myAuctions.length === 0 && enrolledAuctions.length === 0 && (
            <div className="text-center py-16 bg-white rounded-[2rem] shadow-sm">
              <MaterialSymbol icon="gavel" size={64} className="mx-auto text-outline mb-4" />
              <p className="text-on-surface-variant text-lg font-semibold">{t('auctionsPage.noActive')}</p>
              <p className="text-on-surface-subtle text-sm mt-2">{t('auctionsPage.startNew')}</p>
            </div>
          )}
          {filter === 'all' && myAuctions.length > 0 && (
            <div>
              <h3 className={`text-xl font-bold text-brand-primary mb-4 flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <MaterialSymbol icon="person" size={24} className="text-brand-accent" />
                {t('auctions.myAuctions')} ({myAuctions.length})
              </h3>
              <div className={viewMode === 'list' ? 'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'}>
                {viewMode === 'list' ? (
                  <AuctionTableView auctions={myAuctions} navigate={navigate} formatPrice={formatPrice} getTimeRemaining={getTimeRemaining} isRtl={isRtl} />
                ) : (
                  myAuctions.map((auction) => (
                    <AuctionCard key={auction.id} auction={auction} onBid={openBidModal} navigate={navigate} isRtl={isRtl} />
                  ))
                )}
              </div>
            </div>
          )}
          
          {filter === 'all' && enrolledAuctions.length > 0 && (
            <div>
              <h3 className={`text-xl font-bold text-brand-primary mb-4 flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <MaterialSymbol icon="how_to_reg" size={24} className="text-brand-secondary" />
                {t('auctionsPage.biddingOn')} ({enrolledAuctions.length})
              </h3>
              <div className={viewMode === 'list' ? 'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'}>
                {viewMode === 'list' ? (
                  <AuctionTableView auctions={enrolledAuctions} navigate={navigate} formatPrice={formatPrice} getTimeRemaining={getTimeRemaining} isRtl={isRtl} />
                ) : (
                  enrolledAuctions.map((auction) => (
                    <AuctionCard key={auction.id} auction={auction} onBid={openBidModal} navigate={navigate} isRtl={isRtl} />
                  ))
                )}
              </div>
            </div>
          )}
          
          {filter === 'pending' && pendingAuctions.length === 0 && (
            <div className="text-center py-16 bg-white rounded-[2rem] shadow-sm">
              <MaterialSymbol icon="check_circle" size={64} className="mx-auto text-outline mb-4" />
              <p className="text-on-surface-variant text-lg font-semibold">{t('auctionsPage.noPending')}</p>
            </div>
          )}
          
          {filter === 'pending' && pendingAuctions.length > 0 && (
            <div className="space-y-4">
              {pendingAuctions.map((auction) => (
                <div key={auction.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center">
                      <MaterialSymbol icon="hourglass" size={28} className="text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-brand-primary">{auction.title}</h4>
                      <p className="text-sm text-on-surface-subtle">
                        {auction.animal?.animal_id} &middot; {formatPrice(auction.starting_price)} start
                        {auction.owner && <> &middot; by {auction.owner.name}</>}
                      </p>
                      <p className="text-xs text-amber-600 font-medium">{t('auctionsPage.awaitingApproval')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => approveAuction(auction.id)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors"
                    >
                      {t('auctionsPage.approve')}
                    </button>
                    <button
                      onClick={() => { setRejectAuctionId(auction.id); setShowRejectModal(true); }}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
                    >
                      {t('auctionsPage.reject')}
                    </button>
                    <button
                      onClick={() => navigate(`/auctions/${auction.id}`)}
                      className="p-2 hover:bg-surface-dim rounded-lg transition-colors"
                    >
                      <MaterialSymbol icon="open_in_new" size={18} className="text-on-surface-subtle" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filter === 'payments' && paymentAuctions.length === 0 && (
            <div className="text-center py-16 bg-white rounded-[2rem] shadow-sm">
              <MaterialSymbol icon="payments" size={64} className="mx-auto text-outline mb-4" />
              <p className="text-on-surface-variant text-lg font-semibold">{t('auctionsPage.noPayments')}</p>
            </div>
          )}

          {filter === 'payments' && paymentAuctions.length > 0 && (
            <div className="space-y-4">
              {paymentAuctions.map((auction) => (
                <div key={auction.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                      <MaterialSymbol icon="payments" size={28} className="text-on-surface-subtle" />
                    </div>
                    <div>
                      <h4 className="font-bold text-brand-primary">{auction.title}</h4>
                      <p className="text-sm text-on-surface-subtle">
                        {formatPrice(auction.current_price)} &middot; {auction.animal?.animal_id}
                        {auction.winner && <> &middot; Winner: {auction.winner.name}</>}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                        auction.payment_status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                        auction.payment_status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                        auction.payment_status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {auction.payment_status?.toUpperCase() || 'PENDING'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/auctions/${auction.id}`)}
                    className="px-4 py-2 bg-brand-primary text-white rounded-xl text-sm font-bold hover:bg-brand-secondary transition-colors"
                  >
                    {t('auctionsPage.viewDetails')}
                  </button>
                </div>
              ))}
            </div>
          )}

          {filter !== 'all' && filter !== 'pending' && filter !== 'payments' && displayAuctions.length === 0 && (
            <div className="text-center py-16 bg-white rounded-[2rem] shadow-sm">
              <MaterialSymbol icon="gavel" size={64} className="mx-auto text-outline mb-4" />
              <p className="text-on-surface-variant text-lg font-semibold">{t('auctionsPage.noAuctions')}</p>
            </div>
          )}
          
          {filter !== 'all' && filter !== 'pending' && filter !== 'payments' && displayAuctions.length > 0 && (
            viewMode === 'list' ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <AuctionTableView auctions={displayAuctions} navigate={navigate} formatPrice={formatPrice} getTimeRemaining={getTimeRemaining} isRtl={isRtl} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayAuctions.map((auction) => (
                  <AuctionCard key={auction.id} auction={auction} onBid={openBidModal} navigate={navigate} isRtl={isRtl} />
                ))}
              </div>
            )
          )}
        </div>
      )}

      {showBidModal && selectedAuction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-brand-primary text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{t('auctionsPage.placeYourBid')}</h3>
                <p className="text-white/60 text-sm">{selectedAuction.title} <TranslateButton text={selectedAuction.title} /></p>
              </div>
              <button onClick={() => setShowBidModal(false)} className="p-2 hover:bg-white/10 rounded-full">
                <MaterialSymbol icon="close" size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-surface-light rounded-2xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-on-surface-variant text-sm">{t('auctionsPage.currentPrice')}</span>
                  <span className="font-bold text-on-surface">{formatPrice(selectedAuction.current_price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant text-sm">{t('auctionsPage.minimumBid')}</span>
                  <span className="font-bold text-brand-primary">{formatPrice(Math.ceil(selectedAuction.current_price) + 1)}</span>
                </div>
              </div>

              {message && (
                <div className={`p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-[#cfe5d6] text-brand-primary' : 'bg-[#ffdad6] text-[#93000a]'}`}>
                  {message.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">{t('auctions.yourBid')} (SAR)</label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  min={Math.ceil(selectedAuction.current_price) + 1}
                  className="w-full bg-surface-light border-none rounded-xl px-4 py-4 text-xl font-bold text-brand-primary focus:ring-2 focus:ring-brand-accent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowBidModal(false)}
                  className="flex-1 py-3 bg-surface-dim text-brand-primary rounded-xl font-bold text-sm hover:bg-surface-dim"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={placeBid}
                  disabled={placing || !bidAmount}
                  className={`flex-1 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-brand-secondary disabled:opacity-50 flex items-center justify-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}
                >
                  {placing ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      {t('auctionsPage.placing')}
                    </>
                  ) : (
                    <>
                      <MaterialSymbol icon="gavel" />
                      {t('auctionsPage.confirmBid')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-primary/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg">{t('auctionsPage.rejectTitle')}</h3>
              <button onClick={() => { setShowRejectModal(false); setRejectAuctionId(null); setRejectNotes(''); }} className="p-2 hover:bg-white/10 rounded-full">
                <MaterialSymbol icon="close" size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-on-surface-subtle">{t('auctionsPage.rejectDesc')}</p>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder={t('auctionsPage.rejectNotesPlaceholder')}
                className="w-full bg-surface-light border-none rounded-xl p-4 text-brand-primary focus:ring-2 focus:ring-red-500/20 resize-none"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowRejectModal(false); setRejectAuctionId(null); setRejectNotes(''); }}
                  className="flex-1 py-3 bg-surface-dim text-brand-primary rounded-xl font-bold text-sm hover:bg-surface-dim"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={rejectAuction}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700"
                >
                  {t('auctionsPage.reject')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuctionCard({ auction, onBid, navigate, isRtl }) {
  const computedStatus = getComputedStatus(auction);

  const getTimeRemaining = (auction) => {
    if (!auction.ends_at) return 'No limit';
    const end = new Date(auction.ends_at);
    const now = new Date();
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="bg-white rounded-[2rem] overflow-hidden shadow-[0px_12px_32px_rgba(6,64,43,0.06)] group hover:shadow-2xl transition-all duration-500 border border-outline/10">
      <div className="relative h-56 overflow-hidden">
        {auction.animal?.identification_photo ? (
          <img
            src={storageUrl(auction.animal.identification_photo)}
            alt={auction.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#E3E3DE] to-[#cfe5d6] flex items-center justify-center">
            <MaterialSymbol icon="pets" size={64} className="text-brand-primary/20" />
          </div>
        )}
        
        {computedStatus === 'active' && (
          <div className="absolute top-4 left-4 bg-red-500/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Live</span>
          </div>
        )}
        {computedStatus === 'ended' && (
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Ended</span>
          </div>
        )}
        {computedStatus === 'sold' && (
          <div className="absolute top-4 left-4 bg-emerald-500/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-white"></span>
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Sold</span>
          </div>
        )}
        
        <div className="absolute top-4 right-4 bg-brand-accent text-white px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
          {computedStatus === 'active' ? (
            <>
              <MaterialSymbol icon="schedule" size={16} />
              <span className="text-[11px] font-bold">{getTimeRemaining(auction)}</span>
            </>
          ) : (
            <>
              <MaterialSymbol icon={computedStatus === 'sold' ? 'check_circle' : 'cancel'} size={16} />
              <span className="text-[11px] font-bold">{computedStatus}</span>
            </>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-black text-tertiary-container uppercase tracking-[0.2em]">
              {auction.animal?.animal_id || 'CML-XXX'}
            </p>
            {auction.owner && (
              <p className="text-[10px] font-medium text-[#4f6357]">
                Seller: {auction.owner.name}
              </p>
            )}
          </div>
          <h3 className="text-xl font-bold text-brand-primary font-['Manrope']">{auction.title} <TranslateButton text={auction.title} /></h3>
          <p className="text-sm text-[#4f6357]">
            {auction.animal?.species} {auction.animal?.breed && `• ${auction.animal.breed}`}
          </p>
        </div>

        {computedStatus === 'sold' && auction.winner ? (
          <div className="bg-emerald-50 rounded-2xl p-4 mb-4">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Highest Bidder</p>
            <p className="text-lg font-bold text-emerald-700">{auction.winner.name}</p>
            <p className="text-xs text-emerald-600 mt-1">Final: {formatPrice(auction.current_price)}</p>
          </div>
        ) : (
          <div className="bg-surface-light rounded-2xl p-4 mb-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-[#4f6357] uppercase tracking-widest mb-1">Starting</p>
              <p className="text-lg font-bold text-on-surface">{formatPrice(auction.starting_price)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-brand-accent uppercase tracking-widest mb-1">Current Bid</p>
              <p className="text-lg font-bold text-brand-primary">{formatPrice(auction.current_price)}</p>
            </div>
          </div>
        )}

        {computedStatus === 'active' && (
          <div className={`flex items-center gap-2 mb-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <MaterialSymbol icon="schedule" size={16} />
            <span className="text-sm font-bold">{getTimeRemaining(auction)}</span>
          </div>
        )}

        <div className={`flex items-center justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => navigate(`/auctions/${auction.id}`)}
            className="px-4 py-2 text-brand-primary hover:bg-surface-dim rounded-xl font-medium text-sm transition-colors"
          >
            View Details
          </button>
          {computedStatus === 'active' && (
            <button
              onClick={() => onBid(auction)}
              className="px-6 py-2 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-brand-secondary shadow-lg shadow-brand-primary/20 transition-all"
            >
              Place Bid
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

