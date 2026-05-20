import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { useI18n } from '../i18n';
import { useAuth } from '../context/AuthContext';

export default function UserEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const { user: currentUser } = useAuth();
  const isRtl = dir === 'rtl';
  const isAdmin = currentUser?.role === 'Admin';
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Shepherd',
    is_active: true,
    password: '',
    managed_by: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [owners, setOwners] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

const fetchData = async () => {
    try {
      const [userRes, rolesRes, availableRolesRes, usersRes] = await Promise.all([
        apiFetch(`/api/users/${id}`),
        apiFetch(`/api/admin/users/${id}/roles`),
        apiFetch('/api/admin/roles'),
        (isAdmin || currentUser?.role === 'Owner') ? apiFetch('/api/users?per_page=500') : Promise.resolve(null),
      ]);
      
      if (userRes.ok) {
        const res = await userRes.json();
        const user = res.data || res;
        let userRole = user.role || 'Shepherd';
        
        if (rolesRes.ok) {
          const rolesData = await rolesRes.json();
          if (rolesData.roles && rolesData.roles.length > 0) {
            userRole = rolesData.roles[0];
          }
        }
        
        setForm({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          role: userRole,
          is_active: user.is_active !== false,
          password: '',
          managed_by: user.managed_by || '',
        });
      }

      if (usersRes && usersRes.ok) {
        const usersData = await usersRes.json();
        const allUsers = Array.isArray(usersData.data) ? usersData.data : (usersData.data?.data || []);
        setOwners(allUsers.filter(u => u.role === 'Owner'));
      }

      if (availableRolesRes.ok) {
        let availableRolesData = await availableRolesRes.json();
        let roles = availableRolesData.roles || [];
        
        if (!isAdmin) {
          roles = roles.filter(r => r.name !== 'Admin' && r.name !== 'Owner');
        }
        
        setAvailableRoles(roles);
      } else if (!isAdmin) {
        setAvailableRoles([{ name: 'Manager', type: 'user' }, { name: 'Doctor', type: 'user' }, { name: 'Shepherd', type: 'user' }]);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const set = (field, value) => {
    const newForm = { ...form, [field]: value };
    if (field === 'role') {
      if (value === 'Manager' || value === 'Shepherd') {
        newForm.subscription_tier_id = '';
      }
      if (value === 'Admin' || value === 'Owner') {
        newForm.managed_by = '';
      }
    }
    if (field === 'password') {
      validatePassword(value);
    }
    setForm(newForm);
  };

  const needsOwner = (role) => {
    return role && role !== 'Admin' && role !== 'Owner';
  };

  const [errors, setErrors] = useState({});
  const [passwordError, setPasswordError] = useState('');
  const [notifyUser, setNotifyUser] = useState(false);

  const validatePassword = (password) => {
    if (password && password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    
    if (!validatePassword(form.password)) return;
    
    setSaving(true);
    setMsg(null);
    setErrors({});

    const data = {
      name: form.name,
      email: form.email,
      role: form.role,
      is_active: form.is_active ? 1 : 0,
    };
    
    if (form.phone) data.phone = form.phone;
    if (form.password) data.password = form.password;
    if (notifyUser) data.notify_user = true;
    if (needsOwner(form.role)) {
      data.managed_by = form.managed_by ? parseInt(form.managed_by) : null;
    }

    try {
      const res = await apiFetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const response = await res.json();

      if (res.ok) {
        setMsg({ ok: true, text: 'User updated successfully!' });
        setTimeout(() => navigate('/users'), 1200);
      } else {
        if (response.errors) {
          setErrors(response.errors);
        }
        setMsg({ ok: false, text: response.message || 'Failed to update user' });
      }
    } catch (err) {
      setMsg({ ok: false, text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const adminRoles = availableRoles.filter(r => r.type === 'admin');
  const userRoles = availableRoles.filter(r => r.type !== 'admin');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="min-h-screen pb-24">
      <header className="bg-brand-light backdrop-blur-md sticky top-0 z-40 w-full px-8 py-5 flex justify-between items-center shadow-[0px_12px_32px_rgba(6,64,43,0.06)]">
        <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <button type="button" onClick={() => navigate('/users')} className="p-3 hover:bg-surface-light rounded-xl transition">
            <MaterialSymbol icon={isRtl ? 'arrow_forward' : 'arrow_back'} className="text-brand-secondary" />
          </button>
          <h1 className="text-2xl font-bold text-brand-primary">{t('users.editUser')}</h1>
        </div>
        <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full ${form.is_active ? 'bg-[#cfe5d6]' : 'bg-[#ffdad6]'}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${form.is_active ? 'bg-brand-primary' : 'bg-danger'}`} />
          <span className={`text-sm font-semibold ${form.is_active ? 'text-brand-primary' : 'text-danger'}`}>
            {form.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <section className="card p-8">
            <div className={`flex items-center gap-3 mb-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
                <MaterialSymbol icon="person" size={22} className="text-brand-accent" />
              </div>
              <h2 className="text-xl font-bold text-brand-primary">Personal Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>{t('users.name')} *</label>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className={`input-field ${errors.name ? 'ring-2 ring-red-500' : ''}`}
                  required
                />
                {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>{t('users.email')} *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  className={`input-field ${errors.email ? 'ring-2 ring-red-500' : ''}`}
                  required
                />
                {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>{t('users.phone')}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>{t('users.role')}</label>
                {isAdmin || currentUser?.role === 'Owner' ? (
                  <div className="space-y-4">
                    {adminRoles.length > 0 && (
                      <div>
                        <p className={`text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <MaterialSymbol icon="admin_panel_settings" size={16} />
                          Administration Staff
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {adminRoles.map(r => (
                            <button
                              key={r.name}
                              type="button"
                              onClick={() => set('role', r.name)}
                              className={`p-3 rounded-xl border-2 text-left transition ${
                                form.role === r.name
                                  ? 'border-brand-accent bg-brand-accent/10'
                                  : 'border-transparent bg-surface-dim hover:border-brand-accent/30'
                              } ${isRtl ? 'text-right' : ''}`}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{t(`users.${r.name.toLowerCase()}`) || r.name}</span>
                                {form.role === r.name && (
                                  <MaterialSymbol icon="check_circle" size={18} className="text-[#10B981]" />
                                )}
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-accent/20 text-tertiary-container">Staff</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {userRoles.length > 0 && (
                      <div>
                        <p className={`text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                          <MaterialSymbol icon="agriculture" size={16} />
                          Farm Users
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {userRoles.map(r => (
                            <button
                              key={r.name}
                              type="button"
                              onClick={() => set('role', r.name)}
                              className={`p-3 rounded-xl border-2 text-left transition ${
                                form.role === r.name
                                  ? 'border-[#10B981] bg-[#10B981]/10'
                                  : 'border-transparent bg-surface-dim hover:border-[#10B981]/30'
                              } ${isRtl ? 'text-right' : ''}`}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{t(`users.${r.name.toLowerCase()}`) || r.name}</span>
                                {form.role === r.name && (
                                  <MaterialSymbol icon="check_circle" size={18} className="text-[#10B981]" />
                                )}
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#10B981]/20 text-success">Farm</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    value={t(`users.${form.role.toLowerCase()}`) || form.role}
                    disabled
                    className="input-field bg-surface-dim cursor-not-allowed"
                  />
                )}
              </div>
            </div>
          </section>

        </div>

        <div className="lg:col-span-4 space-y-8">
          <section className="card p-8">
            <div className={`flex items-center gap-3 mb-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center">
                <MaterialSymbol icon="settings_account_box" size={22} className="text-brand-accent" />
              </div>
              <h2 className="text-xl font-bold text-brand-primary">Account Status</h2>
            </div>

            <div className={`flex items-center justify-between p-4 bg-surface-light rounded-2xl mb-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <span className="font-bold text-brand-primary">User Active</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => set('is_active', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-surface-high rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-brand-accent"></div>
              </label>
            </div>

              {isAdmin && needsOwner(form.role) && (
                <div className="mb-6">
                  <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>{t('users.assignToOwner') || 'Assigned to Owner'}</label>
                  <select
                    value={form.managed_by}
                    onChange={e => set('managed_by', e.target.value)}
                    className="input-field appearance-none pr-12"
                  >
                    <option value="">{t('teamPage.selectOwner') || 'Not assigned to any owner'}</option>
                    {owners.map(owner => (
                      <option key={owner.id} value={owner.id}>{owner.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'text-right' : ''}`}>New Password (optional)</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className={`input-field ${passwordError || errors.password ? 'ring-2 ring-red-500' : ''}`}
                  placeholder="Leave blank to keep current (min 8 chars if changing)"
                />
                {passwordError && <p className="text-red-600 text-xs mt-1">{passwordError}</p>}
                {errors.password && !passwordError && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}
                <label className="flex items-center gap-3 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyUser}
                    onChange={e => setNotifyUser(e.target.checked)}
                    className="w-4 h-4 rounded border-surface-high text-brand-primary focus:ring-[#002819]"
                  />
                  <span className="text-sm text-on-surface-variant">Notify user about password change</span>
                </label>
              </div>
          </section>

          <div className="bg-gradient-to-br from-brand-primary to-brand-secondary p-6 rounded-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-brand-accent font-bold text-lg mb-2">Need Help?</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Changes to user roles affect global access immediately.
              </p>
            </div>
            <MaterialSymbol icon="support_agent" className="absolute -bottom-4 text-white/5 text-9xl" />
          </div>
        </div>
      </div>

      {msg && (
        <div className={`mx-8 p-4 rounded-xl mb-4 ${msg.ok ? 'bg-[#cfe5d6] text-brand-primary' : 'bg-[#ffdad6] text-[#93000a]'}`}>
          {msg.text}
        </div>
      )}

      <div className={`fixed bottom-0 bg-white/80 backdrop-blur-xl border-t border-surface-high px-8 py-5 flex justify-between items-center z-40 ${isRtl ? 'left-0 right-0 lg:left-72' : 'left-0 right-0 lg:right-72'}`}>
        <div className={`hidden sm:flex items-center gap-2 text-on-surface-variant text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
          <MaterialSymbol icon="info" size={18} />
          Last modified 2 hours ago
        </div>

        <div className={`flex items-center gap-4 w-full sm:w-auto ${isRtl ? 'flex-row-reverse' : ''}`}>
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="flex-1 sm:flex-none px-8 py-3 rounded-xl font-bold text-brand-primary hover:bg-surface-light transition"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 sm:flex-none btn-primary"
          >
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </div>
    </form>
  );
}

