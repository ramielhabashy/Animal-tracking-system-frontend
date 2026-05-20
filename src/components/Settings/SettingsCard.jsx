import React from 'react';
import { MaterialSymbol } from 'react-material-symbols';

export default function SettingsCard({ icon, title, description, children, className = '' }) {
  return (
    <div className={`bg-white rounded-[2rem] p-8 shadow-sm border border-[#eeeee9] ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-brand-primary rounded-xl flex items-center justify-center shadow-sm">
          <MaterialSymbol icon={icon} size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-brand-primary">{title}</h3>
          {description && <p className="text-sm text-on-surface-subtle">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
