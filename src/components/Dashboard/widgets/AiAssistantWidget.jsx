import React, { useState } from 'react';
import DashboardWidget from '../DashboardWidget';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../../../i18n';

export default function AiAssistantWidget({ widget }) {
  const { t } = useI18n();
  const [input, setInput] = useState('');

  const openAssistant = (prompt) => {
    window.dispatchEvent(new CustomEvent('toggle-ai-assistant'));
    if (prompt) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ai-send-message', { detail: { message: prompt } }));
      }, 500);
    }
  };

  const quickPrompts = [
    { icon: 'pets', label: t('ai.healthCheck', 'Health check'), prompt: t('ai.healthCheckPrompt', 'Which animals need health attention?') },
    { icon: 'task', label: t('ai.myTasks', 'My tasks'), prompt: t('ai.myTasksPrompt', 'Show my pending tasks') },
    { icon: 'warning', label: t('ai.alerts', 'Alerts'), prompt: t('ai.alertsPrompt', 'Show active alerts') },
    { icon: 'assessment', label: t('ai.summary', 'Summary'), prompt: t('ai.summaryPrompt', 'Give me a quick summary of my farm') },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      openAssistant(input.trim());
      setInput('');
    }
  };

  return (
    <DashboardWidget widget={widget}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-secondary rounded-lg flex items-center justify-center">
              <MaterialSymbol icon="smart_toy" size={18} className="text-brand-accent" weight="fill" />
            </div>
            <h3 className="text-sm font-semibold text-brand-primary">{t('ai.title', 'AI Assistant')}</h3>
          </div>
          <button
            onClick={() => openAssistant()}
            className="text-xs text-brand-accent hover:underline"
          >
            {t('common.open', 'Open')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => openAssistant(p.prompt)}
              className="flex items-center gap-2 px-3 py-2 bg-surface-dim rounded-xl text-xs text-brand-primary hover:bg-surface-dim transition-all"
            >
              <span className="material-symbols-rounded text-sm">{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('ai.typeMessage', 'Ask AI...')}
            className="flex-1 px-3 py-2 bg-surface-dim text-on-surface border-none rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#002819]/20"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-8 h-8 bg-brand-primary text-white rounded-lg flex items-center justify-center disabled:opacity-50"
          >
            <MaterialSymbol icon="send" size={16} />
          </button>
        </form>
      </div>
    </DashboardWidget>
  );
}
