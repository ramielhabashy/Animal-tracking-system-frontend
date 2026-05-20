import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

export default function AlertsPage() {
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const isRtl = dir === 'rtl';
  const role = user?.role;

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list');

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [animalIdFilter, setAnimalIdFilter] = useState('all');
  const [animalNameFilter, setAnimalNameFilter] = useState('');

  const [owners, setOwners] = useState([]);
  const [groups, setGroups] = useState([]);
  const [animals, setAnimals] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [error, setError] = useState(null);

  const isAdmin = role === 'Admin';
  const isOwner = role === 'Owner';
  const isManager = role === 'Manager';
  const canViewOwnerFilter = isAdmin;
  const canViewGroupFilter = isAdmin || isOwner || isManager;

  useEffect(() => {
    if (canViewOwnerFilter) {
      apiFetch('/api/users/owners/list').then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setOwners(data.data || data.owners || []);
        }
      });
    }
    apiFetch('/api/animal-groups').then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setGroups(data.data || []);
      }
    });
    apiFetch('/api/animals').then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setAnimals(data.data || []);
      }
    });
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [currentPage, perPage, typeFilter, statusFilter, severityFilter, ownerFilter, groupFilter, animalIdFilter, animalNameFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, severityFilter, ownerFilter, groupFilter, animalIdFilter, animalNameFilter]);

  const buildParams = () => {
    const params = new URLSearchParams({ per_page: perPage, page: currentPage });
    if (typeFilter === 'geofence') params.append('type', 'entry,exit');
    else if (typeFilter === 'temperature') params.append('type', 'temperature');
    if (statusFilter === 'unresolved') params.append('is_acknowledged', '0');
    else if (statusFilter === 'resolved') params.append('is_acknowledged', '1');
    if (severityFilter !== 'all') params.append('severity', severityFilter);
    if (canViewOwnerFilter && ownerFilter !== 'all') params.append('owner_id', ownerFilter);
    if (canViewGroupFilter && groupFilter !== 'all') params.append('group_id', groupFilter);
    if (animalIdFilter !== 'all') params.append('animal_id', animalIdFilter);
    if (animalNameFilter) params.append('animal_name', animalNameFilter);
    return params;
  };

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/geofence-alerts?${buildParams()}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.data || []);
        setTotalAlerts(data.total || 0);
        setUnresolvedCount(data.unresolved_count || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      const response = await apiFetch(`/api/geofence-alerts/${alertId}/acknowledge`, { method: 'PATCH' });
      if (response.ok) {
        setAlerts(alerts.map(a => a.id === alertId ? { ...a, is_acknowledged: true } : a));
        setUnresolvedCount(prev => Math.max(0, prev - 1));
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.message || 'Failed to acknowledge alert');
      }
    } catch (err) {
      setError(err.message || 'Failed to acknowledge alert');
    }
  };

  const deleteAlert = async (alertId) => {
    if (!confirm(t('alertsPage.deleteConfirm'))) return;
    try {
      const response = await apiFetch(`/api/geofence-alerts/${alertId}`, { method: 'DELETE' });
      if (response.ok) {
        setAlerts(alerts.filter(a => a.id !== alertId));
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.message || 'Failed to delete alert');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete alert');
    }
  };

  const deactivateAllAlerts = async () => {
    if (!confirm(t('alertsPage.deactivateAllConfirm'))) return;
    try {
      const response = await apiFetch('/api/geofence-alerts/deactivate-all', { method: 'POST' });
      if (response.ok) {
        setAlerts(alerts.map(a => ({ ...a, is_acknowledged: true })));
        setUnresolvedCount(0);
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.message || 'Failed to deactivate alerts');
      }
    } catch (err) {
      setError(err.message || 'Failed to deactivate alerts');
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'entry': return 'login';
      case 'exit': return 'logout';
      case 'temperature': return 'thermostat';
      case 'offline': return 'wifi_off';
      default: return 'warning';
    }
  };

  const getAlertColor = (type) => {
    switch (type) {
      case 'entry': return { bg: 'bg-emerald-50', icon: 'text-emerald-600', dot: 'bg-emerald-500' };
      case 'exit': return { bg: 'bg-red-50', icon: 'text-red-600', dot: 'bg-red-500' };
      case 'temperature': return { bg: 'bg-amber-50', icon: 'text-amber-600', dot: 'bg-amber-500' };
      default: return { bg: 'bg-stone-50', icon: 'text-stone-600', dot: 'bg-stone-500' };
    }
  };

  const getSeverityInfo = (type, severity) => {
    if (type === 'exit' || severity === 'critical') return { label: t('alerts.critical'), color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' };
    if (type === 'temperature' || severity === 'warning') return { label: t('alertsPage.warning'), color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' };
    return { label: t('alertsPage.routine'), color: 'text-stone-600', bg: 'bg-stone-50', dot: 'bg-stone-500' };
  };

  const totalPages = Math.ceil(totalAlerts / perPage);

  const renderAlertCard = (alert) => {
    const colors = getAlertColor(alert.type);
    const severity = getSeverityInfo(alert.type, alert.severity);
    return (
      <div key={alert.id} className="card p-4 space-y-3">
        <div className={`flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center ${colors.icon} flex-shrink-0`}>
            <MaterialSymbol icon={getAlertIcon(alert.type)} />
          </div>
          <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : ''}`}>
            <p className="text-sm font-bold text-brand-primary truncate">
              {alert.type === 'entry' ? t('alerts.geofenceEntry') :
               alert.type === 'exit' ? t('alerts.geofenceExit') :
               alert.type === 'temperature' ? t('alerts.temperature') :
               alert.type === 'offline' ? t('alerts.deviceOffline') :
               t(`alerts.${alert.type}`)}
            </p>
            <p className="text-[10px] text-on-surface-subtle">{alert.geofence?.name || t('alertsPage.unknownZone')}</p>
          </div>
          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md flex-shrink-0 ${
            alert.is_acknowledged ? 'bg-[#cfe5d6] text-brand-primary' : 'bg-red-100 text-red-700'
          }`}>
            {alert.is_acknowledged ? t('alertsPage.resolved') : t('alertsPage.unresolved')}
          </span>
        </div>
        <div className={`flex items-center gap-4 text-xs text-on-surface-variant ${isRtl ? 'flex-row-reverse' : ''}`}>
          {alert.animal ? (
            <Link to={`/animals/${alert.animal.id}`} className="font-bold text-brand-primary hover:underline">
              {alert.animal.animal_id}
            </Link>
          ) : <span className="text-on-surface-subtle">-</span>}
          <span className="text-[10px] text-on-surface-subtle">{(alert.animal_name || alert.animal?.name) && `(${alert.animal_name || alert.animal?.name})`}</span>
          <span className={`w-2 h-2 rounded-full ${severity.dot} ${!alert.is_acknowledged && alert.type === 'exit' ? 'animate-pulse' : ''}`} />
          <span className={`font-bold uppercase ${severity.color}`}>{severity.label}</span>
          {alert.latitude && <span className="font-mono text-on-surface-subtle">{parseFloat(alert.latitude).toFixed(4)}, {parseFloat(alert.longitude).toFixed(4)}</span>}
        </div>
        <div className={`flex items-center gap-2 pt-2 border-t border-[#eeeee9] ${isRtl ? 'flex-row-reverse' : ''}`}>
          {!alert.is_acknowledged && (
            <button onClick={() => acknowledgeAlert(alert.id)} className="bg-brand-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-brand-secondary transition-colors">
              <MaterialSymbol icon="check" size={12} className="inline mr-1" />
              {t('alertsPage.resolve')}
            </button>
          )}
          <Link to="/map" className="border border-outline text-on-surface-variant text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-surface-dim transition-colors">
            <MaterialSymbol icon="map" size={12} className="inline mr-1" />
            {t('common.view')}
          </Link>
          <button onClick={() => deleteAlert(alert.id)} className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors ml-auto" title="Delete alert">
            <MaterialSymbol icon="delete" size={14} />
          </button>
        </div>
      </div>
    );
  };

  const renderFilterSelect = (label, value, onChange, options) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-white border border-[#e0e0e0] rounded-lg px-3 py-2 text-xs font-medium text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-brand-secondary/20"
    >
      <option value="all">{label}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );

  return (
    <div className="space-y-8">
      {error && (
        <div className={`bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-2xl flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <MaterialSymbol icon="error" size={20} className="text-red-500 flex-shrink-0" />
          <p className="flex-1 text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
            <MaterialSymbol icon="close" size={18} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className={`flex flex-wrap justify-between items-end gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className={isRtl ? 'text-right' : ''}>
          <h2 className="text-3xl font-black text-brand-primary tracking-tight font-['Manrope']">{t('alertsPage.title')}</h2>
          <p className={`text-on-surface-variant mt-1 flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <span className="inline-flex items-center justify-center bg-brand-accent/20 text-tertiary-container px-2 py-0.5 rounded-full text-xs font-bold">
              {totalAlerts} {t('alertsPage.totalAlerts')}
            </span>
            {unresolvedCount > 0 && (
              <span className="inline-flex items-center justify-center bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {unresolvedCount} {t('alertsPage.unresolved')}
              </span>
            )}
          </p>
        </div>
        <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg text-sm transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`} title={t('common.list')}>
              <MaterialSymbol icon="table_rows" size={18} />
            </button>
            <button onClick={() => setViewMode('tiles')} className={`p-2 rounded-lg text-sm transition-all ${viewMode === 'tiles' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`} title={t('dashboard.regionalView')}>
              <MaterialSymbol icon="grid_view" size={18} />
            </button>
          </div>
          {unresolvedCount > 0 ? (
            <button onClick={deactivateAllAlerts} className="bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-600 transition-colors text-sm">
              <MaterialSymbol icon="notifications_off" size={18} />
              {t('alertsPage.deactivateAll', { count: unresolvedCount })}
            </button>
          ) : (
            <button className="bg-amber-500/50 text-white/70 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 cursor-not-allowed text-sm" disabled>
              <MaterialSymbol icon="notifications_off" size={18} />
              {t('alertsPage.deactivateAll', { count: 0 })}
            </button>
          )}
          <button className="bg-brand-primary text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-secondary transition-colors text-sm">
            <MaterialSymbol icon="file_download" size={18} />
            {t('alertsPage.exportReport')}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={`bg-surface-light p-3 rounded-2xl flex flex-wrap items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
        {/* Type */}
        <div className={`flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] font-bold text-stone-400 px-2 uppercase">{t('alertsPage.alertType')}</span>
          {['all', 'geofence', 'temperature'].map((type) => (
            <button key={type} onClick={() => setTypeFilter(type)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${typeFilter === type ? 'bg-brand-primary text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
              {type === 'all' ? t('common.all') : t(`alertsPage.${type}`)}
            </button>
          ))}
        </div>
        {/* Status */}
        <div className={`flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] font-bold text-stone-400 px-2 uppercase">{t('common.status')}</span>
          {['all', 'unresolved', 'resolved'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${statusFilter === s ? 'bg-[#cfe5d6] text-brand-primary' : 'text-stone-600 hover:bg-stone-100'}`}>
              {s === 'all' ? t('common.all') : t(`alertsPage.${s}`)}
            </button>
          ))}
        </div>
        {/* Severity */}
        <div className={`flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] font-bold text-stone-400 px-2 uppercase">{t('alertsPage.severity')}</span>
          {['all', 'critical', 'warning', 'routine'].map((sev) => (
            <button key={sev} onClick={() => setSeverityFilter(sev)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${severityFilter === sev ? 'bg-brand-primary text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
              {sev === 'all' ? t('common.all') : sev.charAt(0).toUpperCase() + sev.slice(1)}
            </button>
          ))}
        </div>
        {/* Owner Filter (Admin only) */}
        {canViewOwnerFilter && (
          <div className={`flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
            <span className="text-[10px] font-bold text-stone-400 px-2 uppercase">{t('animals.owner')}</span>
            <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="bg-transparent border-none text-xs font-semibold text-stone-600 px-2 py-1 focus:outline-none cursor-pointer">
              <option value="all">{t('common.all')}</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        )}
        {/* Group Filter (Admin, Owner, Manager) */}
        {canViewGroupFilter && (
          <div className={`flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
            <span className="text-[10px] font-bold text-stone-400 px-2 uppercase">{t('dashboard.groups')}</span>
            <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="bg-transparent border-none text-xs font-semibold text-stone-600 px-2 py-1 focus:outline-none cursor-pointer">
              <option value="all">{t('common.all')}</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
        {/* Animal Filter */}
        <div className={`flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] font-bold text-stone-400 px-2 uppercase">{t('alertsPage.animalId')}</span>
          <select value={animalIdFilter} onChange={(e) => setAnimalIdFilter(e.target.value)} className="bg-transparent border-none text-xs font-semibold text-stone-600 px-2 py-1 focus:outline-none cursor-pointer max-w-[120px]">
            <option value="all">{t('common.all')}</option>
            {animals.map((a) => <option key={a.id} value={a.id}>{a.animal_id}{a.name ? ` - ${a.name}` : ''}</option>)}
          </select>
        </div>
        {/* Animal Name Search */}
        <div className={`flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
          <MaterialSymbol icon="search" size={16} className="text-stone-400 ml-1" />
          <input
            type="text"
            value={animalNameFilter}
            onChange={(e) => setAnimalNameFilter(e.target.value)}
            placeholder={t('alertsPage.animalName')}
            className="bg-transparent border-none text-xs font-semibold text-stone-600 px-2 py-1 focus:outline-none w-[130px] placeholder:text-stone-400"
          />
        </div>
        <div className={`${isRtl ? 'mr-auto ml-0' : 'ml-auto'} text-[10px] text-stone-400 font-medium`}>
          {t('alertsPage.sortedNewest')}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-3xl py-20 text-center text-on-surface-subtle">
          <MaterialSymbol icon="notifications_off" size={48} className="mx-auto mb-4 opacity-50" />
          <p>{t('common.noData')}</p>
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
          <table className={`w-full ${isRtl ? 'text-right' : 'text-left'}`}>
            <thead className="bg-surface-light/50 border-b border-[#eeeee9]">
              <tr>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">{t('alertsPage.alertType')}</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">{t('alertsPage.animalId')}</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">{t('alertsPage.animalName')}</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">{t('alertsPage.location')}</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">{t('alertsPage.timestamp')}</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">{t('alertsPage.severity')}</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant">{t('common.status')}</th>
                <th className={`px-6 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant ${isRtl ? 'text-left' : 'text-right'}`}>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eeeee9]/50">
              {alerts.map((alert) => {
                const colors = getAlertColor(alert.type);
                const severity = getSeverityInfo(alert.type, alert.severity);
                return (
                  <tr key={alert.id} className="hover:bg-surface-light/30 transition-colors">
                    <td className="px-6 py-5">
                      <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center ${colors.icon}`}>
                          <MaterialSymbol icon={getAlertIcon(alert.type)} />
                        </div>
                        <div className={isRtl ? 'text-right' : ''}>
                          <p className="text-sm font-bold text-brand-primary">
                            {alert.type === 'entry' ? t('alerts.geofenceEntry') :
                             alert.type === 'exit' ? t('alerts.geofenceExit') :
                             alert.type === 'temperature' ? t('alerts.temperature') :
                             alert.type === 'offline' ? t('alerts.deviceOffline') :
                             t(`alerts.${alert.type}`)}
                          </p>
                          <p className="text-[10px] text-on-surface-subtle">{alert.geofence?.name || t('alertsPage.unknownZone')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {alert.animal ? (
                        <Link to={`/animals/${alert.animal.id}`} className="font-bold text-sm text-brand-primary hover:underline">{alert.animal.animal_id}</Link>
                      ) : <span className="text-on-surface-subtle">-</span>}
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs text-on-surface-variant">{alert.animal_name || alert.animal?.name || '-'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-mono text-on-surface-variant">
                        {alert.latitude ? `${parseFloat(alert.latitude).toFixed(4)}, ${parseFloat(alert.longitude).toFixed(4)}` : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-xs font-medium text-on-surface-variant">{new Date(alert.triggered_at).toLocaleDateString()}</p>
                      <p className="text-[10px] text-on-surface-subtle font-bold">{new Date(alert.triggered_at).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className={`w-2 h-2 rounded-full ${severity.dot} ${!alert.is_acknowledged && alert.type === 'exit' ? 'animate-pulse' : ''}`} />
                        <span className={`text-xs font-bold uppercase ${severity.color}`}>{severity.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                        alert.is_acknowledged ? 'bg-[#cfe5d6] text-brand-primary' : 'bg-red-100 text-red-700'
                      }`}>
                        {alert.is_acknowledged ? t('alertsPage.resolved') : t('alertsPage.unresolved')}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse ml-auto' : 'ml-auto'}`}>
                        {!alert.is_acknowledged && (
                          <button onClick={() => acknowledgeAlert(alert.id)} className="bg-brand-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-brand-secondary transition-colors flex items-center gap-1">
                            <MaterialSymbol icon="check" size={12} />
                            {t('alertsPage.resolve')}
                          </button>
                        )}
                        <Link to="/map" className="border border-outline text-on-surface-variant text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-surface-dim transition-colors flex items-center gap-1">
                          <MaterialSymbol icon="map" size={12} />
                          {t('common.view')}
                        </Link>
                        <button onClick={() => deleteAlert(alert.id)} className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Delete alert">
                          <MaterialSymbol icon="delete" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {alerts.length > 0 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} perPage={perPage} total={totalAlerts} dir={dir}
              onPageChange={setCurrentPage} onPerPageChange={(v) => { setPerPage(v); setCurrentPage(1); }} />
          )}
        </div>
      ) : (
        /* Tile View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {alerts.map(renderAlertCard)}
          <Pagination currentPage={currentPage} totalPages={totalPages} perPage={perPage} total={totalAlerts} dir={dir}
            onPageChange={setCurrentPage} onPerPageChange={(v) => { setPerPage(v); setCurrentPage(1); }} />
        </div>
      )}
    </div>
  );
}

