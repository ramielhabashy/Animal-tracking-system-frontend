import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { usePlatform } from '../../context/PlatformContext';
import LanguageSwitcher from '../../i18n/LanguageSwitcher';
import { apiFetch, storageUrl } from '../../utils/api';
import TranslateButton from '../TranslateButton';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, dir } = useI18n();
  const { logoUrl, platformName } = usePlatform();

  const isRtl = dir === 'rtl';

  const canViewAlerts = ['Admin', 'Owner', 'Manager'].includes(user?.role);

  useEffect(() => {
    if (canViewAlerts) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [canViewAlerts]);

  useEffect(() => {
    if (!showNotifications) return;
    const handler = (e) => {
      if (!e.target.closest('.notification-dropdown') && !e.target.closest('.notification-bell')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifications]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const shownNotifIds = useRef(new Set());

  useEffect(() => {
    if (
      notifications.length > 0 &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      const lastNotif = notifications[0];
      if (lastNotif && !lastNotif.read_at && !shownNotifIds.current.has(lastNotif.id)) {
        shownNotifIds.current.add(lastNotif.id);
        new Notification(lastNotif.title, {
          body: lastNotif.body || '',
          icon: '/favicon.ico',
        });
      }
    }
  }, [notifications]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiFetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.data);
          setShowSearchResults(true);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchResultClick = (type, id) => {
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults(null);
    const paths = { animals: `/animals/${id}`, users: `/users/${id}/edit`, devices: `/devices/${id}/edit`, auctions: `/auctions/${id}` };
    navigate(paths[type] || '/');
  };

  const hasResults = searchResults && (searchResults.animals?.length || searchResults.users?.length || searchResults.devices?.length || searchResults.auctions?.length);

  const searchResultCount = searchResults ? (searchResults.animals?.length || 0) + (searchResults.users?.length || 0) + (searchResults.devices?.length || 0) + (searchResults.auctions?.length || 0) : 0;

  const fetchNotifications = async () => {
    try {
      const [notifRes, unreadRes] = await Promise.all([
        apiFetch('/api/notifications?unread_only=true&per_page=10'),
        apiFetch('/api/notifications/unread-count'),
      ]);
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(data.data || []);
      }
      if (unreadRes.ok) {
        const data = await unreadRes.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={`sticky top-0 z-40 glass-nav border-b border-brand-primary/5 px-8 py-5 flex justify-between items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
      <div className={`flex items-center flex-1 gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <Link to="/dashboard" className="flex items-center gap-2 group flex-shrink-0">
          {logoUrl ? (
            <img src={storageUrl(logoUrl)} alt={platformName} className="w-9 h-9 object-contain rounded-lg flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-lg flex items-center justify-center flex-shrink-0">
              <MaterialSymbol icon="eco" size={18} className="text-brand-accent" fill />
            </div>
          )}
          <span className="text-sm font-bold text-brand-primary hidden sm:block group-hover:text-brand-secondary transition-colors">{platformName}</span>
        </Link>
        <div className="relative w-full max-w-lg">
          <MaterialSymbol
            icon="search"
            size={20}
            className={`absolute top-1/2 -translate-y-1/2 text-on-surface-subtle ${isRtl ? 'right-4' : 'left-4'}`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults && setShowSearchResults(true)}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            placeholder={t('common.search')}
            className={`w-full py-3.5 bg-surface-light rounded-xl border-none text-sm ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} placeholder:text-on-surface-subtle/60 focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 transition-all`}
          />
          {showSearchResults && (
            <div className={`absolute mt-2 w-full bg-white rounded-2xl shadow-[0_12px_32px_rgba(6,64,43,0.12)] p-4 z-50 ${isRtl ? 'right-0' : 'left-0'}`}>
              {searching ? (
                <p className="text-sm text-on-surface-subtle text-center py-4">Searching...</p>
              ) : !hasResults ? (
                <p className="text-sm text-on-surface-subtle text-center py-4">No results found</p>
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {searchResults.animals?.map(animal => (
                    <button key={`animal-${animal.id}`} onMouseDown={() => handleSearchResultClick('animals', animal.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-light transition-colors ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                      <div className="w-8 h-8 rounded-lg bg-brand-secondary/10 flex items-center justify-center">
                        <MaterialSymbol icon="pets" size={16} className="text-brand-secondary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-brand-primary truncate">{animal.animal_id} - {animal.name || 'Unnamed'}</p>
                        <p className="text-xs text-on-surface-subtle truncate">{animal.species}{animal.breed ? ` - ${animal.breed}` : ''}</p>
                      </div>
                    </button>
                  ))}
                  {searchResults.users?.map(user => (
                    <button key={`user-${user.id}`} onMouseDown={() => handleSearchResultClick('users', user.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-light transition-colors ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                      <div className="w-8 h-8 rounded-lg bg-brand-accent/15 flex items-center justify-center">
                        <MaterialSymbol icon="person" size={16} className="text-tertiary-container" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-brand-primary truncate">{user.name}</p>
                        <p className="text-xs text-on-surface-subtle truncate">{user.email} - {user.role || 'User'}</p>
                      </div>
                    </button>
                  ))}
                  {searchResults.devices?.map(device => (
                    <button key={`device-${device.id}`} onMouseDown={() => handleSearchResultClick('devices', device.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-light transition-colors ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                      <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                        <MaterialSymbol icon="sensors" size={16} className="text-brand-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-brand-primary truncate">{device.device_id || device.name}</p>
                        <p className="text-xs text-on-surface-subtle truncate">{device.name}{device.status ? ` - ${device.status}` : ''}</p>
                      </div>
                    </button>
                  ))}
                  {searchResults.auctions?.map(auction => (
                    <button key={`auction-${auction.id}`} onMouseDown={() => handleSearchResultClick('auctions', auction.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-light transition-colors ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                      <div className="w-8 h-8 rounded-lg bg-brand-accent/15 flex items-center justify-center">
                        <MaterialSymbol icon="gavel" size={16} className="text-tertiary-container" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-brand-primary truncate">{auction.title}</p>
                        <p className="text-xs text-on-surface-subtle truncate">{auction.status}{auction.current_price ? ` - ${new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR' }).format(auction.current_price)}` : ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {hasResults && (
                <p className="text-[10px] text-on-surface-subtle text-center mt-2 pt-2 border-t border-outline/20">
                  {searchResultCount} result{searchResultCount !== 1 ? 's' : ''} found
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-ai-assistant'))}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-brand-primary hover:bg-surface-light transition-colors"
          title="AI Assistant"
        >
          <MaterialSymbol icon="help" size={22} />
        </button>

        <div className="relative notification-bell">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-11 h-11 rounded-xl flex items-center justify-center text-brand-primary hover:bg-surface-light transition-colors"
          >
            <MaterialSymbol icon="notifications" size={22} />
            {unreadCount > 0 && (
              <span className={`absolute top-2 w-2.5 h-2.5 bg-danger rounded-full ${isRtl ? 'left-2' : 'right-2'}`} />
            )}
          </button>
          {showNotifications && (
            <div className={`notification-dropdown absolute mt-3 w-96 bg-white rounded-2xl shadow-[0_12px_32px_rgba(6,64,43,0.12)] p-5 z-[100] ${isRtl ? 'left-0 origin-top-left' : 'right-0 origin-top-right'}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-brand-primary text-lg">{t('common.notifications') || 'Notifications'}</h4>
                <button onClick={async () => { await apiFetch('/api/notifications/read-all', { method: 'POST' }); fetchNotifications(); }} className="text-xs text-on-surface-subtle hover:text-brand-primary">
                  {t('common.markAllRead') || 'Mark all read'}
                </button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-sm text-on-surface-subtle text-center py-4">{t('common.noNotifications') || 'No notifications'}</p>
                 ) : (
                   notifications.slice(0, 5).map((n) => {
                        const icons = { task_assigned: 'assignment', medical_record_added: 'vaccines', subscription_expiring: 'timer', subscription_purchased: 'credit_score', task_completed: 'check_circle', geofence_alert: 'warning', invitation_accepted: 'person_add', auction_new: 'gavel', auction_bid: 'add', auction_outbid: 'trending_down', auction_won: 'emoji_events', auction_ended: 'timer_off', auction_cancelled: 'block', auction_payment_verified: 'verified', auction_payment_rejected: 'block', bidder_disqualified: 'person_remove', payment_proof_submitted: 'upload', order_shipped: 'local_shipping', order_delivered: 'inventory_2', new_message: 'chat', new_ticket: 'support_agent' };
                      const colors = { 
                        task_assigned: 'bg-blue-100 text-blue-600', 
                        medical_record_added: 'bg-emerald-100 text-emerald-600', 
                         subscription_expiring: 'bg-amber-100 text-amber-600',
                         subscription_purchased: 'bg-emerald-100 text-emerald-600',
                        task_completed: 'bg-green-100 text-green-600',
                        geofence_alert: 'bg-red-100 text-red-600',
                        invitation_accepted: 'bg-purple-100 text-purple-600',
                        auction_new: 'bg-amber-100 text-amber-600',
                        auction_bid: 'bg-blue-100 text-blue-600',
                        auction_outbid: 'bg-red-100 text-red-600',
                        auction_won: 'bg-yellow-100 text-yellow-700',
                        auction_ended: 'bg-gray-100 text-gray-600',
                        auction_cancelled: 'bg-red-100 text-red-600',
                        auction_payment_verified: 'bg-emerald-100 text-emerald-600',
                        auction_payment_rejected: 'bg-rose-100 text-rose-600',
                        bidder_disqualified: 'bg-pink-100 text-pink-600',
                        payment_proof_submitted: 'bg-blue-100 text-blue-600',
                        order_shipped: 'bg-blue-100 text-blue-600',
                        order_delivered: 'bg-emerald-100 text-emerald-600',
                        new_message: 'bg-teal-100 text-teal-600',
                        new_ticket: 'bg-amber-100 text-amber-700'
                      };
                     const handleNotificationClick = () => {
                       setShowNotifications(false);
                       apiFetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' }).then(fetchNotifications);
                       if (n.data?.link) {
                         navigate(n.data.link);
                       }
                     };
                     return (
                       <div key={n.id} 
                         onClick={handleNotificationClick}
                         className={`flex items-start gap-3 p-3 rounded-xl hover:bg-surface-light transition-colors cursor-pointer ${isRtl ? 'flex-row-reverse' : ''} ${n.read_at ? 'opacity-60' : ''}`}>
                         <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[n.type] || 'bg-brand-accent/15 text-tertiary-container'}`}>
                           <MaterialSymbol icon={icons[n.type] || 'notifications'} size={18} />
                         </div>
                         <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : ''}`}>
                            <p className="text-sm font-semibold text-brand-primary">{n.title} <TranslateButton text={n.title} /></p>
                            <p className="text-xs text-on-surface-subtle mt-0.5 line-clamp-2">{n.body} <TranslateButton text={n.body} /></p>
                           <p className="text-[10px] text-on-surface-subtle mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                         </div>
                         {!n.read_at && (
                           <button
                             onClick={async (e) => { e.stopPropagation(); await apiFetch(`/api/notifications/${n.id}/read`, { method: 'PATCH' }); fetchNotifications(); }}
                             className="p-1 hover:bg-gray-100 rounded text-on-surface-subtle"
                             title="Mark read"
                           >
                             <MaterialSymbol icon="check" size={14} />
                           </button>
                         )}
                       </div>
                     );
                   })
                 )}
              </div>
              {notifications.length > 5 && (
                <Link to="/alerts" onClick={() => setShowNotifications(false)} className="block text-center text-sm text-brand-accent hover:underline mt-3">
                   {t('common.viewAll') || 'View all'}
                 </Link>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-8 bg-brand-primary/10 mx-2" />

        <button
          onClick={handleLogout}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-brand-primary hover:bg-surface-light transition-colors"
          title={t('auth.logout')}
        >
          <MaterialSymbol icon="logout" size={22} />
        </button>

        <div className="w-px h-8 bg-brand-primary/10 mx-2" />

        <div className="flex items-center gap-3">
          <div className={`hidden sm:block ${isRtl ? 'text-right' : 'text-left'}`}>
            <p className="text-sm font-bold text-brand-primary">{user?.name || 'User'}</p>
            <p className="text-xs text-on-surface-subtle">{user?.role || 'Guest'}</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-bold shadow-md">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>

        <div className="ml-2">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}

