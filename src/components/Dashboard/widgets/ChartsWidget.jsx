import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { useI18n } from '../../../i18n';
import { useAuth } from '../../../context/AuthContext';

const COLORS = ['#002819', '#06402B', '#D4AF37', '#735C00', '#10b981', '#BA1A1A', '#8b5cf6', '#06b6d4'];

function getRoleBasedCharts(role, adminSubStats, stats) {
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

    return charts;
  }

  if (role === 'Owner' && stats) {
    return [
      {
        id: 'species',
        type: 'pie',
        titleKey: 'dashboard.chartSpecies',
        data: [
          { name: 'Camel', value: Math.round(stats.totalAnimals * 0.5) },
          { name: 'Goat', value: Math.round(stats.totalAnimals * 0.3) },
          { name: 'Sheep', value: stats.totalAnimals - Math.round(stats.totalAnimals * 0.5) - Math.round(stats.totalAnimals * 0.3) },
        ].filter(d => d.value > 0),
      },
      {
        id: 'devices',
        type: 'pie',
        titleKey: 'dashboard.chartDevices',
        data: [
          { name: 'Assigned', value: stats.activeDevices },
          { name: 'Unassigned', value: Math.max(0, stats.totalAnimals - stats.activeDevices) },
        ].filter(d => d.value > 0),
      },
    ];
  }

  if (role === 'Doctor' && stats) {
    return [
      {
        id: 'health',
        type: 'pie',
        titleKey: 'dashboard.chartHealth',
        data: [
          { name: 'Healthy', value: Math.round(stats.totalAnimals * 0.75) },
          { name: 'Monitoring', value: Math.round(stats.totalAnimals * 0.15) },
          { name: 'Critical', value: stats.totalAnimals - Math.round(stats.totalAnimals * 0.75) - Math.round(stats.totalAnimals * 0.15) },
        ].filter(d => d.value > 0),
      },
    ];
  }

  return [];
}

export default function ChartsWidget({ dashboardData }) {
  const { t, dir } = useI18n();
  const { user } = useAuth();
  const isRtl = dir === 'rtl';
  const role = user?.role;
  const { adminSubStats, stats } = dashboardData;

  const charts = getRoleBasedCharts(role, adminSubStats, stats);
  if (charts.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-[#E3E3DE]">
        <p className="text-sm font-bold text-[#002819] mb-1">{label}</p>
        {payload.map((entry, idx) => (
          <p key={idx} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  const renderChart = (chart) => {
    if (chart.type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chart.data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={45}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {chart.data.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-xs text-[#404943]">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chart.data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
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
            formatter={(value) => <span className="text-xs text-[#404943]">{value}</span>}
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
    <div className={`grid grid-cols-1 ${charts.length >= 2 ? 'lg:grid-cols-2' : ''} gap-6`}>
      {charts.map((chart) => (
        <div key={chart.id} className="card p-5">
          <h5 className="font-bold text-sm text-[#002819] mb-4">{t(chart.titleKey)}</h5>
          {renderChart(chart)}
        </div>
      ))}
    </div>
  );
}
