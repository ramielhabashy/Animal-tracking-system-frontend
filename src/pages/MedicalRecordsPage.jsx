import React from 'react';
import { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import TranslateButton from '../components/TranslateButton';

export default function MedicalRecordsPage() {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const { user } = useAuth();
  const role = user?.role;
  const canAdd = ['Admin', 'Owner', 'Manager', 'Doctor'].includes(role);
  const canEdit = ['Admin', 'Owner', 'Manager', 'Doctor'].includes(role);

  const [records, setRecords] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [showVetDropdown, setShowVetDropdown] = useState(false);
  const [stats, setStats] = useState({});
  const [recordTypes, setRecordTypes] = useState([]);
  const [vaccinationTypes, setVaccinationTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('records');
  const [search, setSearch] = useState('');
  const [newAttachments, setNewAttachments] = useState([]);
  const [deleteAttachmentIds, setDeleteAttachmentIds] = useState([]);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all',
    animal_id: 'all',
    date_range: '30',
  });
  const [formData, setFormData] = useState({
    animal_id: '',
    record_type: 'checkup',
    title: '',
    description: '',
    record_date: new Date().toISOString().split('T')[0],
    veterinarian: '',
    medication: '',
    dosage: '',
    status: 'completed',
    health_status: '',
    notes: '',
    next_follow_up: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [filters, search]);

  const fetchData = async () => {
    try {
      const [animalsRes, vaccRes, doctorsRes, typesRes, vaccTypesRes] = await Promise.all([
        apiFetch('/api/animals?per_page=100'),
        apiFetch('/api/vaccination-schedules?per_page=100'),
        apiFetch('/api/users/doctors/list'),
        apiFetch('/api/medical-record-types'),
        apiFetch('/api/vaccination-types'),
      ]);

      if (animalsRes.ok) {
        const data = await animalsRes.json();
        setAnimals(data.data || []);
      }

      if (vaccRes.ok) {
        const data = await vaccRes.json();
        setVaccinations(data.data || []);
      }

      if (doctorsRes.ok) {
        const data = await doctorsRes.json();
        setDoctors(data.data || []);
      }

      if (typesRes.ok) {
        const data = await typesRes.json();
        setRecordTypes(data.data || []);
      }

      if (vaccTypesRes.ok) {
        const data = await vaccTypesRes.json();
        setVaccinationTypes(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      let params = '';
      if (search) params += `search=${encodeURIComponent(search)}&`;
      if (filters.type !== 'all') params += `type=${filters.type}&`;
      if (filters.status !== 'all') params += `status=${filters.status}&`;
      if (filters.animal_id !== 'all') params += `animal_id=${filters.animal_id}&`;
      if (filters.date_range !== 'all') {
        const days = parseInt(filters.date_range);
        const dateTo = new Date();
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);
        params += `date_from=${dateFrom.toISOString().split('T')[0]}&`;
        params += `date_to=${dateTo.toISOString().split('T')[0]}&`;
      }

      const [recordsRes, statsRes] = await Promise.all([
        apiFetch(`/api/medical-records?${params}`),
        apiFetch(`/api/medical-records/stats?${params}`),
      ]);

      if (recordsRes.ok) {
        const data = await recordsRes.json();
        setRecords(data.data || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.data || {});
      }
    } catch (error) {
      console.error('Failed to fetch records:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    const isEditingRecord = editingRecord && editingRecord.record_type !== undefined;
    const url = isEditingRecord ? `/api/medical-records/${editingRecord.id}` : '/api/medical-records';

    const hasFiles = newAttachments.length > 0 || deleteAttachmentIds.length > 0;
    let payload, isFormData;

    if (hasFiles) {
      isFormData = true;
      const fd = new FormData();
      fd.append('animal_id', formData.animal_id);
      fd.append('record_type', formData.record_type);
      fd.append('title', formData.title);
      fd.append('description', formData.description || '');
      fd.append('record_date', formData.record_date);
      fd.append('veterinarian', formData.veterinarian || '');
      fd.append('medication', formData.medication || '');
      fd.append('dosage', formData.dosage || '');
      fd.append('status', formData.status);
      fd.append('health_status', formData.health_status || '');
      fd.append('notes', formData.notes || '');
      fd.append('next_follow_up', formData.next_follow_up || '');
      newAttachments.forEach((file) => fd.append('attachments[]', file));
      deleteAttachmentIds.forEach((id) => fd.append('delete_attachment_ids[]', id));
      if (isEditingRecord) fd.append('_method', 'PUT');
      payload = fd;
    } else {
      isFormData = false;
      payload = formData;
    }

    try {
      const options = { method: isFormData ? 'POST' : (editingRecord ? 'PUT' : 'POST') };
      if (isFormData) {
        options.body = payload;
      } else {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(payload);
      }
      const res = await apiFetch(url, options);

      if (res.ok) {
        setMessage({ type: 'success', text: editingRecord ? 'Record updated!' : 'Record created!' });
        setShowModal(false);
        setEditingRecord(null);
        resetForm();
        setNewAttachments([]);
        setDeleteAttachmentIds([]);
        fetchData();
        fetchRecords();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || 'Failed to save record' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error' });
    }
  };

  const resetForm = () => {
    setFormData({
      animal_id: '',
      record_type: 'checkup',
      title: '',
      description: '',
      record_date: new Date().toISOString().split('T')[0],
      veterinarian: '',
      medication: '',
      dosage: '',
      status: 'completed',
      health_status: '',
      notes: '',
      next_follow_up: '',
    });
    setNewAttachments([]);
    setDeleteAttachmentIds([]);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setFormData({
      animal_id: record.animal_id,
      record_type: record.record_type || 'checkup',
      title: record.title || '',
      description: record.description || '',
      record_date: record.record_date || new Date().toISOString().split('T')[0],
      veterinarian: record.veterinarian || '',
      medication: record.medication || '',
      dosage: record.dosage || '',
      status: record.status,
      health_status: record.health_status || '',
      notes: record.notes || '',
      next_follow_up: record.next_follow_up || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const res = await apiFetch(`/api/medical-records/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Record deleted!' });
        fetchData();
        fetchRecords();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete' });
    }
  };

  const getTypeIcon = (type) => {
    const found = recordTypes.find(rt => rt.slug === type);
    if (found?.icon) return found.icon;
    switch (type) {
      case 'vaccination': return 'vaccines';
      case 'checkup': return 'medical_services';
      case 'surgery': return 'local_hospital';
      case 'treatment': return 'healing';
      case 'emergency': return 'emergency';
      default: return 'medical_services';
    }
  };

  const getTypeColor = (type) => {
    const found = recordTypes.find(rt => rt.slug === type);
    if (found) return 'bg-gray-100 text-gray-700';
    switch (type) {
      case 'vaccination': return 'bg-emerald-100 text-emerald-700';
      case 'checkup': return 'bg-blue-100 text-blue-700';
      case 'surgery': return 'bg-purple-100 text-purple-700';
      case 'treatment': return 'bg-amber-100 text-amber-700';
      case 'emergency': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'scheduled': return 'bg-amber-100 text-amber-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const scheduledRecords = records.filter(r => r.status === 'scheduled');
  const combinedScheduled = [
    ...vaccinations,
    ...scheduledRecords.map(r => ({ ...r, _isMedicalRecord: true }))
  ].sort((a, b) => new Date(a.scheduled_date || a.record_date) - new Date(b.scheduled_date || b.record_date));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <nav className={`flex text-xs text-[#4f6357] mb-2 uppercase tracking-widest font-bold ${isRtl ? 'flex-row-reverse' : ''}`}>
            <span>{t('nav.veterinary')}</span>
            <span className="mx-2">/</span>
            <span className="text-brand-primary">{t('nav.medicalRecords')}</span>
          </nav>
          <h2 className="text-4xl font-bold text-brand-primary">{t('medicalRecords.title')}</h2>
          <p className="text-on-surface-variant mt-1">{t('medicalRecords.subtitle') || 'Track and manage herd medical history'}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-surface-dim p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('records')}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                activeTab === 'records' 
                  ? 'bg-white text-brand-primary font-bold shadow-sm' 
                  : 'text-on-surface-variant hover:bg-surface-dim'
              }`}
            >
              {t('medicalRecords.title')}
            </button>
            <button
              onClick={() => setActiveTab('vaccinations')}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                activeTab === 'vaccinations' 
                  ? 'bg-white text-brand-primary font-bold shadow-sm' 
                  : 'text-on-surface-variant hover:bg-surface-dim'
              }`}
            >
              {t('vaccination.title')}
            </button>
          </div>
          {canAdd && (
            <button
              onClick={() => { resetForm(); setEditingRecord(null); setShowModal(true); }}
              className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-brand-secondary transition shadow-lg"
            >
              <MaterialSymbol icon="add" size={20} />
              {t('medicalRecords.addRecord')}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      {activeTab === 'records' ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-on-surface-subtle uppercase tracking-wider font-bold">{t('medicalRecords.total') || 'Total Records'}</p>
            <p className="text-2xl font-black text-brand-primary">{stats.total || 0}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <p className="text-xs text-emerald-600 uppercase tracking-wider font-bold">{t('medicalRecords.vaccination')}</p>
            <p className="text-2xl font-black text-emerald-700">{stats.vaccinations || 0}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-xs text-blue-600 uppercase tracking-wider font-bold">{t('medicalRecords.checkup')}</p>
            <p className="text-2xl font-black text-blue-700">{stats.checkups || 0}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-xs text-amber-600 uppercase tracking-wider font-bold">{t('medicalRecords.scheduled')}</p>
            <p className="text-2xl font-black text-amber-700">{stats.scheduled || 0}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <p className="text-xs text-purple-600 uppercase tracking-wider font-bold">{t('medicalRecords.inProgress')}</p>
            <p className="text-2xl font-black text-purple-700">{stats.in_progress || 0}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-on-surface-subtle uppercase tracking-wider font-bold">{t('vaccination.total')}</p>
              <p className="text-2xl font-black text-brand-primary">{vaccinations.length + scheduledRecords.length}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <p className="text-xs text-emerald-600 uppercase tracking-wider font-bold">{t('vaccination.administered')}</p>
              <p className="text-2xl font-black text-emerald-700">{vaccinations.filter(v => v.status === 'administered').length}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-xs text-amber-600 uppercase tracking-wider font-bold">{t('vaccination.scheduled')}</p>
              <p className="text-2xl font-black text-amber-700">{vaccinations.filter(v => v.status === 'scheduled').length}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-xs text-blue-600 uppercase tracking-wider font-bold">{t('medicalRecords.upcoming')}</p>
              <p className="text-2xl font-black text-blue-700">{scheduledRecords.length}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <p className="text-xs text-red-600 uppercase tracking-wider font-bold">{t('vaccination.overdue')}</p>
              <p className="text-2xl font-black text-red-700">{vaccinations.filter(v => v.status === 'overdue' || (v.status === 'scheduled' && new Date(v.scheduled_date) < new Date())).length}</p>
            </div>
          </div>
          <div className="bg-surface-light rounded-xl p-4 flex items-center justify-between">
            <p className="text-sm text-on-surface-variant">{t('vaccination.manageInFullPage')}</p>
            <Link
              to="/vaccination-schedule"
              className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-bold hover:bg-brand-secondary transition-colors flex items-center gap-2"
            >
              <MaterialSymbol icon="open_in_new" size={16} />
              {t('vaccination.manageLink')}
            </Link>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-surface-high">
        <div className={`flex flex-wrap items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-2 px-4 py-2 bg-surface-light rounded-lg ${isRtl ? 'flex-row-reverse' : ''} flex-1 min-w-[200px]`}>
            <MaterialSymbol icon="search" size={18} className="text-brand-primary/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search') || 'Search records...'}
              className="bg-transparent border-none text-brand-primary font-semibold text-sm focus:ring-0 w-full"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-brand-primary/60 hover:text-brand-primary">
                <MaterialSymbol icon="close" size={16} />
              </button>
            )}
          </div>

          <div className={`flex items-center gap-2 px-4 py-2 bg-surface-light rounded-lg ${isRtl ? 'flex-row-reverse' : ''}`}>
            <MaterialSymbol icon="calendar_month" size={18} className="text-brand-primary/60" />
            <select
              value={filters.date_range}
              onChange={(e) => setFilters({ ...filters, date_range: e.target.value })}
              className="bg-transparent border-none text-brand-primary font-semibold text-sm focus:ring-0"
            >
              <option value="30">{t('common.last30Days') || 'Last 30 Days'}</option>
              <option value="90">{t('common.last3Months') || 'Last 3 Months'}</option>
              <option value="180">{t('common.last6Months') || 'Last 6 Months'}</option>
              <option value="365">{t('common.thisYear') || 'This Year'}</option>
            </select>
          </div>

          <div className={`flex items-center gap-2 px-4 py-2 bg-surface-light rounded-lg ${isRtl ? 'flex-row-reverse' : ''}`}>
            <MaterialSymbol icon="medical_information" size={18} className="text-brand-primary/60" />
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="bg-transparent border-none text-brand-primary font-semibold text-sm focus:ring-0"
            >
              <option value="all">{t('common.allTypes') || 'All Types'}</option>
              {recordTypes.filter(rt => rt.is_active !== false).map(rt => (
                <option key={rt.slug} value={rt.slug}>{rt.name}</option>
              ))}
            </select>
          </div>

          <div className={`flex items-center gap-2 px-4 py-2 bg-surface-light rounded-lg ${isRtl ? 'flex-row-reverse' : ''}`}>
            <MaterialSymbol icon="checklist" size={18} className="text-brand-primary/60" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="bg-transparent border-none text-brand-primary font-semibold text-sm focus:ring-0"
            >
              <option value="all">{t('common.allStatuses')}</option>
              <option value="completed">{t('medicalRecords.completed')}</option>
              <option value="scheduled">{t('medicalRecords.scheduled')}</option>
              <option value="in_progress">{t('medicalRecords.inProgress')}</option>
              <option value="cancelled">{t('medicalRecords.cancelled')}</option>
            </select>
          </div>

          <div className={`flex items-center gap-2 px-4 py-2 bg-surface-light rounded-lg ${isRtl ? 'flex-row-reverse' : ''}`}>
            <MaterialSymbol icon="pets" size={18} className="text-brand-primary/60" />
            <select
              value={filters.animal_id}
              onChange={(e) => setFilters({ ...filters, animal_id: e.target.value })}
              className="bg-transparent border-none text-brand-primary font-semibold text-sm focus:ring-0"
            >
              <option value="all">{t('vaccination.allAnimals')}</option>
              {animals.map((animal) => (
                <option key={animal.id} value={animal.id}>
                  {animal.name || animal.animal_id}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => { setFilters({ type: 'all', status: 'all', animal_id: 'all', date_range: '30' }); setSearch(''); }}
            className={`ml-auto text-brand-primary/60 font-semibold hover:text-brand-primary transition-colors flex items-center gap-1 ${isRtl ? 'flex-row-reverse' : ''}`}
          >
            <MaterialSymbol icon="filter_list_off" size={18} />
            {t('common.clearFilters') || 'Clear Filters'}
          </button>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-surface-high flex justify-between items-center">
          <h3 className="text-xl font-bold text-brand-primary">{activeTab === 'records' ? t('medicalRecords.recentRecords') : t('vaccination.upcomingAll')}</h3>
        </div>

        {activeTab === 'records' ? (
        <div className="overflow-x-auto">
          <table className={`w-full ${isRtl ? 'text-right' : 'text-left'}`}>
            <thead>
              <tr className="bg-surface-light">
                <th className="px-6 py-4 text-[#4f6357] font-bold text-sm">{t('common.date')}</th>
                <th className="px-6 py-4 text-[#4f6357] font-bold text-sm">ID</th>
                <th className="px-6 py-4 text-[#4f6357] font-bold text-sm">{t('nav.animals')}</th>
                <th className="px-6 py-4 text-[#4f6357] font-bold text-sm">{t('common.type')}</th>
                <th className="px-6 py-4 text-[#4f6357] font-bold text-sm">{t('medicalRecords.title') || 'Title'}</th>
                <th className="px-6 py-4 text-[#4f6357] font-bold text-sm">{t('medicalRecords.veterinarian')}</th>
                <th className="px-6 py-4 text-[#4f6357] font-bold text-sm text-center">{t('common.attachments') || 'Files'}</th>
                <th className="px-6 py-4 text-[#4f6357] font-bold text-sm">{t('common.status')}</th>
                <th className="px-6 py-4 text-[#4f6357] font-bold text-sm text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E3DE]">
              {records.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-on-surface-subtle">
                    <MaterialSymbol icon="medical_services" size={48} className="mx-auto mb-2 opacity-50" />
                    <p>{t('medicalRecords.noRecords')}</p>
                    {canAdd && (
                      <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="mt-4 text-brand-primary font-bold hover:underline"
                      >
                        {t('medicalRecords.addFirst')}
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-surface-light/50 transition-colors">
                    <td className="px-6 py-5 font-medium text-brand-primary">
                      {new Date(record.record_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5 font-mono text-xs font-bold text-brand-primary">
                      {record.record_id || `#${record.id}`}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#CFE5D6] flex items-center justify-center text-brand-primary font-black text-xs">
                          {record.animal?.name?.charAt(0) || 'A'}
                        </div>
                        <span className="font-semibold">{record.animal?.name || record.animal?.animal_id || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold capitalize ${getTypeColor(record.record_type)}`}>
                        <MaterialSymbol icon={getTypeIcon(record.record_type)} size={14} />
                        {record.record_type}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-on-surface-variant">{record.title} <TranslateButton text={record.title} /></td>
                    <td className="px-6 py-5 text-on-surface-variant">{record.veterinarian || '-'}</td>
                    <td className="px-6 py-5 text-center">
                      {record.attachments && record.attachments.length > 0 ? (
                        <a
                          href={record.attachments[0].file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand-primary hover:text-brand-secondary transition-colors"
                          title={record.attachments.map(a => a.original_name).join(', ')}
                        >
                          <MaterialSymbol icon="attach_file" size={18} />
                          <span className="text-xs font-bold">{record.attachments.length}</span>
                        </a>
                      ) : (
                        <span className="text-on-surface-subtle/40">-</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${getStatusColor(record.status)}`}>
                        {record.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(record)}
                            className="p-2 hover:bg-surface-high rounded-lg transition-colors"
                          >
                            <MaterialSymbol icon="edit" size={18} className="text-brand-primary" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <MaterialSymbol icon="delete" size={18} className="text-red-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        ) : (
        <div className="overflow-x-auto">
          <table className={`w-full ${isRtl ? 'text-right' : 'text-left'}`}>
            <thead>
              <tr className="bg-surface-light">
                <th className="px-6 py-4 text-[#4f6357] font-bold text-sm">{t('common.date')}</th>
                <th className="px-6 py-4 text-[#4f6357] font-bold text-sm">{t('nav.animals')}</th>
                <th className="px-6 py-4 text-[#4f6357] font-bold text-sm">{t('common.type')}</th>
                <th className="px-6 py-4 text-[#4f6357] font-bold text-sm">{t('medicalRecords.veterinarian')}</th>
                <th className="px-6 py-4 text-[#4f6357] font-bold text-sm">{t('common.status')}</th>
                <th className="px-6 py-4 text-[#4f6357] font-bold text-sm text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E3DE]">
              {combinedScheduled.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-on-surface-subtle">
                    <MaterialSymbol icon="vaccines" size={48} className="mx-auto mb-2 opacity-50" />
                    <p>{t('vaccination.noRecords')}</p>
                    <button
                      onClick={() => { resetForm(); setShowModal(true); }}
                      className="mt-4 text-brand-primary font-bold hover:underline"
                    >
                      {t('vaccination.addFirst')}
                    </button>
                  </td>
                </tr>
              ) : (
                combinedScheduled.map((item) => {
                  const isVacc = !item._isMedicalRecord;
                  const date = item.scheduled_date || item.record_date;
                  const vet = item.veterinarian || '-';
                  const animalName = item.animal?.name || item.animal?.animal_id || 'Unknown';
                  const isOverdue = item.status === 'overdue' || (item.status === 'scheduled' && new Date(date) < new Date());
                  return (
                  <tr key={item.id} className="hover:bg-surface-light/50 transition-colors">
                    <td className="px-6 py-5 font-medium text-brand-primary">
                      {new Date(date).toLocaleDateString()}
                      <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${isVacc ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {isVacc ? 'Vaccination' : t('medicalRecords.title')}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#CFE5D6] flex items-center justify-center text-brand-primary font-black text-xs">
                          {animalName.charAt(0)}
                        </div>
                        <span className="font-semibold">{animalName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {isVacc ? (
                        <div>
                          <p className="font-medium text-brand-primary">{item.vaccine_name} <TranslateButton text={item.vaccine_name} /></p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${item.vaccination_type === 'routine' ? 'bg-blue-100 text-blue-700' : item.vaccination_type === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
                            {item.vaccination_type}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-brand-primary">{item.title || item.description || '-'} <TranslateButton text={item.title || item.description} /></p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${item.record_type === 'checkup' ? 'bg-blue-100 text-blue-700' : item.record_type === 'surgery' ? 'bg-purple-100 text-purple-700' : item.record_type === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                            {item.record_type || 'appointment'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-on-surface-variant">{vet}</td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                        isVacc && item.status === 'administered' ? 'bg-emerald-100 text-emerald-700' :
                        item.status === 'cancelled' ? 'bg-gray-100 text-gray-600' :
                        isVacc && isOverdue ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status === 'administered' ? t('vaccination.statusAdministered') :
                         item.status === 'cancelled' ? t('vaccination.statusCancelled') :
                         isVacc && isOverdue ? t('vaccination.statusOverdue') :
                         t('medicalRecords.scheduled') || 'Scheduled'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit && !isVacc && (
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-2 hover:bg-surface-high rounded-lg transition-colors"
                          >
                            <MaterialSymbol icon="edit" size={18} className="text-brand-primary" />
                          </button>
                        )}
                        {canEdit && !isVacc && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <MaterialSymbol icon="delete" size={18} className="text-red-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-brand-primary">
                {editingRecord ? t('medicalRecords.editRecord') : t('medicalRecords.addRecord')}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <MaterialSymbol icon="close" size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('nav.animals')} *</label>
                <select
                  value={formData.animal_id}
                  onChange={(e) => setFormData({ ...formData, animal_id: e.target.value })}
                  className="w-full bg-surface-light rounded-xl p-3 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                  required
                >
                  <option value="">{t('vaccination.selectAnimal') || 'Select Animal'}</option>
                  {animals.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.name || animal.animal_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {activeTab === 'vaccinations' ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('vaccination.vaccine')} *</label>
                      <input
                        type="text"
                        value={formData.vaccine_name}
                        onChange={(e) => setFormData({ ...formData, vaccine_name: e.target.value, title: e.target.value })}
                        className="w-full bg-surface-light rounded-xl p-3 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                        placeholder="e.g., FMD Vaccine"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('vaccination.vaccinationType')}</label>
                        <select
                          value={formData.vaccination_type}
                          onChange={(e) => setFormData({ ...formData, vaccination_type: e.target.value })}
                          className="w-full bg-surface-light rounded-xl p-3 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                        >
                          {vaccinationTypes.map((vt) => (
                            <option key={vt.slug} value={vt.slug}>{vt.name}</option>
                          ))}
                        </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('medicalRecords.recordType')} *</label>
                      <select
                        value={formData.record_type}
                        onChange={(e) => setFormData({ ...formData, record_type: e.target.value })}
                        className="w-full bg-surface-light rounded-xl p-3 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                      >
                        {recordTypes.filter(rt => rt.is_active !== false).map(rt => (
                          <option key={rt.slug} value={rt.slug}>{rt.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('common.status')}</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full bg-surface-light rounded-xl p-3 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                      >
                        <option value="completed">{t('medicalRecords.completed')}</option>
                        <option value="scheduled">{t('medicalRecords.scheduled')}</option>
                        <option value="in_progress">{t('medicalRecords.inProgress')}</option>
                        <option value="cancelled">{t('medicalRecords.cancelled')}</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {activeTab !== 'vaccinations' && (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('medicalRecords.title')} *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-surface-light rounded-xl p-3 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                    placeholder={t('medicalRecords.titlePlaceholder') || 'Enter title'}
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('common.date')} *</label>
                <input
                  type="date"
                  value={formData.record_date}
                  onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
                  className="w-full bg-surface-light rounded-xl p-3 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('medicalRecords.veterinarian')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.veterinarian}
                      onChange={(e) => {
                        setFormData({ ...formData, veterinarian: e.target.value });
                        setShowVetDropdown(true);
                      }}
                      onFocus={() => setShowVetDropdown(true)}
                      onBlur={() => setTimeout(() => setShowVetDropdown(false), 200)}
                      className="w-full bg-surface-light rounded-xl p-3 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                      placeholder="Dr. Name"
                    />
                    {doctors.length > 0 && showVetDropdown && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-white rounded-xl shadow-xl border border-stone-100 max-h-48 overflow-y-auto">
                        <div className="p-2 border-b border-stone-50">
                          <span className="text-[10px] font-bold text-on-surface-subtle uppercase tracking-wider px-2">Internal Doctors</span>
                        </div>
                        {doctors
                          .filter(d => {
                            const selectedAnimal = animals.find(a => a.id === parseInt(formData.animal_id));
                            if (selectedAnimal?.owner_id && d.managed_by && d.managed_by !== selectedAnimal.owner_id) return false;
                            if (formData.veterinarian && !d.name.toLowerCase().includes(formData.veterinarian.toLowerCase())) return false;
                            return true;
                          })
                          .map(d => (
                            <button
                              key={d.id}
                              type="button"
                              onMouseDown={() => {
                                setFormData({ ...formData, veterinarian: d.name });
                                setShowVetDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-brand-primary hover:bg-surface-light transition-colors flex items-center gap-2"
                            >
                              <span className="w-6 h-6 rounded-full bg-brand-secondary/10 flex items-center justify-center text-[10px] font-bold text-brand-secondary">
                                {d.name.charAt(0)}
                              </span>
                              {d.name}
                            </button>
                          ))}
                        {formData.veterinarian && !doctors.filter(d => {
                          const selectedAnimal = animals.find(a => a.id === parseInt(formData.animal_id));
                          if (selectedAnimal?.owner_id && d.managed_by && d.managed_by !== selectedAnimal.owner_id) return false;
                          return true;
                        }).some(d => d.name.toLowerCase() === formData.veterinarian.toLowerCase()) && (
                          <div className="px-4 py-2 border-t border-stone-50">
                            <span className="text-[10px] font-bold text-brand-accent uppercase tracking-wider">External</span>
                            <p className="text-xs text-on-surface-subtle mt-0.5">Using external veterinarian: <strong>{formData.veterinarian}</strong></p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('medicalRecords.medication')}</label>
                  <input
                    type="text"
                    value={formData.medication}
                    onChange={(e) => setFormData({ ...formData, medication: e.target.value })}
                    className="w-full bg-surface-light rounded-xl p-3 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                    placeholder="Medication name"
                  />
                </div>
              </div>

              {activeTab !== 'vaccinations' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('medicalRecords.healthStatus')}</label>
                    <select
                      value={formData.health_status}
                      onChange={(e) => setFormData({ ...formData, health_status: e.target.value })}
                      className="w-full bg-surface-light rounded-xl p-3 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                    >
                      <option value="">{t('common.none') || '-'}</option>
                      <option value="stable">{t('medicalRecords.stable')}</option>
                      <option value="recovering">{t('medicalRecords.recovering')}</option>
                      <option value="critical">{t('medicalRecords.critical')}</option>
                      <option value="deceased">{t('medicalRecords.deceased')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('medicalRecords.dosage')}</label>
                    <input
                      type="text"
                      value={formData.dosage}
                      onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                      className="w-full bg-surface-light rounded-xl p-3 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                      placeholder="e.g., 10ml"
                    />
                  </div>
                </div>
              )}

              {/* File Upload */}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('common.attachments') || 'Attachments'}</label>

                {/* Existing attachments in edit mode */}
                {editingRecord && editingRecord.attachments && editingRecord.attachments.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {editingRecord.attachments
                      .filter(a => !deleteAttachmentIds.includes(a.id))
                      .map((att) => (
                        <div key={att.id} className="flex items-center justify-between bg-surface-light rounded-lg px-3 py-2">
                          <a
                            href={att.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-brand-primary font-medium hover:underline"
                          >
                            <MaterialSymbol icon={att.mime_type?.startsWith('image/') ? 'image' : 'description'} size={18} />
                            {att.original_name}
                          </a>
                          <button
                            type="button"
                            onClick={() => setDeleteAttachmentIds([...deleteAttachmentIds, att.id])}
                            className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <MaterialSymbol icon="close" size={16} className="text-red-600" />
                          </button>
                        </div>
                      ))}
                    {deleteAttachmentIds.length > 0 && editingRecord.attachments.filter(a => deleteAttachmentIds.includes(a.id)).length > 0 && (
                      <div className="text-xs text-red-600 font-medium">
                        {deleteAttachmentIds.length} file(s) marked for deletion
                      </div>
                    )}
                  </div>
                )}

                {/* New file upload */}
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-2 px-4 py-3 bg-surface-light rounded-xl cursor-pointer hover:bg-surface-high transition-colors border-2 border-dashed border-surface-high text-on-surface-variant text-sm font-medium">
                    <MaterialSymbol icon="upload_file" size={20} />
                    {t('common.upload') || 'Upload files'}
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        setNewAttachments([...newAttachments, ...files]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                {/* Preview new files */}
                {newAttachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {newAttachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-surface-light rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 text-sm text-brand-primary">
                          <MaterialSymbol icon={file.type?.startsWith('image/') ? 'image' : 'description'} size={18} />
                          <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                          <span className="text-on-surface-subtle text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewAttachments(newAttachments.filter((_, i) => i !== idx))}
                          className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <MaterialSymbol icon="close" size={16} className="text-red-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('medicalRecords.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-surface-light rounded-xl p-3 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20 h-20 resize-none"
                  placeholder="Medical notes..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('medicalRecords.nextFollowUp')}</label>
                <input
                  type="date"
                  value={formData.next_follow_up}
                  onChange={(e) => setFormData({ ...formData, next_follow_up: e.target.value })}
                  className="w-full bg-surface-light rounded-xl p-3 text-brand-primary focus:ring-2 focus:ring-brand-secondary/20"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-surface-light text-brand-primary rounded-xl font-bold hover:bg-surface-high transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition shadow-lg"
                >
                  {editingRecord ? t('medicalRecords.editRecord') : t('medicalRecords.addRecord')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

