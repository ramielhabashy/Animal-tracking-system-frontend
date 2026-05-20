import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch, storageUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import TranslateButton from '../components/TranslateButton';
import TaskCalendar from '../components/Tasks/TaskCalendar';

const priorityColors = {
  low: 'bg-surface-light text-on-surface-variant',
  medium: 'bg-brand-accent/15 text-tertiary-container',
  high: 'bg-[#F59E0B]/15 text-tertiary-container',
  urgent: 'bg-danger/10 text-danger',
};

const statusColors = {
  pending: 'bg-[#F59E0B]/15 text-tertiary-container',
  in_progress: 'bg-[#3B82F6]/15 text-[#2563EB]',
  delivered: 'bg-[#8B5CF6]/15 text-[#7C3AED]',
  completed: 'bg-[#10B981]/15 text-success',
  cancelled: 'bg-surface-light text-on-surface-subtle',
};

const logTypeIcons = {
  checkpoint: 'location_on',
  photo: 'photo_camera',
  note: 'note',
  location_update: 'my_location',
  status_change: 'swap_horiz',
};

export default function TasksPage() {
  const { user } = useAuth();
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedTask, setExpandedTask] = useState(null);
  const [taskLogs, setTaskLogs] = useState({});
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [shepherds, setShepherds] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    animal_id: '',
    priority: 'medium',
    task_type: 'other',
    due_date: '',
  });
  const [recurring, setRecurring] = useState({
    enabled: false,
    pattern: 'weekly',
    interval: 1,
    end_date: '',
  });
  const [logForm, setLogForm] = useState({
    log_type: 'checkpoint',
    description: '',
    photo: null,
    voice_note: null,
  });
  const [saving, setSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingInterval, setRecordingInterval] = useState(null);
  const [message, setMessage] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignTask, setReassignTask] = useState(null);
  const [reassignTo, setReassignTo] = useState('');
   const [showDeliverModal, setShowDeliverModal] = useState(false);
   const [deliverTask, setDeliverTask] = useState(null);
   const [deliverNotes, setDeliverNotes] = useState('');
   const [showRejectModal, setShowRejectModal] = useState(false);
   const [rejectTask, setRejectTask] = useState(null);
   const [rejectNotes, setRejectNotes] = useState('');

  const [logTypes, setLogTypes] = useState([]);
  const [reassignOnLog, setReassignOnLog] = useState(false);
  const [reassignToOnLog, setReassignToOnLog] = useState('');
  const [showReassignOnLog, setShowReassignOnLog] = useState(false);

  const isShepherd = user?.role === 'Shepherd';
  const isDoctor = user?.role === 'Doctor';
  const canModify = !isShepherd && !isDoctor;
  const canUpdateStatus = true;

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, [statusFilter, priorityFilter]);

  const fetchTasks = async () => {
    try {
      let url = '/api/tasks?';
      if (statusFilter !== 'all') url += `status=${statusFilter}&`;
      if (priorityFilter !== 'all') url += `priority=${priorityFilter}`;

      const response = await apiFetch(url);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.data?.data || data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiFetch('/api/tasks/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.data || data || {});
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchTaskLogs = async (taskId) => {
    if (taskLogs[taskId]) return;
    try {
      const response = await apiFetch(`/api/tasks/${taskId}/logs`);
      if (response.ok) {
        const data = await response.json();
        setTaskLogs(prev => ({ ...prev, [taskId]: data.data || [] }));
      }
    } catch (error) {
      console.error('Failed to fetch task logs:', error);
    }
  };

  const fetchShepherds = async () => {
    try {
      const response = await apiFetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setShepherds((data.data || []).filter(u => u.role === 'Shepherd'));
        setUsers(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchAnimals = async () => {
    try {
      const response = await apiFetch('/api/animals?per_page=100');
      if (response.ok) {
        const data = await response.json();
        setAnimals(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch animals:', error);
    }
  };

  const fetchTaskTypes = async () => {
    try {
      const response = await apiFetch('/api/task-types');
      if (response.ok) {
        const data = await response.json();
        setTaskTypes(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch task types:', error);
    }
  };

  const fetchLogTypes = async () => {
    try {
      const response = await apiFetch('/api/task-log-types');
      if (response.ok) {
        const data = await response.json();
        setLogTypes(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch log types:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = { ...formData };
    if (recurring.enabled) {
      payload.is_recurring = true;
      payload.recurrence_pattern = recurring.pattern;
      payload.recurrence_interval = recurring.interval;
      payload.recurrence_end_date = recurring.end_date || null;
    }

    try {
      const response = await apiFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: t('tasks.taskCreated') });
        setShowCreateModal(false);
        setFormData({
          title: '', description: '', assigned_to: '',
          animal_id: '', priority: 'medium', task_type: 'other', due_date: '',
        });
        setRecurring({ enabled: false, pattern: 'weekly', interval: 1, end_date: '' });
        fetchTasks();
        fetchStats();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || t('tasks.taskCreateFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('tasks.networkError') });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitLog = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const formDataObj = new FormData();
    formDataObj.append('task_id', selectedTask.id);
    formDataObj.append('log_type', logForm.log_type);
    formDataObj.append('description', logForm.description);
    if (logForm.photo) formDataObj.append('photo', logForm.photo);
    if (audioBlob) formDataObj.append('voice_note', audioBlob, 'voice_note.webm');

    try {
      const response = await apiFetch('/api/task-logs', { method: 'POST', body: formDataObj });
      if (response.ok) {
        if (reassignOnLog && reassignToOnLog && canModify) {
          await apiFetch(`/api/tasks/${selectedTask.id}/reassign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assigned_to: reassignToOnLog }),
          });
        }
        setMessage({ type: 'success', text: t('tasks.logSubmitted') });
        setShowLogModal(false);
        const firstLogType = logTypes.length > 0 ? logTypes[0].slug : 'checkpoint';
        setLogForm({ log_type: firstLogType, description: '', photo: null, voice_note: null });
        setAudioBlob(null);
        setAudioUrl(null);
        stopRecording();
        fetchTaskLogs(selectedTask.id);
        fetchTasks();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.message || t('tasks.logSubmitFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('tasks.networkError') });
    } finally {
      setSaving(false);
    }
  };

  const handleDeliver = async () => {
    if (!deliverTask) return;
    setSaving(true);
    try {
      const response = await apiFetch(`/api/tasks/${deliverTask.id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: deliverNotes }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Task delivered successfully' });
        setShowDeliverModal(false);
        setDeliverTask(null);
        setDeliverNotes('');
        fetchTasks();
        fetchStats();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to deliver task' });
     } finally {
       setSaving(false);
     }
   };

  const handleApprove = async (task) => {
    setSaving(true);
    try {
      const response = await apiFetch(`/api/tasks/${task.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Task approved successfully' });
        fetchTasks();
        fetchStats();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to approve task' });
    } finally {
      setSaving(false);
    }
  };

  const openRejectModal = (task) => {
    setRejectTask(task);
    setRejectNotes('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectTask || !rejectNotes.trim()) return;
    setSaving(true);
    try {
      const response = await apiFetch(`/api/tasks/${rejectTask.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: rejectNotes }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Task rejected and sent back to assignee' });
        setShowRejectModal(false);
        setRejectTask(null);
        setRejectNotes('');
        fetchTasks();
        fetchStats();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reject task' });
    } finally {
      setSaving(false);
    }
  };

   const handleReassign = async () => {
    if (!reassignTask || !reassignTo) return;
    setSaving(true);
    try {
      const response = await apiFetch(`/api/tasks/${reassignTask.id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: reassignTo }),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Task reassigned successfully' });
        setShowReassignModal(false);
        setReassignTask(null);
        setReassignTo('');
        fetchTasks();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reassign task' });
    } finally {
      setSaving(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      const interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      setRecordingInterval(interval);
    } catch (error) {
      setMessage({ type: 'error', text: t('tasks.microphoneDenied') });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    if (recordingInterval) { clearInterval(recordingInterval); setRecordingInterval(null); }
    setIsRecording(false);
    setRecordingTime(0);
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const response = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) { fetchTasks(); fetchStats(); }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm(t('tasks.deleteConfirm'))) return;
    try {
      await apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      fetchTasks();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleComplete = async (task) => {
    try {
      const response = await apiFetch(`/api/tasks/${task.id}/complete`, { method: 'POST' });
      if (response.ok) { fetchTasks(); fetchStats(); }
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const openCreateModal = () => {
    fetchShepherds();
    fetchAnimals();
    fetchTaskTypes();
    setShowCreateModal(true);
  };

  const openLogModal = (task) => {
    setSelectedTask(task);
    fetchLogTypes();
    fetchShepherds();
    setReassignOnLog(false);
    setReassignToOnLog('');
    setShowReassignOnLog(false);
    setShowLogModal(true);
  };

  const openReassignModal = (task) => {
    setReassignTask(task);
    setReassignTo('');
    fetchShepherds();
    setShowReassignModal(true);
  };

  const openDeliverModal = (task) => {
    setDeliverTask(task);
    setDeliverNotes('');
    setShowDeliverModal(true);
  };

  const toggleTaskExpansion = (taskId) => {
    if (expandedTask === taskId) {
      setExpandedTask(null);
    } else {
      setExpandedTask(taskId);
      fetchTaskLogs(taskId);
    }
  };

  const taskTypeIcons = {};
  const taskTypeMap = {};
  taskTypes.forEach(tt => {
    taskTypeIcons[tt.slug] = tt.icon || 'assignment';
    taskTypeMap[tt.slug] = tt;
  });

  const isOverdue = (task) => {
    return task.due_date && new Date(task.due_date) < new Date() && !['completed', 'delivered', 'cancelled'].includes(task.status);
  };

  const canSubmitLog = (task) => {
    return isShepherd && task.assigned_to === user?.id && task.is_recurring && !['completed', 'delivered', 'cancelled'].includes(task.status);
  };

  const canDeliver = (task) => {
    return task.assigned_to === user?.id && ['pending', 'in_progress'].includes(task.status);
  };

  const canApprove = (task) => {
    return task.status === 'delivered' && canModify;
  };

  const canReject = (task) => {
    return task.status === 'delivered' && canModify;
  };

  const canReassignFn = (task) => {
    return canModify && !isDoctor && !['completed', 'cancelled', 'delivered'].includes(task.status);
  };

  return (
    <div className="space-y-8">
      <div className={`flex flex-col md:flex-row md:items-end justify-between gap-4 ${isRtl ? 'text-right' : ''}`}>
        <div>
          <h2 className="text-4xl font-black text-brand-primary">{t('tasks.taskManagement')}</h2>
          <p className="text-on-surface-variant mt-2 font-medium">{t('tasks.subtitle')}</p>
        </div>
        <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className="flex bg-surface-light rounded-xl p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'list' ? 'bg-white text-brand-primary shadow-sm' : 'text-on-surface-subtle'}`}
            >
              <MaterialSymbol icon="list" size={18} />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'calendar' ? 'bg-white text-brand-primary shadow-sm' : 'text-on-surface-subtle'}`}
            >
              <MaterialSymbol icon="calendar_month" size={18} />
            </button>
          </div>
          {canModify && (
            <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
              <MaterialSymbol icon="add" size={18} />
              {t('tasks.createTask')}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-[#10B981]/15 text-success' : 'bg-danger/10 text-danger'}`}>
          {message.text}
        </div>
      )}

      {viewMode === 'list' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: t('common.all'), value: stats.total, color: 'bg-white' },
              { label: t('tasks.pending'), value: stats.pending, color: 'bg-[#F59E0B]/5' },
              { label: t('tasks.inProgress'), value: stats.in_progress, color: 'bg-[#3B82F6]/5' },
              { label: t('tasks.completed'), value: stats.completed, color: 'bg-[#10B981]/5' },
              { label: t('tasks.overdue'), value: stats.overdue, color: stats.overdue > 0 ? 'bg-danger/5' : 'bg-white' },
            ].map((stat, idx) => (
              <div key={idx} className={`${stat.color} p-5 rounded-2xl shadow-sm`}>
                <p className="text-xs font-bold text-on-surface-subtle uppercase tracking-wider">{stat.label}</p>
                <p className="text-3xl font-black text-brand-primary mt-2">{stat.value || 0}</p>
              </div>
            ))}
          </div>

          <div className={`flex flex-wrap gap-3 items-center ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl ${isRtl ? 'flex-row-reverse' : ''}`}>
              <MaterialSymbol icon="filter_list" size={20} className="text-on-surface-subtle" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-none text-sm font-medium text-on-surface-variant focus:outline-none cursor-pointer">
                <option value="all">{t('tasks.allStatus')}</option>
                <option value="pending">{t('tasks.pending')}</option>
                <option value="in_progress">{t('tasks.inProgress')}</option>
                <option value="completed">{t('tasks.completed')}</option>
                <option value="cancelled">{t('tasks.cancelled')}</option>
              </select>
            </div>
            <div className={`flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl ${isRtl ? 'flex-row-reverse' : ''}`}>
              <MaterialSymbol icon="flag" size={20} className="text-on-surface-subtle" />
              <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); }}
                className="bg-transparent border-none text-sm font-medium text-on-surface-variant focus:outline-none cursor-pointer">
                <option value="all">{t('tasks.allPriority')}</option>
                <option value="low">{t('tasks.low')}</option>
                <option value="medium">{t('tasks.medium')}</option>
                <option value="high">{t('tasks.high')}</option>
                <option value="urgent">{t('tasks.urgent')}</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="card p-12 text-center">
              <MaterialSymbol icon="task_alt" size={64} className="text-on-surface-subtle mx-auto mb-4 opacity-50" />
              <p className="text-on-surface-variant font-medium text-lg">{t('common.noData')}</p>
              <p className="text-on-surface-subtle text-sm mt-1">{t('tasks.emptyState')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className={`card overflow-hidden ${isOverdue(task) ? 'ring-2 ring-[#BA1A1A]/30' : ''}`}>
                  <div
                    className="p-6 cursor-pointer hover:bg-surface-light/30 transition-colors"
                    onClick={() => toggleTaskExpansion(task.id)}
                  >
                    <div className={`flex items-start gap-5 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${task.status === 'completed' ? 'bg-[#10B981]/15' : 'bg-brand-primary/5'}`}>
                        <MaterialSymbol
                          icon={taskTypeIcons[task.task_type] || 'assignment'}
                          size={26}
                          className={task.status === 'completed' ? 'text-success' : 'text-brand-primary'}
                        />
                      </div>
                      <div className="flex-1">
                        <div className={`flex items-start justify-between ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-on-surface-subtle bg-surface-light px-2 py-0.5 rounded">
                                {task.task_id || `#${task.id}`}
                              </span>
                              <h3 className={`font-bold text-lg text-brand-primary ${task.status === 'completed' ? 'line-through opacity-60' : ''}`}>
                                {task.title}
                                <TranslateButton text={task.title} className="ml-1" />
                              </h3>
                              {task.is_recurring && (
                                <MaterialSymbol icon="repeat" size={16} className="text-brand-accent" />
                              )}
                            </div>
                            {task.description && (
                              <p className="text-sm text-on-surface-subtle mt-1">{task.description} <TranslateButton text={task.description} /></p>
                            )}
                          </div>
                          <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${priorityColors[task.priority]}`}>
                              {t(`tasks.${task.priority}`)}
                            </span>
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${statusColors[task.status]}`}>
                              {t(`tasks.${task.status === 'in_progress' ? 'inProgress' : task.status}`)}
                            </span>
                          </div>
                        </div>

                        <div className={`flex flex-wrap items-center gap-5 mt-4 text-sm text-on-surface-subtle ${isRtl ? 'flex-row-reverse justify-end' : ''}`}>
                          {task.assignee && (
                            <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                              <MaterialSymbol icon="person" size={16} />
                              <span>{task.assignee.name}</span>
                            </div>
                          )}
                          {task.owner && (
                            <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                              <MaterialSymbol icon="person_outline" size={16} />
                              <span>by {task.owner.name}</span>
                            </div>
                          )}
                          {task.animal && (
                            <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                              <MaterialSymbol icon="pets" size={16} />
                              <span>{task.animal.animal_id}</span>
                            </div>
                          )}
                          {task.due_date && (
                            <div className={`flex items-center gap-2 ${isOverdue(task) ? 'text-danger font-semibold' : ''} ${isRtl ? 'flex-row-reverse' : ''}`}>
                              <MaterialSymbol icon="schedule" size={16} />
                              <span>{new Date(task.due_date).toLocaleDateString()}</span>
                              {isOverdue(task) && <span className="text-xs">({t('tasks.overdue')})</span>}
                            </div>
                          )}
                          {taskLogs[task.id]?.length > 0 && (
                            <div className={`flex items-center gap-2 text-brand-accent ${isRtl ? 'flex-row-reverse' : ''}`}>
                              <MaterialSymbol icon="history" size={16} />
                              <span>{taskLogs[task.id].length} {t('common.logs')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        {canSubmitLog(task) && (
                          <button onClick={(e) => { e.stopPropagation(); openLogModal(task); }}
                            className="p-3 bg-brand-accent/15 text-tertiary-container hover:bg-brand-accent/25 rounded-xl transition-colors"
                            title={t('tasks.submitLog')}>
                            <MaterialSymbol icon="add_circle" size={20} />
                          </button>
                        )}
                        {canDeliver(task) && (
                          <button onClick={(e) => { e.stopPropagation(); openDeliverModal(task); }}
                            className="p-3 bg-[#10B981]/10 text-success hover:bg-[#10B981]/20 rounded-xl transition-colors"
                            title="Deliver">
                            <MaterialSymbol icon="check_circle" size={20} />
                          </button>
                        )}
                        {task.status === 'delivered' && canApprove(task) && (
                          <button onClick={(e) => { e.stopPropagation(); handleApprove(task); }}
                            className="p-3 bg-[#10B981]/15 text-success hover:bg-[#10B981]/25 rounded-xl transition-colors"
                            title="Approve">
                            <MaterialSymbol icon="verified" size={20} />
                          </button>
                        )}
                        {task.status === 'delivered' && canReject(task) && (
                          <button onClick={(e) => { e.stopPropagation(); openRejectModal(task); }}
                            className="p-3 bg-danger/10 text-danger hover:bg-danger/20 rounded-xl transition-colors"
                            title="Reject">
                            <MaterialSymbol icon="gpp_bad" size={20} />
                          </button>
                        )}
                        {task.status === 'pending' && canUpdateStatus && (
                          <button onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, 'in_progress'); }}
                            className="p-3 bg-[#3B82F6]/10 text-[#2563EB] hover:bg-[#3B82F6]/20 rounded-xl transition-colors"
                            title={t('tasks.startTask')}>
                            <MaterialSymbol icon="play_arrow" size={20} />
                          </button>
                        )}
                        {task.status === 'in_progress' && canUpdateStatus && (
                          <button onClick={(e) => { e.stopPropagation(); handleComplete(task); }}
                            className="p-3 bg-[#10B981]/10 text-success hover:bg-[#10B981]/20 rounded-xl transition-colors"
                            title={t('tasks.markComplete')}>
                            <MaterialSymbol icon="check" size={20} />
                          </button>
                        )}
                        {canReassignFn(task) && task.status !== 'completed' && task.status !== 'cancelled' && (
                          <button onClick={(e) => { e.stopPropagation(); openReassignModal(task); }}
                            className="p-3 text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-xl transition-colors"
                            title="Reassign">
                            <MaterialSymbol icon="swap_horiz" size={20} />
                          </button>
                        )}
                        {task.status !== 'completed' && task.status !== 'cancelled' && canModify && (
                          <button onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, 'cancelled'); }}
                            className="p-3 text-on-surface-subtle hover:bg-surface-light rounded-xl transition-colors"
                            title={t('tasks.cancelTask')}>
                            <MaterialSymbol icon="close" size={20} />
                          </button>
                        )}
                        {canModify && (
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                            className="p-3 text-danger hover:bg-danger/10 rounded-xl transition-colors"
                            title={t('common.delete')}>
                            <MaterialSymbol icon="delete" size={20} />
                          </button>
                        )}
                        <MaterialSymbol icon={expandedTask === task.id ? 'expand_less' : 'expand_more'} size={24} className="text-on-surface-subtle" />
                      </div>
                    </div>
                  </div>

                  {expandedTask === task.id && (
                    <div className="border-t border-[#F4F4EF] bg-surface-light/30 p-6 space-y-6">
                      {(task.is_recurring || taskLogs[task.id]?.length > 0) && (
                      <div>
                        <h4 className="font-bold text-brand-primary mb-4 flex items-center gap-2">
                          <MaterialSymbol icon="history" size={20} />
                          {t('tasks.taskLogs')}
                        </h4>
                        {taskLogs[task.id]?.length > 0 ? (
                          <div className="space-y-3">
                            {taskLogs[task.id].map((log) => (
                              <div key={log.id} className={`bg-white p-4 rounded-xl ${isRtl ? 'text-right' : ''}`}>
                                <div className={`flex items-start justify-between ${isRtl ? 'flex-row-reverse' : ''}`}>
                                  <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                                    <div className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center">
                                      <MaterialSymbol icon={logTypeIcons[log.log_type] || 'note'} size={18} className="text-brand-primary" />
                                    </div>
                                    <div>
                                      <p className="font-semibold text-brand-primary">{t(`tasks.${log.log_type === 'location_update' ? 'locationUpdate' : log.log_type === 'status_change' ? 'statusChange' : log.log_type}`)}</p>
                                      <p className="text-sm text-on-surface-subtle">{log.user?.name}</p>
                                    </div>
                                  </div>
                                  <span className="text-xs text-on-surface-subtle">{new Date(log.created_at).toLocaleString()}</span>
                                </div>
                                <p className="mt-3 text-sm text-on-surface-variant">{log.description} <TranslateButton text={log.description} /></p>
                                {log.photo_path && (
                                  <img src={storageUrl('/storage/' + log.photo_path)} alt="Log photo" className="mt-3 rounded-lg max-w-xs" />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-on-surface-subtle text-sm italic">{t('tasks.noLogs')}</p>
                        )}
                      </div>
                    )}
                </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {viewMode === 'calendar' && (
        <div className="card p-6">
          <TaskCalendar tasks={tasks} />
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className={`flex items-center justify-between mb-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-2xl font-bold text-brand-primary">{t('tasks.createTask')}</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-3 hover:bg-surface-light rounded-xl transition">
                <MaterialSymbol icon="close" size={24} className="text-on-surface-subtle" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-6">
              <div>
                <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>
                  {t('tasks.title')} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-field"
                  placeholder={t('tasks.titlePlaceholder')}
                  required
                />
              </div>

              <div>
                <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>
                  {t('tasks.description')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field h-24 resize-none"
                  placeholder={t('tasks.descriptionPlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>
                    {t('tasks.assignedTo')} *
                  </label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">{t('tasks.selectShepherd')}</option>
                    {shepherds.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>
                    {t('tasks.priority')}
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="input-field"
                  >
                    <option value="low">{t('tasks.low')}</option>
                    <option value="medium">{t('tasks.medium')}</option>
                    <option value="high">{t('tasks.high')}</option>
                    <option value="urgent">{t('tasks.urgent')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>
                    {t('common.type')}
                  </label>
                  <select
                    value={formData.task_type}
                    onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                    className="input-field"
                  >
                    {taskTypes.map((tt) => (
                      <option key={tt.slug} value={tt.slug}>{tt.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>
                    {t('tasks.dueDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="border-t border-[#F4F4EF] pt-5">
                <label className={`flex items-center gap-3 cursor-pointer ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <input
                    type="checkbox"
                    checked={recurring.enabled}
                    onChange={(e) => setRecurring({ ...recurring, enabled: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-2 border-brand-accent text-brand-accent focus:ring-brand-accent cursor-pointer"
                  />
                  <span className="font-semibold text-brand-primary">{t('tasks.recurring')}</span>
                </label>

                {recurring.enabled && (
                  <div className="mt-4 p-4 bg-surface-light/50 rounded-xl space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>
                          {t('tasks.recurrenceInterval')}
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="1" max="30"
                            value={recurring.interval}
                            onChange={(e) => setRecurring({ ...recurring, interval: parseInt(e.target.value) || 1 })}
                            className="input-field w-20 text-center"
                          />
                          <span className="text-sm text-on-surface-subtle">{t('tasks.daysUnit')}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>
                          {t('tasks.recurrenceEnd')}
                        </label>
                        <input
                          type="date"
                          value={recurring.end_date}
                          onChange={(e) => setRecurring({ ...recurring, end_date: e.target.value })}
                          className="input-field"
                          placeholder={t('tasks.noEndDate')}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={`flex gap-4 pt-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-surface-light text-brand-primary rounded-xl font-bold text-sm hover:bg-surface-high transition">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? t('common.loading') : t('tasks.createTask')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReassignModal && reassignTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold text-brand-primary mb-2">Reassign Task</h3>
            <p className="text-sm text-on-surface-subtle mb-6">{reassignTask.title}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Assign To</label>
                <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} className="input-field">
                  <option value="">Select Shepherd</option>
                  {shepherds.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className={`flex gap-4 pt-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <button onClick={() => setShowReassignModal(false)}
                  className="flex-1 py-3 bg-surface-light text-brand-primary rounded-xl font-bold text-sm hover:bg-surface-high transition">
                  {t('common.cancel')}
                </button>
                <button onClick={handleReassign} disabled={saving || !reassignTo} className="flex-1 btn-primary">
                  {saving ? t('common.loading') : 'Reassign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeliverModal && deliverTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold text-brand-primary mb-2">Deliver Task</h3>
            <p className="text-sm text-on-surface-subtle mb-6">{deliverTask.title} <TranslateButton text={deliverTask.title} /></p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Delivery Notes</label>
                <textarea value={deliverNotes} onChange={(e) => setDeliverNotes(e.target.value)}
                  className="input-field h-24 resize-none" placeholder="Optional notes..." />
              </div>
              <div className={`flex gap-4 pt-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <button onClick={() => setShowDeliverModal(false)}
                  className="flex-1 py-3 bg-surface-light text-brand-primary rounded-xl font-bold text-sm hover:bg-surface-high transition">
                  {t('common.cancel')}
                </button>
                <button onClick={handleDeliver} disabled={saving} className="flex-1 bg-[#10B981] text-white py-3 rounded-xl font-bold text-sm hover:bg-success transition disabled:opacity-50">
                  {saving ? t('common.loading') : 'Deliver'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLogModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
            <div className={`flex items-center justify-between mb-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div>
                <h3 className="text-2xl font-bold text-brand-primary">{t('tasks.submitLog')}</h3>
                <p className="text-sm text-on-surface-subtle mt-1">{selectedTask.title} <TranslateButton text={selectedTask.title} /></p>
              </div>
              <button onClick={() => setShowLogModal(false)} className="p-3 hover:bg-surface-light rounded-xl transition">
                <MaterialSymbol icon="close" size={24} className="text-on-surface-subtle" />
              </button>
            </div>

            <form onSubmit={handleSubmitLog} className="space-y-6">
               <div>
                <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>
                  {t('common.type')}
                </label>
                <select value={logForm.log_type} onChange={(e) => setLogForm({ ...logForm, log_type: e.target.value })}
                  className="w-full bg-surface-light rounded-xl py-3 px-4 text-sm font-medium text-brand-primary transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-secondary/20">
                  {logTypes.length > 0 ? (
                    logTypes.map((lt) => (
                      <option key={lt.slug} value={lt.slug}>
                        {lt.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="checkpoint">{t('tasks.checkpoint')}</option>
                      <option value="photo">{t('tasks.photo')}</option>
                      <option value="note">{t('tasks.note')}</option>
                      <option value="location_update">{t('tasks.locationUpdate')}</option>
                      <option value="status_change">{t('tasks.statusChange')}</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>
                  {t('tasks.logDescription')} *
                </label>
                <textarea value={logForm.description} onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
                  className="input-field h-32 resize-none" placeholder={t('tasks.logPlaceholder')} required />
              </div>

              <div>
                <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>
                  {t('tasks.photo')} ({t('common.optional')})
                </label>
                <input type="file" accept="image/*" onChange={(e) => setLogForm({ ...logForm, photo: e.target.files[0] })}
                  className="w-full text-sm text-on-surface-subtle file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-surface-light file:text-brand-primary hover:file:bg-surface-high" />
              </div>

              <div>
                <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>
                  {t('tasks.voiceNote')} ({t('common.optional')})
                </label>
                <div className="flex items-center gap-3">
                  {!isRecording && !audioUrl && (
                    <button type="button" onClick={startRecording}
                      className="flex items-center gap-2 px-4 py-2 bg-brand-secondary text-white rounded-xl text-sm font-medium hover:bg-brand-primary transition">
                      <MaterialSymbol icon="mic" size={20} />
                      {t('tasks.startRecording')}
                    </button>
                  )}
                  {isRecording && (
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-xl">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="font-medium text-sm">{formatTime(recordingTime)}</span>
                      </div>
                      <button type="button" onClick={stopRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition">
                        <MaterialSymbol icon="stop" size={20} />
                        {t('tasks.stopRecording')}
                      </button>
                    </div>
                  )}
                  {audioUrl && (
                    <div className="flex items-center gap-3 flex-1">
                      <audio src={audioUrl} controls className="flex-1 h-10" />
                      <button type="button" onClick={deleteRecording}
                        className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition">
                        <MaterialSymbol icon="delete" size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className={`flex gap-4 pt-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                <button type="button" onClick={() => setShowLogModal(false)}
                  className="flex-1 py-3 bg-surface-light text-brand-primary rounded-xl font-bold text-sm hover:bg-surface-high transition">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={saving} className="flex-1 btn-gold">
                  {saving ? t('common.loading') : t('tasks.submitLog')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
