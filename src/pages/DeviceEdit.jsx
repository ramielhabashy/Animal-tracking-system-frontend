import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';

const statusConfig = {
  online: { icon: 'wifi', label: 'Online', color: 'text-[#002819]' },
  low_signal: { icon: 'signal_cellular_alt_1_bar', label: 'Low Signal', color: 'text-[#735c00]' },
  offline: { icon: 'wifi_off', label: 'Offline', color: 'text-[#717973]' },
};

export default function DeviceEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const isOwner = user?.role === 'Owner';
  const canManageDevices = isAdmin || isOwner;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [device, setDevice] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [owners, setOwners] = useState([]);
  const [editing, setEditing] = useState(location.pathname.endsWith('/edit'));
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    update_interval: '15',
    advanced_tracking: false,
    owner_id: '',
  });
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deviceRes, animalsRes, ownersRes] = await Promise.all([
        apiFetch(`/api/devices/${id}`),
        apiFetch('/api/animals?per_page=100'),
        apiFetch('/api/users/owners/list'),
      ]);

      let deviceData = null;
      if (deviceRes.ok) {
        deviceData = await deviceRes.json();
        setDevice(deviceData);
        setFormData({
          name: deviceData.name || '',
          type: deviceData.type || 'collar',
          update_interval: deviceData.update_interval || '15',
          advanced_tracking: deviceData.advanced_tracking ?? false,
          owner_id: deviceData.owner_id || '',
        });
      }

      if (animalsRes.ok) {
        const animalsData = await animalsRes.json();
        const animalsList = animalsData.data || [];
        setAnimals(animalsList);
        if (deviceData?.animal_id) {
          const animal = animalsList.find(a => a.id === deviceData.animal_id);
          setDevice(prev => prev ? { ...prev, _assignedAnimal: animal } : null);
        }
      }

      if (ownersRes.ok) {
        const ownersData = await ownersRes.json();
        setOwners(ownersData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch device:', error);
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Device name is required';
    if (!formData.type) newErrors.type = 'Device type is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setErrors({});

    if (!validate()) {
      setMessage({ type: 'error', text: 'Please fix the errors below' });
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/api/devices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          update_interval: formData.update_interval,
          advanced_tracking: formData.advanced_tracking,
          owner_id: formData.owner_id || null,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Device updated successfully!' });
        setDevice(prev => ({ ...prev, ...data }));
        setTimeout(() => { setEditing(false); setMessage(null); }, 1200);
      } else {
        if (data.errors) setErrors(data.errors);
        setMessage({ type: 'error', text: data.message || 'Failed to update device' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this device? This action cannot be undone.')) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/devices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        navigate('/devices');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete device' });
    } finally {
      setDeleting(false);
    }
  };

  const status = device ? (statusConfig[device.status] || statusConfig.offline) : null;
  const battery = device?.battery_level || 0;
  const assignedAnimal = device?._assignedAnimal || animals.find(a => a.id === device?.animal_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#002819] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-8 text-center">
        <p className="text-stone-500">Device not found</p>
        <Link to="/devices" className="text-emerald-700 font-bold hover:underline mt-2 inline-block">
          Back to Devices
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Breadcrumb */}
      <nav className={`flex text-xs text-[#4f6357] mb-2 uppercase tracking-widest font-bold ${isRtl ? 'flex-row-reverse' : ''}`}>
        <Link to="/devices" className="hover:text-[#002819] transition-colors">{t('devices.deviceManagement')}</Link>
        <span className="mx-2">/</span>
        <span className="text-[#002819]">{device.device_id}</span>
      </nav>

      {/* Header */}
      <div className={`flex items-start justify-between mb-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-4xl font-extrabold font-['Manrope'] text-[#002819] tracking-tight">
              {device.device_id}
            </h2>
            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              device.status === 'online' ? 'bg-[#002819]/10 text-[#002819]' :
              device.status === 'low_signal' ? 'bg-[#D4AF37]/10 text-[#735c00]' :
              'bg-[#717973]/10 text-[#717973]'
            }`}>
              {status?.label || device.status}
            </div>
          </div>
          <p className="text-[#404943] mt-1">{device.name || device.type || 'Device'}</p>
        </div>
        <div className="flex gap-2">
          {!editing && canManageDevices && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 bg-[#002819] text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95"
            >
              <MaterialSymbol icon="edit" size={20} />
              Edit Device
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-6 ${message.type === 'success' ? 'bg-[#cfe5d6] text-[#002819]' : 'bg-[#ffdad6] text-[#93000a]'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-8">
          {editing ? (
            /* Edit Mode */
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Device Identification */}
              <section className="bg-[#eeeee9] rounded-3xl p-8 transition-all hover:shadow-md">
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-white p-2 rounded-xl text-[#002819]">
                    <MaterialSymbol icon="fingerprint" size={20} />
                  </span>
                  <h3 className="text-xl font-bold font-['Manrope'] text-[#002819]">Device Identification</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#404943]/70 px-1">
                      Serial Number
                    </label>
                    <input
                      className="w-full bg-[#e3e3de] border-none rounded-xl px-4 py-3 text-[#404943]/50 cursor-not-allowed font-mono text-sm"
                      defaultValue={device.device_id}
                      disabled
                      type="text"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#404943]/70 px-1">
                      Device Name
                    </label>
                    <input
                      className="w-full bg-white border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#06402b] shadow-sm"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      type="text"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#404943]/70 px-1">
                      Owner
                    </label>
                    <select
                      className={`w-full bg-white border-none rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-[#06402b] shadow-sm ${errors.owner_id ? 'ring-2 ring-red-500' : ''}`}
                      value={formData.owner_id}
                      onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                    >
                      <option value="">Select Owner</option>
                      {owners.map(owner => (
                        <option key={owner.id} value={owner.id}>{owner.name}</option>
                      ))}
                    </select>
                    {errors.owner_id && <p className="text-red-600 text-xs">{errors.owner_id}</p>}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#404943]/70 px-1">
                      Device Type
                    </label>
                    <select
                      className={`w-full bg-white border-none rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-[#06402b] shadow-sm ${errors.type ? 'ring-2 ring-red-500' : ''}`}
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="collar">Pro Tracking Collar v4</option>
                      <option value="ear_tag">Compact Ear Tag v2</option>
                      <option value="bolus">Internal Bolus v1</option>
                      <option value="halter">Halter Tracker v3</option>
                    </select>
                    {errors.type && <p className="text-red-600 text-xs">{errors.type}</p>}
                  </div>
                </div>
              </section>

              {/* Configuration */}
              <section className="bg-[#eeeee9] rounded-3xl p-8 transition-all hover:shadow-md">
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-white p-2 rounded-xl text-[#002819]">
                    <MaterialSymbol icon="settings_input_component" size={20} />
                  </span>
                  <h3 className="text-xl font-bold font-['Manrope'] text-[#002819]">Configuration</h3>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-white">
                    <div>
                      <p className="font-bold text-[#002819]">Advanced Tracking Mode</p>
                      <p className="text-sm text-[#404943]">Enable high-frequency GPS polling for behavioral analysis.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.advanced_tracking}
                        onChange={(e) => setFormData({ ...formData, advanced_tracking: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-14 h-7 bg-[#e3e3de] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-[#002819]" />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-[#404943]/70 px-1">
                        Update Interval
                      </label>
                      <select
                        className={`w-full bg-white border-none rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-[#06402b] shadow-sm ${errors.update_interval ? 'ring-2 ring-red-500' : ''}`}
                        value={formData.update_interval}
                        onChange={(e) => setFormData({ ...formData, update_interval: e.target.value })}
                      >
                        <option value="5">5 Minutes</option>
                        <option value="15">15 Minutes</option>
                        <option value="30">30 Minutes</option>
                        <option value="60">60 Minutes</option>
                      </select>
                      {errors.update_interval && <p className="text-red-600 text-xs">{errors.update_interval}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-[#404943]/70 px-1">
                        Firmware
                      </label>
                      <div className="w-full bg-white rounded-xl px-4 py-3 shadow-sm text-sm font-semibold text-[#002819]">
                        {device.firmware_version || 'v2.4'}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Edit Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 gap-4">
                {canManageDevices && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 text-[#ba1a1a] font-bold px-6 py-3 rounded-xl hover:bg-[#ffdad6] transition-colors disabled:opacity-50"
                  >
                    <MaterialSymbol icon="delete" size={20} />
                    {deleting ? 'Deleting...' : 'Delete Device'}
                  </button>
                )}
                <div className="flex gap-4 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => { setEditing(false); setFormData({ name: device.name || '', type: device.type || 'collar', update_interval: device.update_interval || '15', advanced_tracking: device.advanced_tracking ?? false, owner_id: device.owner_id || '' }); setErrors({}); setMessage(null); }}
                    className="flex-1 sm:flex-none px-10 py-3 rounded-xl font-bold text-[#404943] hover:bg-[#eeeee9] transition-all"
                  >
                    Cancel
                  </button>
                  {canManageDevices && (
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 sm:flex-none px-10 py-3 rounded-xl font-bold bg-[#002819] text-white shadow-xl shadow-[#002819]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          ) : (
            /* View Mode */
            <>
              {/* Hardware Health */}
              <section className="bg-[#eeeee9] rounded-3xl p-8 transition-all hover:shadow-md">
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-white p-2 rounded-xl text-[#002819]">
                    <MaterialSymbol icon="health_and_safety" size={20} />
                  </span>
                  <h3 className="text-xl font-bold font-['Manrope'] text-[#002819]">Hardware Health & Status</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`bg-white p-6 rounded-2xl border-s-4 shadow-sm ${battery > 50 ? 'border-emerald-500' : battery > 20 ? 'border-[#735c00]' : 'border-[#BA1A1A]'}`}>
                    <span className="text-xs font-semibold text-[#404943]/60 flex items-center gap-2">
                      <MaterialSymbol icon="battery_very_low" size={16} />
                      Battery
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-[#002819]">{battery}%</span>
                      <span className={`text-[10px] font-bold uppercase ${battery > 50 ? 'text-emerald-600' : battery > 20 ? 'text-[#735c00]' : 'text-[#BA1A1A]'}`}>
                        {battery > 50 ? 'Optimal' : battery > 0 ? 'Low' : 'Depleted'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border-s-4 border-emerald-500 shadow-sm">
                    <span className="text-xs font-semibold text-[#404943]/60 flex items-center gap-2">
                      <MaterialSymbol icon="signal_cellular_alt" size={16} />
                      Signal
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-[#002819]">{device.signal_strength ? `${device.signal_strength} dBm` : 'N/A'}</span>
                      <span className="text-[10px] font-bold uppercase text-emerald-600">{device.signal_strength > -90 ? 'Stable' : 'Weak'}</span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border-s-4 border-emerald-500 shadow-sm">
                    <span className="text-xs font-semibold text-[#404943]/60 flex items-center gap-2">
                      <MaterialSymbol icon="update" size={16} />
                      Last Ping
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-[#002819]">{device.last_ping ? new Date(device.last_ping).toLocaleDateString() : 'N/A'}</span>
                      <span className="text-[10px] font-bold uppercase text-emerald-600">{device.last_ping ? 'Active' : 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Device Info */}
              <section className="bg-[#eeeee9] rounded-3xl p-8 transition-all hover:shadow-md">
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-white p-2 rounded-xl text-[#002819]">
                    <MaterialSymbol icon="info" size={20} />
                  </span>
                  <h3 className="text-xl font-bold font-['Manrope'] text-[#002819]">Device Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-[#404943]/60 uppercase tracking-wider">Serial Number</p>
                    <p className="text-lg font-bold text-[#002819] mt-1 font-mono">{device.device_id}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-[#404943]/60 uppercase tracking-wider">Device Name</p>
                    <p className="text-lg font-bold text-[#002819] mt-1">{device.name || '-'}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-[#404943]/60 uppercase tracking-wider">Device Type</p>
                    <p className="text-lg font-bold text-[#002819] mt-1 capitalize">{device.type || '-'}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-[#404943]/60 uppercase tracking-wider">Owner</p>
                    <p className="text-lg font-bold text-[#002819] mt-1">{device.owner?.name || '-'}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-[#404943]/60 uppercase tracking-wider">Assigned Animal</p>
                    <p className="text-lg font-bold text-[#002819] mt-1">
                      {assignedAnimal ? (
                        <Link to={`/animals/${assignedAnimal.id}`} className="hover:text-[#06402b] underline underline-offset-2">
                          {assignedAnimal.animal_id}
                        </Link>
                      ) : '-'}
                    </p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-[#404943]/60 uppercase tracking-wider">Firmware Version</p>
                    <p className="text-lg font-bold text-[#002819] mt-1">{device.firmware_version || 'v2.4'}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-[#404943]/60 uppercase tracking-wider">Update Interval</p>
                    <p className="text-lg font-bold text-[#002819] mt-1">{device.update_interval || '15'} min</p>
                  </div>
                  <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-semibold text-[#404943]/60 uppercase tracking-wider">Advanced Tracking</p>
                    <p className="text-lg font-bold text-[#002819] mt-1">{device.advanced_tracking ? 'Enabled' : 'Disabled'}</p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            <div className="bg-[#06402b] text-white rounded-3xl p-8 relative overflow-hidden group shadow-2xl">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#735c00]/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                  <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                    <MaterialSymbol icon="router" size={24} className="text-[#D4AF37]" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold mb-1">Live Status</p>
                    <div className="flex items-center gap-2 justify-end">
                      <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)] ${device.status === 'online' ? 'bg-emerald-400' : 'bg-[#717973]'}`} />
                      <span className={`text-xs font-bold ${device.status === 'online' ? 'text-emerald-400' : 'text-[#717973]'}`}>
                        {device.status === 'online' ? 'ACTIVE' : 'OFFLINE'}
                      </span>
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white/60 mb-1 uppercase tracking-widest">Management Preview</h3>
                <p className="text-2xl font-black mb-8 leading-tight">{device.name || device.device_id}</p>

                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <span className="text-xs text-white/60">Device ID</span>
                    <span className="text-sm font-bold font-mono">{device.device_id}</span>
                  </div>
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <span className="text-xs text-white/60">Battery</span>
                    <span className={`text-sm font-bold ${battery > 50 ? 'text-emerald-400' : battery > 20 ? 'text-[#D4AF37]' : 'text-[#BA1A1A]'}`}>{battery}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Last Ping</span>
                    <span className="text-sm font-bold">{device.last_ping ? new Date(device.last_ping).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#eeeee9] rounded-3xl p-6 border border-white/50 shadow-inner">
              <div className="flex gap-4">
                <MaterialSymbol icon="info" size={20} className="text-[#002819]/40" />
                <div>
                  <h4 className="text-sm font-bold text-[#002819] mb-1">System Audit Log</h4>
                  <p className="text-xs text-[#404943] leading-relaxed">
                    This device was last configured by <span className="font-bold">{device.owner?.name || 'Admin'}</span> on {device.updated_at ? new Date(device.updated_at).toLocaleDateString() : 'N/A'}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
