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

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [intervalSec, setIntervalSec] = useState(15);
  const [autoPilot, setAutoPilot] = useState({});
  const [speeds, setSpeeds] = useState({});
  const [logs, setLogs] = useState([]);
  const [devicePositions, setDevicePositions] = useState({});
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
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
        <div className="animate-spin w-8 h-8 border-4 border-[#002819] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className={`flex items-center justify-between flex-wrap gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div>
            <h1 className="text-3xl font-bold text-[#002819]">Device Simulator</h1>
            <p className="text-[#404943] mt-1">Simulate device movement to test map, tracking, and geofences</p>
          </div>
        </div>
      )}
      <div className={`flex items-center justify-between flex-wrap gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="flex items-center gap-3">
          <select
            value={intervalSec}
            onChange={e => setIntervalSec(parseInt(e.target.value))}
            disabled={running}
            className="px-3 py-2 rounded-xl bg-[#F4F4EF] text-[#404943] text-sm font-medium border-0 focus:ring-2 focus:ring-[#D4AF37]"
          >
            {INTERVAL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={batteryDrain}
            onChange={e => setBatteryDrain(parseInt(e.target.value))}
            className="px-3 py-2 rounded-xl bg-[#F4F4EF] text-[#404943] text-sm font-medium border-0 focus:ring-2 focus:ring-[#D4AF37]"
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
                canRun ? 'bg-gradient-to-br from-[#002819] to-[#06402B] text-white shadow-lg shadow-[#002819]/20 hover:opacity-90' : 'bg-[#E3E3DE] text-[#717973] cursor-not-allowed'
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
            className="px-3 py-2 bg-[#002819] text-white rounded-xl text-xs font-bold hover:bg-[#06402b] transition flex items-center gap-1"
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
            className="px-3 py-2 bg-[#F4F4EF] rounded-xl text-xs font-bold text-[#404943] hover:bg-[#E3E3DE] transition"
          >
            <MaterialSymbol icon="refresh" size={14} />
            Reload
          </button>
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="bg-[#F4F4EF] rounded-2xl p-12 text-center">
          <MaterialSymbol icon="sensors_off" size={48} className="text-[#717973] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#404943]">No devices found</h2>
          <p className="text-[#717973] mt-2">Use <strong>Quick Add</strong> above to create a device and assign it to an animal, or <strong>Demo Mode</strong> to auto-generate test devices.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {devices.map(device => {
              const pos = devicePositions[device.id] || { lat: 0, lng: 0 };
              const isAuto = autoPilot[device.id] || false;
              const speed = speeds[device.id] || 3;
              return (
                <div key={device.id} className={`bg-white rounded-2xl p-5 shadow-sm border transition ${isAuto ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/30' : 'border-[#eeeee9]'}`}>
                  <div className={`flex items-center justify-between mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAuto ? 'bg-[#D4AF37]/20 text-[#735C00]' : 'bg-[#F4F4EF] text-[#404943]'}`}>
                        <MaterialSymbol icon={device.type === 'collar' ? 'watch' : 'sensors'} size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-[#002819] text-sm">{device.name || device.device_id}</p>
                        <p className="text-xs text-[#717973]">{device.animal?.animal_id || device.animal?.name || 'Unknown animal'}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={isAuto} onChange={() => toggleAutoPilot(device.id)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-[#E3E3DE] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#002819]" />
                    </label>
                  </div>

                    <div className={`flex items-center gap-4 mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-1">
                      <p className="text-xs text-[#717973] font-medium">Latitude</p>
                      <p className="text-sm font-mono font-bold text-[#002819]">{pos.lat.toFixed(6)}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-[#717973] font-medium">Longitude</p>
                      <p className="text-sm font-mono font-bold text-[#002819]">{pos.lng.toFixed(6)}</p>
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
                          className="text-[10px] px-1.5 py-0.5 bg-[#D4AF37]/10 text-[#735C00] rounded hover:bg-[#D4AF37]/20 transition"
                          title="Recharge to 100%"
                        >
                          🔋
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 mb-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs text-[#717973] font-medium">Speed:</span>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={speed}
                      onChange={e => handleSpeedChange(device.id, e.target.value)}
                      className="flex-1 h-1.5 bg-[#E3E3DE] rounded-full appearance-none cursor-pointer accent-[#002819]"
                    />
                    <span className="text-xs font-mono font-bold text-[#002819] w-8 text-right">{speed} km/h</span>
                  </div>

                  <div className={`flex gap-1.5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <button onClick={() => nudgeDevice(device.id, 0.001, 0)} className="flex-1 px-2 py-1.5 bg-[#F4F4EF] rounded-lg text-xs font-medium text-[#404943] hover:bg-[#E3E3DE] transition flex items-center justify-center gap-1">
                      <MaterialSymbol icon="arrow_upward" size={14} /> N
                    </button>
                    <button onClick={() => nudgeDevice(device.id, -0.001, 0)} className="flex-1 px-2 py-1.5 bg-[#F4F4EF] rounded-lg text-xs font-medium text-[#404943] hover:bg-[#E3E3DE] transition flex items-center justify-center gap-1">
                      <MaterialSymbol icon="arrow_downward" size={14} /> S
                    </button>
                    <button onClick={() => nudgeDevice(device.id, 0, -0.001)} className="flex-1 px-2 py-1.5 bg-[#F4F4EF] rounded-lg text-xs font-medium text-[#404943] hover:bg-[#E3E3DE] transition flex items-center justify-center gap-1">
                      <MaterialSymbol icon="arrow_back" size={14} /> W
                    </button>
                    <button onClick={() => nudgeDevice(device.id, 0, 0.001)} className="flex-1 px-2 py-1.5 bg-[#F4F4EF] rounded-lg text-xs font-medium text-[#404943] hover:bg-[#E3E3DE] transition flex items-center justify-center gap-1">
                      <MaterialSymbol icon="arrow_forward" size={14} /> E
                    </button>
                    <button onClick={() => randomNudge(device.id)} className="flex-1 px-2 py-1.5 bg-[#D4AF37]/10 rounded-lg text-xs font-medium text-[#735C00] hover:bg-[#D4AF37]/20 transition flex items-center justify-center gap-1">
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
                <MaterialSymbol icon="terminal" size={18} className="text-[#717973]" />
                <span className="font-bold text-sm text-[#404943]">Activity Log</span>
                <span className="text-xs text-[#717973]">({logs.length} entries)</span>
              </div>
              <button onClick={clearLogs} className="text-xs text-red-500 hover:text-red-700 font-medium transition">Clear</button>
            </div>
            <div className="h-48 overflow-y-auto p-4 bg-[#FAF1F5] font-mono text-xs">
              {logs.length === 0 ? (
                <p className="text-[#717973] italic">No activity yet. Toggle auto-pilot on devices and start the simulation.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`mb-1 ${log.type === 'error' ? 'text-red-600' : log.type === 'success' ? 'text-emerald-700' : 'text-[#404943]'}`}>
                    <span className="text-[#717973]">[{log.time}]</span> {log.msg}
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
              <h3 className="text-xl font-bold text-[#002819]">Quick Add Device</h3>
              <button onClick={() => setShowQuickAdd(false)} className="p-1 hover:bg-[#F4F4EF] rounded-lg transition">
                <MaterialSymbol icon="close" size={20} className="text-[#717973]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#404943]/70 px-1">Device Name</label>
                <input
                  type="text"
                  value={quickAddName}
                  onChange={e => setQuickAddName(e.target.value)}
                  placeholder="e.g., Test Collar"
                  className="w-full bg-[#F4F4EF] border-none rounded-xl px-4 py-3 mt-1 focus:ring-2 focus:ring-[#06402b]"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-[#404943]/70 px-1">Assign to Animal *</label>
                <select
                  value={quickAddAnimalId}
                  onChange={e => setQuickAddAnimalId(e.target.value)}
                  className="w-full bg-[#F4F4EF] border-none rounded-xl px-4 py-3 mt-1 appearance-none focus:ring-2 focus:ring-[#06402b]"
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
                className="flex-1 py-3 bg-[#F4F4EF] text-[#404943] rounded-xl font-bold text-sm hover:bg-[#E3E3DE] transition"
              >
                Cancel
              </button>
              <button
                onClick={quickAddDevice}
                disabled={!quickAddAnimalId}
                className="flex-1 py-3 bg-[#002819] text-white rounded-xl font-bold text-sm hover:bg-[#06402b] transition disabled:opacity-50"
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
