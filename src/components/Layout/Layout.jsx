import React from 'react';
import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import Header from './Header';
import AIAssistant from '../AIAssistant';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { usePlatform } from '../../context/PlatformContext';
import { storageUrl, apiFetch } from '../../utils/api';
import Footer from './Footer';

const mainNavItems = [
  { path: '/dashboard', icon: 'dashboard', labelKey: 'nav.dashboard', roles: ['Admin', 'Owner', 'Manager', 'Shepherd', 'Doctor'] },
  { path: '/animals', icon: 'pets', labelKey: 'nav.animals', hasSubmenu: true, roles: ['Admin', 'Owner', 'Manager', 'Shepherd', 'Doctor'] },
  { path: '/medical-records', icon: 'medical_services', labelKey: 'nav.medicalRecords', hasSubmenu: true, roles: ['Admin', 'Owner', 'Manager', 'Doctor'] },
  { path: '/devices', icon: 'sensors', labelKey: 'nav.devices', roles: ['Admin', 'Owner', 'Manager'] },
  { path: '/map', icon: 'map', labelKey: 'nav.mapView', roles: ['Admin', 'Owner', 'Manager', 'Shepherd'] },
  { path: '/auctions', icon: 'gavel', labelKey: 'nav.auctions', hasSubmenu: true, roles: ['Admin', 'Owner', 'Manager'] },
  { path: '/transfers', icon: 'swap_horiz', labelKey: 'nav.transfers', roles: ['Admin', 'Owner'] },
  { path: '/alerts', icon: 'warning', labelKey: 'nav.alerts', roles: ['Admin', 'Owner', 'Manager'] },
  { path: '/tasks', icon: 'task', labelKey: 'nav.tasks', hasSubmenu: true, roles: ['Admin', 'Owner', 'Manager', 'Shepherd', 'Doctor'] },
  { path: '/messages', icon: 'chat', labelKey: 'nav.messages', roles: ['Admin', 'Owner', 'Manager', 'Shepherd', 'Doctor'] },
  { path: '/subscription', icon: 'credit_score', labelKey: 'nav.subscription', roles: ['Admin', 'Owner'] },
  { path: '/users', icon: 'group', labelKey: 'nav.users', hasSubmenu: true, roles: ['Admin', 'Owner'] },
  { path: '/reports', icon: 'assessment', labelKey: 'nav.reports', roles: ['Admin', 'Owner', 'Manager', 'Doctor'] },

  { path: '/settings', icon: 'settings', labelKey: 'settings.title', roles: ['Admin'] },
];

const animalSubmenu = [
  { path: '/animals', labelKey: 'animals.title', roles: ['Admin', 'Owner', 'Manager', 'Shepherd', 'Doctor'] },
  { path: '/animal-groups', labelKey: 'nav.animalGroups', roles: ['Admin', 'Owner', 'Manager', 'Shepherd'] },
  { path: '/geofences', labelKey: 'nav.geofences', roles: ['Admin', 'Owner', 'Manager', 'Shepherd'] },
];

const medicalSubmenu = [
  { path: '/medical-records', labelKey: 'nav.medicalRecords', roles: ['Admin', 'Owner', 'Manager', 'Doctor'] },
  { path: '/vaccination-schedule', labelKey: 'nav.vaccinationSchedule', roles: ['Admin', 'Owner', 'Manager', 'Doctor'] },
];

const auctionSubmenu = [
  { path: '/auctions', labelKey: 'nav.browseAuctions', roles: ['Admin', 'Owner', 'Manager'] },
  { path: '/my-payments', labelKey: 'nav.auctionPayments', roles: ['Admin', 'Owner'] },
  { path: '/payments', labelKey: 'nav.managePayments', roles: ['Admin'] },
];

const usersSubmenu = [
  { path: '/users', labelKey: 'nav.users', roles: ['Admin', 'Owner'] },
  { path: '/invitations', labelKey: 'nav.invitations', roles: ['Admin', 'Owner'] },
  { path: '/team', labelKey: 'nav.team', roles: ['Admin'] },
];

const tasksSubmenu = [
  { path: '/tasks', labelKey: 'tasks.title', roles: ['Admin', 'Owner', 'Manager', 'Shepherd', 'Doctor'] },
  { path: '/task-logs-archive', labelKey: 'nav.taskLogs', roles: ['Admin', 'Owner'] },
];

export default function Layout() {
  const location = useLocation();
const [animalSubmenuOpen, setAnimalSubmenuOpen] = useState(false);
  const [auctionSubmenuOpen, setAuctionSubmenuOpen] = useState(false);
  const [usersSubmenuOpen, setUsersSubmenuOpen] = useState(false);
  const [tasksSubmenuOpen, setTasksSubmenuOpen] = useState(false);
  const [medicalSubmenuOpen, setMedicalSubmenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [menuItems, setMenuItems] = useState(null);
  const { user } = useAuth();
  const { t, dir } = useI18n();
  const { logoUrl, platformName, copyrightText } = usePlatform();

  useEffect(() => {
    if (!user) return;
    fetchMenuItems();
  }, [user]);

  const fetchMenuItems = async () => {
    try {
      const res = await apiFetch('/api/menu-items');
      if (res.ok) {
        const d = await res.json();
        if (d.data && d.data.length > 0) {
          setMenuItems(d.data);
        }
      }
    } catch (e) {
      // fallback to hardcoded
    }
  };

  const navItems = menuItems || mainNavItems;

  const isRtl = dir === 'rtl';

  const isAnimalsActive = location.pathname === '/animals' || location.pathname === '/animal-groups' || location.pathname.startsWith('/animal-groups') || location.pathname === '/geofences';
  const isMedicalActive = location.pathname === '/medical-records' || location.pathname === '/vaccination-schedule';
  const isAuctionsActive = location.pathname === '/auctions' || location.pathname.startsWith('/my-payments') || location.pathname.startsWith('/payments');
  const isUsersActive = location.pathname === '/users' || location.pathname === '/team' || location.pathname === '/invitations' || location.pathname.startsWith('/users/');
  const isTasksActive = location.pathname === '/tasks' || location.pathname.startsWith('/task-logs');

const getSubmenu = (item) => {
    if (item.path === '/animals') return animalSubmenu.filter(subItem => !subItem.roles || subItem.roles.includes(user?.role));
    if (item.path === '/medical-records') return medicalSubmenu.filter(subItem => !subItem.roles || subItem.roles.includes(user?.role));
    if (item.path === '/auctions') return auctionSubmenu.filter(subItem => !subItem.roles || subItem.roles.includes(user?.role));
    if (item.path === '/users') return usersSubmenu.filter(subItem => !subItem.roles || subItem.roles.includes(user?.role));
    if (item.path === '/tasks') return tasksSubmenu.filter(subItem => !subItem.roles || subItem.roles.includes(user?.role));
    return null;
  };

  const isSubmenuOpen = (item) => {
    if (item.path === '/animals') return animalSubmenuOpen;
    if (item.path === '/medical-records') return medicalSubmenuOpen;
    if (item.path === '/auctions') return auctionSubmenuOpen;
    if (item.path === '/users') return usersSubmenuOpen;
    if (item.path === '/tasks') return tasksSubmenuOpen;
    return false;
  };

  const toggleSubmenu = (item) => {
    if (item.path === '/animals') setAnimalSubmenuOpen(!animalSubmenuOpen);
    if (item.path === '/medical-records') setMedicalSubmenuOpen(!medicalSubmenuOpen);
    if (item.path === '/auctions') setAuctionSubmenuOpen(!auctionSubmenuOpen);
    if (item.path === '/users') setUsersSubmenuOpen(!usersSubmenuOpen);
    if (item.path === '/tasks') setTasksSubmenuOpen(!tasksSubmenuOpen);
  };

  const getSubmenuIcon = (subItem) => {
    if (subItem.path === '/animals') return 'pets';
    if (subItem.path === '/animal-groups') return 'groups';
    if (subItem.path === '/geofences') return 'fence';
    if (subItem.path === '/medical-records') return 'medical_services';
    if (subItem.path === '/vaccination-schedule') return 'vaccines';
    if (subItem.path === '/auctions') return 'gavel';
    if (subItem.path === '/my-payments') return 'account_balance_wallet';
    if (subItem.path === '/payments') return 'payments';
    if (subItem.path === '/users') return 'group';
    if (subItem.path === '/invitations') return 'mail';
    if (subItem.path === '/team') return 'groups';
    if (subItem.path === '/tasks') return 'task';
    if (subItem.path === '/task-logs-archive') return 'history';
    return 'chevron_right';
  };

const visibleNavItems = navItems.filter(item => !item.roles || item.roles.includes(user?.role));

  const getNavSubmenu = (item) => {
    if (menuItems && item.children) return item.children.filter(sub => !sub.roles || sub.roles.includes(user?.role));
    return getSubmenu(item);
  };

  return (
    <div className="min-h-screen bg-brand-light">
      <aside className={`hidden md:flex flex-col h-screen fixed top-0 bg-gradient-to-b from-[#FAF1F5] to-[#F4F4EF] py-6 px-4 z-50 transition-all duration-300 start-0 ${sidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <div className={`mb-8 ${sidebarCollapsed ? 'px-1' : ''}`}>
          <div className={`flex items-center gap-4 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            {logoUrl ? (
              <img src={storageUrl(logoUrl)} alt={platformName} className="w-14 h-14 object-contain rounded-2xl flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20 flex-shrink-0">
                <MaterialSymbol icon="eco" size={28} className="text-brand-accent" fill />
              </div>
            )}
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-xl font-black text-brand-primary leading-tight">{platformName}</h1>
                <p className="text-[11px] uppercase tracking-wider text-brand-secondary/60 font-semibold">
                  {copyrightText}
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`absolute top-8 w-8 h-8 rounded-xl bg-surface-light flex items-center justify-center text-on-surface-variant hover:bg-surface-high transition-colors ${sidebarCollapsed ? 'end-8' : 'end-4'}`}
        >
          <MaterialSymbol 
            icon={sidebarCollapsed ? (isRtl ? 'chevron_left' : 'chevron_right') : (isRtl ? 'chevron_right' : 'chevron_left')} 
            size={18} 
          />
        </button>

        <nav className="flex-1 space-y-2 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const submenu = getNavSubmenu(item);
            const hasSubmenu = submenu && submenu.length > 0;
            const isActive = item.path === '/animals' ? isAnimalsActive : item.path === '/medical-records' ? isMedicalActive : item.path === '/auctions' ? isAuctionsActive : item.path === '/users' ? isUsersActive : location.pathname === item.path;
            const menuOpen = isSubmenuOpen(item);
            
            return (
              <div key={item.path || item.id}>
                {hasSubmenu ? (
                  <>
                    <button
                      onClick={() => toggleSubmenu(item)}
                      className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                        sidebarCollapsed ? 'justify-center px-0' : `px-5 ${isRtl ? 'flex-row-reverse' : ''}`} ${
                        isActive
                          ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white shadow-lg shadow-brand-primary/20'
                          : 'text-on-surface-variant hover:bg-surface-light'
                      }`}
                    >
                      <MaterialSymbol
                        icon={item.icon}
                        size={22}
                        weight={isActive ? 'fill' : 'regular'}
                      />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 text-start">{t(item.labelKey || item.label_key || item.label)}</span>
                          <MaterialSymbol
                            icon={menuOpen ? 'expand_less' : 'expand_more'}
                            size={20}
                            className={menuOpen ? 'rotate-180' : ''}
                          />
                        </>
                      )}
                    </button>
                    
                    {!sidebarCollapsed && menuOpen && (
                      <div className={`${isRtl ? 'mr-6' : 'ml-6'} mt-2 space-y-1`}>
                        {submenu.map((subItem) => (
                          <NavLink
                            key={subItem.path || subItem.id}
                            to={subItem.path}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-5 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                                isRtl ? 'flex-row-reverse' : ''
                              } ${
                                isActive
                                  ? 'bg-brand-accent/15 text-brand-primary font-semibold'
                                  : 'text-on-surface-variant/70 hover:bg-surface-light hover:text-on-surface-variant'
                              }`
                            }
                          >
                            <MaterialSymbol
                              icon={subItem.icon || getSubmenuIcon(subItem)}
                              size={18}
                            />
                            <span className="text-start">{t(subItem.labelKey || subItem.label_key || subItem.label)}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-4 px-4 py-4 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                        sidebarCollapsed ? 'justify-center px-0' : `px-5 ${isRtl ? 'flex-row-reverse' : ''}`} ${
                        isActive
                          ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white shadow-lg shadow-brand-primary/20'
                          : 'text-on-surface-variant hover:bg-surface-light'
                      }`
                    }
                  >
                    <MaterialSymbol
                      icon={item.icon}
                      size={22}
                      weight={location.pathname === item.path ? 'fill' : 'regular'}
                    />
                    {!sidebarCollapsed && <span className="text-start">{t(item.labelKey || item.label_key || item.label)}</span>}
                  </NavLink>
                )}
              </div>
            );
          })}
        </nav>

        <div className="mt-auto pt-8">
          <NavLink
            to="/profile"
            className={`flex items-center gap-4 mt-6 p-3 rounded-2xl bg-surface-light hover:bg-surface-high transition-colors ${sidebarCollapsed ? 'justify-center p-2' : ''} ${!sidebarCollapsed && isRtl ? 'flex-row-reverse' : ''}`}
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 text-start">
                <p className="text-sm font-bold text-brand-primary">{user?.name || 'User'}</p>
                <p className="text-xs text-on-surface-variant/60">{user?.role || 'Guest'}</p>
              </div>
            )}
          </NavLink>
        </div>
      </aside>

      <main className={`transition-all duration-300 flex flex-col min-h-screen ${sidebarCollapsed ? 'md:ms-20' : 'md:ms-72'}`}>
        <Header />
        <div className="flex-1 p-8 lg:p-10">
          <Outlet />
        </div>
        <div className="h-24" />
        <Footer />
      </main>
      <AIAssistant />
    </div>
  );
}

