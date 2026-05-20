import React from 'react';
import { useState } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../i18n';
import {
  GeneralSettings,
  SpeciesSettings,
  LanguageSettings,
  RoleSettings,
  TaskTypeSettings,
  MedicalTypeSettings,
  EmailSettings,
  StripeSettings,
  AISettings,
  TranslationApiSettings,
  MenuSettings,
  CountrySettings,
  EmbedCodesSettings,
  BannerSettings,
  TransferCommissionSettings,
  AuctionSettings,
  DeviceIntegrationSettings,
} from '../components/Settings';

const tabs = [
  { id: 'general', labelKey: 'settings.general', icon: 'settings' },
  { id: 'species', label: 'Species', icon: 'pets' },
  { id: 'languages', labelKey: 'settings.languages', label: 'Languages', icon: 'language' },
  { id: 'roles', labelKey: 'settings.roles', label: 'Roles', icon: 'admin_panel_settings' },
  { id: 'taskTypes', label: 'Task Types', icon: 'task' },
  { id: 'medicalTypes', label: 'Medical Types', icon: 'vaccines' },
  { id: 'simulator', label: 'Simulator', icon: 'moving' },
  { id: 'translation', label: 'Translation', icon: 'translate' },
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'stripe', labelKey: 'settings.stripe', icon: 'credit_card' },
  { id: 'ai', labelKey: 'settings.ai', icon: 'psychology' },
  { id: 'menu', label: 'Menu', icon: 'menu' },
  { id: 'countries', label: 'Countries', icon: 'globe' },
  { id: 'embedCodes', labelKey: 'settings.embedCodes', label: 'Embed Codes', icon: 'code' },
  { id: 'announcements', labelKey: 'settings.announcements', label: 'Announcements', icon: 'campaign' },
  { id: 'transferCommission', label: 'Transfer Commission', icon: 'swap_horiz' },
  { id: 'auction', label: 'Auction', icon: 'gavel' },
  { id: 'deviceIntegration', label: 'Device Integration', icon: 'settings_ethernet' },
];

const SimulatorPage = React.lazy(() => import('./SimulatorPage'));

export default function SettingsPage() {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';

  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const tabLabel = (tab) => tab.labelKey ? t(tab.labelKey) : tab.label;

  return (
    <div className="space-y-6">
      <div>
        <nav className={`flex text-xs text-[#4f6357] mb-2 uppercase tracking-widest font-bold ${isRtl ? 'flex-row-reverse' : ''}`}>
          <span>{t('common.settings')}</span>
          <span className="mx-2">/</span>
          <span className="text-brand-primary">{t('settings.title')}</span>
        </nav>
        <h2 className="text-3xl font-bold text-brand-primary">{t('settings.title')}</h2>
        <p className="text-on-surface-variant mt-1">{t('settings.subtitle')}</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl transition-all duration-300 flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <MaterialSymbol
            icon={message.type === 'success' ? 'check_circle' : 'error'}
            size={20}
            className={message.type === 'success' ? 'text-emerald-500' : 'text-red-500'}
          />
          <span className="font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto opacity-60 hover:opacity-100">
            <MaterialSymbol icon="close" size={18} />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 bg-surface-light p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setMessage(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-white text-brand-primary shadow-sm'
                : 'text-on-surface-variant hover:text-brand-primary'
            }`}
          >
            <MaterialSymbol icon={tab.icon} size={18} />
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      <div className="transition-all duration-300">
        {activeTab === 'general' && <GeneralSettings dir={dir} />}
        {activeTab === 'species' && <SpeciesSettings dir={dir} />}
        {activeTab === 'languages' && <LanguageSettings dir={dir} />}
        {activeTab === 'roles' && <RoleSettings dir={dir} message={message} setMessage={setMessage} saving={saving} setSaving={setSaving} />}
        {activeTab === 'taskTypes' && <TaskTypeSettings dir={dir} message={message} setMessage={setMessage} />}
        {activeTab === 'medicalTypes' && <MedicalTypeSettings dir={dir} message={message} setMessage={setMessage} />}
        {activeTab === 'email' && <EmailSettings dir={dir} message={message} setMessage={setMessage} saving={saving} setSaving={setSaving} />}
        {activeTab === 'stripe' && <StripeSettings dir={dir} message={message} setMessage={setMessage} saving={saving} setSaving={setSaving} />}
        {activeTab === 'ai' && <AISettings dir={dir} message={message} setMessage={setMessage} saving={saving} setSaving={setSaving} />}
        {activeTab === 'translation' && <TranslationApiSettings dir={dir} message={message} setMessage={setMessage} saving={saving} setSaving={setSaving} />}
        {activeTab === 'menu' && <MenuSettings dir={dir} message={message} setMessage={setMessage} />}
        {activeTab === 'countries' && <CountrySettings dir={dir} message={message} setMessage={setMessage} saving={saving} setSaving={setSaving} />}
        {activeTab === 'embedCodes' && <EmbedCodesSettings dir={dir} />}
        {activeTab === 'announcements' && <BannerSettings dir={dir} message={message} setMessage={setMessage} />}
        {activeTab === 'auction' && <AuctionSettings dir={dir} message={message} setMessage={setMessage} saving={saving} setSaving={setSaving} />}
        {activeTab === 'transferCommission' && <TransferCommissionSettings dir={dir} message={message} setMessage={setMessage} saving={saving} setSaving={setSaving} />}
        {activeTab === 'deviceIntegration' && <DeviceIntegrationSettings dir={dir} message={message} setMessage={setMessage} saving={saving} setSaving={setSaving} />}
        {activeTab === 'simulator' && (
          <React.Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" />
            </div>
          }>
            <SimulatorPage embedded />
          </React.Suspense>
        )}
      </div>
    </div>
  );
}
