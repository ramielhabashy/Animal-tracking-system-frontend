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
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Shepherd',
    password: '',
    password_confirmation: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState({});
  const [availableRoles, setAvailableRoles] = useState([]);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const res = await apiFetch('/api/admin/roles');
      if (res.ok) {
        const data = await res.json();
        let roles = data.roles || [];
        if (!isAdmin) {
          roles = roles.filter(r => r.name !== 'Admin' && r.name !== 'Owner');
        }
        setAvailableRoles(roles.map(r => r.name));
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Invalid email format';
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (form.password !== form.password_confirmation) newErrors.password_confirmation = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    
    if (!validate()) {
      setMsg({ ok: false, text: 'Please fix the errors below' });
      return;
    }
    
    setSaving(true);

    try {
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
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setMsg({ ok: true, text: t('users.userCreated') });
        setTimeout(() => navigate('/users'), 1200);
      } else {
        if (data.errors) {
          setErrors(data.errors);
        }
        setMsg({ ok: false, text: data.message || t('users.userCreateFailed') });
      }
    } catch (err) {
      setMsg({ ok: false, text: t('errors.networkError') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className={`flex items-center gap-4 mb-8 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <button onClick={() => navigate('/users')} className="p-2 hover:bg-gray-100 rounded-full transition">
          <MaterialSymbol icon={isRtl ? "arrow_forward" : "arrow_back"} className="text-[#06402B]" />
        </button>
        <div className={isRtl ? 'text-right' : ''}>
          <h1 className="text-2xl font-bold text-[#002819]">{t('users.addUser')}</h1>
          <p className="text-sm text-[#717973] mt-1">{t('users.createTeamMember')}</p>
        </div>
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-[#D4AF37]/20 rounded-xl">
            <MaterialSymbol icon="person_add" size={24} className="text-[#735c00]" />
          </div>
          <div>
            <h2 className="font-bold text-[#002819]">{t('users.userDetails')}</h2>
            <p className="text-sm text-[#717973]">{t('users.enterUserInfo')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={`block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{t('users.name')} *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className={`w-full bg-[#e8e8e3] border-none rounded-xl p-4 focus:ring-2 focus:ring-[#06402B]/20 focus:bg-white transition outline-none ${errors.name ? 'ring-2 ring-red-500' : ''} ${isRtl ? 'text-right' : ''}`}
              placeholder="Ahmed Al-Khalidi"
              required
            />
            {errors.name && <p className={`text-red-600 text-xs mt-1 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{errors.name}</p>}
          </div>

          <div>
            <label className={`block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{t('auth.email')} *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              className={`w-full bg-[#e8e8e3] border-none rounded-xl p-4 focus:ring-2 focus:ring-[#06402B]/20 focus:bg-white transition outline-none ${errors.email ? 'ring-2 ring-red-500' : ''} ${isRtl ? 'text-right' : ''}`}
              placeholder="ahmed@oasis.com"
              required
            />
            {errors.email && <p className={`text-red-600 text-xs mt-1 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{errors.email}</p>}
          </div>

          <div>
            <label className={`block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{t('users.phone')}</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              className={`w-full bg-[#e8e8e3] border-none rounded-xl p-4 focus:ring-2 focus:ring-[#06402B]/20 focus:bg-white transition outline-none ${isRtl ? 'text-right' : ''}`}
              placeholder="+971 50 123 4567"
            />
          </div>

<div>
            <label className={`block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{t('users.role')}</label>
            <div className="relative">
              <select
                value={form.role}
                onChange={e => set('role', e.target.value)}
                className={`w-full appearance-none bg-[#e8e8e3] border-none rounded-xl p-4 focus:ring-2 focus:ring-[#06402B]/20 transition outline-none ${isRtl ? 'pl-10 pr-4 text-right' : 'pr-10 pl-4'}`}
              >
                {availableRoles.length > 0 ? (
                  availableRoles.map(roleName => (
                    <option key={roleName} value={roleName}>{t(`users.${roleName.toLowerCase()}`) || roleName}</option>
                  ))
                ) : (
                  <>
                    {isAdmin && <option value="Admin">{t('users.admin')}</option>}
                    {isAdmin && <option value="Owner">{t('users.owner')}</option>}
                    <option value="Manager">{t('users.manager')}</option>
                    <option value="Shepherd">{t('users.shepherd')}</option>
                  </>
                )}
              </select>
              <MaterialSymbol icon="expand_more" className={`absolute top-1/2 -translate-y-1/2 text-[#002819]/40 pointer-events-none ${isRtl ? 'left-4 right-auto' : 'right-4'}`} />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{t('auth.password')} *</label>
            <input
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              className={`w-full bg-[#e8e8e3] border-none rounded-xl p-4 focus:ring-2 focus:ring-[#06402B]/20 focus:bg-white transition outline-none ${errors.password ? 'ring-2 ring-red-500' : ''} ${isRtl ? 'text-right' : ''}`}
              placeholder="Min 8 characters"
              required
            />
            {errors.password && <p className={`text-red-600 text-xs mt-1 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{errors.password}</p>}
          </div>

          <div>
            <label className={`block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>Confirm Password *</label>
            <input
              type="password"
              value={form.password_confirmation}
              onChange={e => set('password_confirmation', e.target.value)}
              className={`w-full bg-[#e8e8e3] border-none rounded-xl p-4 focus:ring-2 focus:ring-[#06402B]/20 focus:bg-white transition outline-none ${errors.password_confirmation ? 'ring-2 ring-red-500' : ''} ${isRtl ? 'text-right' : ''}`}
              placeholder="Confirm password"
              required
            />
            {errors.password_confirmation && <p className={`text-red-600 text-xs mt-1 ${isRtl ? 'mr-1 ml-0 text-right' : 'ml-1'}`}>{errors.password_confirmation}</p>}
          </div>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl ${msg.ok ? 'bg-[#cfe5d6] text-[#002819]' : 'bg-[#ffdad6] text-[#93000a]'}`}>
            {msg.text}
          </div>
        )}

        <div className={`flex gap-4 pt-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="flex-1 py-4 bg-[#e8e8e3] text-[#002819] rounded-xl font-bold hover:bg-gray-200 transition"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-4 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402b] shadow-lg shadow-[#002819]/20 transition disabled:opacity-50"
          >
            {saving ? t('common.loading') : t('users.createUser')}
          </button>
        </div>
      </form>
    </div>
  );
}

