import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MaterialSymbol } from 'react-material-symbols';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';

const createAnimalIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
      ">🐪</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

function getAnimalStatus(animal) {
  const device = animal.device;
  if (!device) return 'healthy';
  const lastPing = device.last_ping ? new Date(device.last_ping) : null;
  const hoursSincePing = lastPing ? (Date.now() - lastPing) / 3600000 : Infinity;
  const battery = parseInt(device.battery_level) || 100;
  if (hoursSincePing > 24 || battery < 10) return 'critical';
  if (hoursSincePing > 6 || battery < 30) return 'warning';
  return 'healthy';
}

function getAnimalGroupColor(animal) {
  if (animal.groups && animal.groups.length > 0) {
    return animal.groups[0].color || '#10b981';
  }
  return '#10b981';
}

function getBatteryIcon(level) {
  const battery = parseInt(level) || 100;
  if (battery < 20) return 'battery_alert';
  if (battery < 50) return 'battery_low';
  return 'battery_full';
}

function getBatteryColor(level) {
  const battery = parseInt(level) || 100;
  if (battery < 20) return 'text-red-500';
  if (battery < 30) return 'text-amber-500';
  return 'text-green-600';
}

function MapUpdater({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [bounds, map]);
  return null;
}

export default function MapWidget({ dashboardData }) {
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const isRtl = dir === 'rtl';

  const { animals, geofences } = dashboardData;
  const [viewMode, setViewMode] = useState('markers');
  const [showGeofences, setShowGeofences] = useState(true);
  const [selectedGeofence, setSelectedGeofence] = useState('all');

  const allPositions = [];
  (animals || []).forEach(animal => {
    if (animal.lat && animal.lng) {
      allPositions.push([animal.lat, animal.lng]);
    }
    if (animal.path && animal.path.length > 0) {
      animal.path.forEach(p => allPositions.push(p));
    }
  });

  const bounds = allPositions.length > 1
    ? [
        [Math.min(...allPositions.map(p => p[0])), Math.min(...allPositions.map(p => p[1]))],
        [Math.max(...allPositions.map(p => p[0])), Math.max(...allPositions.map(p => p[1]))]
      ]
    : allPositions.length === 1
      ? [allPositions[0], allPositions[0]]
      : [[24.7136, 46.6753], [24.7136, 46.6753]];

  const filteredAnimals = (animals || []).filter(animal => {
    if (selectedGeofence === 'all') return true;
    return animal.geofences?.some(g => g.id === parseInt(selectedGeofence));
  });

  const animalsWithPaths = (filteredAnimals || []).filter(a => a.path && a.path.length > 0);
  const animalsOnMap = (filteredAnimals || []).filter(a => a.lat && a.lng);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
          {[
            { mode: 'markers', label: t('dashboard.regionalView'), icon: 'map' },
            { mode: 'paths', label: t('dashboard.paths'), icon: 'route' },
          ].map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                viewMode === mode
                  ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white shadow-lg shadow-brand-primary/20'
                  : 'bg-surface-light text-on-surface-variant hover:bg-surface-high'
              }`}
            >
              <MaterialSymbol icon={icon} size={16} />
              {label}
            </button>
          ))}
          <div className="w-px bg-surface-high" />
          <button
            onClick={() => setShowGeofences(!showGeofences)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              showGeofences
                ? 'bg-gradient-to-br from-[#735C00] to-[#D4AF37] text-white shadow-lg shadow-brand-accent/20'
                : 'bg-surface-light text-on-surface-variant hover:bg-surface-high'
            }`}
          >
            <MaterialSymbol icon="layers" size={16} />
            {t('nav.geofences')}
          </button>
          <select
            value={selectedGeofence}
            onChange={(e) => setSelectedGeofence(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm font-medium bg-surface-light text-on-surface-variant border-0 focus:ring-2 focus:ring-brand-accent cursor-pointer"
          >
            <option value="all">{t('mapPage.allFences') || 'All Areas'}</option>
            {(geofences || []).map(geofence => (
              <option key={geofence.id} value={geofence.id}>{geofence.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="h-[450px] relative rounded-3xl overflow-hidden">
        <MapContainer
          center={[24.7136, 46.6753]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater bounds={bounds} />

          {showGeofences && (geofences || []).map((geofence) => {
            let coords = geofence.coordinates;
            if (typeof coords === 'string') {
              try { coords = JSON.parse(coords); } catch { coords = null; }
            }
            if (!coords || !Array.isArray(coords) || coords.length < 3) return null;
            return (
              <Polygon
                key={geofence.id}
                positions={coords}
                pathOptions={{
                  color: geofence.color || '#D4AF37',
                  fillColor: geofence.color || '#D4AF37',
                  fillOpacity: 0.12,
                  weight: 2,
                  dashArray: geofence.is_active === false ? '6,4' : null,
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[160px]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: geofence.color || '#D4AF37' }} />
                      <h3 className="font-bold text-brand-primary">{geofence.name}</h3>
                    </div>
                    <p className="text-xs text-on-surface-subtle">{coords.length} boundary points</p>
                    {geofence.is_active === false && (
                      <p className="text-xs text-amber-600 font-semibold mt-1">Inactive</p>
                    )}
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {viewMode === 'markers' && animalsOnMap.map((animal) => {
            const groupColor = getAnimalGroupColor(animal);
            const battery = parseInt(animal.device?.battery_level) || 100;
            return (
              <Marker
                key={animal.id}
                position={[animal.lat, animal.lng]}
                icon={createAnimalIcon(groupColor)}
              >
                <Popup>
                  <div className="p-3 min-w-[200px]">
                    <h3 className="font-bold text-brand-primary text-lg">{animal.name || animal.animal_id}</h3>
                    <p className="text-sm text-on-surface-variant mt-1">{animal.species}</p>
                    {['Admin', 'Owner', 'Manager'].includes(user?.role) && (
                      <div className="mt-2 space-y-1 text-xs">
                        {animal.device?.battery_level != null && (
                          <p className="flex items-center gap-1">
                            <MaterialSymbol icon={getBatteryIcon(battery)} size={14} className={getBatteryColor(battery)} />
                            <span>{battery}%</span>
                          </p>
                        )}
                        {animal.owner?.name && <p>Owner: {animal.owner.name}</p>}
                        {(animal.temperature ?? animal.baseline_temperature) && <p>🌡️ {animal.temperature ?? animal.baseline_temperature}°C</p>}
                      </div>
                    )}
                    {user?.role === 'Doctor' && (
                      <div className="mt-2 space-y-1 text-xs">
                        {(animal.temperature ?? animal.baseline_temperature) && <p>🌡️ {animal.temperature ?? animal.baseline_temperature}°C</p>}
                        {animal.heart_rate && <p>💓 {animal.heart_rate} bpm</p>}
                        {animal.weight && <p>⚖️ {animal.weight} kg</p>}
                      </div>
                    )}
                    {user?.role === 'Shepherd' && (
                      <div className="mt-2 space-y-1 text-xs">
                        <p className="flex items-center gap-1">
                          <MaterialSymbol icon={getBatteryIcon(battery)} size={14} className={getBatteryColor(battery)} />
                          <span>{battery}%</span>
                        </p>
                        {animal.device?.signal_strength != null && <p>📶 Signal: {animal.device.signal_strength}</p>}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {viewMode === 'paths' && animalsWithPaths.map((animal) => {
            const status = getAnimalStatus(animal);
            const pathColor = status === 'critical' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#10b981';
            return (
              <Polyline
                key={animal.id}
                positions={animal.path}
                color={pathColor}
                weight={3}
                opacity={0.8}
              />
            );
          })}
          {viewMode === 'paths' && animalsWithPaths.map((animal) => {
            const lastPos = animal.path[animal.path.length - 1];
            const groupColor = getAnimalGroupColor(animal);
            return (
              <Marker
                key={`marker-${animal.id}`}
                position={lastPos}
                icon={createAnimalIcon(groupColor)}
              >
                <Popup>
                  <div className="p-3">
                    <h3 className="font-bold text-brand-primary">{animal.name || animal.animal_id}</h3>
                    <p className="text-xs text-on-surface-variant">{animal.path.length} tracking points</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        <div className={`absolute bottom-6 z-[1000] bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-lg shadow-brand-primary/10 flex items-center gap-6 ${isRtl ? 'right-6' : 'left-6'}`}>
          <span className="text-sm font-medium text-on-surface-variant">
            {filteredAnimals.length} animals tracked
          </span>
          <Link to="/map" className="text-sm font-bold text-brand-accent hover:underline flex items-center gap-1">
            {t('dashboard.fullTracker')}
            <MaterialSymbol icon="arrow_forward" size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
