import React from 'react';
import { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch, storageUrl } from '../utils/api';
import { exportDatabase } from '../utils/export';
import { useI18n } from '../i18n';
import { usePlatform } from '../context/PlatformContext';
import { useAuth } from '../hooks/useAuth';
import { getAuthUser } from '../utils/cookies';
import SimulatorPage from './SimulatorPage';

export default function SettingsPage() {
  const { t, dir } = useI18n();
  const { refreshPlatformSettings } = usePlatform();
  const isRtl = dir === 'rtl';
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [exportingDb, setExportingDb] = useState(false);
  const [message, setMessage] = useState(null);

  const [generalSettings, setGeneralSettings] = useState({
    platform_name: 'The Oasis',
    platform_url: 'http://localhost:5173',
    admin_email: '',
    timezone: 'Asia/Dubai',
    date_format: 'Y-m-d',
    default_language: 'en',
    logo: '',
    favicon: '',
    login_background: '',
    copyright_text: 'Digital Majlis.',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [loginBackgroundFile, setLoginBackgroundFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [faviconPreview, setFaviconPreview] = useState('');
  const [loginBackgroundPreview, setLoginBackgroundPreview] = useState('');

  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: '',
    username: '',
    password: '',
    encryption: 'tls',
    from_email: '',
    from_name: '',
  });
  const [emailNotificationPrefs, setEmailNotificationPrefs] = useState({
    welcome: true,
    invitation: true,
    subscription: true,
    auction_won: true,
    auction_bid: true,
    auction_payment: true,
    task_assigned: true,
    medical: true,
  });

  const [stripeSettings, setStripeSettings] = useState({
    public_key: '',
    secret_key: '',
    webhook_secret: '',
    enabled: false,
  });

  const [geminiSettings, setGeminiSettings] = useState({
    api_key: '',
    model: 'gemini-2.0-flash',
    enabled: false,
  });

  const [whatsappSettings, setWhatsappSettings] = useState({
    api_url: '',
    api_token: '',
    phone_number_id: '',
    business_account_id: '',
    enabled: false,
  });

  const [twilioSettings, setTwilioSettings] = useState({
    account_sid: '',
    auth_token: '',
    phone_number: '',
    enabled: false,
  });

  const [translationSettings, setTranslationSettings] = useState({
    deepl_api_key: '',
    google_api_key: '',
  });

const [speciesList, setSpeciesList] = useState([]);
  const [editingSpecies, setEditingSpecies] = useState(null);
  const [editingBreed, setEditingBreed] = useState(null);
  const [newSpeciesName, setNewSpeciesName] = useState('');
  const [newBreedName, setNewBreedName] = useState('');
  const [selectedSpeciesForBreed, setSelectedSpeciesForBreed] = useState(null);

  const [languages, setLanguages] = useState([]);
  const [languageForm, setLanguageForm] = useState({ code: '', name: '', native_name: '', direction: 'ltr' });
  const [editingLanguage, setEditingLanguage] = useState(null);

  const [showTranslations, setShowTranslations] = useState(false);
  const [translations, setTranslations] = useState([]);
  const [selectedLanguageForTranslation, setSelectedLanguageForTranslation] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('common');
  const groups = ['common', 'dashboard', 'animals', 'devices', 'geofences', 'alerts', 'tasks', 'auctions', 'profile', 'settings'];

  const [rolesData, setRolesData] = useState({ roles: [], permissions: [], permissionsByCategory: {} });
  const [roleForm, setRoleForm] = useState({ name: '', type: 'user', permissions: [] });
  const [editingRole, setEditingRole] = useState(null);
  const [roleTypeTab, setRoleTypeTab] = useState('staff');

  const [taskTypes, setTaskTypes] = useState([]);
  const [taskTypeForm, setTaskTypeForm] = useState({ name: '', slug: '', icon: 'assignment', color: '#002819', is_active: true });
  const [editingTaskType, setEditingTaskType] = useState(null);

  const [taskLogTypes, setTaskLogTypes] = useState([]);
  const [logTypeForm, setLogTypeForm] = useState({ name: '', slug: '', icon: 'note', color: '#717973', allows_media: false, is_status: false, is_active: true });
  const [editingLogType, setEditingLogType] = useState(null);
  const [logTypeTab, setLogTypeTab] = useState('task'); // 'task' or 'log'

  const [medicalRecordTypes, setMedicalRecordTypes] = useState([]);
  const [medicalTypeForm, setMedicalTypeForm] = useState({ name: '', slug: '', icon: 'medical_services', color: '#002819', is_active: true });
  const [editingMedicalType, setEditingMedicalType] = useState(null);
  const [medicalSubTab, setMedicalSubTab] = useState('recordTypes');

  const [vaccinationTypesList, setVaccinationTypesList] = useState([]);
  const [vaccinationTypeForm, setVaccinationTypeForm] = useState({ name: '', slug: '', icon: 'vaccines', color: '#002819', is_active: true });
  const [editingVaccinationType, setEditingVaccinationType] = useState(null);

useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (selectedLanguageForTranslation && showTranslations) {
      loadTranslations();
    }
  }, [selectedLanguageForTranslation, selectedGroup, showTranslations]);

const fetchSettings = async () => {
    setLoading(true);
    try {
      const user = getAuthUser();
      const userRole = user?.role;

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

      const [generalRes, smtpRes, stripeRes, geminiRes, whatsappRes, twilioRes, translationRes, emailPrefsRes, speciesRes, languagesRes, rolesRes, taskTypesRes, logTypesRes, medicalTypesRes, vaccinationTypesRes] = await Promise.all([
        apiFetch('/api/admin/settings/general'),
        apiFetch('/api/admin/settings/smtp'),
        apiFetch('/api/admin/settings/stripe'),
        apiFetch('/api/admin/settings/gemini'),
        apiFetch('/api/admin/settings/whatsapp'),
        apiFetch('/api/admin/settings/twilio'),
        userRole === 'Admin' ? apiFetch('/api/admin/settings/translation') : Promise.resolve({ ok: false }),
        userRole === 'Admin' ? apiFetch('/api/admin/settings/email-preferences') : Promise.resolve({ ok: false }),
        userRole === 'Admin' ? apiFetch('/api/species') : Promise.resolve({ ok: false }),
        userRole === 'Admin' ? apiFetch('/api/admin/languages') : Promise.resolve({ ok: false }),
        userRole === 'Admin' ? apiFetch('/api/admin/roles') : Promise.resolve({ ok: false }),
        userRole === 'Admin' ? apiFetch('/api/task-types') : Promise.resolve({ ok: false }),
        userRole === 'Admin' ? apiFetch('/api/task-log-types') : Promise.resolve({ ok: false }),
        userRole === 'Admin' ? apiFetch('/api/medical-record-types') : Promise.resolve({ ok: false }),
        userRole === 'Admin' ? apiFetch('/api/admin/vaccination-types') : Promise.resolve({ ok: false }),
      ]);

      if (rolesRes.ok) {
        const rolesJson = await rolesRes.json();
        const perms = rolesJson.permissions?.length > 0 ? rolesJson.permissions : defaultPermissions;
        const byCategory = rolesJson.permissionsByCategory || {};
        const finalByCategory = Object.keys(byCategory).length > 0 ? byCategory : defaultPermissionsByCategory;
        setRolesData({ roles: rolesJson.roles || [], permissions: perms, permissionsByCategory: finalByCategory });
      } else {
        setRolesData({ roles: [], permissions: defaultPermissions, permissionsByCategory: defaultPermissionsByCategory });
      }

      if (languagesRes.ok) {
        const langData = await languagesRes.json();
        setLanguages(langData.data || langData);
      }

      if (taskTypesRes.ok) {
        const ttData = await taskTypesRes.json();
        setTaskTypes(ttData.data || []);
      }

      if (logTypesRes.ok) {
        const ltData = await logTypesRes.json();
        setTaskLogTypes(ltData.data || []);
      }

      if (medicalTypesRes.ok) {
        const mtData = await medicalTypesRes.json();
        setMedicalRecordTypes(mtData.data || []);
      }

      if (vaccinationTypesRes.ok) {
        const vtData = await vaccinationTypesRes.json();
        setVaccinationTypesList(vtData.data || []);
      }

      if (speciesRes.ok) {
        const speciesData = await speciesRes.json();
        setSpeciesList(speciesData.data || []);
      }

      if (generalRes.ok) {
        const data = await generalRes.json();
        setGeneralSettings(data.data);
      }
      if (smtpRes.ok) {
        const data = await smtpRes.json();
        setSmtpSettings(data.data);
      }
      if (stripeRes.ok) {
        const data = await stripeRes.json();
        setStripeSettings(data.data);
      }
      if (geminiRes.ok) {
        const data = await geminiRes.json();
        setGeminiSettings(data.data);
      }
      if (whatsappRes.ok) {
        const data = await whatsappRes.json();
        setWhatsappSettings(data.data);
      }
      if (twilioRes.ok) {
        const data = await twilioRes.json();
        setTwilioSettings(data.data);
      }
      if (translationRes.ok) {
        const data = await translationRes.json();
        setTranslationSettings(data.data);
      }
      if (emailPrefsRes.ok) {
        const data = await emailPrefsRes.json();
        setEmailNotificationPrefs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append('platform_name', generalSettings.platform_name);
      fd.append('platform_url', generalSettings.platform_url);
      fd.append('admin_email', generalSettings.admin_email);
      fd.append('timezone', generalSettings.timezone);
      fd.append('date_format', generalSettings.date_format);
      fd.append('default_language', generalSettings.default_language);
      fd.append('copyright_text', generalSettings.copyright_text);
      if (logoFile) fd.append('logo', logoFile);
      else fd.append('logo', generalSettings.logo || '');
      if (faviconFile) fd.append('favicon', faviconFile);
      else fd.append('favicon', generalSettings.favicon || '');
      if (loginBackgroundFile) fd.append('login_background', loginBackgroundFile);
      else fd.append('login_background', generalSettings.login_background || '');

      const res = await apiFetch('/api/admin/settings/general', { method: 'POST', body: fd });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.saved') });
        setLogoFile(null);
        setFaviconFile(null);
        setLoginBackgroundFile(null);
        setLogoPreview('');
        setFaviconPreview('');
        setLoginBackgroundPreview('');
        refreshPlatformSettings();
        const generalRes = await apiFetch('/api/admin/settings/general');
        if (generalRes.ok) {
          const data = await generalRes.json();
          setGeneralSettings(data.data);
        }
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

  const handleSaveSmtp = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpSettings),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.saved') });
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

  const handleTestSmtp = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/smtp/test', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveEmailPrefs = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/email-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailNotificationPrefs),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.saved') });
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

  const handleSaveStripe = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stripeSettings),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.saved') });
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

  const handleSaveGemini = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiSettings),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.saved') });
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

  const handleSaveWhatsApp = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsappSettings),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.saved') });
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

const handleSaveTwilio = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/twilio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(twilioSettings),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.saved') });
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

  const handleSaveTranslationSettings = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/admin/settings/translation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(translationSettings),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Translation settings saved' });
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

  const handleSaveLanguage = async () => {
    if (!languageForm.code || !languageForm.name || !languageForm.native_name) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = editingLanguage
        ? await apiFetch(`/api/admin/languages/${editingLanguage}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(languageForm),
          })
        : await apiFetch('/api/admin/languages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(languageForm),
          });
      if (res.ok) {
        setMessage({ type: 'success', text: t('settings.saved') });
        setLanguageForm({ code: '', name: '', native_name: '', direction: 'ltr' });
        setEditingLanguage(null);
        const langRes = await apiFetch('/api/admin/languages');
        if (langRes.ok) setLanguages(await langRes.json());
        sessionStorage.setItem('oasis_translations_dirty', Date.now().toString());
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || data.error || 'Failed to save' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLanguage = async (code) => {
    if (!confirm('Are you sure? This will also delete all translations for this language.')) return;
    try {
      const res = await apiFetch(`/api/admin/languages/${code}`, { method: 'DELETE' });
      if (res.ok) {
        const langRes = await apiFetch('/api/admin/languages');
        if (langRes.ok) setLanguages(await langRes.json());
        sessionStorage.setItem('oasis_translations_dirty', Date.now().toString());
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to delete' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const handleSetDefaultLanguage = async (code) => {
    try {
      const res = await apiFetch(`/api/admin/languages/${code}/set-default`, { method: 'POST' });
      if (res.ok) {
        const langRes = await apiFetch('/api/admin/languages');
        if (langRes.ok) setLanguages(await langRes.json());
        sessionStorage.setItem('oasis_translations_dirty', Date.now().toString());
      }
    } catch (error) {
      console.error('Failed to set default');
    }
  };

  const handleToggleLanguage = async (lang) => {
    try {
      const res = await apiFetch(`/api/admin/languages/${lang.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !lang.is_active }),
      });
      if (res.ok) {
        const langRes = await apiFetch('/api/admin/languages');
        if (langRes.ok) setLanguages(await langRes.json());
        sessionStorage.setItem('oasis_translations_dirty', Date.now().toString());
      }
    } catch (error) {
      console.error('Failed to toggle');
    }
  };

  const loadTranslations = async () => {
    if (!selectedLanguageForTranslation) return;
    try {
      const res = await apiFetch('/api/translations', { params: { group: selectedGroup, lang: selectedLanguageForTranslation } });
      if (res.ok) {
        const data = await res.json();
        setTranslations(data || []);
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  };

  const handleSaveTranslation = async (id, value) => {
    try {
      await apiFetch(`/api/admin/translations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
    } catch (error) {
      console.error('Failed to save translation:', error);
    }
  };

  const handleSelectLanguageForTranslation = (lang) => {
    setSelectedLanguageForTranslation(lang.code);
    setSelectedGroup('common');
    setShowTranslations(true);
  };

  const refreshRoles = async () => {
    const rolesRes = await apiFetch('/api/admin/roles');
    if (rolesRes.ok) {
      const rolesJson = await rolesRes.json();
      setRolesData({ roles: rolesJson.roles || [], permissions: rolesJson.permissions || [], permissionsByCategory: rolesJson.permissionsByCategory || {} });
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
        await refreshRoles();
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
        await refreshRoles();
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

const tabs = [
    { id: 'general', label: t('settings.general'), icon: 'settings' },
    { id: 'species', label: 'Species', icon: 'pets' },
    { id: 'languages', label: t('settings.languages') || 'Languages', icon: 'language' },
    { id: 'roles', label: t('settings.roles') || 'Roles', icon: 'admin_panel_settings' },
    { id: 'taskTypes', label: 'Task Types', icon: 'task' },
    { id: 'medicalTypes', label: 'Medical Types', icon: 'vaccines' },
    { id: 'simulator', label: 'Simulator', icon: 'moving' },
    { id: 'translation', label: 'Translation', icon: 'translate' },
    { id: 'email', label: 'Email', icon: 'mail' },
    { id: 'stripe', label: t('settings.stripe'), icon: 'credit_card' },
    { id: 'gemini', label: t('settings.gemini'), icon: 'psychology' },
    { id: 'whatsapp', label: t('settings.whatsapp'), icon: 'chat' },
    { id: 'twilio', label: t('settings.twilio'), icon: 'sms' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-[#002819] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <nav className={`flex text-xs text-[#4f6357] mb-2 uppercase tracking-widest font-bold ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span>{t('common.settings')}</span>
          <span className="mx-2">/</span>
          <span className="text-[#002819]">{t('settings.title')}</span>
        </nav>
        <h2 className="text-3xl font-bold text-[#002819]">{t('settings.title')}</h2>
        <p className="text-[#404943] mt-1">{t('settings.subtitle')}</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2 bg-[#F4F4EF] p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-white text-[#002819] shadow-sm'
                : 'text-[#404943] hover:text-[#002819]'
            }`}
          >
            <MaterialSymbol icon={tab.icon} size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#002819] rounded-xl flex items-center justify-center">
              <MaterialSymbol icon="settings" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#002819]">{t('settings.generalSettings')}</h3>
              <p className="text-sm text-[#717973]">{t('settings.generalDescription')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.platformName')}</label>
              <input
                type="text"
                value={generalSettings.platform_name}
                onChange={(e) => setGeneralSettings({ ...generalSettings, platform_name: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="The Oasis"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.platformUrl')}</label>
              <input
                type="url"
                value={generalSettings.platform_url}
                onChange={(e) => setGeneralSettings({ ...generalSettings, platform_url: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="https://oasis.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.adminEmail')}</label>
              <input
                type="email"
                value={generalSettings.admin_email}
                onChange={(e) => setGeneralSettings({ ...generalSettings, admin_email: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="admin@oasis.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.timezone')}</label>
              <select
                value={generalSettings.timezone}
                onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
              >
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Riyadh">Asia/Riyadh (AST)</option>
                <option value="Asia/Kuwait">Asia/Kuwait (AST)</option>
                <option value="Asia/Qatar">Asia/Qatar (AST)</option>
                <option value="Asia/Bahrain">Asia/Bahrain (AST)</option>
                <option value="Asia/Amman">Asia/Amman (AST)</option>
                <option value="Africa/Cairo">Africa/Cairo (EET)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Europe/Paris">Europe/Paris (CET)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.dateFormat')}</label>
              <select
                value={generalSettings.date_format}
                onChange={(e) => setGeneralSettings({ ...generalSettings, date_format: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
              >
                <option value="Y-m-d">2024-01-15</option>
                <option value="d/m/Y">15/01/2024</option>
                <option value="m/d/Y">01/15/2024</option>
                <option value="d-m-Y">15-01-2024</option>
                <option value="d.M.Y">15.Jan.2024</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.defaultLanguage')}</label>
              <select
                value={generalSettings.default_language}
                onChange={(e) => setGeneralSettings({ ...generalSettings, default_language: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
              >
                <option value="en">English</option>
                <option value="ar">العربية (Arabic)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Copyright Text</label>
              <input
                type="text"
                value={generalSettings.copyright_text}
                onChange={(e) => setGeneralSettings({ ...generalSettings, copyright_text: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="Digital Majlis."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Logo</label>
              <div className="flex items-center gap-4">
                {(logoPreview || generalSettings.logo) && (
                  <img
                    src={storageUrl(logoPreview || generalSettings.logo)}
                    alt="Logo"
                    className="w-16 h-16 object-contain rounded-xl border border-[#e5e7db]"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setLogoFile(file);
                      setLogoPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full bg-[#F4F4EF] border-none rounded-xl p-3 text-sm text-[#002819] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#002819] file:text-white file:font-bold file:text-xs hover:file:bg-[#06402b]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Favicon</label>
              <div className="flex items-center gap-4">
                {(faviconPreview || generalSettings.favicon) && (
                  <img
                    src={storageUrl(faviconPreview || generalSettings.favicon)}
                    alt="Favicon"
                    className="w-8 h-8 object-contain rounded border border-[#e5e7db]"
                  />
                )}
                <input
                  type="file"
                  accept="image/png,image/x-icon,image/svg+xml,image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setFaviconFile(file);
                      setFaviconPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full bg-[#F4F4EF] border-none rounded-xl p-3 text-sm text-[#002819] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#002819] file:text-white file:font-bold file:text-xs hover:file:bg-[#06402b]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.loginBackground')}</label>
              <div className="flex items-center gap-4">
                {(loginBackgroundPreview || generalSettings.login_background) && (
                  <div
                    className="w-24 h-16 rounded-xl border border-[#e5e7db] bg-cover bg-center flex-shrink-0"
                    style={{
                      backgroundImage: `url(${storageUrl(loginBackgroundPreview || generalSettings.login_background)})`
                    }}
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setLoginBackgroundFile(file);
                      setLoginBackgroundPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full bg-[#F4F4EF] border-none rounded-xl p-3 text-sm text-[#002819] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#002819] file:text-white file:font-bold file:text-xs hover:file:bg-[#06402b]"
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSaveGeneral}
              disabled={saving}
              className="w-full py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402b] transition disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-[#F4F4EF]">
            <button
              onClick={async () => {
                setExportingDb(true);
                const success = await exportDatabase();
                if (success) {
                  setMessage({ type: 'success', text: t('common.exported') });
                } else {
                  setMessage({ type: 'error', text: t('common.exportFailed') });
                }
                setTimeout(() => setMessage(null), 3000);
                setExportingDb(false);
              }}
              disabled={exportingDb}
              className="w-full py-3 bg-[#D4AF37] text-white rounded-xl font-bold hover:bg-[#c9a030] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <MaterialSymbol icon="backup" size={20} />
              {exportingDb ? t('common.exporting') : t('settings.exportDatabase')}
            </button>
          </div>
        </div>
      )}

      {/* Species Tab */}
      {activeTab === 'species' && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#002819] rounded-xl flex items-center justify-center">
              <MaterialSymbol icon="pets" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#002819]">Species & Breeds</h3>
              <p className="text-sm text-[#717973]">Manage animal species and their breeds</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-[#002819] mb-4">Add New Species</h4>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newSpeciesName}
                  onChange={(e) => setNewSpeciesName(e.target.value)}
                  placeholder="Species name"
                  className="flex-1 bg-[#f4f4ef] border-none rounded-xl px-4 py-3 text-[#002819] font-semibold"
                />
                <button
                  onClick={async () => {
                    if (!newSpeciesName.trim()) return;
                    const res = await apiFetch('/api/species', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: newSpeciesName }),
                    });
                    if (res.ok) {
                      setNewSpeciesName('');
                      const res = await apiFetch('/api/species');
                      if (res.ok) {
                        const data = await res.json();
                        setSpeciesList(data.data);
                      }
                    }
                  }}
                  className="px-4 py-2 bg-[#002819] text-white rounded-xl font-bold"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {speciesList.map((species) => (
                  <div key={species.id} className="p-4 bg-[#f4f4ef] rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#002819]">{species.name}</span>
                      <button
                        onClick={async () => {
                          if (confirm('Delete this species?')) {
                            await apiFetch(`/api/species/${species.id}`, { method: 'DELETE' });
                            const res = await apiFetch('/api/species');
                            if (res.ok) {
                              const data = await res.json();
                              setSpeciesList(data.data);
                            }
                          }
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <MaterialSymbol icon="delete" size={20} />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {species.breeds?.map((breed) => (
                        <span key={breed.id} className="px-2 py-1 bg-white rounded-lg text-xs font-medium flex items-center gap-1">
                          {breed.name}
                          <button
                            onClick={async () => {
                              await apiFetch(`/api/breeds/${breed.id}`, { method: 'DELETE' });
                              const res = await apiFetch('/api/species');
                              if (res.ok) {
                                const data = await res.json();
                                setSpeciesList(data.data);
                              }
                            }}
                            className="text-red-400 hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        placeholder="Add breed..."
                        className="flex-1 bg-white border-none rounded-lg px-3 py-2 text-sm"
                        onKeyDown={async (e) => {
                          if (e.key === 'Enter' && e.target.value.trim()) {
                            await apiFetch(`/api/species/${species.id}/breeds`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name: e.target.value }),
                            });
                            e.target.value = '';
                            const res = await apiFetch('/api/species');
                            if (res.ok) {
                              const data = await res.json();
                              setSpeciesList(data.data);
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
</div>
        </div>
      )}

      {/* Languages Tab */}
      {activeTab === 'languages' && !showTranslations && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#002819] rounded-xl flex items-center justify-center">
              <MaterialSymbol icon="language" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#002819]">{t('settings.languageSettings') || 'Language Settings'}</h3>
              <p className="text-sm text-[#717973]">{t('settings.languageDescription') || 'Manage system languages and translations'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('common.code') || 'Code'}</label>
              <input
                type="text"
                value={languageForm.code}
                onChange={(e) => setLanguageForm({ ...languageForm, code: e.target.value.toLowerCase() })}
                placeholder="e.g. fr"
                disabled={!!editingLanguage}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                maxLength={3}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('common.name') || 'Name'}</label>
              <input
                type="text"
                value={languageForm.name}
                onChange={(e) => setLanguageForm({ ...languageForm, name: e.target.value })}
                placeholder="e.g. French"
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('common.nativeName') || 'Native Name'}</label>
              <input
                type="text"
                value={languageForm.native_name}
                onChange={(e) => setLanguageForm({ ...languageForm, native_name: e.target.value })}
                placeholder="e.g. Français"
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('common.direction') || 'Direction'}</label>
              <select
                value={languageForm.direction}
                onChange={(e) => setLanguageForm({ ...languageForm, direction: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
              >
                <option value="ltr">LTR</option>
                <option value="rtl">RTL</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleSaveLanguage}
                disabled={saving}
                className="flex-1 py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402b] transition disabled:opacity-50"
              >
                {saving ? '...' : editingLanguage ? t('common.update') || 'Update' : t('common.add') || 'Add'}
              </button>
              {editingLanguage && (
                <button
                  onClick={() => { setEditingLanguage(null); setLanguageForm({ code: '', name: '', native_name: '', direction: 'ltr' }); }}
                  className="px-4 py-3 bg-gray-400 text-white rounded-xl font-bold hover:bg-gray-500"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#F4F4EF]">
            <table className="w-full">
              <thead className="bg-[#F4F4EF]">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-bold text-[#404943] uppercase">{t('common.code') || 'Code'}</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-[#404943] uppercase">{t('common.name') || 'Name'}</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-[#404943] uppercase">{t('common.nativeName') || 'Native'}</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-[#404943] uppercase">{t('common.direction') || 'Dir'}</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-[#404943] uppercase">{t('common.status') || 'Status'}</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-[#404943] uppercase">{t('common.actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {languages.map((lang) => (
                  <tr key={lang.code} className="border-t border-[#F4F4EF]">
                    <td className="px-4 py-3 font-mono font-bold text-[#002819]">{lang.code}</td>
                    <td className="px-4 py-3 text-[#002819]">{lang.name}</td>
                    <td className="px-4 py-3 text-[#002819]" dir={lang.direction || 'ltr'}>{lang.native_name}</td>
                    <td className="px-4 py-3 uppercase text-xs text-[#404943]">{lang.direction}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${lang.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {lang.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {lang.is_default && (
                        <span className="ml-2 px-2 py-1 rounded-lg text-xs font-bold bg-[#D4AF37] text-white">
                          Default
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setEditingLanguage(lang.code); setLanguageForm({ code: lang.code, name: lang.name, native_name: lang.native_name, direction: lang.direction }); }}
                        className="text-[#002819] hover:text-[#06402B] font-medium text-sm mr-3"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        onClick={() => handleSelectLanguageForTranslation(lang)}
                        className="text-green-600 hover:text-green-700 font-medium text-sm mr-3"
                      >
                        Translate
                      </button>
                      <button
                        onClick={() => handleToggleLanguage(lang)}
                        className={`font-medium text-sm mr-3 ${lang.is_active ? 'text-orange-600' : 'text-emerald-600'}`}
                      >
                        {lang.is_active ? t('common.disable') : t('common.enable')}
                      </button>
                      {!lang.is_default && (
                        <button
                          onClick={() => handleSetDefaultLanguage(lang.code)}
                          className="text-purple-600 hover:text-purple-700 font-medium text-sm mr-3"
                        >
                          {t('common.setDefault')}
                        </button>
                      )}
                      {!lang.is_default && (
                        <button
                          onClick={() => handleDeleteLanguage(lang.code)}
                          className="text-red-600 hover:text-red-700 font-medium text-sm"
                        >
                          {t('common.delete')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Translations Panel */}
      {activeTab === 'languages' && showTranslations && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#002819] rounded-xl flex items-center justify-center">
              <MaterialSymbol icon="translate" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#002819]">Manage Translations</h3>
              <p className="text-sm text-[#717973]">Edit translation values for selected language</p>
            </div>
          </div>

          <div className="flex gap-4 mb-4 items-center">
            <button
              onClick={() => setShowTranslations(false)}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
            >
              <MaterialSymbol icon="arrow_back" size={20} />
              <span>Back to Languages</span>
            </button>
            <span className="text-gray-400">|</span>
            <select
              value={selectedLanguageForTranslation}
              onChange={(e) => setSelectedLanguageForTranslation(e.target.value)}
              className="border border-[#F4F4EF] rounded-xl px-3 py-2 min-w-[200px]"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name} ({lang.code})</option>
              ))}
            </select>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="border border-[#F4F4EF] rounded-xl px-3 py-2"
            >
              {groups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#F4F4EF]">
            <table className="w-full">
              <thead className="bg-[#F4F4EF] sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-bold text-[#404943] uppercase w-1/3">Key</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-[#404943] uppercase">Value</th>
                </tr>
              </thead>
              <tbody>
                {translations.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="px-4 py-8 text-center text-gray-500">
                      No translations found for this language and group.
                    </td>
                  </tr>
                ) : (
                  translations.map((trans) => (
                    <tr key={trans.id} className="border-t border-[#F4F4EF]">
                      <td className="px-4 py-3 font-mono text-sm text-[#002819]">{trans.key}</td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          defaultValue={trans.value}
                          onBlur={(e) => handleSaveTranslation(trans.id, e.target.value)}
                          dir={selectedLanguageForTranslation === 'ar' || selectedLanguageForTranslation === 'ur' ? 'rtl' : 'ltr'}
                          className="w-full border-none rounded-lg px-3 py-2 bg-[#F4F4EF] focus:ring-2 focus:ring-[#06402B]/20"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#002819] rounded-xl flex items-center justify-center">
              <MaterialSymbol icon="admin_panel_settings" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#002819]">{t('settings.roleSettings') || 'Role Settings'}</h3>
              <p className="text-sm text-[#717973]">{t('settings.roleDescription') || 'Manage roles and permissions'}</p>
            </div>
          </div>

          <div className="flex gap-2 bg-[#F4F4EF] p-1 rounded-xl w-fit mb-6">
            <button
              onClick={() => setRoleTypeTab('staff')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                roleTypeTab === 'staff' ? 'bg-white text-[#002819] shadow-sm' : 'text-[#404943] hover:text-[#002819]'
              }`}
            >
              Administration Staff
            </button>
            <button
              onClick={() => setRoleTypeTab('farm')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                roleTypeTab === 'farm' ? 'bg-white text-[#002819] shadow-sm' : 'text-[#404943] hover:text-[#002819]'
              }`}
            >
              Farm Users
            </button>
          </div>

          {roleTypeTab === 'staff' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="font-bold text-[#002819] mb-4">
                  {editingRole ? 'Edit' : 'New'} Staff Role
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Role Name</label>
                    <input
                      type="text"
                      value={roleForm.name}
                      onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value, type: 'admin' })}
                      placeholder="e.g. Support, Accountant"
                      disabled={!!editingRole}
                      className="w-full bg-[#F4F4EF] border-none rounded-xl px-4 py-3 text-[#002819] font-semibold disabled:opacity-50"
                    />
                  </div>

                  {Object.entries(rolesData.permissionsByCategory).filter(([key]) =>
                    ['support', 'billing', 'customer_service', 'platform', 'users', 'reports', 'settings', 'animals', 'devices', 'geofences', 'tasks', 'medical', 'vaccinations', 'auctions'].includes(key)
                  ).map(([categoryKey, category]) => (
                    <div key={categoryKey} className="border border-[#F4F4EF] rounded-xl p-4">
                      <label className="flex items-center gap-2 mb-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={category.permissions.every(p => roleForm.permissions.includes(p))}
                          onChange={(e) => toggleAllInCategory(category.permissions, e.target.checked)}
                          className="w-4 h-4 rounded border-2 border-[#D4AF37] text-[#D4AF37]"
                        />
                        <span className="font-bold text-[#002819]">{category.label}</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2 pl-6">
                        {category.permissions.map((perm) => (
                          <label key={perm} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={roleForm.permissions.includes(perm)}
                              onChange={() => togglePermission(perm)}
                              className="w-4 h-4 rounded border-2 border-[#D4AF37] text-[#D4AF37]"
                            />
                            <span className="text-sm text-[#404943]">{perm}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button onClick={handleSaveRole} disabled={saving}
                    className="w-full py-3 bg-[#D4AF37] text-white rounded-xl font-bold hover:bg-[#c9a330] transition disabled:opacity-50"
                  >
                    {saving ? '...' : editingRole ? 'Update' : 'Add'} Staff Role
                  </button>
                  {editingRole && (
                    <button onClick={() => { setEditingRole(null); setRoleForm({ name: '', type: 'user', permissions: [] }); }}
                      className="w-full py-3 bg-gray-400 text-white rounded-xl font-bold hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#002819] mb-4">Staff Roles</h4>
                {rolesData.roles.filter(r => r.type === 'admin').length === 0 ? (
                  <div className="text-center py-8 text-[#717973]">No staff roles yet.</div>
                ) : (
                  <div className="space-y-3">
                    {rolesData.roles.filter(r => r.type === 'admin').map((role) => (
                      <div key={role.name} className={`p-4 rounded-xl ${role.is_system ? 'bg-gray-100' : 'bg-[#f4f4ef]'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs bg-[#D4AF37]/20 text-[#735C00] font-bold">Staff</span>
                            <span className="font-bold text-[#002819]">{role.name}</span>
                            {role.is_system && (
                              <span className="px-2 py-0.5 rounded text-xs bg-gray-300 text-gray-600">System</span>
                            )}
                          </div>
                          <span className="text-sm text-[#717973]">{role.user_count || 0} user{(role.user_count || 0) !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {role.permissions?.slice(0, 6).map((perm) => (
                            <span key={perm} className="px-2 py-1 bg-white rounded text-xs text-[#404943]">{perm}</span>
                          ))}
                          {role.permissions?.length > 6 && (
                            <span className="px-2 py-1 text-xs text-[#717973]">+{role.permissions.length - 6} more</span>
                          )}
                        </div>
                        {!role.is_system && (
                          <div className="flex gap-2 pt-2 border-t border-gray-200">
                            <button onClick={() => handleEditRole(role)}
                              className="text-sm text-[#002819] hover:text-[#06402B] font-medium">Edit</button>
                            <button onClick={() => handleDeleteRole(role.name)}
                              className="text-sm text-red-600 hover:text-red-700 font-medium">Delete</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {roleTypeTab === 'farm' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h4 className="font-bold text-[#002819] mb-4">
                  {editingRole ? 'Edit' : 'New'} Farm Role
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Role Name</label>
                    <input
                      type="text"
                      value={roleForm.name}
                      onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value, type: 'user' })}
                      placeholder="e.g. Helper, Trainer"
                      disabled={!!editingRole}
                      className="w-full bg-[#F4F4EF] border-none rounded-xl px-4 py-3 text-[#002819] font-semibold disabled:opacity-50"
                    />
                  </div>

                  {Object.entries(rolesData.permissionsByCategory).filter(([key]) =>
                    ['animals', 'devices', 'geofences', 'geofence_alerts', 'tasks', 'reports', 'medical', 'vaccinations', 'users', 'auctions'].includes(key)
                  ).map(([categoryKey, category]) => (
                    <div key={categoryKey} className="border border-[#F4F4EF] rounded-xl p-4">
                      <label className="flex items-center gap-2 mb-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={category.permissions.every(p => roleForm.permissions.includes(p))}
                          onChange={(e) => toggleAllInCategory(category.permissions, e.target.checked)}
                          className="w-4 h-4 rounded border-2 border-[#D4AF37] text-[#D4AF37]"
                        />
                        <span className="font-bold text-[#002819]">{category.label}</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2 pl-6">
                        {category.permissions.map((perm) => (
                          <label key={perm} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={roleForm.permissions.includes(perm)}
                              onChange={() => togglePermission(perm)}
                              className="w-4 h-4 rounded border-2 border-[#D4AF37] text-[#D4AF37]"
                            />
                            <span className="text-sm text-[#404943]">{perm}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button onClick={handleSaveRole} disabled={saving}
                    className="w-full py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402b] transition disabled:opacity-50"
                  >
                    {saving ? '...' : editingRole ? 'Update' : 'Add'} Farm Role
                  </button>
                  {editingRole && (
                    <button onClick={() => { setEditingRole(null); setRoleForm({ name: '', type: 'user', permissions: [] }); }}
                      className="w-full py-3 bg-gray-400 text-white rounded-xl font-bold hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#002819] mb-4">Farm Roles</h4>
                {rolesData.roles.filter(r => r.type !== 'admin').length === 0 ? (
                  <div className="text-center py-8 text-[#717973]">No farm roles yet.</div>
                ) : (
                  <div className="space-y-3">
                    {rolesData.roles.filter(r => r.type !== 'admin').map((role) => (
                      <div key={role.name} className={`p-4 rounded-xl ${role.is_system ? 'bg-gray-100' : 'bg-[#f4f4ef]'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs bg-[#10B981]/20 text-[#059669] font-bold">Farm</span>
                            <span className="font-bold text-[#002819]">{role.name}</span>
                            {role.is_system && (
                              <span className="px-2 py-0.5 rounded text-xs bg-gray-300 text-gray-600">System</span>
                            )}
                          </div>
                          <span className="text-sm text-[#717973]">{role.user_count || 0} user{(role.user_count || 0) !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {role.permissions?.slice(0, 6).map((perm) => (
                            <span key={perm} className="px-2 py-1 bg-white rounded text-xs text-[#404943]">{perm}</span>
                          ))}
                          {role.permissions?.length > 6 && (
                            <span className="px-2 py-1 text-xs text-[#717973]">+{role.permissions.length - 6} more</span>
                          )}
                        </div>
                        {!role.is_system && (
                          <div className="flex gap-2 pt-2 border-t border-gray-200">
                            <button onClick={() => handleEditRole(role)}
                              className="text-sm text-[#002819] hover:text-[#06402B] font-medium">Edit</button>
                            <button onClick={() => handleDeleteRole(role.name)}
                              className="text-sm text-red-600 hover:text-red-700 font-medium">Delete</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Types Tab */}
      {activeTab === 'taskTypes' && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#002819] rounded-xl flex items-center justify-center">
              <MaterialSymbol icon="task" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#002819]">Task Types</h3>
              <p className="text-sm text-[#717973]">Manage task categories and log types</p>
            </div>
          </div>

          <div className="flex gap-2 bg-[#F4F4EF] p-1 rounded-xl w-fit mb-6">
            <button onClick={() => setLogTypeTab('task')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${logTypeTab === 'task' ? 'bg-white text-[#002819] shadow-sm' : 'text-[#717973]'}`}>
              <MaterialSymbol icon="task" size={16} className="inline mr-1" />Task Types
            </button>
            <button onClick={() => setLogTypeTab('log')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${logTypeTab === 'log' ? 'bg-white text-[#002819] shadow-sm' : 'text-[#717973]'}`}>
              <MaterialSymbol icon="note" size={16} className="inline mr-1" />Log Types
            </button>
          </div>

          {logTypeTab === 'task' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-[#002819] mb-4">{editingTaskType ? 'Edit Task Type' : 'Add New Task Type'}</h4>
              <div className="space-y-4 p-4 bg-[#F4F4EF] rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Name</label>
                  <input
                    type="text"
                    value={taskTypeForm.name}
                    onChange={(e) => setTaskTypeForm({ ...taskTypeForm, name: e.target.value, slug: editingTaskType ? taskTypeForm.slug : e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="e.g. Vaccination"
                    className="w-full bg-white border-none rounded-xl px-4 py-3 text-[#002819]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Slug</label>
                  <input
                    type="text"
                    value={taskTypeForm.slug}
                    onChange={(e) => setTaskTypeForm({ ...taskTypeForm, slug: e.target.value })}
                    placeholder="e.g. vaccination"
                    className="w-full bg-white border-none rounded-xl px-4 py-3 text-[#002819]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Icon</label>
                    <select
                      value={taskTypeForm.icon}
                      onChange={(e) => setTaskTypeForm({ ...taskTypeForm, icon: e.target.value })}
                      className="w-full bg-white border-none rounded-xl px-4 py-3 text-[#002819]"
                    >
                      <option value="assignment">assignment</option>
                      <option value="search">search</option>
                      <option value="medical_services">medical_services</option>
                      <option value="restaurant">restaurant</option>
                      <option value="directions_walk">directions_walk</option>
                      <option value="vaccines">vaccines</option>
                      <option value="nutrition">nutrition</option>
                      <option value="build">build</option>
                      <option value="cleaning_services">cleaning_services</option>
                      <option value="checklist">checklist</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Color</label>
                    <input
                      type="color"
                      value={taskTypeForm.color}
                      onChange={(e) => setTaskTypeForm({ ...taskTypeForm, color: e.target.value })}
                      className="w-full h-11 rounded-xl border-0 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taskTypeForm.is_active}
                      onChange={(e) => setTaskTypeForm({ ...taskTypeForm, is_active: e.target.checked })}
                      className="w-5 h-5 rounded border-2 border-[#D4AF37] text-[#D4AF37]"
                    />
                    <span className="text-sm font-semibold text-[#002819]">Active</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!taskTypeForm.name.trim() || !taskTypeForm.slug.trim()) return;
                      const url = editingTaskType
                        ? `/api/admin/task-types/${editingTaskType}`
                        : '/api/admin/task-types';
                      const method = editingTaskType ? 'PUT' : 'POST';
                      const res = await apiFetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(taskTypeForm),
                      });
                      if (res.ok) {
                        setTaskTypeForm({ name: '', slug: '', icon: 'assignment', color: '#002819', is_active: true });
                        setEditingTaskType(null);
                        const listRes = await apiFetch('/api/task-types');
                        if (listRes.ok) {
                          const data = await listRes.json();
                          setTaskTypes(data.data);
                        }
                      }
                    }}
                    className="flex-1 py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402B] transition"
                  >
                    {editingTaskType ? 'Update' : 'Add'}
                  </button>
                  {editingTaskType && (
                    <button
                      onClick={() => { setEditingTaskType(null); setTaskTypeForm({ name: '', slug: '', icon: 'assignment', color: '#002819', is_active: true }); }}
                      className="px-4 py-3 bg-[#717973] text-white rounded-xl font-bold hover:bg-[#5a6265] transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[#002819] mb-4">Existing Task Types</h4>
              <div className="space-y-2">
                {taskTypes.length === 0 ? (
                  <p className="text-[#717973] text-sm">No task types defined</p>
                ) : (
                  taskTypes.map((tt) => (
                    <div key={tt.id} className={`p-4 rounded-xl flex items-center justify-between ${tt.is_active ? 'bg-[#F4F4EF]' : 'bg-[#F4F4EF]/50 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: tt.color + '20' }}>
                          <MaterialSymbol icon={tt.icon || 'assignment'} size={20} style={{ color: tt.color }} />
                        </div>
                        <div>
                          <p className="font-bold text-[#002819]">{tt.name}</p>
                          <p className="text-xs text-[#717973]">{tt.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingTaskType(tt.id);
                            setTaskTypeForm({ name: tt.name, slug: tt.slug, icon: tt.icon || 'assignment', color: tt.color || '#002819', is_active: tt.is_active });
                          }}
                          className="p-2 text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition"
                        >
                          <MaterialSymbol icon="edit" size={18} />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Delete this task type?')) {
                              await apiFetch(`/api/admin/task-types/${tt.id}`, { method: 'DELETE' });
                              const listRes = await apiFetch('/api/task-types');
                              if (listRes.ok) {
                                const data = await listRes.json();
                                setTaskTypes(data.data);
                              }
                            }
                          }}
                          className="p-2 text-[#BA1A1A] hover:bg-[#BA1A1A]/10 rounded-lg transition"
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
              <h4 className="font-bold text-[#002819] mb-4">{editingLogType ? 'Edit Log Type' : 'Add New Log Type'}</h4>
              <div className="space-y-4 p-4 bg-[#F4F4EF] rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Name</label>
                  <input type="text" value={logTypeForm.name}
                    onChange={(e) => setLogTypeForm({ ...logTypeForm, name: e.target.value, slug: editingLogType ? logTypeForm.slug : e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="e.g. Done" className="w-full bg-white border-none rounded-xl px-4 py-3 text-[#002819]" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Slug</label>
                  <input type="text" value={logTypeForm.slug}
                    onChange={(e) => setLogTypeForm({ ...logTypeForm, slug: e.target.value })}
                    placeholder="e.g. done" className="w-full bg-white border-none rounded-xl px-4 py-3 text-[#002819]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Icon</label>
                    <select value={logTypeForm.icon} onChange={(e) => setLogTypeForm({ ...logTypeForm, icon: e.target.value })}
                      className="w-full bg-white border-none rounded-xl px-4 py-3 text-[#002819]">
                      <option value="note">note</option>
                      <option value="check_circle">check_circle</option>
                      <option value="block">block</option>
                      <option value="schedule">schedule</option>
                      <option value="play_arrow">play_arrow</option>
                      <option value="photo_camera">photo_camera</option>
                      <option value="my_location">my_location</option>
                      <option value="location_on">location_on</option>
                      <option value="assignment">assignment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Color</label>
                    <input type="color" value={logTypeForm.color}
                      onChange={(e) => setLogTypeForm({ ...logTypeForm, color: e.target.value })}
                      className="w-full h-11 rounded-xl border-0 cursor-pointer" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={logTypeForm.allows_media}
                      onChange={(e) => setLogTypeForm({ ...logTypeForm, allows_media: e.target.checked })}
                      className="w-5 h-5 rounded border-2 border-[#D4AF37] text-[#D4AF37]" />
                    <span className="text-sm font-semibold text-[#002819]">Allows Media</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={logTypeForm.is_status}
                      onChange={(e) => setLogTypeForm({ ...logTypeForm, is_status: e.target.checked })}
                      className="w-5 h-5 rounded border-2 border-[#D4AF37] text-[#D4AF37]" />
                    <span className="text-sm font-semibold text-[#002819]">Status Change</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={logTypeForm.is_active}
                      onChange={(e) => setLogTypeForm({ ...logTypeForm, is_active: e.target.checked })}
                      className="w-5 h-5 rounded border-2 border-[#D4AF37] text-[#D4AF37]" />
                    <span className="text-sm font-semibold text-[#002819]">Active</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={async () => {
                    if (!logTypeForm.name.trim() || !logTypeForm.slug.trim()) return;
                    const url = editingLogType ? `/api/admin/task-log-types/${editingLogType}` : '/api/admin/task-log-types';
                    const method = editingLogType ? 'PUT' : 'POST';
                    const res = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(logTypeForm) });
                    if (res.ok) {
                      setLogTypeForm({ name: '', slug: '', icon: 'note', color: '#717973', allows_media: false, is_status: false, is_active: true });
                      setEditingLogType(null);
                      const listRes = await apiFetch('/api/task-log-types');
                      if (listRes.ok) { const d = await listRes.json(); setTaskLogTypes(d.data); }
                    }
                  }} className="flex-1 py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402B] transition">
                    {editingLogType ? 'Update' : 'Add'}
                  </button>
                  {editingLogType && (
                    <button onClick={() => { setEditingLogType(null); setLogTypeForm({ name: '', slug: '', icon: 'note', color: '#717973', allows_media: false, is_status: false, is_active: true }); }}
                      className="px-4 py-3 bg-[#717973] text-white rounded-xl font-bold hover:bg-[#5a6265] transition">Cancel</button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[#002819] mb-4">Existing Log Types</h4>
              <div className="space-y-2">
                {taskLogTypes.length === 0 ? (
                  <p className="text-[#717973] text-sm">No log types defined</p>
                ) : (
                  taskLogTypes.map((lt) => (
                    <div key={lt.id} className={`p-4 rounded-xl flex items-center justify-between ${lt.is_active ? 'bg-[#F4F4EF]' : 'bg-[#F4F4EF]/50 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: lt.color + '20' }}>
                          <MaterialSymbol icon={lt.icon || 'note'} size={20} style={{ color: lt.color }} />
                        </div>
                        <div>
                          <p className="font-bold text-[#002819]">{lt.name}</p>
                          <p className="text-xs text-[#717973]">{lt.slug} {lt.is_status ? '(status)' : ''} {lt.allows_media ? '(media)' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => {
                          setEditingLogType(lt.id);
                          setLogTypeForm({ name: lt.name, slug: lt.slug, icon: lt.icon || 'note', color: lt.color || '#717973', allows_media: lt.allows_media, is_status: lt.is_status, is_active: lt.is_active });
                        }} className="p-2 text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition">
                          <MaterialSymbol icon="edit" size={18} />
                        </button>
                        <button onClick={async () => {
                          if (confirm('Delete this log type?')) {
                            await apiFetch(`/api/admin/task-log-types/${lt.id}`, { method: 'DELETE' });
                            const listRes = await apiFetch('/api/task-log-types');
                            if (listRes.ok) { const d = await listRes.json(); setTaskLogTypes(d.data); }
                          }
                        }} className="p-2 text-[#BA1A1A] hover:bg-[#BA1A1A]/10 rounded-lg transition">
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
        </div>
      )}

      {/* Medical Record Types Tab */}
      {activeTab === 'medicalTypes' && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#002819] rounded-xl flex items-center justify-center">
              <MaterialSymbol icon="vaccines" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#002819]">Medical Types</h3>
              <p className="text-sm text-[#717973]">Manage medical record and vaccination categories</p>
            </div>
          </div>

          <div className="flex gap-2 bg-[#F4F4EF] p-1 rounded-xl w-fit mb-6">
            <button onClick={() => setMedicalSubTab('recordTypes')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${medicalSubTab === 'recordTypes' ? 'bg-white text-[#002819] shadow-sm' : 'text-[#717973]'}`}>
              <MaterialSymbol icon="medical_services" size={16} className="inline mr-1" />Record Types
            </button>
            <button onClick={() => setMedicalSubTab('vaccinationTypes')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${medicalSubTab === 'vaccinationTypes' ? 'bg-white text-[#002819] shadow-sm' : 'text-[#717973]'}`}>
              <MaterialSymbol icon="vaccines" size={16} className="inline mr-1" />Vaccination Types
            </button>
          </div>

          {medicalSubTab === 'recordTypes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-[#002819] mb-4">{editingMedicalType ? 'Edit Medical Type' : 'Add New Medical Type'}</h4>
              <div className="space-y-4 p-4 bg-[#F4F4EF] rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Name</label>
                  <input
                    type="text"
                    value={medicalTypeForm.name}
                    onChange={(e) => setMedicalTypeForm({ ...medicalTypeForm, name: e.target.value, slug: editingMedicalType ? medicalTypeForm.slug : e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="e.g. Vaccination"
                    className="w-full bg-white border-none rounded-xl px-4 py-3 text-[#002819]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Slug</label>
                  <input
                    type="text"
                    value={medicalTypeForm.slug}
                    onChange={(e) => setMedicalTypeForm({ ...medicalTypeForm, slug: e.target.value })}
                    placeholder="e.g. vaccination"
                    className="w-full bg-white border-none rounded-xl px-4 py-3 text-[#002819]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Icon</label>
                    <select
                      value={medicalTypeForm.icon}
                      onChange={(e) => setMedicalTypeForm({ ...medicalTypeForm, icon: e.target.value })}
                      className="w-full bg-white border-none rounded-xl px-4 py-3 text-[#002819]"
                    >
                      <option value="medical_services">medical_services</option>
                      <option value="vaccines">vaccines</option>
                      <option value="local_hospital">local_hospital</option>
                      <option value="healing">healing</option>
                      <option value="emergency">emergency</option>
                      <option value="checklist">checklist</option>
                      <option value="monitor_heart">monitor_heart</option>
                      <option value="biotech">biotech</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Color</label>
                    <input
                      type="color"
                      value={medicalTypeForm.color}
                      onChange={(e) => setMedicalTypeForm({ ...medicalTypeForm, color: e.target.value })}
                      className="w-full h-11 rounded-xl border-0 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={medicalTypeForm.is_active}
                      onChange={(e) => setMedicalTypeForm({ ...medicalTypeForm, is_active: e.target.checked })}
                      className="w-5 h-5 rounded border-2 border-[#D4AF37] text-[#D4AF37]"
                    />
                    <span className="text-sm font-semibold text-[#002819]">Active</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!medicalTypeForm.name.trim() || !medicalTypeForm.slug.trim()) return;
                      const url = editingMedicalType
                        ? `/api/admin/medical-record-types/${editingMedicalType}`
                        : '/api/admin/medical-record-types';
                      const method = editingMedicalType ? 'PUT' : 'POST';
                      const res = await apiFetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(medicalTypeForm),
                      });
                      if (res.ok) {
                        setMedicalTypeForm({ name: '', slug: '', icon: 'medical_services', color: '#002819', is_active: true });
                        setEditingMedicalType(null);
                        const listRes = await apiFetch('/api/medical-record-types');
                        if (listRes.ok) {
                          const data = await listRes.json();
                          setMedicalRecordTypes(data.data);
                        }
                        setMessage({ type: 'success', text: 'Medical type saved' });
                        setTimeout(() => setMessage(null), 3000);
                      }
                    }}
                    className="flex-1 py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402B] transition"
                  >
                    {editingMedicalType ? 'Update' : 'Add'}
                  </button>
                  {editingMedicalType && (
                    <button
                      onClick={() => { setEditingMedicalType(null); setMedicalTypeForm({ name: '', slug: '', icon: 'medical_services', color: '#002819', is_active: true }); }}
                      className="px-4 py-3 bg-[#717973] text-white rounded-xl font-bold hover:bg-[#5a6265] transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[#002819] mb-4">Existing Medical Record Types</h4>
              <div className="space-y-2">
                {medicalRecordTypes.length === 0 ? (
                  <p className="text-[#717973] text-sm">No medical record types defined</p>
                ) : (
                  medicalRecordTypes.map((mt) => (
                    <div key={mt.id} className={`p-4 rounded-xl flex items-center justify-between ${mt.is_active ? 'bg-[#F4F4EF]' : 'bg-[#F4F4EF]/50 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: mt.color + '20' }}>
                          <MaterialSymbol icon={mt.icon || 'medical_services'} size={20} style={{ color: mt.color }} />
                        </div>
                        <div>
                          <p className="font-bold text-[#002819]">{mt.name}</p>
                          <p className="text-xs text-[#717973]">{mt.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingMedicalType(mt.id);
                            setMedicalTypeForm({ name: mt.name, slug: mt.slug, icon: mt.icon || 'medical_services', color: mt.color || '#002819', is_active: mt.is_active });
                          }}
                          className="p-2 text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition"
                        >
                          <MaterialSymbol icon="edit" size={18} />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Delete this medical record type?')) {
                              await apiFetch(`/api/admin/medical-record-types/${mt.id}`, { method: 'DELETE' });
                              const listRes = await apiFetch('/api/medical-record-types');
                              if (listRes.ok) {
                                const data = await listRes.json();
                                setMedicalRecordTypes(data.data);
                              }
                              setMessage({ type: 'success', text: 'Medical type deleted' });
                              setTimeout(() => setMessage(null), 3000);
                            }
                          }}
                          className="p-2 text-[#BA1A1A] hover:bg-[#BA1A1A]/10 rounded-lg transition"
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

          {medicalSubTab === 'vaccinationTypes' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-[#002819] mb-4">{editingVaccinationType ? 'Edit Vaccination Type' : 'Add New Vaccination Type'}</h4>
              <div className="space-y-4 p-4 bg-[#F4F4EF] rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Name</label>
                  <input
                    type="text"
                    value={vaccinationTypeForm.name}
                    onChange={(e) => setVaccinationTypeForm({ ...vaccinationTypeForm, name: e.target.value, slug: editingVaccinationType ? vaccinationTypeForm.slug : e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="e.g. Booster"
                    className="w-full bg-white border-none rounded-xl px-4 py-3 text-[#002819]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Slug</label>
                  <input
                    type="text"
                    value={vaccinationTypeForm.slug}
                    onChange={(e) => setVaccinationTypeForm({ ...vaccinationTypeForm, slug: e.target.value })}
                    placeholder="e.g. booster"
                    className="w-full bg-white border-none rounded-xl px-4 py-3 text-[#002819]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Icon</label>
                    <select
                      value={vaccinationTypeForm.icon}
                      onChange={(e) => setVaccinationTypeForm({ ...vaccinationTypeForm, icon: e.target.value })}
                      className="w-full bg-white border-none rounded-xl px-4 py-3 text-[#002819]"
                    >
                      <option value="vaccines">vaccines</option>
                      <option value="refresh">refresh</option>
                      <option value="emergency">emergency</option>
                      <option value="ac_unit">ac_unit</option>
                      <option value="medical_services">medical_services</option>
                      <option value="healing">healing</option>
                      <option value="monitor_heart">monitor_heart</option>
                      <option value="biotech">biotech</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Color</label>
                    <input
                      type="color"
                      value={vaccinationTypeForm.color}
                      onChange={(e) => setVaccinationTypeForm({ ...vaccinationTypeForm, color: e.target.value })}
                      className="w-full h-11 rounded-xl border-0 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={vaccinationTypeForm.is_active}
                      onChange={(e) => setVaccinationTypeForm({ ...vaccinationTypeForm, is_active: e.target.checked })}
                      className="w-5 h-5 rounded border-2 border-[#D4AF37] text-[#D4AF37]"
                    />
                    <span className="text-sm font-semibold text-[#002819]">Active</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!vaccinationTypeForm.name.trim() || !vaccinationTypeForm.slug.trim()) return;
                      const url = editingVaccinationType
                        ? `/api/admin/vaccination-types/${editingVaccinationType}`
                        : '/api/admin/vaccination-types';
                      const method = editingVaccinationType ? 'PUT' : 'POST';
                      const res = await apiFetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(vaccinationTypeForm),
                      });
                      if (res.ok) {
                        setVaccinationTypeForm({ name: '', slug: '', icon: 'vaccines', color: '#002819', is_active: true });
                        setEditingVaccinationType(null);
                        const listRes = await apiFetch('/api/admin/vaccination-types');
                        if (listRes.ok) {
                          const data = await listRes.json();
                          setVaccinationTypesList(data.data);
                        }
                        setMessage({ type: 'success', text: 'Vaccination type saved' });
                        setTimeout(() => setMessage(null), 3000);
                      }
                    }}
                    className="flex-1 py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402B] transition"
                  >
                    {editingVaccinationType ? 'Update' : 'Add'}
                  </button>
                  {editingVaccinationType && (
                    <button
                      onClick={() => { setEditingVaccinationType(null); setVaccinationTypeForm({ name: '', slug: '', icon: 'vaccines', color: '#002819', is_active: true }); }}
                      className="px-4 py-3 bg-[#717973] text-white rounded-xl font-bold hover:bg-[#5a6265] transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-[#002819] mb-4">Existing Vaccination Types</h4>
              <div className="space-y-2">
                {vaccinationTypesList.length === 0 ? (
                  <p className="text-[#717973] text-sm">No vaccination types defined</p>
                ) : (
                  vaccinationTypesList.map((vt) => (
                    <div key={vt.id} className={`p-4 rounded-xl flex items-center justify-between ${vt.is_active ? 'bg-[#F4F4EF]' : 'bg-[#F4F4EF]/50 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: vt.color + '20' }}>
                          <MaterialSymbol icon={vt.icon || 'vaccines'} size={20} style={{ color: vt.color }} />
                        </div>
                        <div>
                          <p className="font-bold text-[#002819]">{vt.name}</p>
                          <p className="text-xs text-[#717973]">{vt.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingVaccinationType(vt.id);
                            setVaccinationTypeForm({ name: vt.name, slug: vt.slug, icon: vt.icon || 'vaccines', color: vt.color || '#002819', is_active: vt.is_active });
                          }}
                          className="p-2 text-[#3B82F6] hover:bg-[#3B82F6]/10 rounded-lg transition"
                        >
                          <MaterialSymbol icon="edit" size={18} />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Delete this vaccination type?')) {
                              await apiFetch(`/api/admin/vaccination-types/${vt.id}`, { method: 'DELETE' });
                              const listRes = await apiFetch('/api/admin/vaccination-types');
                              if (listRes.ok) {
                                const data = await listRes.json();
                                setVaccinationTypesList(data.data);
                              }
                              setMessage({ type: 'success', text: 'Vaccination type deleted' });
                              setTimeout(() => setMessage(null), 3000);
                            }
                          }}
                          className="p-2 text-[#BA1A1A] hover:bg-[#BA1A1A]/10 rounded-lg transition"
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
        </div>
      )}

      {/* SMTP Tab */}
      {activeTab === 'email' && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#002819] rounded-xl flex items-center justify-center">
              <MaterialSymbol icon="mail" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#002819]">Email Settings</h3>
              <p className="text-sm text-[#717973]">Configure SMTP, email notifications, and send test emails</p>
            </div>
          </div>

          <h4 className="text-lg font-bold text-[#002819] mb-4 pb-2 border-b border-[#F4F4EF]">SMTP Configuration</h4>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.smtpHost')}</label>
              <input
                type="text"
                value={smtpSettings.host}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.port')}</label>
              <input
                type="text"
                value={smtpSettings.port}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="587"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.username')}</label>
              <input
                type="text"
                value={smtpSettings.username}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, username: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('auth.password')}</label>
              <input
                type="password"
                value={smtpSettings.password}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, password: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="App password"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.encryption')}</label>
              <select
                value={smtpSettings.encryption}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, encryption: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
              >
                <option value="tls">TLS</option>
                <option value="ssl">SSL</option>
                <option value="none">None</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.fromEmail')}</label>
              <input
                type="email"
                value={smtpSettings.from_email}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, from_email: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="noreply@oasis.com"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.fromName')}</label>
              <input
                type="text"
                value={smtpSettings.from_name}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, from_name: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="The Oasis"
              />
            </div>
          </div>

          <div className="flex gap-4 mt-6 mb-8">
            <button
              onClick={handleSaveSmtp}
              disabled={saving}
              className="flex-1 py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402b] transition disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
            <button
              onClick={handleTestSmtp}
              disabled={testing}
              className="px-6 py-3 bg-[#D4AF37] text-white rounded-xl font-bold hover:bg-[#c9a030] transition disabled:opacity-50"
            >
              {testing ? t('common.loading') : t('settings.sendTest')}
            </button>
          </div>

          <h4 className="text-lg font-bold text-[#002819] mb-4 pb-2 border-b border-[#F4F4EF]">Email Notification Preferences</h4>
          <p className="text-sm text-[#717973] mb-4">Choose which events trigger email notifications to users</p>

          <div className="space-y-3">
            {[
              { key: 'welcome', label: 'New User Registration', desc: 'Welcome email when users register or accept an invitation' },
              { key: 'invitation', label: 'Invitations', desc: 'Email when invitations are sent and accepted' },
              { key: 'subscription', label: 'Subscription & Payments', desc: 'Payment confirmations, renewals, cancellations, and expiry notices' },
              { key: 'auction_won', label: 'Auction Won', desc: 'Notify winner when they win an auction' },
              { key: 'auction_bid', label: 'Auction Bids', desc: 'Outbid notices and new bid alerts for auction owners' },
              { key: 'auction_payment', label: 'Auction Payments', desc: 'Payment verified/rejected notices for auction winners' },
              { key: 'task_assigned', label: 'Task Assigned', desc: 'Email when a task is assigned to a user' },
              { key: 'medical', label: 'Medical Records', desc: 'Notify animal owners when a medical record is added' },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 p-4 rounded-xl bg-[#F4F4EF] cursor-pointer hover:bg-[#eeeee9] transition-colors">
                <input
                  type="checkbox"
                  checked={emailNotificationPrefs[key]}
                  onChange={(e) => setEmailNotificationPrefs(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="w-5 h-5 rounded-lg border-2 border-[#D4AF37] text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer mt-0.5"
                />
                <div>
                  <span className="font-bold text-[#002819]">{label}</span>
                  <p className="text-sm text-[#717973]">{desc}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={handleSaveEmailPrefs}
              disabled={saving}
              className="w-full py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402b] transition disabled:opacity-50"
            >
              {saving ? t('common.loading') : 'Save Notification Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* Stripe Tab */}
      {activeTab === 'stripe' && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#635BFF] rounded-xl flex items-center justify-center">
              <MaterialSymbol icon="credit_card" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#002819]">{t('settings.stripeSettings')}</h3>
              <p className="text-sm text-[#717973]">{t('settings.stripeDescription')}</p>
            </div>
          </div>

          <label className="flex items-center gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={stripeSettings.enabled}
              onChange={(e) => setStripeSettings({ ...stripeSettings, enabled: e.target.checked })}
              className="w-5 h-5 rounded-lg border-2 border-[#D4AF37] text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"
            />
            <span className="font-bold text-[#002819]">{t('settings.enableStripe')}</span>
          </label>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.publicKey')}</label>
              <input
                type="text"
                value={stripeSettings.public_key}
                onChange={(e) => setStripeSettings({ ...stripeSettings, public_key: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="pk_live_..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.secretKey')}</label>
              <input
                type="password"
                value={stripeSettings.secret_key}
                onChange={(e) => setStripeSettings({ ...stripeSettings, secret_key: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="sk_live_..."
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.webhookSecret')}</label>
              <input
                type="text"
                value={stripeSettings.webhook_secret}
                onChange={(e) => setStripeSettings({ ...stripeSettings, webhook_secret: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="whsec_..."
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSaveStripe}
              disabled={saving}
              className="w-full py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402b] transition disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </div>
      )}

      {/* Gemini Tab */}
      {activeTab === 'gemini' && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[#002819] to-[#06402B] rounded-xl flex items-center justify-center">
              <MaterialSymbol icon="psychology" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#002819]">{t('settings.geminiSettings')}</h3>
              <p className="text-sm text-[#717973]">{t('settings.geminiDescription')}</p>
            </div>
          </div>

          <label className="flex items-center gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={geminiSettings.enabled}
              onChange={(e) => setGeminiSettings({ ...geminiSettings, enabled: e.target.checked })}
              className="w-5 h-5 rounded-lg border-2 border-[#D4AF37] text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"
            />
            <span className="font-bold text-[#002819]">{t('settings.enableGemini')}</span>
          </label>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.geminiApiKey')}</label>
              <input
                type="password"
                value={geminiSettings.api_key}
                onChange={(e) => setGeminiSettings({ ...geminiSettings, api_key: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="AI..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.geminiModel')}</label>
              <select
                value={geminiSettings.model}
                onChange={(e) => setGeminiSettings({ ...geminiSettings, model: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
              >
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-pro">Gemini Pro</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSaveGemini}
              disabled={saving}
              className="w-full py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402b] transition disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Tab */}
      {activeTab === 'whatsapp' && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#25D366] rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.296-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#002819]">{t('settings.whatsappSettings')}</h3>
              <p className="text-sm text-[#717973]">{t('settings.whatsappDescription')}</p>
            </div>
          </div>

          <label className="flex items-center gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={whatsappSettings.enabled}
              onChange={(e) => setWhatsappSettings({ ...whatsappSettings, enabled: e.target.checked })}
              className="w-5 h-5 rounded-lg border-2 border-[#D4AF37] text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"
            />
            <span className="font-bold text-[#002819]">{t('settings.enableWhatsapp')}</span>
          </label>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.whatsappApiUrl')}</label>
              <input
                type="text"
                value={whatsappSettings.api_url}
                onChange={(e) => setWhatsappSettings({ ...whatsappSettings, api_url: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="https://graph.facebook.com/v18.0"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.whatsappApiToken')}</label>
              <input
                type="password"
                value={whatsappSettings.api_token}
                onChange={(e) => setWhatsappSettings({ ...whatsappSettings, api_token: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="EAAxxxx..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.whatsappPhoneId')}</label>
              <input
                type="text"
                value={whatsappSettings.phone_number_id}
                onChange={(e) => setWhatsappSettings({ ...whatsappSettings, phone_number_id: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="Phone Number ID"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.whatsappBusinessId')}</label>
              <input
                type="text"
                value={whatsappSettings.business_account_id}
                onChange={(e) => setWhatsappSettings({ ...whatsappSettings, business_account_id: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="Business Account ID"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSaveWhatsApp}
              disabled={saving}
              className="w-full py-3 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#1da851] transition disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </div>
      )}

      {/* Simulator Tab */}
      {activeTab === 'simulator' && (
        <SimulatorPage embedded />
      )}

      {/* Twilio Tab */}
      {activeTab === 'twilio' && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#F22F46] rounded-xl flex items-center justify-center">
              <MaterialSymbol icon="sms" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#002819]">{t('settings.twilioSettings')}</h3>
              <p className="text-sm text-[#717973]">{t('settings.twilioDescription')}</p>
            </div>
          </div>

          <label className="flex items-center gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={twilioSettings.enabled}
              onChange={(e) => setTwilioSettings({ ...twilioSettings, enabled: e.target.checked })}
              className="w-5 h-5 rounded-lg border-2 border-[#D4AF37] text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"
            />
            <span className="font-bold text-[#002819]">{t('settings.enableTwilio')}</span>
          </label>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.twilioAccountSid')}</label>
              <input
                type="text"
                value={twilioSettings.account_sid}
                onChange={(e) => setTwilioSettings({ ...twilioSettings, account_sid: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="ACxxxxxxxx..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.twilioAuthToken')}</label>
              <input
                type="password"
                value={twilioSettings.auth_token}
                onChange={(e) => setTwilioSettings({ ...twilioSettings, auth_token: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="Auth Token"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">{t('settings.twilioPhoneNumber')}</label>
              <input
                type="text"
                value={twilioSettings.phone_number}
                onChange={(e) => setTwilioSettings({ ...twilioSettings, phone_number: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSaveTwilio}
              disabled={saving}
              className="w-full py-3 bg-[#F22F46] text-white rounded-xl font-bold hover:bg-[#d91d39] transition disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </div>
      )}

      {/* Translation Settings Tab */}
      {activeTab === 'translation' && (
        <div className="bg-white rounded-[2rem] p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-[#002819] rounded-xl flex items-center justify-center">
              <MaterialSymbol icon="translate" size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#002819]">Translation Settings</h3>
              <p className="text-sm text-[#717973]">Configure API keys for on-demand translation (DeepL + Google Translate)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">DeepL API Key</label>
              <input
                type="password"
                value={translationSettings.deepl_api_key}
                onChange={(e) => setTranslationSettings({ ...translationSettings, deepl_api_key: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="DeepL API Key (en/ar/ur)"
              />
              <p className="text-xs text-[#717973] mt-1">Used for English, Arabic, Urdu translations</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#404943] uppercase tracking-wider mb-2">Google Translate API Key</label>
              <input
                type="password"
                value={translationSettings.google_api_key}
                onChange={(e) => setTranslationSettings({ ...translationSettings, google_api_key: e.target.value })}
                className="w-full bg-[#F4F4EF] border-none rounded-xl p-4 text-[#002819] focus:ring-2 focus:ring-[#06402B]/20"
                placeholder="Google Translate API Key (all langs)"
              />
              <p className="text-xs text-[#717973] mt-1">Fallback for Basque (eu) and all other languages</p>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSaveTranslationSettings}
              disabled={saving}
              className="w-full py-3 bg-[#002819] text-white rounded-xl font-bold hover:bg-[#06402b] transition disabled:opacity-50"
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

