import React from 'react';
import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import DashboardGrid from '../components/Dashboard/DashboardGrid';

export default function Dashboard() {
  const { user } = useAuth();
  const userRole = user?.role;
  const isAdmin = userRole === 'Admin';

  const [stats, setStats] = useState({
    totalAnimals: 0,
    activeDevices: 0,
    alerts: 0,
    subscription: null,
  });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [animals, setAnimals] = useState([]);
  const [devices, setDevices] = useState([]);
  const [locationHistories, setLocationHistories] = useState({});
  const [geofences, setGeofences] = useState([]);
  const [ownerStatsData, setOwnerStatsData] = useState(null);
  const [ownerStatsLoading, setOwnerStatsLoading] = useState(false);
  const [adminSubStats, setAdminSubStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboardRes, animalsRes, devicesRes, alertsRes, geofenceRes, notifRes] = await Promise.all([
        apiFetch('/api/dashboard'),
        apiFetch('/api/animals?per_page=100'),
        apiFetch('/api/devices?per_page=100'),
        apiFetch('/api/geofence-alerts'),
        apiFetch('/api/geofences'),
        apiFetch('/api/notifications?per_page=10'),
      ]);

      const dashboardData = dashboardRes.ok ? await dashboardRes.json() : { stats: {}, subscription: null };
      const animalsData = await animalsRes.json();
      const devicesData = await devicesRes.json();
      const alertsData = alertsRes.ok ? await alertsRes.json() : [];
      const geofenceData = geofenceRes.ok ? await geofenceRes.json() : { data: [] };
      const notifData = notifRes.ok ? await notifRes.json() : { data: [] };

      const dashboardStats = dashboardData.stats || {};
      const subscriptionData = dashboardData.subscription;
      const animalsList = animalsData.data || [];
      const totalAnimals = animalsData.meta?.total || animalsData.total || animalsList.length;
      const devicesList = Array.isArray(devicesData.data) ? devicesData.data : (devicesData.data?.data || []);
      const geofenceAlerts = Array.isArray(alertsData) ? alertsData : (alertsData.data || []);
      const geofencesList = Array.isArray(geofenceData.data) ? geofenceData.data : [];
      const notificationsList = Array.isArray(notifData.data) ? notifData.data : [];

      setGeofences(geofencesList);
      setNotifications(notificationsList);
      setDevices(devicesList);

      const animalsWithDevices = animalsList.filter(a => a.device?.device_id || a.device_id);

      const historyPromises = animalsWithDevices.map(animal =>
        apiFetch(`/api/animals/${animal.id}/location-history?hours=720`)
          .then(res => res.ok ? res.json() : null)
      );

      const histories = await Promise.all(historyPromises);
      const historyMap = {};
      animalsWithDevices.forEach((animal, idx) => {
        if (histories[idx]) {
          historyMap[animal.id] = histories[idx].locations || [];
        }
      });
      setLocationHistories(historyMap);

      const assignedDeviceIds = animalsList.map(a => a.device?.device_id || a.device_id).filter(Boolean);
      const offlineOrSignalDevices = devicesList.filter(d => d.status === 'offline' || d.status === 'low_signal').length;
      const animalsWithDevicesCount = assignedDeviceIds.length;
      const animalsWithoutDevices = totalAnimals - animalsWithDevicesCount;
      const unacknowledgedAlerts = geofenceAlerts.filter(a => !a.is_acknowledged).length;

      setStats({
        totalAnimals: totalAnimals,
        activeDevices: animalsWithDevicesCount,
        alerts: offlineOrSignalDevices + animalsWithoutDevices + unacknowledgedAlerts,
        subscription: subscriptionData,
      });

      const animalsWithLocations = animalsList.map((animal, index) => {
        const history = historyMap[animal.id] || [];
        let lat = null;
        let lng = null;

        if (history.length > 0) {
          const lastLoc = history[history.length - 1];
          lat = parseFloat(lastLoc.latitude);
          lng = parseFloat(lastLoc.longitude);
        } else if (animal.device?.gps_lat && animal.device?.gps_lng) {
          lat = parseFloat(animal.device.gps_lat);
          lng = parseFloat(animal.device.gps_lng);
        } else {
          lat = 24.4539 + (index * 0.002) - 0.004;
          lng = 54.3773 + (index * 0.003) - 0.003;
        }

        const path = history
          .sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at))
          .map(h => [parseFloat(h.latitude), parseFloat(h.longitude)]);

        return {
          ...animal,
          lat,
          lng,
          path
        };
      });

      setAnimals(animalsWithLocations);

      const dashboardAlerts = [];

      if (geofenceAlerts && geofenceAlerts.length > 0) {
        geofenceAlerts.slice(0, 10).forEach(alert => {
          const severity = alert.type === 'exit' ? 'High' : alert.type === 'temperature' ? 'Medium' : 'Medium';
          dashboardAlerts.push({
            id: alert.id,
            severity,
            animal: alert.animal?.animal_id || alert.animal_id || 'Unknown',
            message: alert.type === 'entry' ? `Entry: ${alert.geofence?.name || 'Geofence'}` : alert.type === 'exit' ? `Exit: ${alert.geofence?.name || 'Geofence'}` : alert.type,
            time: alert.triggered_at ? new Date(alert.triggered_at).toLocaleTimeString() : 'Now',
            isAcknowledged: alert.is_acknowledged,
          });
        });
      } else {
        devicesList.forEach(device => {
          if (device.status === 'offline') {
            dashboardAlerts.push({ severity: 'High', animal: device.device_id, message: 'Device Offline', time: 'Just now' });
          } else if (device.status === 'low_signal') {
            dashboardAlerts.push({ severity: 'Medium', animal: device.device_id, message: 'Low Signal / Battery Warning', time: 'Just now' });
          }
        });
      }

      const unassignedAnimals = animalsList.filter(a => !(a.device?.device_id || a.device_id));
      unassignedAnimals.forEach(animal => {
        dashboardAlerts.push({ severity: 'Medium', animal: animal.animal_id, message: 'No device assigned', time: 'Now' });
      });

      if (dashboardAlerts.length === 0) {
        dashboardAlerts.push({ severity: 'Low', animal: 'System', message: 'All systems operating normally', time: 'Now' });
      }

      setAlerts(dashboardAlerts);

      if (isAdmin) {
        fetchAdminData();
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  };

  const fetchAdminData = async () => {
    setOwnerStatsLoading(true);
    try {
      const [ownerRes, statsRes, unreadRes] = await Promise.all([
        apiFetch('/api/dashboard/owners'),
        apiFetch('/api/subscription/admin/stats'),
        apiFetch('/api/notifications/unread-count'),
      ]);
      if (ownerRes.ok) {
        const ownerData = await ownerRes.json();
        setOwnerStatsData(ownerData);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setAdminSubStats(statsData.data || statsData);
      }
      if (unreadRes.ok) {
        const { count } = await unreadRes.json();
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setOwnerStatsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#002819] border-t-transparent rounded-full" />
      </div>
    );
  }

  const dashboardData = {
    stats,
    alerts,
    animals,
    devices,
    geofences,
    locationHistories,
    ownerStatsData,
    ownerStatsLoading,
    adminSubStats,
    notifications,
    unreadCount,
    setUnreadCount,
    setNotifications,
  };

  return <DashboardGrid dashboardData={dashboardData} />;
}
