import React from 'react';
import { useState, useMemo } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../../i18n';
import { useNavigate } from 'react-router-dom';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const priorityColors = {
  low: 'bg-[#F4F4EF]',
  medium: 'bg-[#D4AF37]',
  high: 'bg-[#F59E0B]',
  urgent: 'bg-[#BA1A1A]',
};

export default function TaskCalendar({ tasks, compact = false, onDateClick }) {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const taskMap = useMemo(() => {
    const map = {};
    if (tasks && tasks.length > 0) {
      tasks.forEach(task => {
        if (task.due_date) {
          const d = new Date(task.due_date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          if (!map[key]) map[key] = [];
          map[key].push(task);
        }
      });
    }
    return map;
  }, [tasks]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
    setSelectedDate(null);
  };

  const goToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(null);
  };

  const handleDateClick = (dateStr, day) => {
    if (!compact) {
      setSelectedDate(prev => prev === dateStr ? null : dateStr);
    }
    if (onDateClick) onDateClick(dateStr, day);
  };

  const selectedDateTasks = selectedDate ? taskMap[selectedDate] || [] : [];

  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(currentYear, currentMonth, d);
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
    const isSelected = selectedDate === dateStr;
    const dayTasks = taskMap[dateStr] || [];
    const hasOverdue = dayTasks.some(t => t.status !== 'completed' && new Date(t.due_date) < today);

    calendarDays.push({
      day: d,
      dateStr,
      isToday,
      isSelected,
      tasks: dayTasks,
      count: dayTasks.length,
      hasOverdue,
      overdueCount: dayTasks.filter(t => t.status !== 'completed' && new Date(t.due_date) < today).length,
    });
  }

  return (
    <div>
      <div className={`flex items-center justify-between mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <button onClick={prevMonth} className="p-2 hover:bg-[#F4F4EF] rounded-xl transition">
            <MaterialSymbol icon={isRtl ? 'chevron_right' : 'chevron_left'} size={20} className="text-[#717973]" />
          </button>
          <h4 className="font-bold text-[#002819]">
            {t(`common.${MONTHS[currentMonth].toLowerCase()}`) || MONTHS[currentMonth]} {currentYear}
          </h4>
          <button onClick={nextMonth} className="p-2 hover:bg-[#F4F4EF] rounded-xl transition">
            <MaterialSymbol icon={isRtl ? 'chevron_left' : 'chevron_right'} size={20} className="text-[#717973]" />
          </button>
        </div>
        <button
          onClick={goToday}
          className="text-xs font-semibold text-[#D4AF37] hover:underline"
        >
          {t('common.today')}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAYS.map(d => (
          <div key={d} className={`text-center text-[10px] font-bold text-[#717973] uppercase py-1 ${isRtl ? 'text-right' : ''}`}>
            {compact ? d[0] : t(`common.${d.toLowerCase()}`) || d}
          </div>
        ))}
        {calendarDays.map((cell, idx) => {
          if (!cell) return <div key={`empty-${idx}`} />;
          return (
            <div
              key={cell.dateStr}
              onClick={() => handleDateClick(cell.dateStr, cell.day)}
              className={`
                relative min-h-[60px] rounded-xl p-1.5 cursor-pointer transition-all
                ${cell.isToday ? 'ring-2 ring-[#D4AF37]' : ''}
                ${cell.isSelected ? 'bg-[#D4AF37]/15' : 'hover:bg-[#F4F4EF]/50'}
                ${cell.count > 0 ? 'bg-[#F4F4EF]' : ''}
              `}
            >
              <span className={`
                text-xs font-bold
                ${cell.isToday ? 'text-[#D4AF37]' : 'text-[#404943]'}
                ${cell.isSelected ? 'text-[#D4AF37]' : ''}
              `}>
                {cell.day}
              </span>
              {cell.count > 0 && !compact && (
                <div className="mt-1 space-y-0.5">
                  {cell.tasks.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      className={`
                        text-[8px] leading-tight truncate rounded px-0.5
                        ${task.status === 'completed' ? 'text-[#10B981] line-through' : task.status === 'in_progress' ? 'text-[#3B82F6]' : 'text-[#404943]'}
                      `}
                    >
                      {task.title}
                    </div>
                  ))}
                  {cell.count > 3 && (
                    <div className="text-[8px] text-[#717973] font-semibold">+{cell.count - 3} more</div>
                  )}
                </div>
              )}
              {cell.count > 0 && compact && (
                <div className="flex gap-0.5 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${cell.hasOverdue ? 'bg-[#BA1A1A]' : 'bg-[#D4AF37]'}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && selectedDateTasks.length > 0 && !compact && (
        <div className="mt-4 space-y-2">
          <h5 className="text-xs font-bold text-[#717973] uppercase tracking-wider">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </h5>
          {selectedDateTasks.map(task => (
            <div
              key={task.id}
              onClick={() => navigate(`/tasks?task=${task.id}`)}
              className="flex items-center gap-3 p-3 bg-white rounded-xl cursor-pointer hover:shadow-sm transition-shadow"
            >
              <div className={`w-2 h-2 rounded-full ${priorityColors[task.priority] || 'bg-[#717973]'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#002819] truncate">{task.title}</p>
                <p className="text-xs text-[#717973]">
                  {task.assignee_name && `${task.assignee_name}`}
                  {task.animal_name && ` - ${task.animal_name}`}
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                task.status === 'completed' ? 'bg-[#10B981]/15 text-[#059669]' :
                task.status === 'in_progress' ? 'bg-[#3B82F6]/15 text-[#2563EB]' :
                task.status === 'cancelled' ? 'bg-[#F4F4EF] text-[#717973]' :
                'bg-[#F59E0B]/15 text-[#735C00]'
              }`}>
                {t(`tasks.${task.status === 'in_progress' ? 'inProgress' : task.status}`)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
