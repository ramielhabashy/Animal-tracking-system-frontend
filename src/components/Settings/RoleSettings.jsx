import React, { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../../utils/api';
import { useI18n } from '../../i18n';
import { SettingsCard, SubTabBar, InputField, SelectField, CheckboxField, ToggleSwitch, SaveButton } from './index';

const defaultPermissions = [
  'user_view', 'user_create', 'user_edit', 'user_delete', 'user_assign_role',
  'animal_view', 'animal_create', 'animal_edit', 'animal_delete', 'animal_view_health',
  'device_view', 'device_create', 'device_edit', 'device_delete',
  'geofence_view', 'geofence_create', 'geofence_edit', 'geofence_delete',
  'task_view', 'task_create', 'task_complete', 'task_delete',
  'report_view', 'report_export',
  'settings_view', 'settings_edit',
  'medical_record_view', 'medical_record_create', 'medical_record_edit',
  'vaccination_view', 'vaccination_create', 'vaccination_edit',
  'auction_view', 'auction_create', 'auction_edit', 'auction_bid',
];

const defaultPermissionsByCategory = {
  'users': { label: 'Users', permissions: ['user_view', 'user_create', 'user_edit', 'user_delete', 'user_assign_role'] },
  'animals': { label: 'Animals', permissions: ['animal_view', 'animal_create', 'animal_edit', 'animal_delete', 'animal_view_health'] },
  'devices': { label: 'Devices', permissions: ['device_view', 'device_create', 'device_edit', 'device_delete'] },
  'geofences': { label: 'Geofences', permissions: ['geofence_view', 'geofence_create', 'geofence_edit', 'geofence_delete'] },
  'tasks': { label: 'Tasks', permissions: ['task_view', 'task_create', 'task_complete', 'task_delete'] },
  'reports': { label: 'Reports', permissions: ['report_view', 'report_export'] },
  'settings': { label: 'Settings', permissions: ['settings_view', 'settings_edit'] },
  'medical': { label: 'Medical', permissions: ['medical_record_view', 'medical_record_create', 'medical_record_edit'] },
  'vaccinations': { label: 'Vaccinations', permissions: ['vaccination_view', 'vaccination_create', 'vaccination_edit'] },
  'auctions': { label: 'Auctions', permissions: ['auction_view', 'auction_create', 'auction_edit', 'auction_bid'] },
};

const staffCategories = ['support', 'billing', 'customer_service', 'platform', 'users', 'reports', 'settings', 'animals', 'devices', 'geofences', 'tasks', 'medical', 'vaccinations', 'auctions'];
const farmCategories = ['animals', 'devices', 'geofences', 'geofence_alerts', 'tasks', 'reports', 'medical', 'vaccinations', 'users', 'auctions'];

const roleTabs = [
  { id: 'staff', label: 'Administration Staff', icon: 'admin_panel_settings' },
  { id: 'farm', label: 'Farm Users', icon: 'agriculture' },
];

export default function RoleSettings({ dir, message, setMessage, saving, setSaving }) {
  const { t } = useI18n();

  const [rolesData, setRolesData] = useState({ roles: [], permissions: [], permissionsByCategory: {} });
  const [roleForm, setRoleForm] = useState({ name: '', type: 'user', permissions: [] });
  const [editingRole, setEditingRole] = useState(null);
  const [roleTypeTab, setRoleTypeTab] = useState('staff');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    const rolesRes = await apiFetch('/api/admin/roles');
    if (rolesRes.ok) {
      const rolesJson = await rolesRes.json();
      const perms = rolesJson.permissions?.length > 0 ? rolesJson.permissions : defaultPermissions;
      const byCategory = rolesJson.permissionsByCategory || {};
      const finalByCategory = Object.keys(byCategory).length > 0 ? byCategory : defaultPermissionsByCategory;
      setRolesData({ roles: rolesJson.roles || [], permissions: perms, permissionsByCategory: finalByCategory });
    } else {
      setRolesData({ roles: [], permissions: defaultPermissions, permissionsByCategory: defaultPermissionsByCategory });
    }
  };

  const handleSaveRole = async () => {
    if (!roleForm.name.trim()) {
      setMessage({ type: 'error', text: 'Role name is required' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = editingRole
        ? await apiFetch(`/api/admin/roles/${editingRole}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ permissions: roleForm.permissions, type: roleForm.type }),
          })
        : await apiFetch('/api/admin/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(roleForm),
          });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.saved') });
        setRoleForm({ name: '', type: 'user', permissions: [] });
        setEditingRole(null);
        await fetchRoles();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Failed to save' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleName) => {
    if (!confirm(`Are you sure you want to delete the "${roleName}" role?`)) return;
    try {
      const res = await apiFetch(`/api/admin/roles/${roleName}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchRoles();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Failed to delete' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role.name);
    setRoleForm({ name: role.name, type: role.type || 'user', permissions: role.permissions || [] });
  };

  const togglePermission = (perm) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  const toggleAllInCategory = (categoryPerms, checked) => {
    setRoleForm(prev => ({
      ...prev,
      permissions: checked
        ? [...new Set([...prev.permissions, ...categoryPerms])]
        : prev.permissions.filter(p => !categoryPerms.includes(p))
    }));
  };

  const renderRoleForm = (type, categories) => (
    <div>
      <h4 className="font-bold text-brand-primary mb-4">
        {editingRole ? 'Edit' : 'New'} {type === 'admin' ? 'Staff' : 'Farm'} Role
      </h4>
      <div className="space-y-4">
        <InputField
          label="Role Name"
          value={roleForm.name}
          onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value, type })}
          placeholder={type === 'admin' ? 'e.g. Support, Accountant' : 'e.g. Helper, Trainer'}
          disabled={!!editingRole}
        />
        {Object.entries(rolesData.permissionsByCategory).filter(([key]) => categories.includes(key)).map(([categoryKey, category]) => (
          <div key={categoryKey} className="border border-[#F4F4EF] rounded-xl p-4">
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={category.permissions.every(p => roleForm.permissions.includes(p))}
                onChange={(e) => toggleAllInCategory(category.permissions, e.target.checked)}
                className="w-4 h-4 rounded border-2 border-brand-accent text-brand-accent"
              />
              <span className="font-bold text-brand-primary">{category.label}</span>
            </label>
            <div className="grid grid-cols-2 gap-2 pl-6">
              {category.permissions.map((perm) => (
                <label key={perm} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roleForm.permissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                    className="w-4 h-4 rounded border-2 border-brand-accent text-brand-accent"
                  />
                  <span className="text-sm text-on-surface-variant">{perm}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <SaveButton
          onClick={handleSaveRole}
          saving={saving}
          color={type === 'admin' ? '#D4AF37' : '#002819'}
        >
          {saving ? '...' : editingRole ? 'Update' : 'Add'} {type === 'admin' ? 'Staff' : 'Farm'} Role
        </SaveButton>
        {editingRole && (
          <button
            onClick={() => { setEditingRole(null); setRoleForm({ name: '', type: 'user', permissions: [] }); }}
            className="w-full py-3 bg-gray-400 text-white rounded-xl font-bold hover:bg-gray-500"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );

  const renderRoleList = (type, label, badgeColorClass, badgeBgClass) => (
    <div>
      <h4 className="font-bold text-brand-primary mb-4">{label} Roles</h4>
      {rolesData.roles.filter(r => type === 'admin' ? r.type === 'admin' : r.type !== 'admin').length === 0 ? (
        <div className="text-center py-8 text-on-surface-subtle">No {label.toLowerCase()} roles yet.</div>
      ) : (
        <div className="space-y-3">
          {rolesData.roles.filter(r => type === 'admin' ? r.type === 'admin' : r.type !== 'admin').map((role) => (
            <div key={role.name} className={`p-4 rounded-xl ${role.is_system ? 'bg-gray-100' : 'bg-surface-light'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${badgeBgClass} ${badgeColorClass} font-bold`}>{label}</span>
                  <span className="font-bold text-brand-primary">{role.name}</span>
                  {role.is_system && (
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-300 text-gray-600">System</span>
                  )}
                </div>
                <span className="text-sm text-on-surface-subtle">{role.user_count || 0} user{(role.user_count || 0) !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {role.permissions?.slice(0, 6).map((perm) => (
                  <span key={perm} className="px-2 py-1 bg-white rounded text-xs text-on-surface-variant">{perm}</span>
                ))}
                {role.permissions?.length > 6 && (
                  <span className="px-2 py-1 text-xs text-on-surface-subtle">+{role.permissions.length - 6} more</span>
                )}
              </div>
              {!role.is_system && (
                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <button onClick={() => handleEditRole(role)}
                    className="text-sm text-brand-primary hover:text-brand-secondary font-medium">Edit</button>
                  <button onClick={() => handleDeleteRole(role.name)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <SettingsCard icon="admin_panel_settings" title={t('settings.roleSettings') || 'Role Settings'} description={t('settings.roleDescription') || 'Manage roles and permissions'}>
      <SubTabBar tabs={roleTabs} activeTab={roleTypeTab} onTabChange={setRoleTypeTab} />

      {roleTypeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {renderRoleForm('admin', staffCategories)}
          {renderRoleList('admin', 'Staff', 'text-tertiary-container', 'bg-brand-accent/20')}
        </div>
      )}

      {roleTypeTab === 'farm' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {renderRoleForm('user', farmCategories)}
          {renderRoleList('farm', 'Farm', 'text-success', 'bg-[#10B981]/20')}
        </div>
      )}
    </SettingsCard>
  );
}
