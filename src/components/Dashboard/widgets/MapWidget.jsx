import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MaterialSymbol } from 'react-material-symbols';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n';

const createCustomIcon = () => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, var(--primary), var(--primary-container));
        border-radius: 50%;
        border: 3px solid var(--tertiary);
        box-shadow: 0 4px 12px rgba(var(--primary-container-rgb), 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
      ">🐪</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

function MapUpdater({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [bounds, map]);
  return null;
}

const pathColors = [
  '#002819', '#06402B', '#735c00', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
];

export default function MapWidget({ dashboardData }) {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';

  const { animals, geofences } = dashboardData;
  const [viewMode, setViewMode] = useState('markers');
  const [showGeofences, setShowGeofences] = useState(true);

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
      : [[24.4539, 54.3773], [24.4539, 54.3773]];

  const animalsWithPaths = (animals || []).filter(a => a.path && a.path.length > 0);

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
                  ? 'bg-gradient-to-br from-[#002819] to-[#06402B] text-white shadow-lg shadow-[#002819]/20'
                  : 'bg-[#F4F4EF] text-[#404943] hover:bg-[#E3E3DE]'
              }`}
            >
              <MaterialSymbol icon={icon} size={16} />
              {label}
            </button>
          ))}
          <div className="w-px bg-[#E3E3DE]" />
          <button
            onClick={() => setShowGeofences(!showGeofences)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              showGeofences
                ? 'bg-gradient-to-br from-[#735C00] to-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/20'
                : 'bg-[#F4F4EF] text-[#404943] hover:bg-[#E3E3DE]'
            }`}
          >
            <MaterialSymbol icon="layers" size={16} />
            {t('nav.geofences')}
          </button>
        </div>
      </div>
      <div className="h-[450px] relative rounded-3xl overflow-hidden">
        <MapContainer
          center={[24.4539, 54.3773]}
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
                      <h3 className="font-bold text-[#002819]">{geofence.name}</h3>
                    </div>
                    <p className="text-xs text-[#717973]">{coords.length} boundary points</p>
                    {geofence.is_active === false && (
                      <p className="text-xs text-amber-600 font-semibold mt-1">Inactive</p>
                    )}
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {viewMode === 'markers' && (animals || []).filter(a => a.lat && a.lng).map((animal) => (
            <Marker
              key={animal.id}
              position={[animal.lat, animal.lng]}
              icon={createCustomIcon()}
            >
              <Popup>
                <div className="p-3 min-w-[200px]">
                  <h3 className="font-bold text-[#002819] text-lg">{animal.animal_id}</h3>
                  <p className="text-sm text-[#404943] mt-1">{animal.species}</p>
                  {animal.baseline_temperature && (
                    <p className="text-xs mt-2 text-[#735C00]">🌡️ {animal.baseline_temperature}°C</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {viewMode === 'paths' && animalsWithPaths.map((animal, idx) => (
            <Polyline
              key={animal.id}
              positions={animal.path}
              color={pathColors[idx % pathColors.length]}
              weight={3}
              opacity={0.8}
            />
          ))}
          {viewMode === 'paths' && animalsWithPaths.map((animal, idx) => (
            <Marker
              key={`marker-${animal.id}`}
              position={animal.path[animal.path.length - 1]}
              icon={createCustomIcon()}
            >
              <Popup>
                <div className="p-3">
                  <h3 className="font-bold text-[#002819]">{animal.animal_id}</h3>
                  <p className="text-xs text-[#404943]">{animal.path.length} tracking points</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <div className={`absolute bottom-6 z-[1000] bg-white/95 backdrop-blur-sm rounded-2xl px-5 py-3 shadow-lg shadow-[#002819]/10 flex items-center gap-6 ${isRtl ? 'right-6' : 'left-6'}`}>
          <span className="text-sm font-medium text-[#404943]">
            {animalsWithPaths.length} animals tracked
          </span>
          <Link to="/map" className="text-sm font-bold text-[#D4AF37] hover:underline flex items-center gap-1">
            {t('dashboard.fullTracker')}
            <MaterialSymbol icon="arrow_forward" size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
