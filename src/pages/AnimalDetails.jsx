import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch, storageUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import TransferCreateModal from '../components/Transfers/TransferCreateModal';

const createMarkerIcon = (status) => {
  const colors = { healthy: '#10b981', warning: '#f59e0b', critical: '#ef4444' };
  const color = colors[status] || '#10b981';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:40px;height:40px;background:${color};border-radius:50%;border:4px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:20px;">🐪</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 14, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

export default function AnimalDetails() {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const canModify = user?.role !== 'Shepherd' && user?.role !== 'Doctor';
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState(null);
  const [owner, setOwner] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [activityHistory, setActivityHistory] = useState([]);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    fetchAnimal();
  }, [id]);

  const handleTransferClick = () => {
    setShowTransferModal(true);
  };

const fetchAnimal = async () => {
    try {
      const [animalRes, historyRes, alertsRes] = await Promise.all([
        apiFetch(`/api/animals/${id}`),
        apiFetch(`/api/animals/${id}/location-history?hours=720`),
        apiFetch(`/api/geofence-alerts?per_page=20&animal_id=${id}`),
      ]);
      if (animalRes.ok) {
        const animalData = await animalRes.json();
        const animalObj = animalData.data || animalData;
        setAnimal(animalObj);
        
        if (animalObj.device) {
          setDevice(animalObj.device);
        }
        
        if (animalObj.owner) {
          setOwner(animalObj.owner);
        }

        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setLocationHistory(historyData.locations || []);
        }

        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setActivityHistory(alertsData.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch animal:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPathPositions = () => {
    return locationHistory.map(loc => [parseFloat(loc.latitude), parseFloat(loc.longitude)]);
  };

  const getCurrentPosition = () => {
    const positions = getPathPositions();
    if (positions.length > 0) {
      return positions[positions.length - 1];
    }
    if (device?.gps_lat && device?.gps_lng) {
      return [parseFloat(device.gps_lat), parseFloat(device.gps_lng)];
    }
    return null;
  };

  const getStatus = () => {
    const temp = parseFloat(animal?.baseline_temperature) || 38.5;
    if (temp > 39.5) return 'critical';
    if (temp > 39) return 'warning';
    return 'healthy';
  };

  const statusConfig = getStatusConfig(animal?.baseline_temperature);
  const positions = getPathPositions();
  const currentPosition = getCurrentPosition();
  const status = getStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-500">{t('animalDetailsPage.animalNotFound')}</p>
        <Link to="/animals" className="text-emerald-700 font-bold hover:underline">{t('animalDetailsPage.backToAnimals')}</Link>
      </div>
    );
  }

  return (
    <main className="p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Hero Header */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 items-stretch">
          {/* Main Hero Image */}
          <div className="lg:col-span-8 relative rounded-[2rem] overflow-hidden shadow-2xl h-[400px] group">
            {animal.identification_photo ? (
              <img src={storageUrl(animal.identification_photo)} alt={animal.animal_id} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                <MaterialSymbol icon="pets" size={120} className="text-emerald-300" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/90 via-[#002819]/30 to-transparent"></div>
            <div className={`absolute bottom-0 right-0 left-0 p-10 flex flex-col md:flex-row justify-between items-end gap-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className={isRtl ? 'text-right' : ''}>
                <div className={`flex items-center gap-3 mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <span className="px-3 py-1 bg-amber-400 text-emerald-950 text-[10px] font-bold rounded-full uppercase tracking-widest shadow-lg shadow-amber-400/20">
                    {animal.species}
                  </span>
                  <span className="text-emerald-100/70 text-sm font-medium">| ID: {animal.animal_id}</span>
                </div>
                <h2 className="text-5xl font-extrabold text-white brand-font tracking-tight mb-2">
                  {animal.name || animal.breed || animal.species}
                </h2>
                <div className={`flex items-center gap-2 text-emerald-100/80 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <MaterialSymbol icon="person" className="text-amber-400" />
                  <span className="font-medium">{owner?.name || t('animalDetailsPage.unassignedOwner')}</span>
                </div>
              </div>
              <div className={`flex gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                {canModify && (
                  <Link to={`/animals/${id}/edit`} className={`bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-xl font-bold transition-all border border-white/10 flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <MaterialSymbol icon="edit" />
                    {t('animals.editProfile')}
                  </Link>
                )}
                {canModify && (
                  <Link to={`/auctions/new?animal=${id}`} className={`bg-amber-400 hover:bg-amber-500 text-emerald-950 px-8 py-3 rounded-xl font-bold transition-all shadow-xl shadow-amber-900/20 flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <MaterialSymbol icon="gavel" />
                    {t('animalDetailsPage.sellAnimal')}
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Right Cards */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Ownership Card */}
            <div className="bg-brand-secondary text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden flex-1 flex flex-col justify-between">
              <div className="relative z-10">
                <div className={`flex justify-between items-start ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <h3 className={`text-emerald-200 text-xs font-bold uppercase tracking-[0.2em] mb-4 ${isRtl ? 'text-right' : ''}`}>{t('animalDetailsPage.verifiedOwnership')}</h3>
                  <MaterialSymbol icon="verified_user" className="text-emerald-200/50" />
                </div>
                <p className={`text-2xl font-bold brand-font mb-1 text-white ${isRtl ? 'text-right' : ''}`}>{t('animalDetailsPage.verifiedOwnership')}</p>
                <p className={`text-emerald-100/60 text-sm leading-relaxed ${isRtl ? 'text-right' : ''}`}>
                  {owner ? t('animalDetailsPage.legalCustody', { name: owner.name }) : t('animalDetailsPage.noOwner')}
                </p>
              </div>
              {canModify && (
                <button onClick={handleTransferClick} className={`w-full bg-emerald-800 hover:bg-emerald-700 text-amber-400 py-4 rounded-2xl font-bold transition-all mt-6 flex items-center justify-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <MaterialSymbol icon="swap_horiz" />
                  {t('animalDetailsPage.transferOwnership')}
                </button>
              )}
              <div className={`absolute w-40 h-40 bg-emerald-800/30 rounded-full blur-3xl ${isRtl ? '-left-8 -top-8 right-auto' : '-right-8 -top-8'}`}></div>
            </div>

          {/* Quick Details Card */}
          <div className="bg-white p-6 rounded-[2rem] flex items-center gap-5 border border-outline/10 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-[#cba72f]/20 flex items-center justify-center text-tertiary-container">
              <MaterialSymbol icon="location_on" className="text-3xl" />
            </div>
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{t('animals.location')}</p>
            <p className="text-lg font-bold text-on-surface">{currentPosition ? t('animalDetailsPage.gpsLocated') : t('animalDetailsPage.noData')}</p>
            <p className="text-sm text-on-surface-variant/70">{locationHistory.length} {t('animalDetailsPage.trackingPoints')}</p>
          </div>
          </div>
        </div>
      </section>

      {/* Live Telemetry Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Temperature */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-all border border-outline/5">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
              <MaterialSymbol icon="device_thermostat" />
            </div>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusConfig.bg}`}>
              {statusConfig.label}
            </span>
          </div>
          <p className="text-on-surface-variant text-sm font-medium mb-1">{t('animalDetailsPage.bodyTemperature')}</p>
          <div className="flex items-baseline gap-1">
            <h4 className="text-3xl font-extrabold text-on-surface brand-font">{animal.baseline_temperature || '38.5'}</h4>
            <span className="text-on-surface-variant font-bold">°C</span>
          </div>
          <div className="mt-4 w-full bg-surface-dim h-1 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${status === 'critical' ? 'bg-red-500 w-[90%]' : status === 'warning' ? 'bg-amber-500 w-[75%]' : 'bg-emerald-500 w-[50%]'}`}></div>
          </div>
        </div>

        {/* Speed */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-all border border-outline/5">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <MaterialSymbol icon="speed" />
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Active</span>
          </div>
          <p className="text-on-surface-variant text-sm font-medium mb-1">{t('animalDetailsPage.currentSpeed')}</p>
          <div className="flex items-baseline gap-1">
            <h4 className="text-3xl font-extrabold text-on-surface brand-font">{locationHistory.length > 0 ? (locationHistory[locationHistory.length - 1].speed || '0') : '0'}</h4>
            <span className="text-on-surface-variant font-bold">km/h</span>
          </div>
          <div className="mt-4 w-full bg-surface-dim h-1 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full w-[40%] rounded-full"></div>
          </div>
        </div>

        {/* Activity */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-all border border-outline/5">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <MaterialSymbol icon="directions_run" />
            </div>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-emerald-600">Live</span>
            </span>
          </div>
          <p className="text-on-surface-variant text-sm font-medium mb-1">Current Activity</p>
          <div className="flex items-baseline gap-1">
            <h4 className="text-3xl font-extrabold text-on-surface brand-font">{currentPosition ? 'Moving' : 'No Data'}</h4>
          </div>
          <p className="mt-4 text-[11px] text-on-surface-variant/60 font-medium">{positions.length} points tracked</p>
        </div>

        {/* Battery */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-all border border-outline/5">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <MaterialSymbol icon="battery_5_bar" />
            </div>
            <span className="text-[10px] font-bold text-on-surface-variant bg-surface-dim px-2 py-1 rounded-full">
              {device?.device_id || 'No Device'}
            </span>
          </div>
          <p className="text-on-surface-variant text-sm font-medium mb-1">Sensor Battery</p>
          <div className="flex items-baseline gap-1">
            <h4 className="text-3xl font-extrabold text-on-surface brand-font">{device?.battery_level || '0'}</h4>
            <span className="text-on-surface-variant font-bold">%</span>
          </div>
          <div className="mt-4 w-full bg-surface-dim h-1 rounded-full overflow-hidden">
            <div className={`h-full rounded-full shadow-[0_0_8px_rgba(212,175,55,0.4)] ${(device?.battery_level || 0) > 50 ? 'bg-emerald-400' : (device?.battery_level || 0) > 20 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${device?.battery_level || 0}%` }}></div>
          </div>
        </div>
      </section>

      {/* Animal Info Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Basic Information */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-outline/5">
          <h3 className="text-xl font-bold text-brand-primary brand-font mb-6">Basic Information</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-[#eeeee9]">
              <span className="text-on-surface-variant">Animal ID</span>
              <span className="font-bold text-on-surface">{animal.animal_id}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-[#eeeee9]">
              <span className="text-on-surface-variant">Species</span>
              <span className="font-bold text-on-surface">{animal.species}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-[#eeeee9]">
              <span className="text-on-surface-variant">Breed</span>
              <span className="font-bold text-on-surface">{animal.breed || 'Not specified'}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-[#eeeee9]">
              <span className="text-on-surface-variant">Gender</span>
              <span className="font-bold text-on-surface">{animal.gender}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-[#eeeee9]">
              <span className="text-on-surface-variant">Date of Birth</span>
              <span className="font-bold text-on-surface">{animal.date_of_birth || 'Not specified'}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-on-surface-variant">Weight</span>
              <span className="font-bold text-on-surface">{animal.current_weight ? `${animal.current_weight} kg` : 'Not specified'}</span>
            </div>
          </div>
        </div>

        {/* Health Benchmarks */}
        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-outline/5">
          <h3 className="text-xl font-bold text-brand-primary brand-font mb-6">Health Benchmarks</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-[#eeeee9]">
              <span className="text-on-surface-variant">Baseline Temp</span>
              <span className="font-bold text-on-surface">{animal.baseline_temperature ? `${animal.baseline_temperature}°C` : '38.5°C'}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-[#eeeee9]">
              <span className="text-on-surface-variant">Normal Heart Rate</span>
              <span className="font-bold text-on-surface">{animal.normal_heart_rate ? `${animal.normal_heart_rate} BPM` : '30-50 BPM'}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-[#eeeee9]">
              <span className="text-on-surface-variant">Tracking Device</span>
              <span className="font-bold text-on-surface">{device?.device_id || 'Not assigned'}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-[#eeeee9]">
              <span className="text-on-surface-variant">Device Status</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                device?.status === 'online' ? 'bg-emerald-100 text-emerald-700' :
                device?.status === 'low_signal' ? 'bg-amber-100 text-amber-700' :
                'bg-stone-100 text-stone-600'
              }`}>
                {device?.status || 'Offline'}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-on-surface-variant">Color/Markings</span>
              <span className="font-bold text-on-surface">{animal.color_markings || 'Not specified'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Location & Map */}
      <section className="bg-white rounded-[2.5rem] shadow-sm border border-outline/5 overflow-hidden mb-8">
        <div className="p-6 flex justify-between items-center border-b border-[#eeeee9]">
          <div>
            <h3 className="text-xl font-bold text-brand-primary brand-font">Live Location & Movement Path</h3>
            <p className="text-sm text-on-surface-variant/70 font-medium mt-1">Last 48 hours of tracking data</p>
          </div>
          <Link to="/map" className="text-emerald-700 font-bold text-sm hover:text-emerald-900 flex items-center gap-2">
            View Full Map
            <MaterialSymbol icon="open_in_new" size={18} />
          </Link>
        </div>
        <div className="h-[450px] relative z-0">
          {positions.length > 0 ? (
            <MapContainer 
              center={currentPosition || [24.7136, 46.6753]} 
              zoom={14} 
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapUpdater center={currentPosition} zoom={14} />
              
              {positions.length > 1 && (
                <Polyline
                  positions={positions}
                  color={status === 'critical' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#10b981'}
                  weight={4}
                  opacity={0.8}
                />
              )}
              
              {currentPosition && (
                <Marker position={currentPosition} icon={createMarkerIcon(status)}>
                  <Popup>
                    <div className="p-2">
                      <p className="font-bold text-brand-primary">{animal.animal_id}</p>
                      <p className="text-sm text-on-surface-variant">{animal.species} - {animal.breed || animal.species}</p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200">
              <div className="text-center">
                <MaterialSymbol icon="location_off" size={64} className="text-emerald-300 mx-auto mb-4" />
                <p className="text-emerald-700 font-bold text-lg">No Tracking Data Available</p>
                <p className="text-emerald-600 text-sm mt-2">This animal has no location history in the last 30 days</p>
                {device?.gps_lat && device?.gps_lng && (
                  <p className="text-emerald-500 text-xs mt-1">Last known: {device.gps_lat}, {device.gps_lng}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Alert History */}
<section className="bg-white rounded-[2.5rem] shadow-sm border border-outline/5 overflow-hidden">
        <div className="p-10 flex justify-between items-center border-b border-[#eeeee9]">
          <h3 className="text-2xl font-bold text-brand-primary brand-font">Recent Activity</h3>
          <Link to="/alerts" className="text-sm font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-2">
            View All Activity Log
            <MaterialSymbol icon="arrow_forward" />
          </Link>
        </div>
        <div className="divide-y divide-[#eeeee9]/50">
          {activityHistory.length === 0 ? (
            <div className="px-10 py-8 text-center text-on-surface-subtle">
              <MaterialSymbol icon="history" size={32} className="mx-auto mb-2 opacity-50" />
              <p>No recent activity recorded</p>
            </div>
          ) : (
            activityHistory.slice(0, 5).map((alert) => {
              const isEntry = alert.type === 'entry';
              const isExit = alert.type === 'exit';
              const isTemp = alert.type === 'temperature';
              const isOffline = alert.type === 'offline';
              const icon = isEntry ? 'login' : isExit ? 'logout' : isTemp ? 'thermostat' : isOffline ? 'wifi_off' : 'notification_important';
              const bgClass = isEntry ? 'bg-emerald-50 text-emerald-600' : isExit ? 'bg-red-50 text-red-600' : isTemp ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-600';
              const label = isEntry ? 'Entered Geofence' : isExit ? 'Exited Geofence' : isTemp ? 'Temperature Alert' : isOffline ? 'Device Offline' : 'Alert';
              const geofenceName = alert.geofence?.name || (isTemp ? 'Temperature' : isOffline ? 'Device' : 'Geofence');
              return (
              <div key={alert.id} className="px-10 py-6 flex items-center gap-6 hover:bg-surface-light/50 transition-colors">
                <div className={`p-3 rounded-xl ${bgClass}`}>
                  <MaterialSymbol icon={icon} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-on-surface">{label}</p>
                  <p className="text-sm text-on-surface-variant/80">{geofenceName}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${bgClass}`}>
                    {alert.type.toUpperCase()}
                  </span>
                  <p className="text-[10px] text-on-surface-subtle mt-1">
                    {new Date(alert.triggered_at).toLocaleString()}
                  </p>
                </div>
              </div>
              );
            })
          )}
        </div>
        {activityHistory.length > 0 && (
          <div className="px-10 py-6 bg-surface-light/30 border-t border-[#eeeee9] flex justify-center">
            <Link to="/alerts" className="text-emerald-800 font-bold text-sm hover:underline">
              View All Activity Log
            </Link>
          </div>
        )}
      </section>

      {showTransferModal && (
        <TransferCreateModal
          preselectedAnimalIds={[parseInt(id)]}
          onClose={() => setShowTransferModal(false)}
          onCreated={() => fetchAnimal()}
        />
      )}
      </div>
    </main>
  );
}

function getStatusConfig(temp) {
  const tempNum = parseFloat(temp) || 38.5;
  if (tempNum > 39.5) return { bg: 'bg-red-50 text-red-700', label: 'Critical' };
  if (tempNum > 39) return { bg: 'bg-amber-50 text-amber-700', label: 'Warning' };
  return { bg: 'bg-emerald-50 text-emerald-700', label: 'Normal' };
}

