import React from 'react';
import { Link } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';

export default function QuickActionsWidget({ dashboardData }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const userRole = user?.role;
  const isAdmin = userRole === 'Admin';
  const isOwner = userRole === 'Owner';
  const isManager = userRole === 'Manager';
  const canManageUsers = isAdmin || isOwner;
  const isAdminOrOwner = isAdmin || isOwner;
  const { stats } = dashboardData;

  const items = [
    { to: '/animals', icon: 'pets', title: t('dashboard.manageAnimals'), subtitle: `${stats?.totalAnimals || 0} total`, color: 'from-[#002819] to-[#06402B]', roles: true },
    { to: '/devices', icon: 'sensors', title: t('nav.devices'), subtitle: `${stats?.activeDevices || 0} active`, color: 'from-[#06402B] to-[#002819]', roles: isAdmin || isOwner || isManager },
    { to: '/map', icon: 'map', title: t('nav.mapView'), subtitle: t('dashboard.fullTracker'), color: 'from-[#735C00] to-[#D4AF37]', roles: isAdmin || isOwner || isManager },
    { to: '/users', icon: 'groups', title: t('nav.team'), subtitle: t('team.teamMembers'), color: 'from-[#D4AF37] to-[#735C00]', roles: canManageUsers },
    { to: '/tasks', icon: 'task', title: t('nav.tasks'), subtitle: t('tasks.title'), color: 'from-[#06402B] to-[#735C00]', roles: true },
    { to: '/medical-records', icon: 'medical_services', title: t('nav.medicalRecords'), subtitle: t('medicalRecords.records'), color: 'from-[#735C00] to-[#06402B]', roles: isAdmin || isOwner || isManager || userRole === 'Doctor' },
  ];

  const visible = items.filter(item => item.roles);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {visible.map((item, idx) => (
        <Link
          key={idx}
          to={item.to}
          className={`card p-5 bg-gradient-to-br ${item.color} text-white group hover:shadow-[0_16px_48px_rgba(6,64,43,0.15)] transition-all duration-300 hover:-translate-y-1`}
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <MaterialSymbol icon={item.icon} size={22} className="text-white" weight="fill" />
          </div>
          <h5 className="font-bold text-sm mb-1">{item.title}</h5>
          <p className="text-xs text-white/70">{item.subtitle}</p>
        </Link>
      ))}
    </div>
  );
}
