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
  auctionsWidget: { id: 'auctionsWidget', gridDesktop: 12, gridTablet: 12 },
  activationWidget: { id: 'activationWidget', gridDesktop: 4, gridTablet: 6 },
  announcements: { id: 'announcements', gridDesktop: 12, gridTablet: 12 },
  aiAssistant: { id: 'aiAssistant', gridDesktop: 6, gridTablet: 12 },
  messages: { id: 'messages', gridDesktop: 6, gridTablet: 12 },
};

const ROLE_LAYOUTS = {
  Admin: [
    'announcements', 'statsCards', 'activationWidget', 'subscriptionOverview', 'auctionsWidget', 'map', 'alertsPanel',
    'chartsWidget', 'tasksWidget', 'ownerOverview', 'tierDistribution', 'quickActions', 'aiAssistant',
    'messages',
  ],
  Owner: [
    'announcements', 'statsCards', 'activationWidget', 'auctionsWidget', 'map', 'alertsPanel',
    'chartsWidget', 'tasksWidget', 'quickActions', 'aiAssistant', 'messages',
  ],
  Manager: [
    'announcements', 'statsCards', 'auctionsWidget', 'map', 'alertsPanel',
    'chartsWidget', 'tasksWidget', 'quickActions', 'aiAssistant',
  ],
  Shepherd: [
    'statsCards', 'map', 'alertsPanel',
    'tasksWidget', 'quickActions', 'aiAssistant',
  ],
  Doctor: [
    'statsCards', 'medicalOverview', 'alertsPanel',
    'chartsWidget', 'tasksWidget', 'quickActions', 'aiAssistant',
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
    auctionsWidget: t('nav.auctions'),
    activationWidget: 'Device Activation',
    announcements: t('nav.announcements') || 'Announcements',
    aiAssistant: t('ai.title') || 'AI Assistant',
    messages: t('nav.messages') || 'Messages',
  };
  return titles[id] || id;
}

const ROLE_AVAILABLE = {
  Admin: ['announcements', 'statsCards', 'map', 'alertsPanel', 'quickActions', 'subscriptionOverview', 'tierDistribution', 'ownerOverview', 'chartsWidget', 'tasksWidget', 'auctionsWidget', 'activationWidget', 'aiAssistant', 'messages'],
  Owner: ['announcements', 'statsCards', 'map', 'alertsPanel', 'quickActions', 'chartsWidget', 'tasksWidget', 'subscriptionOverview', 'auctionsWidget', 'activationWidget', 'aiAssistant', 'messages'],
  Manager: ['announcements', 'statsCards', 'map', 'alertsPanel', 'quickActions', 'chartsWidget', 'tasksWidget', 'auctionsWidget', 'aiAssistant', 'messages'],
  Shepherd: ['statsCards', 'map', 'alertsPanel', 'quickActions', 'tasksWidget', 'aiAssistant', 'messages'],
  Doctor: ['statsCards', 'medicalOverview', 'alertsPanel', 'quickActions', 'chartsWidget', 'tasksWidget', 'aiAssistant', 'messages'],
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
