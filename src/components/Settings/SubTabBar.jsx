import React from 'react';
import { MaterialSymbol } from 'react-material-symbols';

export default function SubTabBar({ tabs, activeTab, onTabChange }) {
  return (
    <div className="flex gap-2 bg-surface-light p-1 rounded-xl w-fit mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === tab.id ? 'bg-white text-brand-primary shadow-sm' : 'text-on-surface-subtle hover:text-brand-primary'
          }`}
        >
          <MaterialSymbol icon={tab.icon} size={16} />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
