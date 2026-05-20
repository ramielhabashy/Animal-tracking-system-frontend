import React from 'react';
import { useState, useEffect } from 'react';
import { MaterialSymbol } from 'react-material-symbols';
import { apiFetch } from '../utils/api';
import { exportData } from '../utils/export';
import { useI18n } from '../i18n';

function BarChart({ data, height = 200, color = '#002819', maxValue, labelKey }) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.max(20, Math.min(60, 600 / data.length - 8));

  return (
    <div className="flex items-end gap-2 h-full pt-6" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
          <div className="w-full flex flex-col items-center justify-end" style={{ height: '100%' }}>
            <span className="text-[10px] font-bold text-brand-primary mb-1">{d.value}</span>
            <div
              className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80"
              style={{
                height: `${(d.value / max) * 100}%`,
                backgroundColor: d.color || color,
                maxWidth: barWidth,
              }}
            />
            <span className="text-[9px] text-on-surface-subtle mt-2 truncate w-full text-center font-medium">
              {d.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, total, size = 160 }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={radius} fill="transparent" stroke="#eeeee9" strokeWidth="3.5" />
        {segments.map((seg, i) => {
          const dashLength = (seg.value / 100) * circumference;
          const dashOffset = -offset;
          offset += dashLength;
          return seg.value > 0 ? (
            <circle
              key={i}
              cx="18" cy="18" r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth="3.5"
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700"
            />
          ) : null;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-brand-primary">{total}</span>
        <span className="text-[9px] uppercase font-bold text-on-surface-subtle tracking-widest">points</span>
      </div>
    </div>
  );
}

function TrendChart({ data, height = 200, valueKey = 'value', color = '#002819' }) {
  if (!data || data.length === 0) return <div className="text-center py-12 text-on-surface-subtle text-sm">No data</div>;

  const values = data.map(d => d[valueKey] || 0);
  const max = Math.max(...values, 1);
  const padding = 30;
  const chartWidth = 1000;
  const chartHeight = 100;
  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1 || 1)) * (chartWidth - 2 * padding),
    y: chartHeight - ((d[valueKey] || 0) / max) * (chartHeight - 10),
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L${points[points.length - 1].x},${chartHeight} L${points[0].x},${chartHeight} Z`;

  return (
    <div className="relative" style={{ height }}>
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#trendFill)`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" />
        {points.filter((_, i) => i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2)).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} stroke="white" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="absolute -bottom-6 w-full flex justify-between text-[10px] text-on-surface-subtle font-bold uppercase tracking-widest px-1">
        {data.filter((_, i) => i === 0 || i === Math.floor(data.length / 2) || i === data.length - 1).map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { t, dir } = useI18n();
  const isRtl = dir === 'rtl';
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activity');
  const [stats, setStats] = useState({
    totalAnimals: 0, totalDevices: 0, avgMovement: 0, avgTemp: 0, healthScore: 0, connectivity: 0,
  });
  const [activityTrend, setActivityTrend] = useState([]);
  const [temperatureTrend, setTemperatureTrend] = useState([]);
  const [healthMetrics, setHealthMetrics] = useState(null);
  const [speciesDistribution, setSpeciesDistribution] = useState([]);
  const [breedDistribution, setBreedDistribution] = useState([]);
  const [activityDistribution, setActivityDistribution] = useState({ grazing: 0, moving: 0, resting: 0, total_points: 0 });
  const [distanceByGroup, setDistanceByGroup] = useState([]);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [animalIdFilter, setAnimalIdFilter] = useState('all');
  const [groups, setGroups] = useState([]);
  const [animals, setAnimals] = useState([]);

  useEffect(() => {
    fetchData();
    apiFetch('/api/animal-groups').then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setGroups(data.data || []);
      }
    });
    apiFetch('/api/animals').then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setAnimals(data.data || []);
      }
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [groupFilter, animalIdFilter]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (groupFilter !== 'all') params.append('group_id', groupFilter);
      if (animalIdFilter !== 'all') params.append('animal_id', animalIdFilter);
      const ok = await exportData(`/api/reports/export?${params.toString()}`, `report-${new Date().toISOString().split('T')[0]}.csv`);
      if (!ok) setError('Export failed');
    } catch (err) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (groupFilter !== 'all') params.append('group_id', groupFilter);
      if (animalIdFilter !== 'all') params.append('animal_id', animalIdFilter);
      const queryString = params.toString();
      const response = await apiFetch(`/api/reports${queryString ? '?' + queryString : ''}`);
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalAnimals: data.stats?.total_animals || 0,
          totalDevices: data.stats?.total_devices || 0,
          avgMovement: data.stats?.avg_movement || 0,
          avgTemp: data.stats?.avg_temp || 0,
          healthScore: data.stats?.health_score || 0,
          connectivity: data.stats?.connectivity || 0,
        });
        setActivityTrend(data.activity_trend || []);
        setTemperatureTrend(data.temperature_trend || []);
        setHealthMetrics(data.health_metrics || null);
        setSpeciesDistribution(data.species_distribution || []);
        setBreedDistribution(data.breed_distribution || []);
        setActivityDistribution(data.activity_distribution || { grazing: 0, moving: 0, resting: 0, total_points: 0 });
        setDistanceByGroup(data.distance_by_group || []);
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.message || 'Failed to fetch reports');
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      setError(err.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const healthScoreColor = stats.healthScore >= 80 ? 'text-emerald-600' : stats.healthScore >= 60 ? 'text-amber-600' : 'text-red-600';
  const healthScoreBg = stats.healthScore >= 80 ? 'bg-emerald-50' : stats.healthScore >= 60 ? 'bg-amber-50' : 'bg-red-50';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className={`bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-2xl flex items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <MaterialSymbol icon="error" size={20} className="text-red-500 flex-shrink-0" />
          <p className="flex-1 text-sm font-medium">{error}</p>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg"><MaterialSymbol icon="close" size={18} /></button>
        </div>
      )}

      <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 ${isRtl ? 'text-right' : ''}`}>
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-brand-primary tracking-tight font-['Manrope']">
            {t('reportsPage.fleetReports')}
          </h2>
          <p className="text-[#4f6357] font-medium">{t('reportsPage.herdDescription')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white px-4 py-2 rounded-xl border border-stone-100 shadow-sm">
            <MaterialSymbol icon="pets" className="text-on-surface-subtle mr-2 text-xl" />
            <span className="text-sm font-bold text-brand-primary">{stats.totalAnimals} {t('reportsPage.animals')}</span>
          </div>
          <button onClick={handleExport} disabled={exporting} className="bg-gradient-to-b from-[#e9c349] to-[#cba72f] text-[#241a00] px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow disabled:opacity-50">
            <MaterialSymbol icon={exporting ? 'sync' : 'ios_share'} />
            {exporting ? t('common.exporting') : t('reports.export')}
          </button>
        </div>
      </div>

      <div className={`flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-stone-100 shadow-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('reportsPage.from')}</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 text-brand-primary focus:outline-none focus:ring-2 focus:ring-[#002819]/20" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('reportsPage.to')}</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 text-brand-primary focus:outline-none focus:ring-2 focus:ring-[#002819]/20" />
        </div>
        <div className="w-px h-6 bg-stone-200" />
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('reportsPage.group')}</label>
          <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 text-brand-primary focus:outline-none focus:ring-2 focus:ring-[#002819]/20 bg-white">
            <option value="all">{t('reportsPage.allGroups')}</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('reportsPage.animalLabel')}</label>
          <select value={animalIdFilter} onChange={e => setAnimalIdFilter(e.target.value)} className="text-sm border border-stone-200 rounded-lg px-3 py-1.5 text-brand-primary focus:outline-none focus:ring-2 focus:ring-[#002819]/20 bg-white">
            <option value="all">{t('reportsPage.allAnimals')}</option>
            {animals.map(a => <option key={a.id} value={a.id}>{a.name ? `${a.name} (${a.animal_id})` : a.animal_id}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-8 border-b border-stone-100">
        {['activity', 'temperature', 'health'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-4 px-2 border-b-2 font-bold text-sm transition-colors ${
              activeTab === tab
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-on-surface-subtle hover:text-stone-600'
            }`}
          >
            {t(`reportsPage.${tab === 'activity' ? 'activity' : tab === 'temperature' ? 'temp' : 'healthTrends'}`)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-brand-primary">
            <MaterialSymbol icon="directions_walk" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('reportsPage.avgMovement')}</p>
            <h4 className="text-2xl font-black text-brand-primary">
              {stats.avgMovement} <span className="text-sm font-normal text-stone-400">{t('reportsPage.km')}</span>
            </h4>
          </div>
        </div>
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-brand-primary">
            <MaterialSymbol icon="thermostat" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('reportsPage.avgTemp')}</p>
            <h4 className="text-2xl font-black text-brand-primary">
              {stats.avgTemp} <span className="text-sm font-normal text-stone-400">{t('reportsPage.celsius')}</span>
            </h4>
          </div>
        </div>
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full ${healthScoreBg} flex items-center justify-center ${healthScoreColor}`}>
            <MaterialSymbol icon="favorite" className="fill" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('reportsPage.healthScore')}</p>
            <h4 className={`text-2xl font-black ${healthScoreColor}`}>{stats.healthScore}%</h4>
          </div>
        </div>
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-brand-primary">
            <MaterialSymbol icon="bolt" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('reportsPage.connectivity')}</p>
            <h4 className="text-2xl font-black text-brand-primary">{stats.connectivity}%</h4>
          </div>
        </div>
      </div>

      {activeTab === 'activity' && (
        <>
          <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-stone-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-brand-primary font-['Manrope']">{t('reportsPage.activityTrend')}</h3>
                <p className="text-sm text-stone-500">{t('reportsPage.dailyDistance')}</p>
              </div>
            </div>
            <div className="h-56 relative pb-8">
              <TrendChart
                data={activityTrend.map(d => ({ ...d, value: d.distance }))}
                valueKey="value"
                color="#002819"
              />
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-stone-100">
              <h3 className="text-xl font-bold text-brand-primary font-['Manrope'] mb-6">{t('reportsPage.distanceByGroup')}</h3>
              {distanceByGroup.length === 0 ? (
                <div className="text-center py-8 text-on-surface-subtle text-sm">{t('reportsPage.noGroupData')}</div>
              ) : (
                <div className="space-y-5">
                  {distanceByGroup.map((group, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-stone-700">{group.name}</span>
                        <span className="font-bold text-brand-primary">{group.distance} km</span>
                      </div>
                      <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-primary rounded-full transition-all duration-700"
                          style={{ width: `${group.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-stone-100">
              <h3 className="text-xl font-bold text-brand-primary font-['Manrope'] mb-6">{t('reportsPage.activityDistribution')}</h3>
              {activityDistribution.total_points === 0 ? (
                <div className="text-center py-8 text-on-surface-subtle text-sm">{t('reportsPage.noActivityData')}</div>
              ) : (
                <div className="flex items-center gap-8 md:gap-12">
                  <DonutChart
                    segments={[
                      { value: activityDistribution.grazing, color: '#002819' },
                      { value: activityDistribution.moving, color: '#D4AF37' },
                      { value: activityDistribution.resting, color: '#b6ccbe' },
                    ]}
                    total={activityDistribution.total_points}
                  />
                  <div className="space-y-4 flex-1">
                    {[
                      { label: t('reportsPage.grazing'), value: activityDistribution.grazing, color: '#002819' },
                      { label: t('reportsPage.moving'), value: activityDistribution.moving, color: '#D4AF37' },
                      { label: t('reportsPage.resting'), value: activityDistribution.resting, color: '#b6ccbe' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm font-semibold text-stone-600">{item.label}</span>
                        </div>
                        <span className="text-sm font-bold text-brand-primary">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {speciesDistribution.length > 0 && (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-stone-100">
              <h3 className="text-xl font-bold text-brand-primary font-['Manrope'] mb-6">{t('reportsPage.speciesBreed')}</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-4">{t('reportsPage.bySpecies')}</h4>
                  <div className="space-y-3">
                    {speciesDistribution.map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-24 text-sm font-semibold text-stone-700 capitalize">{s.species}</span>
                        <div className="flex-1 h-3 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-primary rounded-full transition-all duration-700" style={{ width: `${s.percentage}%` }} />
                        </div>
                        <span className="text-xs font-bold text-brand-primary w-12 text-right">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-4">{t('reportsPage.byBreed')}</h4>
                  <div className="space-y-3">
                    {breedDistribution.map((b, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-24 text-sm font-semibold text-stone-700 truncate">{b.breed}</span>
                        <div className="flex-1 h-3 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-accent rounded-full transition-all duration-700" style={{ width: `${b.percentage}%` }} />
                        </div>
                        <span className="text-xs font-bold text-brand-primary w-12 text-right">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'temperature' && (
        <>
          <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-stone-100">
            <h3 className="text-xl font-bold text-brand-primary font-['Manrope'] mb-6">{t('reportsPage.tempTrend')}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <MaterialSymbol icon="thermostat" className="text-emerald-600" size={32} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('reportsPage.currentAvg')}</p>
                    <p className="text-4xl font-black text-brand-primary">
                      {temperatureTrend?.avg_temp || stats.avgTemp}
                      <span className="text-lg font-normal text-stone-400">°C</span>
                    </p>
                    <p className="text-xs text-on-surface-subtle mt-0.5">{t('reportsPage.baselineTemp')}</p>
                  </div>
                </div>
                <p className="text-sm text-stone-500 mb-4">{t('reportsPage.tempDesc')}</p>
              </div>
              {temperatureTrend?.ranges && (
                <div className="space-y-4">
                  {temperatureTrend.ranges.map((r, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-stone-700">{r.label}</span>
                        <span className="font-bold text-brand-primary">{r.count}</span>
                      </div>
                      <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(2, (r.count / Math.max(stats.totalAnimals, 1)) * 100)}%`, backgroundColor: r.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <MaterialSymbol icon="thermostat" className="text-emerald-600" size={20} />
                </div>
                <span className="font-bold text-brand-primary">{t('reportsPage.currentAvg')}</span>
              </div>
              <p className="text-3xl font-black text-brand-primary">{temperatureTrend?.avg_temp || stats.avgTemp}°C</p>
              <p className="text-xs text-on-surface-subtle mt-1">{t('reportsPage.baselineTemp')}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <MaterialSymbol icon="warning" className="text-red-500" size={20} />
                </div>
                <span className="font-bold text-brand-primary">{t('reportsPage.criticalAlerts')}</span>
              </div>
              <p className="text-3xl font-black text-red-500">{temperatureTrend?.critical_count || healthMetrics?.critical_temp_count || 0}</p>
              <p className="text-xs text-on-surface-subtle mt-1">{t('reportsPage.animalsAboveThreshold')}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <MaterialSymbol icon="devices" className="text-blue-500" size={20} />
                </div>
                <span className="font-bold text-brand-primary">{t('reportsPage.connectivity')}</span>
              </div>
              <p className="text-3xl font-black text-brand-primary">{stats.connectivity}%</p>
              <p className="text-xs text-on-surface-subtle mt-1">{stats.totalDevices} {t('reportsPage.totalDevices')}</p>
            </div>
          </div>
        </>
      )}

      {activeTab === 'health' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <MaterialSymbol icon="medical_services" className="text-blue-600" size={20} />
                </div>
                <span className="font-bold text-brand-primary">{t('reportsPage.records30d')}</span>
              </div>
              <p className="text-3xl font-black text-brand-primary">{healthMetrics?.total_records || 0}</p>
              <p className="text-xs text-on-surface-subtle mt-1">{t('reportsPage.totalMedicalRecords')}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <MaterialSymbol icon="syringe" className="text-green-600" size={20} />
                </div>
                <span className="font-bold text-brand-primary">{t('reportsPage.vaccinations')}</span>
              </div>
              <p className="text-3xl font-black text-green-600">{healthMetrics?.vaccinations || 0}</p>
              <p className="text-xs text-on-surface-subtle mt-1">{t('reportsPage.last30d')}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <MaterialSymbol icon="stethoscope" className="text-amber-600" size={20} />
                </div>
                <span className="font-bold text-brand-primary">{t('reportsPage.checkups')}</span>
              </div>
              <p className="text-3xl font-black text-amber-600">{healthMetrics?.checkups || 0}</p>
              <p className="text-xs text-on-surface-subtle mt-1">{t('reportsPage.last30d')}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <MaterialSymbol icon="healing" className="text-red-600" size={20} />
                </div>
                <span className="font-bold text-brand-primary">{t('reportsPage.treatments')}</span>
              </div>
              <p className="text-3xl font-black text-red-600">{healthMetrics?.treatments || 0}</p>
              <p className="text-xs text-on-surface-subtle mt-1">{t('reportsPage.last30d')}</p>
            </div>
          </div>

          <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-stone-100">
            <h3 className="text-xl font-bold text-brand-primary font-['Manrope'] mb-6">{t('reportsPage.healthCoverage')}</h3>
            <div className="flex items-center gap-8 md:gap-16">
              <div className="relative">
                <svg className="w-40 h-40 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="transparent" stroke="#eeeee9" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="16" fill="transparent" stroke="#002819"
                    strokeDasharray={`${healthMetrics?.coverage_percentage || 0} ${100 - (healthMetrics?.coverage_percentage || 0)}`}
                    strokeWidth="3.5" strokeLinecap="round" className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-brand-primary">{healthMetrics?.coverage_percentage || 0}%</span>
                  <span className="text-[9px] uppercase font-bold text-on-surface-subtle tracking-widest">{t('reportsPage.coverage')}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-brand-primary"></span>
                  <span className="text-sm text-stone-600">{t('reportsPage.animalsWithRecords')}</span>
                  <span className="text-sm font-bold text-brand-primary ml-auto">{healthMetrics?.animals_with_records || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-surface-dim"></span>
                  <span className="text-sm text-stone-600">{t('reportsPage.totalAnimals')}</span>
                  <span className="text-sm font-bold text-brand-primary ml-auto">{stats.totalAnimals}</span>
                </div>
              </div>
            </div>
          </section>

          {breedDistribution.length > 0 && (
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-stone-100">
              <h3 className="text-xl font-bold text-brand-primary font-['Manrope'] mb-6">{t('reportsPage.breedDistribution')}</h3>
              <BarChart
                data={breedDistribution.map(b => ({ label: b.breed, value: b.count, color: '#D4AF37' }))}
                color="#D4AF37"
                height={250}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
