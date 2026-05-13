import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { exportData } from '../utils/export';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/Pagination';

const statusConfig = {
  online: { icon: 'wifi', label: 'Online', color: 'text-[#002819]' },
  low_signal: { icon: 'signal_cellular_alt_1_bar', label: 'Low Signal', color: 'text-[#735c00]' },
  offline: { icon: 'wifi_off', label: 'Offline', color: 'text-[#717973]' },
};

export default function DeviceList() {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const { user } = useAuth();
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState('all');
  const [batteryFilter, setBatteryFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalDevices, setTotalDevices] = useState(0);
  const [stats, setStats] = useState({ online: 0, offline: 0, lowBattery: 0, maintenance: 0 });
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchCount, setBatchCount] = useState(10);
  const [batchAssign, setBatchAssign] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMessage, setBatchMessage] = useState(null);

  const isAdmin = user?.role === 'Admin';
  const isOwner = user?.role === 'Owner';
  const canManageDevices = isAdmin || isOwner;
  const canRegisterDevice = isAdmin;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearch, ownerFilter, deviceTypeFilter, batteryFilter, assignmentFilter]);

  useEffect(() => {
    fetchData();
    fetchStats();
  }, [currentPage, perPage, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [devicesRes, animalsRes] = await Promise.all([
        apiFetch(`/api/devices?per_page=${perPage}&page=${currentPage}`),
        apiFetch('/api/animals?per_page=100'),
      ]);
      if (devicesRes.ok && animalsRes.ok) {
        const devicesData = await devicesRes.json();
        const animalsData = await animalsRes.json();
        const devicesArray = devicesData.data?.data || devicesData.data || devicesData || [];
        setDevices(devicesArray);
        setTotalDevices(devicesData.data?.meta?.total || devicesData.data?.total || devicesData.total || 0);
        setAnimals(animalsData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [devicesRes, animalsRes] = await Promise.all([
        apiFetch('/api/devices?per_page=1000'),
        apiFetch('/api/animals?per_page=100'),
      ]);
      if (devicesRes.ok && animalsRes.ok) {
        const devicesData = await devicesRes.json();
        const animalsData = await animalsRes.json();
        const allDevices = devicesData.data?.data || devicesData.data || devicesData || [];
        const allAnimals = animalsData.data || [];
        
        const assignedDeviceIds = allAnimals
          .map(a => a.device?.device_id || a.device_id)
          .filter(Boolean);
        
        const uniqueAssigned = new Set(assignedDeviceIds).size;
        
        setStats({
          online: allDevices.filter(d => d.status === 'online' || d.status === 'active').length,
          offline: allDevices.filter(d => d.status === 'offline' || d.status === 'low_signal').length,
          lowBattery: allDevices.filter(d => (d.battery_level || 0) < 20).length,
          maintenance: allDevices.filter(d => d.status === 'maintenance').length,
          assigned: uniqueAssigned,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getAssignedAnimal = (deviceId) => {
    return animals.find(a => (a.device?.device_id || a.device_id) === deviceId);
  };

  const ownerOptions = [...new Map(
    devices.filter(d => d.owner?.id && d.owner?.name)
      .map(d => [d.owner.id, d.owner])
  ).values()];

  const deviceTypeOptions = [...new Set(devices.map(d => d.type).filter(Boolean))];

  const filteredDevices = devices.filter((device) => {
    const matchesFilter = statusFilter === 'all' || device.status === statusFilter;
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      if (!device.device_id?.toLowerCase().includes(search) &&
          !device.name?.toLowerCase().includes(search) &&
          !device.type?.toLowerCase().includes(search) &&
          !device.owner?.name?.toLowerCase().includes(search)) {
        return false;
      }
    }
    const matchesOwner = ownerFilter === 'all' || String(device.owner?.id) === String(ownerFilter);
    const matchesType = deviceTypeFilter === 'all' || device.type === deviceTypeFilter;
    const matchesBattery = batteryFilter === 'all' ||
      (batteryFilter === 'low' && (device.battery_level || 0) < 20) ||
      (batteryFilter === 'medium' && (device.battery_level || 0) >= 20 && (device.battery_level || 0) <= 50) ||
      (batteryFilter === 'good' && (device.battery_level || 0) > 50);
    const assignedAnimal = getAssignedAnimal(device.device_id);
    const matchesAssignment = assignmentFilter === 'all' ||
      (assignmentFilter === 'assigned' && assignedAnimal) ||
      (assignmentFilter === 'unassigned' && !assignedAnimal);

    return matchesFilter && matchesOwner && matchesType && matchesBattery && matchesAssignment;
  });



  const totalPages = Math.ceil(totalDevices / perPage);

  const totalActive = stats.assigned || 0;
  const onlineCount = stats.online;
  const offlineCount = stats.offline;
  const lowBatteryCount = stats.lowBattery;
  const maintenanceCount = stats.maintenance;

  const handleBatchCreate = async () => {
    setBatchLoading(true);
    setBatchMessage(null);
    try {
      const res = await apiFetch('/api/devices/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: batchCount,
          assign_to_unassigned: batchAssign,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBatchMessage({ type: 'success', text: data.message });
        fetchData();
        fetchStats();
        setTimeout(() => { setShowBatchModal(false); setBatchMessage(null); }, 2000);
      } else {
        setBatchMessage({ type: 'error', text: data.message || 'Batch creation failed' });
      }
    } catch (e) {
      setBatchMessage({ type: 'error', text: 'Network error' });
    } finally {
      setBatchLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    const success = await exportData('/api/export/devices', `devices_${new Date().toISOString().split('T')[0]}.csv`);
    if (success) {
      setMessage({ type: 'success', text: t('common.exported') });
    } else {
      setMessage({ type: 'error', text: t('common.exportFailed') });
    }
    setTimeout(() => setMessage(null), 3000);
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#002819] border-t-transparent rounded-full" />
        <span className="ml-3 text-[#404943]">Loading devices...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold font-['Manrope'] text-[#002819] tracking-tight">
            {t('devices.deviceManagement')}
          </h2>
          <p className="text-[#404943] mt-1">
            {t('devicesPage.monitoring')}
          </p>
        </div>
        <div className="flex gap-3">
          {canManageDevices && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 bg-[#D4AF37] text-white rounded-xl font-bold hover:bg-[#c9a030] transition flex items-center gap-2 disabled:opacity-50"
            >
              <MaterialSymbol icon="download" size={20} />
              {exporting ? t('common.exporting') : t('common.export')}
            </button>
          )}
          {canRegisterDevice && (
            <>
              <button
                onClick={() => navigate('/devices/new')}
                className="flex items-center gap-2 bg-[#002819] text-white px-6 py-3 rounded-xl font-['Manrope'] font-bold hover:shadow-lg transition-all active:scale-95"
              >
                <MaterialSymbol icon="add_circle" size={20} />
                {t('devicesPage.registerNew')}
              </button>
              <button
                onClick={() => { setBatchCount(10); setBatchAssign(false); setShowBatchModal(true); }}
                className="flex items-center gap-2 bg-[#735C00] text-white px-6 py-3 rounded-xl font-['Manrope'] font-bold hover:bg-[#5c4900] transition-all"
              >
                <MaterialSymbol icon="layers" size={20} />
                Batch Create
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          <span className="text-[#717973] text-xs font-bold uppercase">{t('devices.title')}</span>
          <p className="text-3xl font-black text-[#002819] mt-1">{totalDevices}</p>
        </div>
        <div className="bg-[#002819] p-5 rounded-2xl">
          <span className="text-white/60 text-xs font-bold uppercase">{t('devicesPage.totalActive')}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-white">{totalActive}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border-s-4 border-[#002819]">
          <span className="text-[#717973] text-xs font-bold uppercase">{t('devicesPage.onlineStatus')}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-3xl font-black text-[#002819]">{onlineCount}</span>
            <MaterialSymbol icon="wifi" size={18} className="text-[#002819]" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border-s-4 border-[#735c00]">
          <span className="text-[#717973] text-xs font-bold uppercase">{t('devicesPage.lowBatteryAlerts')}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-[#735c00]">{lowBatteryCount}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          <span className="text-[#717973] text-xs font-bold uppercase">{t('devicesPage.maintenanceDue')}</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-[#4f6357]">{maintenanceCount}</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[240px] relative">
            <MaterialSymbol icon="search" size={20} className={`absolute top-1/2 -translate-y-1/2 text-[#717973] ${isRtl ? 'right-4 left-auto' : 'left-4'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('common.search')}
              className={`w-full bg-white rounded-xl py-3 text-sm shadow-sm focus:ring-2 focus:ring-[#06402b]/10 ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
            />
          </div>

          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="bg-white rounded-xl px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-[#06402b]/10 cursor-pointer"
          >
            <option value="all">All Owners</option>
            {ownerOptions.map(owner => (
              <option key={owner.id} value={owner.id}>{owner.name}</option>
            ))}
          </select>

          {deviceTypeOptions.length > 0 && (
            <select
              value={deviceTypeFilter}
              onChange={(e) => setDeviceTypeFilter(e.target.value)}
              className="bg-white rounded-xl px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-[#06402b]/10 cursor-pointer"
            >
              <option value="all">All Types</option>
              {deviceTypeOptions.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          )}

          <select
            value={batteryFilter}
            onChange={(e) => setBatteryFilter(e.target.value)}
            className="bg-white rounded-xl px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-[#06402b]/10 cursor-pointer"
          >
            <option value="all">All Battery</option>
            <option value="good">{t('devicesPage.optimal') || 'Good (>50%)'}</option>
            <option value="medium">Medium (20-50%)</option>
            <option value="low">{t('devicesPage.critical') || 'Low (<20%)'}</option>
          </select>

          <select
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
            className="bg-white rounded-xl px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-[#06402b]/10 cursor-pointer"
          >
            <option value="all">All Assignments</option>
            <option value="assigned">{t('devices.assigned') || 'Assigned'}</option>
            <option value="unassigned">{t('devicesPage.unassigned') || 'Unassigned'}</option>
          </select>

          <button
            onClick={() => { setSearchQuery(''); setOwnerFilter('all'); setDeviceTypeFilter('all'); setBatteryFilter('all'); setAssignmentFilter('all'); setStatusFilter('all'); }}
            className="px-4 py-3 text-sm font-semibold text-[#717973] hover:text-[#002819] transition-colors flex items-center gap-1"
          >
            <MaterialSymbol icon="filter_list_off" size={18} />
            {t('common.clearFilters') || 'Clear'}
          </button>
        </div>

        {/* Status Pills & View Toggle */}
        <div className={`flex flex-wrap items-center justify-between gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className="flex flex-wrap items-center gap-2">
            {['all', 'online', 'offline', 'low_signal'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-[#002819] text-white'
                    : 'bg-white text-[#404943] border border-[#c0c9c1]/20 hover:bg-[#f4f4ef]'
                }`}
              >
                {status === 'all' ? t('devicesPage.allDevices') : status === 'low_signal' ? t('devicesPage.lowBattery') : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex bg-gray-100 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('tiles')}
              className={`p-2.5 rounded-lg text-sm transition-all ${viewMode === 'tiles' ? 'bg-white shadow-sm text-[#002819]' : 'text-gray-500 hover:text-gray-700'}`}
              title={t('dashboard.regionalView') || 'Tile view'}
            >
              <MaterialSymbol icon="grid_view" size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-lg text-sm transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[#002819]' : 'text-gray-500 hover:text-gray-700'}`}
              title={t('common.list')}
            >
              <MaterialSymbol icon="table_rows" size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredDevices.length === 0 ? (
        <div className="card p-12 text-center">
          <MaterialSymbol icon="sensors_off" size={64} className="mx-auto text-[#717973] mb-4 opacity-50" />
          <p className="text-[#404943] font-medium text-lg">{t('devicesPage.noDevices')}</p>
        </div>
      ) : viewMode === 'tiles' ? (
        /* Tile View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevices.map((device) => {
            const status = statusConfig[device.status] || statusConfig.offline;
            const battery = device.battery_level || 0;
            const assignedAnimal = getAssignedAnimal(device.device_id);
            return (
              <div key={device.id} className="card overflow-hidden group">
                <div className="p-6">
                  <div className={`flex items-start justify-between mb-4 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        device.status === 'offline' ? 'bg-[#BA1A1A]/10' :
                        device.status === 'low_signal' ? 'bg-[#D4AF37]/10' :
                        'bg-[#002819]/5'
                      }`}>
                        <MaterialSymbol icon={status.icon} size={24} className={status.color} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-[#002819]">{device.device_id}</h3>
                        {device.name && <p className="text-sm text-[#717973]">{device.name}</p>}
                        <p className="text-sm text-[#717973]">{device.type || '-'}</p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      device.status === 'online' ? 'bg-[#10B981]' :
                      device.status === 'low_signal' ? 'bg-[#D4AF37]' :
                      'bg-[#717973]'
                    }`} />
                  </div>

                  <div className={`grid grid-cols-2 gap-3 text-sm ${isRtl ? 'text-right' : ''}`}>
                    <div className="bg-[#F4F4EF] rounded-xl p-3">
                      <p className="text-xs text-[#717973]">{t('devicesPage.batteryLevel')}</p>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-[#e8e8e3] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${
                            battery > 50 ? 'bg-[#002819]' :
                            battery > 20 ? 'bg-[#735c00]' : 'bg-[#BA1A1A]'
                          }`} style={{ width: `${battery}%` }} />
                        </div>
                        <span className={`font-semibold text-xs ${
                          battery > 50 ? 'text-[#002819]' :
                          battery > 20 ? 'text-[#735c00]' : 'text-[#BA1A1A]'
                        }`}>{battery}%</span>
                      </div>
                    </div>
                    <div className="bg-[#F4F4EF] rounded-xl p-3">
                      <p className="text-xs text-[#717973]">{t('users.owner')}</p>
                      <p className="font-semibold text-[#002819] truncate">{device.owner?.name || '-'}</p>
                    </div>
                    <div className="bg-[#F4F4EF] rounded-xl p-3">
                      <p className="text-xs text-[#717973]">{t('devicesPage.assignedAnimal')}</p>
                      <p className="font-semibold text-[#002819] text-xs truncate">
                        {assignedAnimal ? assignedAnimal.animal_id : t('devicesPage.unassigned')}
                      </p>
                    </div>
                    <div className="bg-[#F4F4EF] rounded-xl p-3">
                      <p className="text-xs text-[#717973]">{t('devicesPage.firmware')}</p>
                      <p className="font-semibold text-[#002819] text-xs truncate">{device.firmware_version || '-'}</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-[#F4F4EF]/50">
                    <div className={`flex items-center justify-between text-xs text-[#717973] ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span>{t('devicesPage.lastUpdate')}</span>
                      <span>{device.updated_at ? new Date(device.updated_at).toLocaleDateString() : t('devicesPage.na')}</span>
                    </div>
                  </div>
                </div>

                <div className={`flex border-t border-[#F4F4EF] ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <Link
                    to={`/devices/${device.id}/edit`}
                    className="flex-1 py-3 text-center text-sm font-semibold text-[#002819] hover:bg-[#F4F4EF] transition-colors"
                  >
                    {t('common.view') || 'View'}
                  </Link>
                  {canManageDevices && (
                    <>
                      <Link
                        to={`/devices/${device.id}/edit`}
                        className="flex-1 py-3 text-center text-sm font-semibold text-[#717473] hover:bg-[#F4F4EF] hover:text-[#002819] transition-colors border-x border-[#F4F4EF]"
                      >
                        {t('common.edit')}
                      </Link>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Are you sure you want to delete device ${device.device_id}?`)) return;
                          try {
                            const res = await apiFetch(`/api/devices/${device.id}`, { method: 'DELETE' });
                            if (res.ok) {
                              setMessage({ type: 'success', text: 'Device deleted successfully' });
                              fetchData();
                              setTimeout(() => setMessage(null), 3000);
                            }
                          } catch (err) {
                            setMessage({ type: 'error', text: 'Failed to delete device' });
                          }
                        }}
                        className="flex-1 py-3 text-center text-sm font-semibold text-[#BA1A1A] hover:bg-red-50 transition-colors"
                      >
                        {t('common.delete')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List / Table View */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className={`w-full text-sm ${isRtl ? 'text-right' : 'text-left'}`}>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="py-3 px-5 font-bold text-[#002819] text-xs uppercase tracking-wider">{t('devices.deviceId')}</th>
                  <th className="py-3 px-4 font-bold text-[#002819] text-xs uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 font-bold text-[#002819] text-xs uppercase tracking-wider">{t('users.owner')}</th>
                  <th className="py-3 px-4 font-bold text-[#002819] text-xs uppercase tracking-wider">{t('devicesPage.assignedAnimal')}</th>
                  <th className="py-3 px-4 font-bold text-[#002819] text-xs uppercase tracking-wider">{t('devicesPage.batteryLevel')}</th>
                  <th className="py-3 px-4 font-bold text-[#002819] text-xs uppercase tracking-wider">{t('devicesPage.connection')}</th>
                  <th className="py-3 px-4 font-bold text-[#002819] text-xs uppercase tracking-wider">{t('devicesPage.lastUpdate')}</th>
                  <th className={`py-3 px-5 font-bold text-[#002819] text-xs uppercase tracking-wider ${isRtl ? 'text-left' : 'text-right'}`}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device) => {
                  const status = statusConfig[device.status] || statusConfig.offline;
                  const battery = device.battery_level || 0;
                  return (
                    <tr key={device.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${battery === 0 ? 'bg-[#ffdad6]/5' : ''}`}>
                      <td className="py-3 px-5">
                        <p className="font-semibold text-[#002819]">{device.device_id}</p>
                        <p className="text-xs text-[#717973]">{device.firmware_version || 'v2.4'} {t('devicesPage.firmware')}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-[#404943]">{device.name || '-'}</p>
                        <p className="text-xs text-[#717973]">{device.type || '-'}</p>
                      </td>
                      <td className="py-3 px-4 text-[#404943]">
                        {device.owner ? device.owner.name : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const assignedAnimal = getAssignedAnimal(device.device_id);
                          return assignedAnimal ? (
                            <Link to={`/animals/${assignedAnimal.id}`} className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#eeeee9] flex items-center justify-center">
                                <MaterialSymbol icon="pets" size={14} className="text-[#002819]" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-[#002819]">{assignedAnimal.animal_id}</p>
                                <p className="text-[10px] text-[#717973]">{assignedAnimal.species}</p>
                              </div>
                            </Link>
                          ) : (
                            <span className="text-xs text-[#BA1A1A]">{t('devicesPage.unassigned')}</span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-12 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${
                              battery > 50 ? 'bg-[#002819]' :
                              battery > 20 ? 'bg-[#735c00]' : 'bg-[#BA1A1A]'
                            }`} style={{ width: `${battery}%` }} />
                          </div>
                          <span className={`text-xs font-medium ${
                            battery > 50 ? 'text-[#002819]' :
                            battery > 20 ? 'text-[#735c00]' : 'text-[#BA1A1A]'
                          }`}>{battery}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${status.color}`}>
                          <MaterialSymbol icon={status.icon} size={16} />
                          {status.label}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-[#717973]">
                        {device.updated_at ? new Date(device.updated_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-5">
                        <div className={`flex items-center gap-1 ${isRtl ? 'justify-start' : 'justify-end'}`}>
                          <Link to={`/devices/${device.id}/edit`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title={t('common.view')}>
                            <MaterialSymbol icon="visibility" size={16} />
                          </Link>
                          {canManageDevices && (
                            <Link to={`/devices/${device.id}/edit`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title={t('common.edit')}>
                              <MaterialSymbol icon="edit" size={16} />
                            </Link>
                          )}
                          {canManageDevices && (
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Are you sure you want to delete device ${device.device_id}?`)) return;
                                try {
                                  const res = await apiFetch(`/api/devices/${device.id}`, { method: 'DELETE' });
                                  if (res.ok) {
                                    setMessage({ type: 'success', text: 'Device deleted successfully' });
                                    fetchData();
                                    setTimeout(() => setMessage(null), 3000);
                                  }
                                } catch (err) {
                                  setMessage({ type: 'error', text: 'Failed to delete device' });
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title={t('common.delete')}
                            >
                              <MaterialSymbol icon="delete" size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {filteredDevices.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          perPage={perPage}
          total={totalDevices}
          dir={dir}
          onPageChange={setCurrentPage}
          onPerPageChange={(value) => { setPerPage(value); setCurrentPage(1); }}
        />
      )}

      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowBatchModal(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#002819]">Batch Create Devices</h3>
              <button onClick={() => setShowBatchModal(false)} className="p-1 hover:bg-[#F4F4EF] rounded-lg transition">
                <MaterialSymbol icon="close" size={20} className="text-[#717973]" />
              </button>
            </div>
            {batchMessage && (
              <div className={`p-3 rounded-xl mb-4 text-sm font-medium ${batchMessage.type === 'success' ? 'bg-[#cfe5d6] text-[#002819]' : 'bg-[#ffdad6] text-[#93000a]'}`}>
                {batchMessage.text}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#404943]/70 px-1">Number of Devices</label>
                <select
                  value={batchCount}
                  onChange={e => setBatchCount(parseInt(e.target.value))}
                  className="w-full bg-[#F4F4EF] border-none rounded-xl px-4 py-3 mt-1 appearance-none focus:ring-2 focus:ring-[#06402b]"
                >
                  <option value={5}>5 Devices</option>
                  <option value={10}>10 Devices</option>
                  <option value={20}>20 Devices</option>
                  <option value={50}>50 Devices</option>
                </select>
              </div>
              <div className="flex items-center gap-3 py-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={batchAssign} onChange={e => setBatchAssign(e.target.checked)} className="sr-only peer" />
                  <div className="w-14 h-7 bg-[#E3E3DE] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-[#002819]" />
                </label>
                <span className="text-sm text-[#404943]">Auto-assign to animals without devices</span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBatchModal(false)}
                className="flex-1 py-3 bg-[#F4F4EF] text-[#404943] rounded-xl font-bold text-sm hover:bg-[#E3E3DE] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchCreate}
                disabled={batchLoading}
                className="flex-1 py-3 bg-[#002819] text-white rounded-xl font-bold text-sm hover:bg-[#06402b] transition disabled:opacity-50"
              >
                {batchLoading ? 'Creating...' : `Create ${batchCount} Devices`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

