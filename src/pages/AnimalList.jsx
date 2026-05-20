import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch, storageUrl } from '../utils/api';
import { exportData } from '../utils/export';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import Pagination from '../components/Pagination';
import TransferCreateModal from '../components/Transfers/TransferCreateModal';

export default function AnimalList() {
  const { user } = useAuth();
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';

  const [animals, setAnimals] = useState([]);
  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferAnimalId, setTransferAnimalId] = useState(null);
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [viewMode, setViewMode] = useState('tiles');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const [totalAnimals, setTotalAnimals] = useState(0);
  const [stats, setStats] = useState({ assigned: 0, unassigned: 0, healthy: 0, warning: 0, critical: 0 });
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);
  
  const canModify = user?.role !== 'Shepherd' && user?.role !== 'Doctor';
  const isAdmin = user?.role === 'Admin';
  const canTransfer = user?.role === 'Admin' || user?.role === 'Owner';

  const extractList = (res) => Array.isArray(res.data) ? res.data : (res.data?.data || []);

  const getDeviceStatus = (deviceId) => {
    if (!deviceId) return 'unknown';
    const device = devices.find(d => d.device_id === deviceId || d.id === deviceId);
    return device?.status || 'unknown';
  };
  const getDeviceForAnimal = (deviceId) => {
    if (!deviceId) return null;
    return devices.find(d => d.device_id === deviceId || d.id === deviceId);
  };
  useEffect(() => {
    fetchData();
    fetchStats();
  }, [currentPage, perPage, debouncedSearch]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [animalsRes, devicesRes, usersRes] = await Promise.all([
        apiFetch(`/api/animals?per_page=${perPage}&page=${currentPage}`),
        apiFetch('/api/devices?per_page=100'),
        apiFetch('/api/users?per_page=100'),
      ]);
      
      let animals = [];
      if (animalsRes.ok) {
        const animalsData = await animalsRes.json();
        animals = extractList(animalsData);
        setTotalAnimals(animalsData.meta?.total || animalsData.total || animalsData.data?.meta?.total || 0);
      }
      
      let devices = [];
      if (devicesRes.ok) {
        const devicesData = await devicesRes.json();
        devices = extractList(devicesData);
      }
      
      let users = [];
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        users = extractList(usersData);
      }
      
      setAnimals(animals);
      setDevices(devices);
      setUsers(users);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiFetch('/api/animals/stats');
      if (res.ok) {
        const data = await res.json();
        setStats({
          assigned: data.assigned,
          unassigned: data.unassigned,
          healthy: data.healthy,
          warning: data.warning,
          critical: data.critical,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getAnimalStatus = (animal) => {
    const temp = parseFloat(animal.device?.temperature ?? animal.baseline_temperature) || 38.5;
    if (temp > 39.5) return 'critical';
    if (temp > 39) return 'warning';
    return 'healthy';
  };

  const totalPages = Math.ceil(totalAnimals / perPage);

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    if (years > 0) {
      return `${years}y`;
    } else if (months > 0) {
      return `${months}m`;
    }
    return null;
  };

  const filteredAnimals = animals.filter((animal) => {
    const search = debouncedSearch.toLowerCase();
    const matchesSearch = !debouncedSearch || 
      animal.animal_id?.toLowerCase().includes(search) ||
      animal.name?.toLowerCase().includes(search) ||
      animal.breed?.toLowerCase().includes(search) ||
      animal.species?.toLowerCase().includes(search);
    
    const animalStatus = getAnimalStatus(animal);
    const animalDeviceId = animal.device?.device_id || animal.device_id;
    const animalOwnerId = animal.owner?.id || animal.owner_id;
    const animalDeviceStatus = animalDeviceId ? getDeviceStatus(animalDeviceId) : null;
    const isDeviceOffline = animalDeviceStatus === 'offline' || animalDeviceStatus === 'low_signal';
    
    const matchesSpecies = speciesFilter === 'all' || animal.species === speciesFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'healthy' && animalStatus === 'healthy') ||
      (statusFilter === 'warning' && animalStatus === 'warning') ||
      (statusFilter === 'critical' && animalStatus === 'critical') ||
      (statusFilter === 'device_issue' && isDeviceOffline);
    const matchesDevice = deviceFilter === 'all' ||
      (deviceFilter === 'assigned' && animalDeviceId) ||
      (deviceFilter === 'unassigned' && !animalDeviceId) ||
      (deviceFilter === 'offline' && isDeviceOffline);
    
    const matchesOwner = ownerFilter === 'all' || String(animalOwnerId) === String(ownerFilter);
    
    return matchesSearch && matchesSpecies && matchesStatus && matchesDevice && matchesOwner;
  });

  const speciesOptions = [...new Set(animals.map(a => a.species).filter(Boolean))];
  const ownerOptions = users.filter(u => u.role === 'Owner' || u.role === 'Admin');
  const filteredAssigned = filteredAnimals.filter(a => a.device?.device_id || a.device_id).length;
  const filteredUnassigned = filteredAnimals.filter(a => !(a.device?.device_id || a.device_id)).length;
  const filteredHealthy = filteredAnimals.filter(a => getAnimalStatus(a) === 'healthy').length;
  const filteredWarning = filteredAnimals.filter(a => getAnimalStatus(a) === 'warning').length;
  const filteredCritical = filteredAnimals.filter(a => getAnimalStatus(a) === 'critical').length;

  const assignedDeviceIds = animals
    .map(a => a.device?.device_id || a.device_id)
    .filter(Boolean);
  const availableDevices = devices.filter(d => !assignedDeviceIds.includes(d.device_id));

  const handleAssignDevice = async () => {
    if (!selectedDevice) return;
    setAssigning(true);
    try {
      const response = await apiFetch(`/api/animals/${selectedAnimal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: selectedDevice }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: t('common.success') });
        fetchData();
        setTimeout(() => { setShowAssignModal(false); setMessage(null); }, 1500);
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('common.error') });
    } finally {
      setAssigning(false);
    }
  };

  const openAssignModal = (animal) => {
    setSelectedAnimal(animal);
    setSelectedDevice('');
    setShowAssignModal(true);
  };

  const handleExport = async () => {
    setExporting(true);
    const success = await exportData('/api/export/animals', `animals_${new Date().toISOString().split('T')[0]}.csv`);
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
        <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
        <span className="ml-3 text-on-surface-variant">Loading animals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className={`flex flex-col md:flex-row md:items-end justify-between gap-4 ${isRtl ? 'text-right' : ''}`}>
        <div>
          <h2 className="text-4xl font-black text-brand-primary">
            {t('animals.animalManagement')}
          </h2>
          <p className="text-on-surface-variant mt-2 font-medium">
            {totalAnimals} {t('common.animals')}
          </p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 bg-brand-accent text-white rounded-xl font-bold hover:bg-brand-accent transition flex items-center gap-2 disabled:opacity-50"
            >
              <MaterialSymbol icon="download" size={20} />
              {exporting ? t('common.exporting') : t('common.export')}
            </button>
          )}
          {canModify && (
            <Link
              to="/animals/new"
              className="btn-primary flex items-center gap-2"
            >
              <MaterialSymbol icon="add" size={20} />
              {t('animals.addAnimal')}
            </Link>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-[#cfe5d6] text-brand-primary' : 'bg-[#ffdad6] text-[#93000a]'}`}>
          {message.text}
        </div>
      )}

      <div className={`flex flex-wrap gap-4 items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="flex-1 min-w-[240px] relative">
          <MaterialSymbol icon="search" size={20} className={`absolute top-1/2 -translate-y-1/2 text-on-surface-subtle ${isRtl ? 'right-4 left-auto' : 'left-4'}`} />
          <input 
            type="text" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            placeholder={t('animals.searchAnimals')}
            className={`w-full bg-white rounded-xl py-3 text-sm shadow-sm focus:ring-2 focus:ring-brand-secondary/10 ${isRtl ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`} 
          />
        </div>

        <select
          value={speciesFilter}
          onChange={(e) => setSpeciesFilter(e.target.value)}
          className="bg-white rounded-xl px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-brand-secondary/10 cursor-pointer"
        >
          <option value="all">{t('animals.allSpecies')}</option>
          {speciesOptions.map(species => (
            <option key={species} value={species}>{species}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white rounded-xl px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-brand-secondary/10 cursor-pointer"
        >
          <option value="all">{t('animals.allStatuses')}</option>
          <option value="healthy">{t('animals.healthy')}</option>
          <option value="warning">{t('alertsPage.warning')}</option>
          <option value="critical">{t('dashboard.critical')}</option>
          <option value="device_issue">{t('devices.deviceIssue') || 'Device Issue'}</option>
        </select>

        <select
          value={deviceFilter}
          onChange={(e) => setDeviceFilter(e.target.value)}
          className="bg-white rounded-xl px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-brand-secondary/10 cursor-pointer"
        >
          <option value="all">{t('animals.allDevices')}</option>
          <option value="assigned">{t('devices.assigned')}</option>
          <option value="unassigned">{t('animals.noDeviceAssigned')}</option>
          <option value="offline">{t('devices.offline')}</option>
        </select>

        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="bg-white rounded-xl px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-brand-secondary/10 cursor-pointer"
        >
          <option value="all">{t('mapPage.allOwners')}</option>
          {ownerOptions.map(owner => (
            <option key={owner.id} value={owner.id}>{owner.name}</option>
          ))}
        </select>

        <div className="flex bg-gray-100 rounded-xl p-0.5">
          <button
            onClick={() => setViewMode('tiles')}
            className={`p-2.5 rounded-lg text-sm transition-all ${viewMode === 'tiles' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
            title={t('dashboard.regionalView')}
          >
            <MaterialSymbol icon="grid_view" size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2.5 rounded-lg text-sm transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-500 hover:text-gray-700'}`}
            title={t('common.list')}
          >
            <MaterialSymbol icon="table_rows" size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-on-surface-subtle uppercase">{t('animals.title')}</p>
          <p className="text-3xl font-black text-brand-primary mt-1">{debouncedSearch || speciesFilter !== 'all' || statusFilter !== 'all' || deviceFilter !== 'all' || ownerFilter !== 'all' ? filteredAnimals.length : totalAnimals}</p>
        </div>
        <div className="bg-brand-primary p-5 rounded-2xl">
          <p className="text-xs font-bold text-white/60 uppercase">{t('devices.assigned')}</p>
          <p className="text-3xl font-black text-white mt-1">{filteredAssigned}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-on-surface-subtle uppercase">{t('animals.noDeviceAssigned')}</p>
          <p className="text-3xl font-black text-danger mt-1">{filteredUnassigned}</p>
        </div>
        <div className="bg-brand-accent/10 p-5 rounded-2xl">
          <p className="text-xs font-bold text-tertiary-container uppercase">{t('animals.health')}</p>
          <p className="text-3xl font-black text-tertiary-container mt-1">{filteredHealthy}</p>
          <p className="text-xs text-tertiary-container/60 mt-1">
            {filteredWarning} {t('alertsPage.warning')} &middot; {filteredCritical} {t('dashboard.critical')}
          </p>
        </div>
      </div>

      {filteredAnimals.length === 0 ? (
        <div className="card p-12 text-center">
          <MaterialSymbol icon="pets" size={64} className="text-on-surface-subtle mx-auto mb-4 opacity-50" />
          <p className="text-on-surface-variant font-medium text-lg">{t('animals.noAnimals')}</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-5 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('animals.name')}</th>
                <th className="text-left py-3 px-4 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('animals.species')}</th>
                <th className="text-left py-3 px-4 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('animals.breed')}</th>
                <th className="text-center py-3 px-4 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('animals.device')}</th>
                <th className="text-left py-3 px-4 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('animals.owner')}</th>
                <th className="text-center py-3 px-4 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('common.status')}</th>
                <th className="text-center py-3 px-4 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('animals.temperature')}</th>
                <th className="text-right py-3 px-5 font-bold text-brand-primary text-xs uppercase tracking-wider">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnimals.map((animal) => {
                const animalDeviceId = animal.device?.device_id || animal.device_id;
                const animalStatus = getAnimalStatus(animal);
                return (
                  <tr key={animal.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-5">
                      <Link to={`/animals/${animal.id}`} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${
                          animalStatus === 'critical' ? 'bg-danger/10' :
                          animalStatus === 'warning' ? 'bg-brand-accent/10' : 'bg-brand-primary/5'
                        }`}>
                          {animal.species === 'Camel' ? '🐪' : animal.species === 'Goat' ? '🐐' : '🐪'}
                        </div>
                        <div>
                          <p className="font-semibold text-brand-primary">{animal.animal_id}</p>
                          {animal.name && <p className="text-xs text-on-surface-subtle">{animal.name}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant">{animal.species}</td>
                    <td className="py-3 px-4 text-on-surface-variant">{animal.breed || '-'}</td>
                    <td className="text-center py-3 px-4">
                      {animalDeviceId ? (
                        <span className="text-xs font-medium text-brand-primary">{animalDeviceId}</span>
                      ) : (
                        <span className="text-xs text-danger">{t('animals.noDeviceAssigned')}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant">{animal.owner?.name || '-'}</td>
                    <td className="text-center py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        animalStatus === 'critical' ? 'bg-danger/10 text-danger' :
                        animalStatus === 'warning' ? 'bg-brand-accent/10 text-tertiary-container' :
                        'bg-[#10B981]/10 text-[#10B981]'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          animalStatus === 'critical' ? 'bg-danger' :
                          animalStatus === 'warning' ? 'bg-brand-accent' : 'bg-[#10B981]'
                        }`} />
                        {animalStatus}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      {(() => {
                        const liveTemp = animal.device?.temperature ?? animal.baseline_temperature;
                        return liveTemp ? (
                          <span className={`text-xs font-medium ${
                            parseFloat(liveTemp) > 39.5 ? 'text-danger' :
                            parseFloat(liveTemp) > 39 ? 'text-tertiary-container' : 'text-[#10B981]'
                          }`}>
                            {parseFloat(liveTemp).toFixed(1)}°C
                          </span>
                        ) : (
                          <span className="text-xs text-on-surface-subtle">-</span>
                        );
                      })()}
                    </td>
                    <td className="text-right py-3 px-5">
                      <div className={`flex items-center justify-end gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <Link to={`/animals/${animal.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title={t('common.view')}>
                          <MaterialSymbol icon="visibility" size={16} />
                        </Link>
                        {canModify && (
                          <>
                            <Link to={`/animals/${animal.id}/edit`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title={t('common.edit')}>
                              <MaterialSymbol icon="edit" size={16} />
                            </Link>
                            {canTransfer && (
                              <button onClick={() => { setTransferAnimalId(animal.id); setShowTransfer(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Transfer">
                                <MaterialSymbol icon="swap_horiz" size={16} />
                              </button>
                            )}
                            {!animalDeviceId && (
                              <button onClick={() => openAssignModal(animal)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title={t('animals.assignDevice')}>
                                <MaterialSymbol icon="sensors" size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAnimals.map((animal) => {
            const animalDeviceId = animal.device?.device_id || animal.device_id;
            const device = getDeviceForAnimal(animalDeviceId);
            const animalStatus = getAnimalStatus(animal);
            
return (
                <div key={animal.id} className="card overflow-hidden group">
                  <div className="p-6">
                    <div className={`flex items-start justify-between mb-4 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden ${
                          animalStatus === 'critical' ? 'bg-danger/10' :
                          animalStatus === 'warning' ? 'bg-brand-accent/10' :
                          'bg-brand-primary/5'
                        }`}>
                          {animal.identification_photo ? (
                            <img src={storageUrl(animal.identification_photo)} alt={animal.animal_id} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">
                              {animal.species === 'Camel' ? '🐪' : animal.species === 'Goat' ? '🐐' : animal.species === 'Sheep' ? '🐑' : animal.species === 'Cow' ? '🐄' : animal.species === 'Dog' ? '🐕' : '🐪'}
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-brand-primary">{animal.animal_id}</h3>
                          {animal.name && <p className="text-sm text-on-surface-subtle">{animal.name}</p>}
                          <p className="text-sm text-on-surface-subtle">{animal.species}{animal.breed && ` ${t('common.separator')} ${animal.breed}`}</p>
                        </div>
                      </div>
                    <div className={`w-3 h-3 rounded-full ${
                      animalStatus === 'critical' ? 'bg-danger animate-pulse' :
                      animalStatus === 'warning' ? 'bg-brand-accent' :
                      'bg-[#10B981]'
                    }`} />
                  </div>

                  <div className={`grid grid-cols-2 gap-3 text-sm ${isRtl ? 'text-right' : ''}`}>
                    <div className="bg-surface-light rounded-xl p-3">
                      <p className="text-xs text-on-surface-subtle">{t('animals.gender')}</p>
                      <p className="font-semibold text-brand-primary capitalize">{animal.gender || '-'}</p>
                    </div>
                    <div className="bg-surface-light rounded-xl p-3">
                      <p className="text-xs text-on-surface-subtle">{t('animals.age')}</p>
                      <p className="font-semibold text-brand-primary">{calculateAge(animal.date_of_birth) || '-'}</p>
                    </div>
                    <div className="bg-surface-light rounded-xl p-3">
                      <p className="text-xs text-on-surface-subtle">{t('animals.weight')}</p>
                      <p className="font-semibold text-brand-primary">{animal.current_weight ? `${animal.current_weight} ${t('common.kg')}` : '-'}</p>
                    </div>
                    <div className="bg-surface-light rounded-xl p-3">
                      <p className="text-xs text-on-surface-subtle">{t('animals.temperature')}</p>
                      {(() => {
                        const liveTemp = animal.device?.temperature ?? animal.baseline_temperature;
                        return (
                          <p className={`font-semibold flex items-center gap-1 ${
                            parseFloat(liveTemp) > 39.5 ? 'text-danger' :
                            parseFloat(liveTemp) > 39 ? 'text-tertiary-container' : 'text-[#10B981]'
                          }`}>
                            <MaterialSymbol icon="device_thermostat" size={16} />
                            {liveTemp ? `${parseFloat(liveTemp).toFixed(1)}°C` : '-'}
                          </p>
                        );
                      })()}
                    </div>
                    <div className="bg-surface-light rounded-xl p-3">
                      <p className="text-xs text-on-surface-subtle">{t('animals.device')}</p>
                      <p className="font-semibold text-brand-primary text-xs">
                        {animal.device?.device_id ? animal.device.device_id : 
                         animalDeviceId && !/^\d+$/.test(animalDeviceId) ? animalDeviceId : '-'}
                      </p>
                    </div>
                    <div className="bg-surface-light rounded-xl p-3">
                      <p className="text-xs text-on-surface-subtle">{t('animals.owner')}</p>
                      <p className="font-semibold text-brand-primary text-sm truncate">
                        {animal.owner?.name || '-'}
                      </p>
                    </div>
                    <div className="bg-surface-light rounded-xl p-3">
                      <p className="text-xs text-on-surface-subtle">{t('animals.groups')}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {animal.groups?.length > 0 ? animal.groups.map(g => (
                          <span key={g.id} className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: g.color || '#D4AF37', color: '#fff' }}>
                            {g.name}
                          </span>
                        )) : <span className="text-xs font-semibold text-brand-primary">-</span>}
                      </div>
                    </div>
                  </div>

                  {device && (
                    <div className={`flex items-center gap-2 mt-4 p-3 rounded-xl ${device.status === 'offline' ? 'bg-danger/5' : 'bg-[#10B981]/5'} ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <MaterialSymbol 
                        icon={device.status === 'offline' ? 'wifi_off' : 'wifi'} 
                        size={16} 
                        className={device.status === 'offline' ? 'text-danger' : 'text-[#10B981]'} 
                      />
                      <span className={`text-xs font-medium ${device.status === 'offline' ? 'text-danger' : 'text-[#10B981]'}`}>
                        {device.status === 'offline' ? t('devices.offline') : t('devices.online')}
                      </span>
                      {device.battery_level !== undefined && (
                        <span className="text-xs text-on-surface-subtle">{device.battery_level}%</span>
                      )}
                      {device.last_ping && (
                        <span className={`text-xs text-on-surface-subtle ml-auto ${device.status === 'offline' ? '' : ''}`}>
                          Last: {new Date(device.last_ping).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className={`flex border-t border-[#F4F4EF] ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <Link 
                    to={`/animals/${animal.id}`}
                    className="flex-1 py-3 text-center text-sm font-semibold text-brand-primary hover:bg-surface-light transition-colors"
                  >
                    {t('common.view')}
                  </Link>
                      {canModify && (
                        <>
                          <Link 
                            to={`/animals/${animal.id}/edit`}
                            className="flex-1 py-3 text-center text-sm font-semibold text-[#717473] hover:bg-surface-light hover:text-brand-primary transition-colors border-x border-[#F4F4EF]"
                          >
                            {t('common.edit')}
                          </Link>
                          {canTransfer && (
                            <button 
                              onClick={() => { setTransferAnimalId(animal.id); setShowTransfer(true); }}
                              className="flex-1 py-3 text-center text-sm font-semibold text-[#717473] hover:bg-surface-light hover:text-brand-primary transition-colors border-x border-[#F4F4EF]"
                            >
                              <MaterialSymbol icon="swap_horiz" size={16} />
                              Transfer
                            </button>
                          )}
                          {!animalDeviceId && (
                            <button 
                              onClick={() => openAssignModal(animal)}
                              className="flex-1 py-3 text-center text-sm font-semibold text-[#717473] hover:bg-surface-light hover:text-brand-primary transition-colors"
                            >
                              {t('animals.assignDevice')}
                            </button>
                          )}
                        </>
                      )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredAnimals.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          perPage={perPage}
          total={totalAnimals}
          dir={dir}
          onPageChange={setCurrentPage}
          onPerPageChange={(value) => { setPerPage(value); setCurrentPage(1); }}
        />
      )}

      {showAssignModal && selectedAnimal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className={`flex items-center justify-between mb-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div>
                <h3 className="text-2xl font-bold text-brand-primary">{t('animals.assignDevice')}</h3>
                <p className="text-sm text-on-surface-subtle mt-1">{selectedAnimal.animal_id}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-3 hover:bg-surface-light rounded-xl transition">
                <MaterialSymbol icon="close" size={24} className="text-on-surface-subtle" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>
                  {t('devices.title')} *
                </label>
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="input-field"
                >
                  <option value="">{t('common.selectDevice')}</option>
                  {availableDevices.map(d => (
                    <option key={d.id} value={d.device_id}>
                      {d.device_id} {t('common.separator')} {d.status}{d.battery ? ` (${d.battery}${t('common.percent')})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className={`flex gap-4 pt-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-3 bg-surface-light text-brand-primary rounded-xl font-bold text-sm hover:bg-surface-high transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleAssignDevice}
                  disabled={!selectedDevice || assigning}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {assigning ? t('common.loading') : t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTransfer && (
        <TransferCreateModal
          preselectedAnimalIds={[transferAnimalId]}
          onClose={() => { setShowTransfer(false); setTransferAnimalId(null); }}
          onCreated={() => { fetchData(); }}
        />
      )}
    </div>
  );
}

