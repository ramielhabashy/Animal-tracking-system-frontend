const COLUMNS = 12;

const ALL_WIDGETS = {
  statsCards: { id: 'statsCards', gridDesktop: 12, gridTablet: 12 },
  map: { id: 'map', gridDesktop: 8, gridTablet: 12 },
  alertsPanel: { id: 'alertsPanel', gridDesktop: 4, gridTablet: 6 },
  quickActions: { id: 'quickActions', gridDesktop: 12, gridTablet: 12 },
  subscriptionOverview: { id: 'subscriptionOverview', gridDesktop: 12, gridTablet: 12 },
  tierDistribution: { id: 'tierDistribution', gridDesktop: 12, gridTablet: 12 },
  ownerOverview: { id: 'ownerOverview', gridDesktop: 12, gridTablet: 12 },
  chartsWidget: { id: 'chartsWidget', gridDesktop: 12, gridTablet: 12 },
  medicalOverview: { id: 'medicalOverview', gridDesktop: 6, gridTablet: 6 },
  tasksWidget: { id: 'tasksWidget', gridDesktop: 6, gridTablet: 6 },
};

const ROLE_LAYOUTS = {
  Admin: [
    'statsCards', 'subscriptionOverview', 'map', 'alertsPanel',
    'chartsWidget', 'tasksWidget', 'ownerOverview', 'tierDistribution', 'quickActions',
  ],
  Owner: [
    'statsCards', 'map', 'alertsPanel',
    'chartsWidget', 'tasksWidget', 'quickActions',
  ],
  Manager: [
    'statsCards', 'map', 'alertsPanel',
    'chartsWidget', 'tasksWidget', 'quickActions',
  ],
  Shepherd: [
    'statsCards', 'map', 'alertsPanel',
    'tasksWidget', 'quickActions',
  ],
  Doctor: [
    'statsCards', 'medicalOverview', 'alertsPanel',
    'chartsWidget', 'tasksWidget', 'quickActions',
  ],
};

const STORAGE_KEY = 'oasis_dashboard_layout';

function getStoredLayout(role) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data[role]) return data[role];
    }
  } catch {}
  return null;
}

function saveLayout(role, widgetIds) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[role] = widgetIds;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function getWidgetsForRole(role, t) {
  const stored = getStoredLayout(role);
  const defaults = ROLE_LAYOUTS[role] || ROLE_LAYOUTS.Owner;
  let ids = stored || defaults;
  if (stored && !stored.every(id => ALL_WIDGETS[id])) ids = defaults;
  return ids
    .map(id => ALL_WIDGETS[id])
    .filter(Boolean)
    .map(w => ({
      ...w,
      title: getWidgetTitle(w.id, t),
    }));
}

export function reorderWidgets(role, widgetIds) {
  saveLayout(role, widgetIds);
}

export function resetLayout(role) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      delete data[role];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch {}
}

function getWidgetTitle(id, t) {
  const titles = {
    statsCards: t('dashboard.title'),
    map: t('dashboard.herdLocations'),
    alertsPanel: t('dashboard.recentAlerts'),
    quickActions: t('dashboard.quickActions'),
    subscriptionOverview: t('subscription.overview'),
    tierDistribution: t('subscription.tierDistribution'),
    ownerOverview: t('dashboard.ownerOverview'),
    chartsWidget: t('dashboard.analytics'),
    medicalOverview: t('nav.medicalRecords'),
    tasksWidget: t('nav.tasks'),
  };
  return titles[id] || id;
}

const ROLE_AVAILABLE = {
  Admin: ['statsCards', 'map', 'alertsPanel', 'quickActions', 'subscriptionOverview', 'tierDistribution', 'ownerOverview', 'chartsWidget', 'tasksWidget'],
  Owner: ['statsCards', 'map', 'alertsPanel', 'quickActions', 'chartsWidget', 'tasksWidget', 'subscriptionOverview'],
  Manager: ['statsCards', 'map', 'alertsPanel', 'quickActions', 'chartsWidget', 'tasksWidget'],
  Shepherd: ['statsCards', 'map', 'alertsPanel', 'quickActions', 'tasksWidget'],
  Doctor: ['statsCards', 'medicalOverview', 'alertsPanel', 'quickActions', 'chartsWidget', 'tasksWidget'],
};

export function getAvailableForRole(role, t) {
  const ids = ROLE_AVAILABLE[role] || ROLE_AVAILABLE.Owner;
  return ids
    .map(id => ALL_WIDGETS[id])
    .filter(Boolean)
    .map(w => ({
      ...w,
      title: getWidgetTitle(w.id, t),
    }));
}

export function toggleWidget(role, widgetId, show) {
  const stored = getStoredLayout(role);
  const defaults = ROLE_LAYOUTS[role] || ROLE_LAYOUTS.Owner;
  let ids = stored || defaults;

  if (show) {
    if (!ids.includes(widgetId)) ids.push(widgetId);
  } else {
    ids = ids.filter(id => id !== widgetId);
  }

  saveLayout(role, ids);
}

export { ALL_WIDGETS, ROLE_LAYOUTS, ROLE_AVAILABLE };
