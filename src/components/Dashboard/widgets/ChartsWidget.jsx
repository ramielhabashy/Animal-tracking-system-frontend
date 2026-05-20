import React from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { MaterialSymbol } from 'react-material-symbols';
import { useI18n } from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';

const COLORS = ['#002819', '#06402B', '#D4AF37', '#735C00', '#10b981', '#BA1A1A', '#8b5cf6', '#06b6d4'];

function computeSpeciesData(animals) {
  const map = {};
  (animals || []).forEach(a => {
    const species = a.species || 'Unknown';
    map[species] = (map[species] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
}

function computeHealthData(animals) {
  const counts = { Healthy: 0, Warning: 0, Critical: 0 };
  (animals || []).forEach(a => {
    const temp = parseFloat(a.baseline_temperature);
    if (!temp || isNaN(temp)) { counts.Healthy++; return; }
    if (temp <= 39) counts.Healthy++;
    else if (temp <= 39.5) counts.Warning++;
    else counts.Critical++;
  });
  return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
}

function computeDeviceStatusData(animals) {
  const counts = { Online: 0, Offline: 0, Unassigned: 0 };
  (animals || []).forEach(a => {
    const device = a.device;
    if (!device || !device.device_id) { counts.Unassigned++; return; }
    if (device.status === 'online') counts.Online++;
    else counts.Offline++;
  });
  return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
}

function getRoleBasedCharts(role, adminSubStats, stats, speciesData, healthData, deviceStatusData) {
  if (role === 'Admin' && adminSubStats) {
    const charts = [];

    if (adminSubStats.revenue_over_time && adminSubStats.revenue_over_time.length > 0) {
      charts.push({
        id: 'revenue',
        type: 'bar',
        titleKey: 'dashboard.chartRevenue',
        data: adminSubStats.revenue_over_time.map(r => ({
          month: r.month,
          Revenue: r.revenue || 0,
          Subscriptions: r.count || 0,
        })),
        bars: [
          { dataKey: 'Revenue', color: '#D4AF37' },
          { dataKey: 'Subscriptions', color: '#06402B' },
        ],
      });
    }

    if (adminSubStats.growth_over_time && adminSubStats.growth_over_time.length > 0) {
      charts.push({
        id: 'growth',
        type: 'bar',
        titleKey: 'dashboard.chartGrowth',
        data: adminSubStats.growth_over_time.map(g => ({
          month: g.month,
          New: g.new || 0,
          Cancelled: g.cancelled || 0,
        })),
        bars: [
          { dataKey: 'New', color: '#10b981' },
          { dataKey: 'Cancelled', color: '#BA1A1A' },
        ],
      });
    }

    if (adminSubStats.tier_distribution && adminSubStats.tier_distribution.length > 0) {
      charts.push({
        id: 'tierPie',
        type: 'pie',
        titleKey: 'subscription.tierDistribution',
        data: adminSubStats.tier_distribution.map(t => ({
          name: t.name,
          value: t.subscriber_count || 0,
        })),
      });
    }

    if (adminSubStats.payment_methods) {
      const pmData = Object.entries(adminSubStats.payment_methods).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value,
      }));
      if (pmData.length > 0) {
        charts.push({
          id: 'paymentMethods',
          type: 'pie',
          titleKey: 'dashboard.paymentMethods',
          data: pmData,
        });
      }
    }

    if (healthData.length > 0) {
      charts.push({
        id: 'health',
        type: 'pie',
        titleKey: 'dashboard.chartHealth',
        data: healthData,
      });
    }

    if (speciesData.length > 0) {
      charts.push({
        id: 'species',
        type: 'pie',
        titleKey: 'dashboard.chartSpecies',
        data: speciesData,
      });
    }

    return charts;
  }

  if ((role === 'Owner' || role === 'Manager') && stats) {
    const charts = [];

    if (speciesData.length > 0) {
      charts.push({
        id: 'species',
        type: 'pie',
        titleKey: 'dashboard.chartSpecies',
        data: speciesData,
      });
    }

    charts.push({
      id: 'devices',
      type: 'deviceProgress',
      titleKey: 'dashboard.chartDevices',
      data: {
        total: stats.totalAnimals,
        active: stats.activeDevices,
      },
    });

    if (healthData.length > 0) {
      charts.push({
        id: 'health',
        type: 'pie',
        titleKey: 'dashboard.chartHealth',
        data: healthData,
      });
    }

    return charts;
  }

  if (role === 'Doctor' && stats) {
    const charts = [];

    if (healthData.length > 0) {
      charts.push({
        id: 'health',
        type: 'pie',
        titleKey: 'dashboard.chartHealth',
        data: healthData,
      });
    }

    if (speciesData.length > 0) {
      charts.push({
        id: 'species',
        type: 'pie',
        titleKey: 'dashboard.chartSpecies',
        data: speciesData,
      });
    }

    return charts;
  }

  if (role === 'Shepherd' && stats) {
    const charts = [];

    if (deviceStatusData.length > 0) {
      charts.push({
        id: 'deviceStatus',
        type: 'pie',
        titleKey: 'dashboard.chartDevices',
        data: deviceStatusData,
      });
    }

    if (speciesData.length > 0) {
      charts.push({
        id: 'species',
        type: 'pie',
        titleKey: 'dashboard.chartSpecies',
        data: speciesData,
      });
    }

    return charts;
  }

  return [];
}

export default function ChartsWidget({ dashboardData }) {
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const isRtl = dir === 'rtl';
  const role = user?.role;
  const { adminSubStats, stats, animals } = dashboardData;

  const speciesData = computeSpeciesData(animals);
  const healthData = computeHealthData(animals);
  const deviceStatusData = computeDeviceStatusData(animals);

  const charts = getRoleBasedCharts(role, adminSubStats, stats, speciesData, healthData, deviceStatusData);
  if (charts.length === 0) return null;

  const canViewReports = ['Admin', 'Owner', 'Manager', 'Doctor'].includes(role);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-surface-high">
        <p className="text-sm font-bold text-brand-primary mb-1">{label}</p>
        {payload.map((entry, idx) => (
          <p key={idx} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  const renderDeviceProgress = (chart) => {
    const { total, active } = chart.data || {};
    const pct = total ? Math.round((active / total) * 100) : 0;
    return (
      <div className="flex flex-col items-center justify-center h-[260px]">
        <div className="text-4xl font-bold text-brand-primary mb-1">{active}</div>
        <div className="text-sm text-on-surface-subtle mb-6">{t('common.of')} {total} {t('dashboard.animals')}</div>
        <div className="w-full max-w-xs bg-surface-light rounded-full h-4 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between w-full max-w-xs mt-2 text-xs text-on-surface-subtle">
          <span>{pct}% {t('dashboard.chartDevicesAssigned') || 'Assigned'}</span>
          <span>{100 - pct}% {t('dashboard.chartDevicesUnassigned') || 'Unassigned'}</span>
        </div>
      </div>
    );
  };

  const renderChart = (chart) => {
    if (chart.type === 'deviceProgress') {
      return renderDeviceProgress(chart);
    }
    if (chart.type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <Pie
              data={chart.data}
              cx="50%"
              cy="50%"
              outerRadius={85}
              innerRadius={48}
              paddingAngle={3}
              dataKey="value"
              labelLine={{ stroke: '#c0c9c1', strokeWidth: 1 }}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                const RADIAN = Math.PI / 180;
                const radius = outerRadius + 28;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                if (percent < 0.04) return null;
                return (
                  <text x={x} y={y} fill="#404943" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
                    {`${name} ${(percent * 100).toFixed(0)}%`}
                  </text>
                );
              }}
            >
              {chart.data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-xs text-on-surface-variant">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chart.data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F4F4EF" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#717973' }}
            axisLine={{ stroke: '#E3E3DE' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#717973' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-xs text-on-surface-variant">{value}</span>}
          />
          {chart.bars.map((bar) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              fill={bar.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div>
      {canViewReports && (
        <div className={`flex justify-between items-center mb-5 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <h4 className="font-bold text-brand-primary">{t('dashboard.analytics')}</h4>
          <Link
            to="/reports"
            className="text-sm font-bold text-brand-accent hover:underline flex items-center gap-1"
          >
            {t('reports.reportCenter')}
            <MaterialSymbol icon={isRtl ? 'arrow_back' : 'arrow_forward'} size={16} />
          </Link>
        </div>
      )}
      <div className={`grid grid-cols-1 ${charts.length >= 2 ? 'lg:grid-cols-2' : ''} gap-6`}>
        {charts.map((chart) => (
          <div key={chart.id} className="card p-5">
            <h5 className="font-bold text-sm text-brand-primary mb-4">{t(chart.titleKey)}</h5>
            {renderChart(chart)}
          </div>
        ))}
      </div>
    </div>
  );
}
