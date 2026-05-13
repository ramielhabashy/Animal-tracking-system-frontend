import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../../../utils/api';
import { useI18n } from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';
import TaskCalendar from '../../Tasks/TaskCalendar';

const fetchWithRetry = async (url, options = {}, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    const res = await apiFetch(url, options);
    if (res.status === 429 && i < retries) {
      await new Promise(r => setTimeout(r, (i + 1) * 2000));
      continue;
    }
    return res;
  }
  return null;
};

export default function TasksWidget({ dashboardData }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const userRole = user?.role;
  const showVaccinations = userRole === 'Owner' || userRole === 'Manager';
  const mountedRef = useRef(true);

  const [allTasks, setAllTasks] = useState([]);
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, overdue: 0 });
  const [vaccinationCount, setVaccinationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();
    return () => { mountedRef.current = false; };
  }, []);

  const fetchAll = async () => {
    try {
      const now = new Date();

      const calRes = await fetchWithRetry(`/api/tasks/calendar/data?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      if (!mountedRef.current) return;

      const statsRes = await fetchWithRetry('/api/tasks/stats');
      if (!mountedRef.current) return;

      let vaccRes = null;
      if (showVaccinations) {
        await new Promise(r => setTimeout(r, 300));
        vaccRes = await fetchWithRetry('/api/vaccination-schedules?per_page=100');
        if (!mountedRef.current) return;
      }

      let tasks = [];

      if (calRes && calRes.ok) {
        const calData = await calRes.json();
        const grouped = calData.data || {};
        Object.entries(grouped).forEach(([dateStr, taskList]) => {
          taskList.forEach(task => {
            tasks.push({ ...task, due_date: task.due_date || dateStr, _type: 'task' });
          });
        });
      }

      if (statsRes && statsRes.ok) {
        const sData = await statsRes.json();
        const d = sData.data || {};
        setStats({ pending: d.pending || 0, inProgress: d.in_progress || 0, overdue: d.overdue || 0 });
      }

      if (vaccRes && vaccRes.ok) {
        const vaccData = await vaccRes.json();
        const vaccList = vaccData.data || [];
        const pendingVaccinations = vaccList.filter(v => v.status !== 'cancelled' && v.status !== 'administered');
        setVaccinationCount(pendingVaccinations.length);
        pendingVaccinations.forEach(v => {
          tasks.push({
            id: `vacc_${v.id}`,
            title: `${v.vaccine_name || 'Vaccination'} (${v.animal?.animal_id || 'N/A'})`,
            due_date: v.scheduled_date,
            status: v.status === 'overdue' ? 'overdue' : (v.status || 'scheduled'),
            priority: v.status === 'overdue' ? 'urgent' : 'medium',
            _type: 'vaccination',
          });
        });
      }

      setAllTasks(tasks);
    } catch (e) {
      console.error('Failed to fetch calendar data:', e);
      if (mountedRef.current) setError('Failed to load calendar');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const { pending, inProgress, overdue } = stats;

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${showVaccinations ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <div className="bg-[#F59E0B]/10 p-3 rounded-xl text-center">
          <p className="text-2xl font-black text-[#735C00]">{pending}</p>
          <p className="text-[10px] font-bold text-[#717973] uppercase">{t('tasks.pending')}</p>
        </div>
        <div className="bg-[#3B82F6]/10 p-3 rounded-xl text-center">
          <p className="text-2xl font-black text-[#2563EB]">{inProgress}</p>
          <p className="text-[10px] font-bold text-[#717973] uppercase">{t('tasks.inProgress')}</p>
        </div>
        <div className={`${overdue > 0 ? 'bg-[#BA1A1A]/10' : 'bg-[#F4F4EF]'} p-3 rounded-xl text-center`}>
          <p className={`text-2xl font-black ${overdue > 0 ? 'text-[#BA1A1A]' : 'text-[#717973]'}`}>{overdue}</p>
          <p className="text-[10px] font-bold text-[#717973] uppercase">{t('tasks.overdue')}</p>
        </div>
        {showVaccinations && (
          <div className="bg-[#D4AF37]/10 p-3 rounded-xl text-center">
            <p className="text-2xl font-black text-[#735C00]">{vaccinationCount}</p>
            <p className="text-[10px] font-bold text-[#717973] uppercase">Vaccinations</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-6 h-6 border-2 border-[#002819] border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <MaterialSymbol icon="cloud_off" size={32} className="mx-auto text-[#717973] mb-2" />
          <p className="text-sm text-[#717973] mb-3">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); fetchAll(); }}
            className="px-4 py-2 bg-[#F4F4EF] hover:bg-[#E3E3DE] rounded-xl text-sm font-semibold text-[#002819] transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <TaskCalendar tasks={allTasks} />
      )}

      <div className={`flex gap-2 ${showVaccinations ? '' : ''}`}>
        <Link
          to="/tasks"
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#F4F4EF] hover:bg-[#E3E3DE] rounded-xl text-sm font-bold text-[#002819] transition-colors"
        >
          <MaterialSymbol icon="arrow_forward" size={16} />
          {t('tasks.viewAll')}
        </Link>
        {showVaccinations && (
          <Link
            to="/vaccination-schedule"
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 rounded-xl text-sm font-bold text-[#735C00] transition-colors"
          >
            <MaterialSymbol icon="vaccines" size={16} />
            Vaccinations
          </Link>
        )}
      </div>
    </div>
  );
}
