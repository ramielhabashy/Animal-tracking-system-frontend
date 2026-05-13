import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import DashboardWidget from './DashboardWidget';
import { getWidgetsForRole, getAvailableForRole, reorderWidgets, toggleWidget, resetLayout } from './dashboardConfig';
import StatsCardsWidget from './widgets/StatsCardsWidget';
import MapWidget from './widgets/MapWidget';
import AlertsPanelWidget from './widgets/AlertsPanelWidget';
import QuickActionsWidget from './widgets/QuickActionsWidget';
import SubscriptionOverviewWidget from './widgets/SubscriptionOverviewWidget';
import TierDistributionWidget from './widgets/TierDistributionWidget';
import OwnerOverviewWidget from './widgets/OwnerOverviewWidget';
import ChartsWidget from './widgets/ChartsWidget';
import MedicalOverviewWidget from './widgets/MedicalOverviewWidget';
import TasksWidget from './widgets/TasksWidget';

const widgetComponents = {
  statsCards: StatsCardsWidget,
  map: MapWidget,
  alertsPanel: AlertsPanelWidget,
  quickActions: QuickActionsWidget,
  subscriptionOverview: SubscriptionOverviewWidget,
  tierDistribution: TierDistributionWidget,
  ownerOverview: OwnerOverviewWidget,
  chartsWidget: ChartsWidget,
  medicalOverview: MedicalOverviewWidget,
  tasksWidget: TasksWidget,
};

function getGridColsClass(gridDesktop) {
  if (gridDesktop === 12) return 'lg:col-span-12';
  if (gridDesktop === 8) return 'lg:col-span-8';
  if (gridDesktop === 6) return 'lg:col-span-6';
  if (gridDesktop === 4) return 'lg:col-span-4';
  if (gridDesktop === 3) return 'lg:col-span-3';
  return 'lg:col-span-12';
}

function getTabletColsClass(gridTablet) {
  if (gridTablet === 12) return 'md:col-span-12';
  if (gridTablet === 8) return 'md:col-span-8';
  if (gridTablet === 6) return 'md:col-span-6';
  if (gridTablet === 4) return 'md:col-span-4';
  if (gridTablet === 3) return 'md:col-span-3';
  return 'md:col-span-12';
}

export default function DashboardGrid({ dashboardData }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const role = user?.role || 'Owner';

  const [widgets, setWidgets] = useState(() => getWidgetsForRole(role, t));
  const [showCustomize, setShowCustomize] = useState(false);
  const customizeRef = useRef(null);

  const availableWidgets = getAvailableForRole(role, t);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customizeRef.current && !customizeRef.current.contains(e.target)) {
        setShowCustomize(false);
      }
    };
    if (showCustomize) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCustomize]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWidgets((prev) => {
      const oldIndex = prev.findIndex((w) => w.id === active.id);
      const newIndex = prev.findIndex((w) => w.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const reordered = arrayMove(prev, oldIndex, newIndex);
      reorderWidgets(role, reordered.map((w) => w.id));
      return reordered;
    });
  }, [role]);

  const handleToggleWidget = useCallback((widgetId, show) => {
    toggleWidget(role, widgetId, show);
    setWidgets(getWidgetsForRole(role, t));
  }, [role, t]);

  const handleReset = useCallback(() => {
    resetLayout(role);
    setWidgets(getWidgetsForRole(role, t));
  }, [role, t]);

  if (!widgets || widgets.length === 0) return null;

  const activeIds = widgets.map(w => w.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-[#002819]">{t('dashboard.title')}</h2>
        <div className="flex items-center gap-2">
          <div className="relative" ref={customizeRef}>
            <button
              onClick={() => setShowCustomize(v => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#717973] hover:text-[#002819] hover:bg-[#F4F4EF] transition-all"
              title="Customize"
            >
              <MaterialSymbol icon="tune" size={16} />
              Customize
            </button>

            {showCustomize && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 min-w-[220px]">
                <h4 className="text-sm font-bold text-[#002819] mb-3">Show Widgets</h4>
                <div className="space-y-2">
                  {availableWidgets.map(aw => {
                    const isActive = activeIds.includes(aw.id);
                    return (
                      <label
                        key={aw.id}
                        className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[#F4F4EF] cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => handleToggleWidget(aw.id, e.target.checked)}
                          className="w-4 h-4 text-[#002819] border-gray-300 rounded focus:ring-[#002819]"
                        />
                        <span className="text-sm font-medium text-[#404943]">{aw.title}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={handleReset}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#717973] hover:text-[#002819] hover:bg-[#F4F4EF] transition-all"
                  >
                    <MaterialSymbol icon="refresh" size={14} />
                    Reset to Defaults
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#717973] hover:text-[#002819] hover:bg-[#F4F4EF] transition-all"
            title={t('dashboard.resetLayout')}
          >
            <MaterialSymbol icon="refresh" size={16} />
            {t('dashboard.resetLayout')}
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {widgets.map((widget) => {
              const Component = widgetComponents[widget.id];
              if (!Component) return null;
              const desktopClass = getGridColsClass(widget.gridDesktop);
              const tabletClass = getTabletColsClass(widget.gridTablet);
              return (
                <div key={widget.id} className={`col-span-1 ${tabletClass} ${desktopClass}`}>
                  <DashboardWidget
                    id={widget.id}
                    title={widget.title}
                  >
                    <Component dashboardData={dashboardData} />
                  </DashboardWidget>
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
