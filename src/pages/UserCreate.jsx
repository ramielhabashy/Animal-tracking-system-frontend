import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';

export default function UserCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const isAdmin = user?.role === 'Admin';
  
  const [mode, setMode] = useState('create');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Shepherd',
    password: '',
    password_confirmation: '',
    managed_by: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState({});
  const [availableRoles, setAvailableRoles] = useState([]);
  const [owners, setOwners] = useState([]);
  const [invitationLink, setInvitationLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadRoles();
    if (isAdmin) loadOwners();
  }, []);

  const extractList = (res) => Array.isArray(res.data) ? res.data : (res.data?.data || []);

  const loadRoles = async () => {
    try {
      const res = await apiFetch('/api/admin/roles');
      if (res.ok) {
        const data = await res.json();
        let roles = data.roles || [];
        if (!isAdmin) {
          roles = roles.filter(r => r.name !== 'Admin' && r.name !== 'Owner');
        }
        setAvailableRoles(roles);
      } else {
        if (!isAdmin) {
          setAvailableRoles([{ name: 'Manager', type: 'user' }, { name: 'Doctor', type: 'user' }, { name: 'Shepherd', type: 'user' }]);
        } else {
          setAvailableRoles([{ name: 'Admin', type: 'admin' }, { name: 'Support', type: 'admin' }, { name: 'Accountant', type: 'admin' }, { name: 'Customer Service', type: 'admin' }, { name: 'Owner', type: 'user' }, { name: 'Manager', type: 'user' }, { name: 'Doctor', type: 'user' }, { name: 'Shepherd', type: 'user' }]);
        }
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
      if (!isAdmin) {
        setAvailableRoles([{ name: 'Manager', type: 'user' }, { name: 'Doctor', type: 'user' }, { name: 'Shepherd', type: 'user' }]);
      } else {
        setAvailableRoles([{ name: 'Admin', type: 'admin' }, { name: 'Support', type: 'admin' }, { name: 'Accountant', type: 'admin' }, { name: 'Customer Service', type: 'admin' }, { name: 'Owner', type: 'user' }, { name: 'Manager', type: 'user' }, { name: 'Doctor', type: 'user' }, { name: 'Shepherd', type: 'user' }]);
      }
    }
  };

  const loadOwners = async () => {
    try {
      const res = await apiFetch('/api/users?per_page=100');
      if (res.ok) {
        const data = await res.json();
        const users = extractList(data);
        setOwners(users.filter(u => u.role === 'Owner'));
      }
    } catch (err) {
      console.error('Failed to load owners:', err);
    }
  };

  const set = (field, value) => {
    const updates = { [field]: value };
    if (field === 'role' && (value === 'Admin' || value === 'Owner')) {
      updates.managed_by = '';
    }
    setForm(f => ({ ...f, ...updates }));
    if (errors[field]) {
      setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (mode === 'create') {
      if (!form.name.trim()) newErrors.name = 'Name is required';
      if (!form.password) newErrors.password = 'Password is required';
      else if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
      if (form.password !== form.password_confirmation) newErrors.password_confirmation = 'Passwords do not match';
    }
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email format';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setInvitationLink('');
    
    if (!validate()) {
      setMsg({ ok: false, text: 'Please fix the errors below' });
      return;
    }
    
    setSaving(true);

    try {
      if (mode === 'invite') {
        const res = await apiFetch('/api/invitations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email,
            role: form.role,
            ...(isAdmin && form.managed_by ? { managed_by: parseInt(form.managed_by) } : {}),
          }),
        });
        const data = await res.json();

        if (res.ok) {
          setMsg({ ok: true, text: 'Invitation sent successfully!' });
          setInvitationLink(data.data.invitation_link);
        } else {
          if (data.errors) setErrors(data.errors);
          setMsg({ ok: false, text: data.message || 'Failed to send invitation' });
        }
      } else {
        const res = await apiFetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            phone: form.phone,
            role: form.role,
            password: form.password,
            password_confirmation: form.password_confirmation,
            ...(isAdmin && form.managed_by ? { managed_by: parseInt(form.managed_by) } : {}),
          }),
        });
        const data = await res.json();

        if (res.ok) {
          setMsg({ ok: true, text: t('users.userCreated') });
          setTimeout(() => navigate('/users'), 1200);
        } else {
          if (data.errors) setErrors(data.errors);
          setMsg({ ok: false, text: t(`errors.${data.error}`) || data.message || t('users.userCreateFailed') });
        }
      }
    } catch (err) {
      setMsg({ ok: false, text: t('errors.networkError') });
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(invitationLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const adminRoles = availableRoles.filter(r => r.type === 'admin');
  const userRoles = availableRoles.filter(r => r.type !== 'admin');
  const selectedRoleType = availableRoles.find(r => r.name === form.role)?.type;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className={`flex items-center gap-4 mb-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <button onClick={() => navigate('/users')} className="p-2 hover:bg-gray-100 rounded-full transition">
          <MaterialSymbol icon={isRtl ? "arrow_forward" : "arrow_back"} className="text-brand-secondary" />
        </button>
        <div className={isRtl ? 'text-right' : ''}>
          <h1 className="text-2xl font-bold text-brand-primary">{t('users.addUser')}</h1>
          <p className="text-sm text-on-surface-subtle mt-1">{t('users.createTeamMember')}</p>
        </div>
      </div>

      <div className={`flex gap-2 mb-6 bg-surface-dim p-1 rounded-xl ${isRtl ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={() => { setMode('create'); setMsg(null); setInvitationLink(''); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition ${
            mode === 'create' ? 'bg-white text-brand-primary shadow-sm' : 'text-on-surface-subtle hover:text-brand-primary'
          } ${isRtl ? 'text-center' : ''}`}
        >
          <MaterialSymbol icon="person_add" size={16} className="inline mr-1" />
          Create User
        </button>
        <button
          onClick={() => { setMode('invite'); setMsg(null); setInvitationLink(''); }}
          className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition ${
            mode === 'invite' ? 'bg-white text-brand-primary shadow-sm' : 'text-on-surface-subtle hover:text-brand-primary'
          } ${isRtl ? 'text-center' : ''}`}
        >
          <MaterialSymbol icon="mail" size={16} className="inline mr-1" />
          Invite by Email
        </button>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-brand-accent/20 rounded-xl">
            <MaterialSymbol icon={mode === 'invite' ? "mail" : "person_add"} size={24} className="text-tertiary-container" />
          </div>
          <div>
            <h2 className="font-bold text-brand-primary">{mode === 'invite' ? 'Send Invitation' : t('users.userDetails')}</h2>
            <p className="text-sm text-on-surface-subtle">{mode === 'invite' ? 'Invite a team member via email' : t('users.enterUserInfo')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mode === 'create' && (
            <div>
              <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{t('users.name')} *</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={`w-full bg-surface-dim border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-secondary/20 focus:bg-white transition outline-none ${errors.name ? 'ring-2 ring-red-500' : ''} ${isRtl ? 'text-right' : ''}`}
                placeholder="Ahmed Al-Khalidi"
                required
              />
              {errors.name && <p className={`text-red-600 text-xs mt-1 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{errors.name}</p>}
            </div>
          )}

          <div>
            <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{t('auth.email')} *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className={`w-full bg-surface-dim border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-secondary/20 focus:bg-white transition outline-none ${errors.email ? 'ring-2 ring-red-500' : ''} ${isRtl ? 'text-right' : ''}`}
              placeholder="ahmed@oasis.com"
              required
            />
            {errors.email && <p className={`text-red-600 text-xs mt-1 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{errors.email}</p>}
          </div>

          {mode === 'create' && (
            <div>
              <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{t('users.phone')}</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className={`w-full bg-surface-dim border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-secondary/20 transition outline-none ${isRtl ? 'text-right' : ''}`}
                placeholder="+971 50 123 4567"
              />
            </div>
          )}

<div>
            <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{t('users.role')}</label>

            <div className="space-y-4">
              {isAdmin && adminRoles.length > 0 && (
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
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#10B981]/20 text-success">Farm</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {isAdmin && form.role && selectedRoleType !== 'admin' && form.role !== 'Owner' && (
            <div className="md:col-span-2">
              <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{t('users.assignToOwner') || 'Assign to Owner'}</label>
              <select
                value={form.managed_by}
                onChange={e => set('managed_by', e.target.value)}
                className={`w-full bg-surface-dim border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-secondary/20 transition outline-none appearance-none ${isRtl ? 'pl-10 pr-4 text-right' : 'pr-10 pl-4'}`}
              >
                <option value="">{t('teamPage.selectOwner') || 'Not assigned to any owner'}</option>
                {owners.map(owner => (
                  <option key={owner.id} value={owner.id}>{owner.name} ({owner.email})</option>
                ))}
              </select>
              <p className={`text-xs text-on-surface-subtle mt-1 ${isRtl ? 'text-right' : ''}`}>
                {t('users.ownerAssignHint') || 'The user will be managed by this owner'}
              </p>
            </div>
          )}

          {mode === 'create' && (
            <>
              <div>
                <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{t('auth.password')} *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className={`w-full bg-surface-dim border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-secondary/20 focus:bg-white transition outline-none ${errors.password ? 'ring-2 ring-red-500' : ''} ${isRtl ? 'text-right' : ''}`}
                  placeholder="Min 8 characters"
                  required
                />
                {errors.password && <p className={`text-red-600 text-xs mt-1 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{errors.password}</p>}
              </div>

              <div>
                <label className={`block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>Confirm Password *</label>
                <input
                  type="password"
                  value={form.password_confirmation}
                  onChange={e => set('password_confirmation', e.target.value)}
                  className={`w-full bg-surface-dim border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-secondary/20 focus:bg-white transition outline-none ${errors.password_confirmation ? 'ring-2 ring-red-500' : ''} ${isRtl ? 'text-right' : ''}`}
                  placeholder="Confirm password"
                  required
                />
                {errors.password_confirmation && <p className={`text-red-600 text-xs mt-1 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{errors.password_confirmation}</p>}
              </div>
            </>
          )}
        </div>

        {msg && (
          <div className={`p-4 rounded-xl ${msg.ok ? 'bg-[#cfe5d6] text-brand-primary' : 'bg-[#ffdad6] text-[#93000a]'}`}>
            {msg.text}
          </div>
        )}

        {invitationLink && (
          <div className="p-4 bg-surface-light rounded-xl">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Invitation Link</label>
            <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <input
                type="text"
                value={invitationLink}
                readOnly
                className="flex-1 bg-white border border-[#e8e8e3] rounded-xl p-3 text-sm text-on-surface-variant outline-none"
              />
              <button
                type="button"
                onClick={copyLink}
                className="px-4 py-3 bg-brand-primary text-white rounded-xl font-bold text-sm hover:bg-brand-secondary transition flex items-center gap-2"
              >
                <MaterialSymbol icon={copied ? "check" : "content_copy"} size={16} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-on-surface-subtle mt-2">
              <MaterialSymbol icon="info" size={14} className="inline mr-1" />
              The invitation link has also been sent to {form.email}. It expires in 7 days.
            </p>
          </div>
        )}

        <div className={`flex gap-4 pt-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="flex-1 py-4 bg-surface-dim text-brand-primary rounded-xl font-bold hover:bg-gray-200 transition"
          >
            {t('common.cancel')}
          </button>
          {!invitationLink && (
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-4 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary shadow-lg shadow-brand-primary/20 transition disabled:opacity-50"
            >
              {saving ? t('common.loading') : (mode === 'invite' ? 'Send Invitation' : t('users.createUser'))}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
