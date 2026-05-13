import React from 'react';
import { Link } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';

export default function MedicalOverviewWidget({ dashboardData }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const userRole = user?.role;
  const canView = userRole === 'Admin' || userRole === 'Owner' || userRole === 'Manager' || userRole === 'Doctor';

  if (!canView) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Link to="/medical-records" className="card p-5 text-center hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#06402B] to-[#002819] flex items-center justify-center mx-auto mb-3">
            <MaterialSymbol icon="medical_services" size={20} className="text-[#D4AF37]" />
          </div>
          <p className="font-bold text-sm text-[#002819]">{t('medicalRecords.records')}</p>
          <p className="text-xs text-[#717973] mt-1">View all records</p>
        </Link>
        <Link to="/vaccination-schedule" className="card p-5 text-center hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#735C00] to-[#D4AF37] flex items-center justify-center mx-auto mb-3">
            <MaterialSymbol icon="vaccines" size={20} className="text-white" />
          </div>
          <p className="font-bold text-sm text-[#002819]">{t('nav.vaccinationSchedule')}</p>
          <p className="text-xs text-[#717973] mt-1">Upcoming vaccinations</p>
        </Link>
      </div>
    </div>
  );
}
