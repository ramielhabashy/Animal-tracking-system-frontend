import React, { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../../utils/api';
import { useI18n } from '../../i18n';
import { SettingsCard, SubTabBar, InputField, SelectField, CheckboxField, ToggleSwitch, SaveButton } from './index';

const taskIconOptions = [
  { value: 'assignment', label: 'assignment' },
  { value: 'search', label: 'search' },
  { value: 'medical_services', label: 'medical_services' },
  { value: 'restaurant', label: 'restaurant' },
  { value: 'directions_walk', label: 'directions_walk' },
  { value: 'vaccines', label: 'vaccines' },
  { value: 'nutrition', label: 'nutrition' },
  { value: 'build', label: 'build' },
  { value: 'cleaning_services', label: 'cleaning_services' },
  { value: 'checklist', label: 'checklist' },
];

const logIconOptions = [
  { value: 'note', label: 'note' },
  { value: 'check_circle', label: 'check_circle' },
  { value: 'block', label: 'block' },
  { value: 'schedule', label: 'schedule' },
  { value: 'play_arrow', label: 'play_arrow' },
  { value: 'photo_camera', label: 'photo_camera' },
  { value: 'my_location', label: 'my_location' },
  { value: 'location_on', label: 'location_on' },
  { value: 'assignment', label: 'assignment' },
];

const logTypeTabs = [
  { id: 'task', label: 'Task Types', icon: 'task' },
  { id: 'log', label: 'Log Types', icon: 'note' },
];

export default function TaskTypeSettings({ dir, message, setMessage }) {
  const { t } = useI18n();

  const [taskTypes, setTaskTypes] = useState([]);
  const [taskTypeForm, setTaskTypeForm] = useState({ name: '', slug: '', icon: 'assignment', color: '#002819', is_active: true });
  const [editingTaskType, setEditingTaskType] = useState(null);

  const [taskLogTypes, setTaskLogTypes] = useState([]);
  const [logTypeForm, setLogTypeForm] = useState({ name: '', slug: '', icon: 'note', color: '#717973', allows_media: false, is_status: false, is_active: true });
  const [editingLogType, setEditingLogType] = useState(null);
  const [logTypeTab, setLogTypeTab] = useState('task');

  useEffect(() => {
    fetchTaskTypes();
    fetchLogTypes();
  }, []);

  const fetchTaskTypes = async () => {
    const res = await apiFetch('/api/task-types');
    if (res.ok) {
      const data = await res.json();
      setTaskTypes(data.data || []);
    }
  };

  const fetchLogTypes = async () => {
    const res = await apiFetch('/api/task-log-types');
    if (res.ok) {
      const data = await res.json();
      setTaskLogTypes(data.data || []);
    }
  };

  const handleSaveTaskType = async () => {
    if (!taskTypeForm.name.trim() || !taskTypeForm.slug.trim()) return;
    const url = editingTaskType ? `/api/admin/task-types/${editingTaskType}` : '/api/admin/task-types';
    const method = editingTaskType ? 'PUT' : 'POST';
    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskTypeForm),
    });
    if (res.ok) {
      setTaskTypeForm({ name: '', slug: '', icon: 'assignment', color: '#002819', is_active: true });
      setEditingTaskType(null);
      await fetchTaskTypes();
    }
  };

  const handleDeleteTaskType = async (id) => {
    if (!confirm('Delete this task type?')) return;
    await apiFetch(`/api/admin/task-types/${id}`, { method: 'DELETE' });
    await fetchTaskTypes();
  };

  const handleSaveLogType = async () => {
    if (!logTypeForm.name.trim() || !logTypeForm.slug.trim()) return;
    const url = editingLogType ? `/api/admin/task-log-types/${editingLogType}` : '/api/admin/task-log-types';
    const method = editingLogType ? 'PUT' : 'POST';
    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logTypeForm),
    });
    if (res.ok) {
      setLogTypeForm({ name: '', slug: '', icon: 'note', color: '#717973', allows_media: false, is_status: false, is_active: true });
      setEditingLogType(null);
      await fetchLogTypes();
    }
  };

  const handleDeleteLogType = async (id) => {
    if (!confirm('Delete this log type?')) return;
    await apiFetch(`/api/admin/task-log-types/${id}`, { method: 'DELETE' });
    await fetchLogTypes();
  };

  return (
    <SettingsCard icon="task" title="Task Types" description="Manage task categories and log types">
      <SubTabBar tabs={logTypeTabs} activeTab={logTypeTab} onTabChange={setLogTypeTab} />

      {logTypeTab === 'task' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="font-bold text-brand-primary mb-4">{editingTaskType ? 'Edit Task Type' : 'Add New Task Type'}</h4>
            <div className="space-y-4 p-4 bg-surface-light rounded-xl">
              <InputField
                label="Name"
                value={taskTypeForm.name}
                onChange={(e) => setTaskTypeForm({ ...taskTypeForm, name: e.target.value, slug: editingTaskType ? taskTypeForm.slug : e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g. Vaccination"
                inputClassName="bg-white"
              />
              <InputField
                label="Slug"
                value={taskTypeForm.slug}
                onChange={(e) => setTaskTypeForm({ ...taskTypeForm, slug: e.target.value })}
                placeholder="e.g. vaccination"
                inputClassName="bg-white"
              />
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Icon"
                  value={taskTypeForm.icon}
                  onChange={(e) => setTaskTypeForm({ ...taskTypeForm, icon: e.target.value })}
                  options={taskIconOptions}
                />
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Color</label>
                  <input
                    type="color"
                    value={taskTypeForm.color}
                    onChange={(e) => setTaskTypeForm({ ...taskTypeForm, color: e.target.value })}
                    className="w-full h-11 rounded-xl border-0 cursor-pointer"
                  />
                </div>
              </div>
              <ToggleSwitch
                label="Active"
                checked={taskTypeForm.is_active}
                onChange={(e) => setTaskTypeForm({ ...taskTypeForm, is_active: e.target.checked })}
              />
              <div className="flex gap-2">
                <SaveButton
                  onClick={handleSaveTaskType}
                  saving={false}
                  color="#002819"
                >
                  {editingTaskType ? 'Update' : 'Add'}
                </SaveButton>
                {editingTaskType && (
                  <button
                    onClick={() => { setEditingTaskType(null); setTaskTypeForm({ name: '', slug: '', icon: 'assignment', color: '#002819', is_active: true }); }}
                    className="px-4 py-3 bg-on-surface-subtle text-white rounded-xl font-bold hover:bg-[#5a6265] transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-brand-primary mb-4">Existing Task Types</h4>
            <div className="space-y-2">
              {taskTypes.length === 0 ? (
                <p className="text-on-surface-subtle text-sm">No task types defined</p>
              ) : (
                taskTypes.map((tt) => (
                  <div key={tt.id} className={`p-4 rounded-xl flex items-center justify-between ${tt.is_active ? 'bg-surface-light' : 'bg-surface-light/50 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: tt.color + '20' }}>
                        <MaterialSymbol icon={tt.icon || 'assignment'} size={20} style={{ color: tt.color }} />
                      </div>
                      <div>
                        <p className="font-bold text-brand-primary">{tt.name}</p>
                        <p className="text-xs text-on-surface-subtle">{tt.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingTaskType(tt.id); setTaskTypeForm({ name: tt.name, slug: tt.slug, icon: tt.icon || 'assignment', color: tt.color || '#002819', is_active: tt.is_active }); }}
                        className="p-2 text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition"
                      >
                        <MaterialSymbol icon="edit" size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteTaskType(tt.id)}
                        className="p-2 text-danger hover:bg-danger/10 rounded-lg transition"
                      >
                        <MaterialSymbol icon="delete" size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {logTypeTab === 'log' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="font-bold text-brand-primary mb-4">{editingLogType ? 'Edit Log Type' : 'Add New Log Type'}</h4>
            <div className="space-y-4 p-4 bg-surface-light rounded-xl">
              <InputField
                label="Name"
                value={logTypeForm.name}
                onChange={(e) => setLogTypeForm({ ...logTypeForm, name: e.target.value, slug: editingLogType ? logTypeForm.slug : e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g. Done"
                inputClassName="bg-white"
              />
              <InputField
                label="Slug"
                value={logTypeForm.slug}
                onChange={(e) => setLogTypeForm({ ...logTypeForm, slug: e.target.value })}
                placeholder="e.g. done"
                inputClassName="bg-white"
              />
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Icon"
                  value={logTypeForm.icon}
                  onChange={(e) => setLogTypeForm({ ...logTypeForm, icon: e.target.value })}
                  options={logIconOptions}
                />
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Color</label>
                  <input
                    type="color"
                    value={logTypeForm.color}
                    onChange={(e) => setLogTypeForm({ ...logTypeForm, color: e.target.value })}
                    className="w-full h-11 rounded-xl border-0 cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <CheckboxField
                  label="Allows Media"
                  checked={logTypeForm.allows_media}
                  onChange={(e) => setLogTypeForm({ ...logTypeForm, allows_media: e.target.checked })}
                />
                <CheckboxField
                  label="Status Change"
                  checked={logTypeForm.is_status}
                  onChange={(e) => setLogTypeForm({ ...logTypeForm, is_status: e.target.checked })}
                />
                <ToggleSwitch
                  label="Active"
                  checked={logTypeForm.is_active}
                  onChange={(e) => setLogTypeForm({ ...logTypeForm, is_active: e.target.checked })}
                />
              </div>
              <div className="flex gap-2">
                <SaveButton
                  onClick={handleSaveLogType}
                  saving={false}
                  color="#002819"
                >
                  {editingLogType ? 'Update' : 'Add'}
                </SaveButton>
                {editingLogType && (
                  <button
                    onClick={() => { setEditingLogType(null); setLogTypeForm({ name: '', slug: '', icon: 'note', color: '#717973', allows_media: false, is_status: false, is_active: true }); }}
                    className="px-4 py-3 bg-on-surface-subtle text-white rounded-xl font-bold hover:bg-[#5a6265] transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-brand-primary mb-4">Existing Log Types</h4>
            <div className="space-y-2">
              {taskLogTypes.length === 0 ? (
                <p className="text-on-surface-subtle text-sm">No log types defined</p>
              ) : (
                taskLogTypes.map((lt) => (
                  <div key={lt.id} className={`p-4 rounded-xl flex items-center justify-between ${lt.is_active ? 'bg-surface-light' : 'bg-surface-light/50 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: lt.color + '20' }}>
                        <MaterialSymbol icon={lt.icon || 'note'} size={20} style={{ color: lt.color }} />
                      </div>
                      <div>
                        <p className="font-bold text-brand-primary">{lt.name}</p>
                        <p className="text-xs text-on-surface-subtle">{lt.slug} {lt.is_status ? '(status)' : ''} {lt.allows_media ? '(media)' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingLogType(lt.id); setLogTypeForm({ name: lt.name, slug: lt.slug, icon: lt.icon || 'note', color: lt.color || '#717973', allows_media: lt.allows_media, is_status: lt.is_status, is_active: lt.is_active }); }}
                        className="p-2 text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition"
                      >
                        <MaterialSymbol icon="edit" size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteLogType(lt.id)}
                        className="p-2 text-danger hover:bg-danger/10 rounded-lg transition"
                      >
                        <MaterialSymbol icon="delete" size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </SettingsCard>
  );
}
