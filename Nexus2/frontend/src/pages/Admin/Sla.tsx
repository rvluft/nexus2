import { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Clock, CheckCircle2, AlertTriangle, Users, Layers,
  RefreshCw, Filter, TrendingUp,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────

interface Overview {
  total: string; resolved: string;
  fr_breached: string; res_breached: string;
  avg_first_response_min: string; avg_resolution_min: string;
  median_first_response_min: string; p90_first_response_min: string;
}
interface StatusRow  { status: string; count: string; }
interface SpecRow    { specialist_name: string; specialist_whatsapp?: string; total: string; resolved: string; fr_breached: string; avg_first_response_min: string; }
interface DomainRow  { domain_name: string; domain_color?: string; total: string; resolved: string; fr_breached: string; avg_first_response_min: string; }
interface CrossRow   { specialist_name: string; domain_name: string; total: string; avg_first_response_min: string; }
interface SeriesRow  { period: string; total: string; resolved: string; fr_breached: string; avg_first_response_min: string; }

// ── Constants ─────────────────────────────────────────────────

const PERIODS = [
  { v: 'today', l: 'Hoje' }, { v: 'week', l: '7 dias' }, { v: 'month', l: '30 dias' },
  { v: '3months', l: '3 meses' }, { v: '6months', l: '6 meses' }, { v: 'year', l: '1 ano' },
  { v: 'custom', l: 'Personalizado' },
];
const GROUP_BY = [{ v: 'day', l: 'Dia' }, { v: 'week', l: 'Semana' }, { v: 'month', l: 'Mês' }];

const STATUS_COLORS: Record<string, string> = {
  open: '#6366f1', awaiting_specialist: '#f59e0b', in_progress: '#0ea5e9',
  resolved: '#22c55e', closed: '#64748b',
};
const STATUS_LABELS: Record<string, string> = {
  open: 'Aberto', awaiting_specialist: 'Aguardando', in_progress: 'Em andamento',
  resolved: 'Resolvido', closed: 'Fechado',
};

const n = (v: any) => parseInt(v, 10) || 0;
const min2h = (m: any) => {
  const mins = parseInt(m, 10);
  if (!mins) return '—';
  if (mins < 60) return `${mins}m`;
  return `${(mins / 60).toFixed(1)}h`;
};
const fmtPeriod = (p: string) =>
  new Date(p).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

// ── Filter bar ────────────────────────────────────────────────

function FilterBar({ filters, onChange, specialists, domains }: {
  filters: any; onChange: (k: string, v: string) => void;
  specialists: { specialist_name: string; specialist_whatsapp: string }[];
  domains: { id: string; name: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-outer border border-border/40 bg-secondary/20">
      <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
      {/* Período */}
      <div className="flex gap-0.5 bg-background/50 rounded-inner p-0.5">
        {PERIODS.filter(p => p.v !== 'custom').map(p => (
          <button key={p.v} onClick={() => onChange('period', p.v)}
            className={`px-2.5 py-1 rounded-inner text-xs font-medium transition-colors ${
              filters.period === p.v ? 'bg-primary/20 text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>{p.l}
          </button>
        ))}
      </div>
      {/* Datas custom */}
      {filters.period === 'custom' && (
        <>
          <input type="date" value={filters.date_from} onChange={e => onChange('date_from', e.target.value)} className="input text-xs h-8 w-36" />
          <span className="text-xs text-muted-foreground">até</span>
          <input type="date" value={filters.date_to} onChange={e => onChange('date_to', e.target.value)} className="input text-xs h-8 w-36" />
        </>
      )}
      {/* Especialista */}
      <select value={filters.specialist_whatsapp} onChange={e => onChange('specialist_whatsapp', e.target.value)}
        className="input text-xs h-8 min-w-[140px]">
        <option value="">Todos especialistas</option>
        {specialists.map(s => <option key={s.specialist_whatsapp} value={s.specialist_whatsapp}>{s.specialist_name || s.specialist_whatsapp}</option>)}
      </select>
      {/* Domínio */}
      <select value={filters.domain_id} onChange={e => onChange('domain_id', e.target.value)}
        className="input text-xs h-8 min-w-[140px]">
        <option value="">Todos domínios</option>
        {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      {/* Agrupamento */}
      <select value={filters.group_by} onChange={e => onChange('group_by', e.target.value)}
        className="input text-xs h-8 w-28">
        {GROUP_BY.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}
      </select>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────

function StatCard({ label, value, sub, color, Icon }: { label: string; value: string; sub?: string; color: string; Icon: any }) {
  return (
    <div className="rounded-outer border border-border/40 p-4 flex items-center gap-3" style={{ background: `${color}0d` }}>
      <div className="p-2 rounded-inner shrink-0" style={{ background: `${color}20` }}>
        <Icon className="h-4 w-4" style={{ color }} strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground opacity-70 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Chart wrapper ─────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-outer border border-border/40 p-4">
      <h3 className="text-sm font-medium text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { background: 'hsl(230 15% 9%)', border: '1px solid hsl(220 15% 20%)', borderRadius: 6, fontSize: 12 },
  labelStyle: { color: 'hsl(220 15% 70%)' },
};

// ── Main page ─────────────────────────────────────────────────

export default function AdminSla() {
  const [filters, setFilters] = useState({
    period: 'month', date_from: '', date_to: '', specialist_whatsapp: '', domain_id: '', group_by: 'day',
  });
  const [loading, setLoading] = useState(true);
  const [overview, setOverview]   = useState<{ overview: Overview; by_status: StatusRow[]; by_priority: any[] } | null>(null);
  const [bySpec,   setBySpec]     = useState<SpecRow[]>([]);
  const [byDomain, setByDomain]   = useState<DomainRow[]>([]);
  const [cross,    setCross]      = useState<CrossRow[]>([]);
  const [series,   setSeries]     = useState<SeriesRow[]>([]);
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [domains, setDomains]     = useState<any[]>([]);

  const params = () => ({
    period: filters.period !== 'custom' ? filters.period : undefined,
    date_from: filters.period === 'custom' ? filters.date_from : undefined,
    date_to: filters.period === 'custom' ? filters.date_to : undefined,
    specialist_whatsapp: filters.specialist_whatsapp || undefined,
    domain_id: filters.domain_id || undefined,
    group_by: filters.group_by,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = params();
      const [ov, sp, dm, cr, ts, specList, domList] = await Promise.all([
        api.get('/tickets/stats/overview',    { params: p }),
        api.get('/tickets/stats/by-specialist', { params: p }),
        api.get('/tickets/stats/by-domain',   { params: p }),
        api.get('/tickets/stats/cross',        { params: p }),
        api.get('/tickets/stats/time-series',  { params: p }),
        api.get('/tickets/specialists'),
        api.get('/domains'),
      ]);
      setOverview(ov.data);
      setBySpec(sp.data);
      setByDomain(dm.data);
      setCross(cr.data);
      setSeries(ts.data);
      setSpecialists(specList.data);
      setDomains(domList.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);

  const changeFilter = (k: string, v: string) => setFilters(f => ({ ...f, [k]: v }));

  // Derived data for charts
  const statusPie = (overview?.by_status || []).map(r => ({
    name: STATUS_LABELS[r.status] ?? r.status, value: n(r.count), fill: STATUS_COLORS[r.status] ?? '#64748b',
  }));

  const slaBreachRate = overview?.overview ? (() => {
    const total = n(overview.overview.total);
    if (!total) return [];
    return [
      { name: 'Dentro do SLA', value: total - n(overview.overview.fr_breached), fill: '#22c55e' },
      { name: 'Violação resposta', value: n(overview.overview.fr_breached), fill: '#ef4444' },
    ];
  })() : [];

  const specBarData = bySpec.map(r => ({
    name: r.specialist_name.length > 12 ? r.specialist_name.slice(0, 12) + '…' : r.specialist_name,
    fullName: r.specialist_name,
    Total: n(r.total),
    Resolvidos: n(r.resolved),
    Violações: n(r.fr_breached),
    'TM Resposta (h)': r.avg_first_response_min ? +(n(r.avg_first_response_min) / 60).toFixed(2) : 0,
  }));

  const domainBarData = byDomain.map(r => ({
    name: r.domain_name.length > 12 ? r.domain_name.slice(0, 12) + '…' : r.domain_name,
    fullName: r.domain_name,
    fill: r.domain_color ?? '#00d4d4',
    Total: n(r.total),
    Resolvidos: n(r.resolved),
    Violações: n(r.fr_breached),
  }));

  const seriesData = series.map(r => ({
    period: fmtPeriod(r.period),
    Total: n(r.total),
    Resolvidos: n(r.resolved),
    Violações: n(r.fr_breached),
    'TM Resposta (h)': r.avg_first_response_min ? +(n(r.avg_first_response_min) / 60).toFixed(2) : 0,
  }));

  // Cross-tab: pivot specialist × domain
  const crossSpecialists = [...new Set(cross.map(r => r.specialist_name))];
  const crossDomains     = [...new Set(cross.map(r => r.domain_name))];
  const crossMap: Record<string, Record<string, number>> = {};
  cross.forEach(r => {
    if (!crossMap[r.specialist_name]) crossMap[r.specialist_name] = {};
    crossMap[r.specialist_name][r.domain_name] = n(r.total);
  });

  const ov = overview?.overview;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-medium text-foreground">SLA de Atendimento</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitoramento de tickets, tempos de resposta e qualidade do atendimento
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          Atualizar
        </button>
      </div>

      <FilterBar filters={filters} onChange={changeFilter} specialists={specialists} domains={domains} />

      {loading ? (
        <div className="text-center text-muted-foreground py-20">Carregando dados...</div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total de tickets"   value={n(ov?.total).toString()}            color="#6366f1" Icon={TrendingUp} />
            <StatCard label="Resolvidos"          value={n(ov?.resolved).toString()}          color="#22c55e" Icon={CheckCircle2} />
            <StatCard label="Violações 1ª resp."  value={n(ov?.fr_breached).toString()}       color="#ef4444" Icon={AlertTriangle}
              sub={ov && n(ov.total) > 0 ? `${((n(ov.fr_breached)/n(ov.total))*100).toFixed(0)}% do total` : undefined} />
            <StatCard label="TM 1ª resposta"     value={min2h(ov?.avg_first_response_min)}   color="#f59e0b" Icon={Clock}
              sub={`Mediana ${min2h(ov?.median_first_response_min)} · P90 ${min2h(ov?.p90_first_response_min)}`} />
          </div>

          {/* Row 1: Status pie + SLA breach pie + série temporal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Distribuição por Status">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" nameKey="name" label={({ percent }: { percent?: number }) => percent ? `${(percent*100).toFixed(0)}%` : ''}
                    labelLine={false}>
                    {statusPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Violação de SLA (1ª Resposta)">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={slaBreachRate} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    dataKey="value" nameKey="name"
                    label={({ percent }: { percent?: number }) => percent && percent > 0.04 ? `${(percent*100).toFixed(0)}%` : ''}
                    labelLine={false}>
                    {slaBreachRate.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Volume ao Longo do Tempo">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={seriesData} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 20%)" />
                  <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'hsl(220 15% 55%)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(220 15% 55%)' }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Total"     stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Resolvidos" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Violações"  stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row 2: Por especialista (barra) + Por domínio (barra) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard title="Tickets por Especialista">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={specBarData} margin={{ top: 0, right: 8, bottom: 24, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 20%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220 15% 55%)' }} interval={0} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(220 15% 55%)' }} />
                  <Tooltip {...tooltipStyle} formatter={(v, n) => [v, n]} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Total"     fill="#6366f1" radius={[3,3,0,0]} maxBarSize={40} />
                  <Bar dataKey="Resolvidos" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={40} />
                  <Bar dataKey="Violações"  fill="#ef4444" radius={[3,3,0,0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Tickets por Domínio">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={domainBarData} margin={{ top: 0, right: 8, bottom: 24, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 20%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220 15% 55%)' }} interval={0} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(220 15% 55%)' }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Total"      fill="#00d4d4" radius={[3,3,0,0]} maxBarSize={40} />
                  <Bar dataKey="Resolvidos" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={40} />
                  <Bar dataKey="Violações"  fill="#ef4444" radius={[3,3,0,0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Row 3: Tempo médio de resposta por especialista (linha) */}
          <ChartCard title="Tempo Médio de 1ª Resposta ao Longo do Tempo (horas)">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={seriesData} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 20%)" />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'hsl(220 15% 55%)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(220 15% 55%)' }} unit="h" />
                <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v}h`, 'TM Resposta']} />
                <Line type="monotone" dataKey="TM Resposta (h)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Row 4: Cruzamento especialista × domínio */}
          {cross.length > 0 && (
            <ChartCard title="Cruzamento: Especialista × Domínio (tickets totais)">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Especialista</span>
                      </th>
                      {crossDomains.map(d => (
                        <th key={d} className="text-center py-2 px-3 text-muted-foreground font-medium">
                          <span className="flex items-center gap-1 justify-center"><Layers className="h-3 w-3" />{d}</span>
                        </th>
                      ))}
                      <th className="text-center py-2 px-3 text-muted-foreground font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crossSpecialists.map((spec) => {
                      const row = crossMap[spec] || {};
                      const rowTotal = Object.values(row).reduce((a, b) => a + b, 0);
                      const maxVal = Math.max(...Object.values(crossMap).flatMap(r => Object.values(r)));
                      return (
                        <tr key={spec} className="border-b border-border/20 hover:bg-secondary/20">
                          <td className="py-2 px-3 font-medium text-foreground">{spec}</td>
                          {crossDomains.map(d => {
                            const val = row[d] || 0;
                            const intensity = maxVal > 0 ? val / maxVal : 0;
                            return (
                              <td key={d} className="text-center py-2 px-3">
                                {val > 0 ? (
                                  <span className="inline-block px-2 py-0.5 rounded font-semibold text-foreground"
                                    style={{ background: `rgba(99,102,241,${0.1 + intensity * 0.7})` }}>
                                    {val}
                                  </span>
                                ) : <span className="opacity-25">—</span>}
                              </td>
                            );
                          })}
                          <td className="text-center py-2 px-3 font-semibold text-foreground">{rowTotal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}

          {/* Row 5: Tabelas detalhadas */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Por especialista */}
            <div className="rounded-outer border border-border/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30 bg-secondary/20">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                  Detalhes por Especialista
                </h3>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left px-4 py-2">Especialista</th>
                    <th className="text-right px-3 py-2">Total</th>
                    <th className="text-right px-3 py-2">Resolvidos</th>
                    <th className="text-right px-3 py-2">Violações</th>
                    <th className="text-right px-3 py-2">TM Resposta</th>
                  </tr>
                </thead>
                <tbody>
                  {bySpec.map((r, i) => (
                    <tr key={i} className="border-b border-border/15 hover:bg-secondary/20">
                      <td className="px-4 py-2 font-medium text-foreground">{r.specialist_name}</td>
                      <td className="text-right px-3 py-2">{n(r.total)}</td>
                      <td className="text-right px-3 py-2 text-green-400">{n(r.resolved)}</td>
                      <td className="text-right px-3 py-2 text-red-400">{n(r.fr_breached)}</td>
                      <td className="text-right px-3 py-2 font-mono">{min2h(r.avg_first_response_min)}</td>
                    </tr>
                  ))}
                  {bySpec.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Sem dados</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Por domínio */}
            <div className="rounded-outer border border-border/40 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30 bg-secondary/20">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                  Detalhes por Domínio
                </h3>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/30 text-muted-foreground">
                    <th className="text-left px-4 py-2">Domínio</th>
                    <th className="text-right px-3 py-2">Total</th>
                    <th className="text-right px-3 py-2">Resolvidos</th>
                    <th className="text-right px-3 py-2">Violações</th>
                    <th className="text-right px-3 py-2">TM Resposta</th>
                  </tr>
                </thead>
                <tbody>
                  {byDomain.map((r, i) => (
                    <tr key={i} className="border-b border-border/15 hover:bg-secondary/20">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {r.domain_color && (
                            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: r.domain_color }} />
                          )}
                          <span className="font-medium text-foreground">{r.domain_name}</span>
                        </div>
                      </td>
                      <td className="text-right px-3 py-2">{n(r.total)}</td>
                      <td className="text-right px-3 py-2 text-green-400">{n(r.resolved)}</td>
                      <td className="text-right px-3 py-2 text-red-400">{n(r.fr_breached)}</td>
                      <td className="text-right px-3 py-2 font-mono">{min2h(r.avg_first_response_min)}</td>
                    </tr>
                  ))}
                  {byDomain.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Sem dados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </motion.div>
      )}
    </div>
  );
}
