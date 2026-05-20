import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { useI18n } from '../i18n';

const INTERVAL_OPTIONS = [
  { value: 5, label: '5s' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '60s' },
];

const BATTERY_DRAIN_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 1, label: '1%/tick' },
  { value: 2, label: '2%/tick' },
  { value: 5, label: '5%/tick' },
];

export default function SimulatorPage({ embedded }) {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';

  const [simulatorEnabled, setSimulatorEnabled] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [intervalSec, setIntervalSec] = useState(15);
  const [autoPilot, setAutoPilot] = useState({});
  const [speeds, setSpeeds] = useState({});
  const [logs, setLogs] = useState([]);
  const [devicePositions, setDevicePositions] = useState({});
  const [temperatures, setTemperatures] = useState({});
  const [batteryDrain, setBatteryDrain] = useState(0);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddAnimalId, setQuickAddAnimalId] = useState('');
  const [unassignedAnimals, setUnassignedAnimals] = useState([]);
  const [demoDeviceIds, setDemoDeviceIds] = useState([]);
  const [demoActive, setDemoActive] = useState(false);
  const timerRef = useRef(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    fetchDevices();
    fetchSettings();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiFetch('/api/admin/settings/device-integration');
      if (res?.ok) {
        const data = await res.json();
        setSimulatorEnabled(data.data?.device_simulator_enabled !== false);
      }
    } catch (e) {}
    setSettingsLoaded(true);
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = useCallback((msg, type = 'info') => {
    setLogs(prev => [...prev.slice(-99), { time: new Date().toLocaleTimeString(), msg, type }]);
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/simulator/devices');
      if (res.ok) {
        const data = await res.json();
        const list = data.data || [];
        setDevices(list);
        const pos = {};
        const spd = {};
        const ap = {};
        list.forEach(d => {
          pos[d.id] = { lat: parseFloat(d.gps_lat) || 24.7136, lng: parseFloat(d.gps_lng) || 46.6753 };
          spd[d.id] = 3;
          ap[d.id] = false;
        });
        setDevicePositions(pos);
        setSpeeds(spd);
        setAutoPilot(ap);
        const tmp = {};
        list.forEach(d => { tmp[d.id] = parseFloat(d.temperature) || 38.0; });
        setTemperatures(tmp);
        addLog(`Loaded ${list.length} devices with animals`, 'success');
      }
    } catch (e) {
      addLog('Failed to load devices: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const rechargeDevice = async (deviceId, level = 100) => {
    try {
      const res = await apiFetch('/api/simulator/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, level }),
      });
      if (res.ok) {
        const data = await res.json();
        const device = devices.find(d => d.id === deviceId);
        device.battery_level = data.battery_level;
        addLog(`${device?.name || 'Device ' + deviceId} battery → ${data.battery_level}%`, 'success');
        fetchDevices();
      }
    } catch (e) {
      addLog(`Recharge failed: ${e.message}`, 'error');
    }
  };

  const teleportToGeofence = async () => {
    const geoRes = await apiFetch('/api/geofences?include_inactive=false');
    if (!geoRes.ok) { addLog('Failed to fetch geofences', 'error'); return; }
    const geoData = await geoRes.json();
    const geoList = geoData.data || geoData.geofences || [];
    if (geoList.length === 0) { addLog('No active geofences found', 'error'); return; }

    for (const geofence of geoList) {
      let coords = geofence.coordinates;
      if (typeof coords === 'string') try { coords = JSON.parse(coords); } catch { coords = null; }
      if (!coords || !Array.isArray(coords) || coords.length < 3) continue;

      const centerLat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      const centerLng = coords.reduce((s, c) => s + c[1], 0) / coords.length;

      const ownerDevices = devices.filter(d => d.animal?.owner_id === geofence.owner_id);
      if (ownerDevices.length === 0) continue;

      const deviceIds = ownerDevices.map(d => d.id);
      const res = await apiFetch('/api/simulator/teleport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_ids: deviceIds,
          latitude: centerLat + (Math.random() - 0.5) * 0.02,
          longitude: centerLng + (Math.random() - 0.5) * 0.02,
          battery_drain: 0,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const count = data.results.filter(r => r.success).length;
        addLog(`Teleported ${count} devices to geofence "${geofence.name}"`, 'success');
      }
    }

    fetchDevices();
  };

  const setAllBatteries = async (level) => {
    let count = 0;
    for (const device of devices) {
      const res = await apiFetch('/api/simulator/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: device.id, level }),
      });
      if (res.ok) count++;
    }
    addLog(`Set battery to ${level}% for ${count} devices`, 'success');
    fetchDevices();
  };

  const nudgeDevice = async (deviceId, dLat, dLng) => {
    const pos = devicePositions[deviceId];
    if (!pos) return;
    const newLat = pos.lat + dLat;
    const newLng = pos.lng + dLng;
    setDevicePositions(prev => ({ ...prev, [deviceId]: { lat: newLat, lng: newLng } }));
    try {
      const res = await apiFetch('/api/simulator/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, latitude: newLat, longitude: newLng, speed: speeds[deviceId] || 3, heading: dLat === 0 && dLng > 0 ? 90 : dLat === 0 && dLng < 0 ? 270 : dLat > 0 && dLng === 0 ? 0 : dLat < 0 && dLng === 0 ? 180 : 45 }),
      });
      if (res.ok) {
        const data = await res.json();
        const device = devices.find(d => d.id === deviceId);
        addLog(`${device?.name || 'Device ' + deviceId} moved → ${newLat.toFixed(5)}, ${newLng.toFixed(5)}${data.alert_triggered ? ' ⚠️ ' + data.alert_type : ''}`, 'success');
      }
    } catch (e) {
      addLog(`Move failed for device ${deviceId}: ${e.message}`, 'error');
    }
  };

  const randomNudge = async (deviceId) => {
    const step = 0.0005 + Math.random() * 0.002;
    const heading = Math.random() * 360;
    const rad = heading * (Math.PI / 180);
    const dLat = step * Math.cos(rad);
    const dLng = step * Math.sin(rad);
    await nudgeDevice(deviceId, dLat, dLng);
  };

  const generateMoves = () => {
    const moves = [];
    Object.keys(autoPilot).forEach(id => {
      if (!autoPilot[id]) return;
      const pos = devicePositions[id];
      if (!pos) return;
      const speed = speeds[id] || 3;
      const step = speed * 0.0003;
      const heading = Math.random() * 360;
      const rad = heading * (Math.PI / 180);
      moves.push({
        device_id: parseInt(id),
        latitude: pos.lat + step * Math.cos(rad),
        longitude: pos.lng + step * Math.sin(rad),
        speed: speed,
        heading: heading,
        battery_drain: batteryDrain,
      });
    });
    return moves;
  };

  const tick = async () => {
    const moves = generateMoves();
    if (moves.length === 0) {
      addLog('Tick: no devices in auto-pilot', 'info');
      return;
    }
    try {
      const res = await apiFetch('/api/simulator/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves }),
      });
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        const newPos = { ...devicePositions };
        let alertCount = 0;
        const updatedDevices = [...devices];
        results.forEach((r, i) => {
          if (r.success) {
            newPos[r.device_id] = { lat: moves[i].latitude, lng: moves[i].longitude };
            if (r.alert_triggered) alertCount++;
            const dev = updatedDevices.find(d => d.id === r.device_id);
            if (dev && r.battery_level !== undefined) dev.battery_level = r.battery_level;
          }
        });
        setDevicePositions(newPos);
        setDevices(updatedDevices);
        addLog(`Tick: moved ${results.filter(r => r.success).length} devices${alertCount ? `, ${alertCount} alerts triggered` : ''}`, 'success');
      }
    } catch (e) {
      addLog(`Batch tick failed: ${e.message}`, 'error');
    }
  };

  const startSimulation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(true);
    addLog(`Simulation started (every ${intervalSec}s)`, 'info');
    tick();
    timerRef.current = setInterval(tick, intervalSec * 1000);
  };

  const stopSimulation = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
    addLog('Simulation stopped', 'info');
  };

  const toggleAutoPilot = (deviceId) => {
    setAutoPilot(prev => ({ ...prev, [deviceId]: !prev[deviceId] }));
  };

  const handleSpeedChange = (deviceId, val) => {
    setSpeeds(prev => ({ ...prev, [deviceId]: parseInt(val) }));
  };

  const setTemperature = async (deviceId) => {
    const temp = temperatures[deviceId];
    if (temp == null) return;
    try {
      const res = await apiFetch('/api/simulator/set-temperature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, temperature: temp }),
      });
      if (res.ok) {
        const device = devices.find(d => d.id === deviceId);
        addLog(`${device?.name || 'Device ' + deviceId} temperature → ${temp}°C`, 'success');
      }
    } catch (e) {
      addLog(`Set temperature failed: ${e.message}`, 'error');
    }
  };

  const fetchUnassignedAnimals = async () => {
    try {
      const res = await apiFetch('/api/animals?per_page=100');
      if (res.ok) {
        const data = await res.json();
        const list = data.data || [];
        setUnassignedAnimals(list.filter(a => !a.device?.device_id && !a.device_id));
      }
    } catch (e) {
      addLog('Failed to fetch animals: ' + e.message, 'error');
    }
  };

  const quickAddDevice = async () => {
    if (!quickAddAnimalId) return;
    try {
      const res = await apiFetch('/api/devices/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickAddName || 'Quick Device',
          animal_id: quickAddAnimalId,
        }),
      });
      if (res.ok) {
        addLog('Device provisioned and added to simulator', 'success');
        setShowQuickAdd(false);
        setQuickAddName('');
        setQuickAddAnimalId('');
        fetchDevices();
        fetchUnassignedAnimals();
      } else {
        const data = await res.json();
        addLog('Provision failed: ' + (data.message || 'Unknown error'), 'error');
      }
    } catch (e) {
      addLog('Provision failed: ' + e.message, 'error');
    }
  };

  const activateDemo = async () => {
    try {
      const res = await apiFetch('/api/simulator/demo-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setDemoDeviceIds(data.device_ids || []);
        setDemoActive(true);
        addLog(data.message, 'success');
        fetchDevices();
        fetchUnassignedAnimals();
      }
    } catch (e) {
      addLog('Demo activation failed: ' + e.message, 'error');
    }
  };

  const deactivateDemo = async () => {
    if (demoDeviceIds.length === 0) return;
    try {
      const res = await apiFetch('/api/simulator/demo-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: demoDeviceIds }),
      });
      if (res.ok) {
        const data = await res.json();
        setDemoDeviceIds([]);
        setDemoActive(false);
        addLog(data.message, 'info');
        fetchDevices();
        fetchUnassignedAnimals();
      }
    } catch (e) {
      addLog('Demo reset failed: ' + e.message, 'error');
    }
  };

  const clearLogs = () => setLogs([]);

  const canRun = Object.values(autoPilot).some(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (settingsLoaded && !simulatorEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <MaterialSymbol icon="simulation" size={48} className="text-on-surface-subtle" />
        <h3 className="text-lg font-bold text-on-surface-variant">Simulator Disabled</h3>
        <p className="text-sm text-on-surface-subtle text-center max-w-md">
          The device simulator has been disabled by the admin. Enable it in Settings &rarr; Device Integration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className={`flex items-center justify-between flex-wrap gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div>
            <h1 className="text-3xl font-bold text-brand-primary">Device Simulator</h1>
            <p className="text-on-surface-variant mt-1">Simulate device movement to test map, tracking, and geofences</p>
          </div>
        </div>
      )}
      <div className={`flex items-center justify-between flex-wrap gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="flex items-center gap-3">
          <select
            value={intervalSec}
            onChange={e => setIntervalSec(parseInt(e.target.value))}
            disabled={running}
            className="px-3 py-2 rounded-xl bg-surface-light text-on-surface-variant text-sm font-medium border-0 focus:ring-2 focus:ring-brand-accent"
          >
            {INTERVAL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={batteryDrain}
            onChange={e => setBatteryDrain(parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl bg-surface-light text-on-surface-variant text-sm font-medium border-0 focus:ring-2 focus:ring-brand-accent"
            title="Battery drain per tick"
          >
            {BATTERY_DRAIN_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {running ? (
            <button
              onClick={stopSimulation}
              className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-700 transition"
            >
              <MaterialSymbol icon="stop" size={18} />
              Stop
            </button>
          ) : (
            <button
              onClick={startSimulation}
              disabled={!canRun}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition ${
                canRun ? 'bg-gradient-to-br from-brand-primary to-brand-secondary text-white shadow-lg shadow-brand-primary/20 hover:opacity-90' : 'bg-surface-high text-on-surface-subtle cursor-not-allowed'
              }`}
            >
              <MaterialSymbol icon="play_arrow" size={18} />
              Start All
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={teleportToGeofence}
            className="px-3 py-2 bg-purple-100 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-200 transition flex items-center gap-1"
            title="Move all devices to their owner's geofence center"
          >
            <MaterialSymbol icon="my_location" size={14} />
            Teleport to Geofence
          </button>
          <button
            onClick={() => setAllBatteries(100)}
            className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-200 transition flex items-center gap-1"
          >
            <MaterialSymbol icon="battery_charging_full" size={14} />
            All 100%
          </button>
          <button
            onClick={() => setAllBatteries(10)}
            className="px-3 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold hover:bg-red-200 transition flex items-center gap-1"
          >
            <MaterialSymbol icon="battery_alert" size={14} />
            Drain All
          </button>
          <button
            onClick={() => { fetchUnassignedAnimals(); setShowQuickAdd(true); }}
            className="px-3 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold hover:bg-brand-secondary transition flex items-center gap-1"
          >
            <MaterialSymbol icon="add" size={14} />
            Quick Add
          </button>
          {demoActive ? (
            <button
              onClick={deactivateDemo}
              className="px-3 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold hover:bg-red-200 transition flex items-center gap-1"
            >
              <MaterialSymbol icon="close" size={14} />
              End Demo
            </button>
          ) : (
            <button
              onClick={activateDemo}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-200 transition flex items-center gap-1"
            >
              <MaterialSymbol icon="rocket_launch" size={14} />
              Demo Mode
            </button>
          )}
          <button
            onClick={fetchDevices}
            className="px-3 py-2 bg-surface-light rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-high transition"
          >
            <MaterialSymbol icon="refresh" size={14} />
            Reload
          </button>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="bg-surface-light rounded-2xl p-12 text-center">
          <MaterialSymbol icon="sensors_off" size={48} className="text-on-surface-subtle mx-auto mb-4" />
          <h2 className="text-xl font-bold text-on-surface-variant">No devices found</h2>
          <p className="text-on-surface-subtle mt-2">Use <strong>Quick Add</strong> above to create a device and assign it to an animal, or <strong>Demo Mode</strong> to auto-generate test devices.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {devices.map(device => {
              const pos = devicePositions[device.id] || { lat: 0, lng: 0 };
              const isAuto = autoPilot[device.id] || false;
              const speed = speeds[device.id] || 3;
              return (
                <div key={device.id} className={`bg-white rounded-2xl p-5 shadow-sm border transition ${isAuto ? 'border-brand-accent ring-1 ring-brand-accent/30' : 'border-[#eeeee9]'}`}>
                  <div className={`flex items-center justify-between mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAuto ? 'bg-brand-accent/20 text-tertiary-container' : 'bg-surface-light text-on-surface-variant'}`}>
                        <MaterialSymbol icon={device.type === 'collar' ? 'watch' : 'sensors'} size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-brand-primary text-sm">{device.name || device.device_id}</p>
                        <p className="text-xs text-on-surface-subtle">{device.animal?.animal_id || device.animal?.name || 'Unknown animal'}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={isAuto} onChange={() => toggleAutoPilot(device.id)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-surface-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary" />
                    </label>
                  </div>

                    <div className={`flex items-center gap-4 mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className="flex-1">
                        <p className="text-xs text-on-surface-subtle font-medium">Latitude</p>
                        <input
                          type="number"
                          step="0.000001"
                          value={pos.lat}
                          onChange={e => setDevicePositions(prev => ({ ...prev, [device.id]: { ...prev[device.id], lat: parseFloat(e.target.value) || 0 } }))}
                          onBlur={e => {
                            const parent = e.target.closest('.flex.items-center.gap-4');
                            if (!parent) return;
                            const inputs = parent.querySelectorAll('input[type="number"]');
                            const lat = parseFloat(inputs[0]?.value) || 0;
                            const lng = parseFloat(inputs[1]?.value) || 0;
                            apiFetch('/api/simulator/move', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ device_id: device.id, latitude: lat, longitude: lng, speed: speeds[device.id] || 3 }),
                            }).then(res => {
                              if (res.ok) addLog(`${device.name || device.device_id} position → ${lat.toFixed(6)}, ${lng.toFixed(6)}`, 'success');
                            }).catch(e => addLog(`Move failed: ${e.message}`, 'error'));
                          }}
                          className="w-full bg-surface-light border border-transparent focus:border-brand-accent rounded-lg px-2 py-1 text-sm font-mono font-bold text-brand-primary focus:outline-none focus:bg-white"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-on-surface-subtle font-medium">Longitude</p>
                        <input
                          type="number"
                          step="0.000001"
                          value={pos.lng}
                          onChange={e => setDevicePositions(prev => ({ ...prev, [device.id]: { ...prev[device.id], lng: parseFloat(e.target.value) || 0 } }))}
                          onBlur={e => {
                            const parent = e.target.closest('.flex.items-center.gap-4');
                            if (!parent) return;
                            const inputs = parent.querySelectorAll('input[type="number"]');
                            const lat = parseFloat(inputs[0]?.value) || 0;
                            const lng = parseFloat(inputs[1]?.value) || 0;
                            apiFetch('/api/simulator/move', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ device_id: device.id, latitude: lat, longitude: lng, speed: speeds[device.id] || 3 }),
                            }).then(res => {
                              if (res.ok) addLog(`${device.name || device.device_id} position → ${lat.toFixed(6)}, ${lng.toFixed(6)}`, 'success');
                            }).catch(e => addLog(`Move failed: ${e.message}`, 'error'));
                          }}
                          className="w-full bg-surface-light border border-transparent focus:border-brand-accent rounded-lg px-2 py-1 text-sm font-mono font-bold text-brand-primary focus:outline-none focus:bg-white"
                        />
                      </div>
                    <div className="text-right space-y-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${device.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {device.status}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-bold ${(device.battery_level ?? 100) < 20 ? 'text-red-600' : (device.battery_level ?? 100) < 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {device.battery_level ?? 100}%
                        </span>
                        <button
                          onClick={() => rechargeDevice(device.id, 100)}
                          className="text-[10px] px-1.5 py-0.5 bg-brand-accent/10 text-tertiary-container rounded hover:bg-brand-accent/20 transition"
                          title="Recharge to 100%"
                        >
                          🔋
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs text-on-surface-subtle font-medium">Speed:</span>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={speed}
                      onChange={e => handleSpeedChange(device.id, e.target.value)}
                      className="flex-1 h-1.5 bg-surface-high rounded-full appearance-none cursor-pointer accent-[#002819]"
                    />
                    <span className="text-xs font-mono font-bold text-brand-primary w-8 text-right">{speed} km/h</span>
                  </div>

                  <div className={`flex items-center gap-2 mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs text-on-surface-subtle font-medium">Temp:</span>
                    <input
                      type="range"
                      min="35"
                      max="42"
                      step="0.1"
                      value={temperatures[device.id] ?? 38.0}
                      onChange={e => setTemperatures(prev => ({ ...prev, [device.id]: parseFloat(e.target.value) }))}
                      onMouseUp={() => setTemperature(device.id)}
                      onTouchEnd={() => setTemperature(device.id)}
                      onKeyUp={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') setTemperature(device.id); }}
                      className="flex-1 h-1.5 bg-surface-high rounded-full appearance-none cursor-pointer accent-amber-600"
                    />
                    <span className="text-xs font-mono font-bold text-brand-primary w-10 text-right">{(temperatures[device.id] ?? 38.0).toFixed(1)}°C</span>
                  </div>

                  <div className={`flex gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <button onClick={() => nudgeDevice(device.id, 0.001, 0)} className="flex-1 px-2 py-1.5 bg-surface-light rounded-lg text-xs font-medium text-on-surface-variant hover:bg-surface-high transition flex items-center justify-center gap-1">
                      <MaterialSymbol icon="arrow_upward" size={14} /> N
                    </button>
                    <button onClick={() => nudgeDevice(device.id, -0.001, 0)} className="flex-1 px-2 py-1.5 bg-surface-light rounded-lg text-xs font-medium text-on-surface-variant hover:bg-surface-high transition flex items-center justify-center gap-1">
                      <MaterialSymbol icon="arrow_downward" size={14} /> S
                    </button>
                    <button onClick={() => nudgeDevice(device.id, 0, -0.001)} className="flex-1 px-2 py-1.5 bg-surface-light rounded-lg text-xs font-medium text-on-surface-variant hover:bg-surface-high transition flex items-center justify-center gap-1">
                      <MaterialSymbol icon="arrow_back" size={14} /> W
                    </button>
                    <button onClick={() => nudgeDevice(device.id, 0, 0.001)} className="flex-1 px-2 py-1.5 bg-surface-light rounded-lg text-xs font-medium text-on-surface-variant hover:bg-surface-high transition flex items-center justify-center gap-1">
                      <MaterialSymbol icon="arrow_forward" size={14} /> E
                    </button>
                    <button onClick={() => randomNudge(device.id)} className="flex-1 px-2 py-1.5 bg-brand-accent/10 rounded-lg text-xs font-medium text-tertiary-container hover:bg-brand-accent/20 transition flex items-center justify-center gap-1">
                      <MaterialSymbol icon="shuffle" size={14} /> Rand
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#eeeee9] overflow-hidden">
            <div className={`flex items-center justify-between px-5 py-3 border-b border-[#eeeee9] ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="flex items-center gap-2">
                <MaterialSymbol icon="terminal" size={18} className="text-on-surface-subtle" />
                <span className="font-bold text-sm text-on-surface-variant">Activity Log</span>
                <span className="text-xs text-on-surface-subtle">({logs.length} entries)</span>
              </div>
              <button onClick={clearLogs} className="text-xs text-red-500 hover:text-red-700 font-medium transition">Clear</button>
            </div>
            <div className="h-48 overflow-y-auto p-4 bg-brand-light font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-on-surface-subtle italic">No activity yet. Toggle auto-pilot on devices and start the simulation.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`mb-1 ${log.type === 'error' ? 'text-red-600' : log.type === 'success' ? 'text-emerald-700' : 'text-on-surface-variant'}`}>
                    <span className="text-on-surface-subtle">[{log.time}]</span> {log.msg}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </>
      )}

      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowQuickAdd(false)}>
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-brand-primary">Quick Add Device</h3>
              <button onClick={() => setShowQuickAdd(false)} className="p-1 hover:bg-surface-light rounded-lg transition">
                <MaterialSymbol icon="close" size={20} className="text-on-surface-subtle" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 px-1">Device Name</label>
                <input
                  type="text"
                  value={quickAddName}
                  onChange={e => setQuickAddName(e.target.value)}
                  placeholder="e.g., Test Collar"
                  className="w-full bg-surface-light border-none rounded-xl px-4 py-3 mt-1 focus:ring-2 focus:ring-brand-secondary"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 px-1">Assign to Animal *</label>
                <select
                  value={quickAddAnimalId}
                  onChange={e => setQuickAddAnimalId(e.target.value)}
                  className="w-full bg-surface-light border-none rounded-xl px-4 py-3 mt-1 appearance-none focus:ring-2 focus:ring-brand-secondary"
                >
                  <option value="">Select an animal...</option>
                  {unassignedAnimals.map(animal => (
                    <option key={animal.id} value={animal.id}>
                      {animal.name || animal.animal_id} ({animal.species})
                    </option>
                  ))}
                </select>
                {unassignedAnimals.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No unassigned animals available. Create an animal first.</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowQuickAdd(false)}
                className="flex-1 py-3 bg-surface-light text-on-surface-variant rounded-xl font-bold text-sm hover:bg-surface-high transition"
              >
                Cancel
              </button>
              <button
                onClick={quickAddDevice}
                disabled={!quickAddAnimalId}
                className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-brand-secondary transition disabled:opacity-50"
              >
                Add to Simulator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
