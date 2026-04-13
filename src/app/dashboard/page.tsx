'use client';

import { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import {
  Building2, Zap, FileText, AlertCircle,
  TrendingUp, Clock, CheckCircle2, Mail
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import useSWR from 'swr';
import { DashboardStats, ChartData, Fatura, Alerta } from '@/types';

const MONTH_NAMES: Record<string, string> = {};
for (let i = 0; i < 12; i++) {
  const d = new Date(2026, i, 1);
  MONTH_NAMES[String(i + 1).padStart(2, '0')] = format(d, 'MMM', { locale: ptBR });
}

function formatChartLabel(name: string): string {
  // "2026-03" → "Mar"
  const parts = name.split('-');
  if (parts.length === 2) {
    return MONTH_NAMES[parts[1]] || name;
  }
  // Truncate long names
  return name.length > 12 ? name.slice(0, 12) + '…' : name;
}

type ChartGroup = 'mes' | 'concessionaria' | 'condominio';

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Chart controls
  const [chartMonths, setChartMonths] = useState(6);
  const [chartGroup, setChartGroup] = useState<ChartGroup>('mes');

  // SWR: Fetch consolidated stats from dedicated backend endpoint (SQL COUNT)
  const { data: stats, isLoading: loadingStats } = useSWR<DashboardStats>('dashboardStats', async () => {
    const [kpis, latestFaturas, alertas] = await Promise.all([
      api.getDashboardKpis(),
      api.getFaturas({ limit: 5 }),
      api.getAlertas({ limit: 5, resolvido: false }),
    ]);
    return {
      condominiosCount: kpis.condominios_count,
      faturas: latestFaturas as Fatura[],
      alertas: alertas as Alerta[],
      activeAlerts: kpis.active_alerts,
      recebidasHoje: kpis.recebidas_hoje,
    };
  }, { revalidateOnFocus: true });

  const { data: contasEsperadas } = useSWR('dashboardContas', 
    () => api.getDashboardContasEsperadas().catch(() => null)
  );

  const { data: chartData, isLoading: chartLoading } = useSWR<ChartData[]>(
    ['dashboardChart', chartMonths, chartGroup],
    () => api.getDashboardChart(chartMonths, chartGroup).catch(() => [])
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Reload chart when filters change (now handled automatically by SWR keys)
  const handleChartFilterChange = (months: number, group: ChartGroup) => {
    setChartMonths(months);
    setChartGroup(group);
  };

  if (loadingStats) {
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div className="dc-loading-spinner" />
        </div>
      </Shell>
    );
  }

  // Format contas esperadas
  const contasLabel = contasEsperadas
    ? `${contasEsperadas.recebidas}/${contasEsperadas.total_esperadas}`
    : '...';

  // Determine if bar chart makes more sense for grouping
  const useBarChart = chartGroup !== 'mes';

  return (
    <Shell>
      {/* Page header */}
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title">Painel Operacional</h1>
          <p className="dc-page-subtitle">
            Bem-vindo, {user?.nome || 'Operador'}. Veja o resumo das operações de hoje.
          </p>
        </div>
        <div
          className="dc-btn dc-btn-secondary"
          style={{ gap: 8, cursor: 'default' }}
        >
          <Clock size={16} style={{ color: '#2563eb' }} />
          {format(currentTime, "dd 'de' MMMM 'de' yyyy '·' HH:mm", { locale: ptBR })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dc-stats-grid">
        <StatCard
          title="Condomínios"
          value={String(stats?.condominiosCount || 0)}
          icon={<Building2 size={22} />}
          color="#eff6ff"
          iconColor="#2563eb"
          badge="Ativos"
          badgeColor="#16a34a"
        />
        <StatCard
          title="Contas Esperadas"
          value={contasLabel}
          icon={<Zap size={22} />}
          color="#fffbeb"
          iconColor="#d97706"
          badge={contasEsperadas ? `Recebidas em ${format(new Date(), 'MMMM', { locale: ptBR })}` : 'Ciclo Mensal'}
          badgeColor="#64748b"
        />
        <StatCard
          title="Recebidas Hoje"
          value={String(stats?.recebidasHoje || 0)}
          icon={<FileText size={22} />}
          color="#f0fdf4"
          iconColor="#16a34a"
          badge="Novas faturas"
          badgeColor="#16a34a"
          positive
        />
        <StatCard
          title="Alertas Ativos"
          value={String(stats?.activeAlerts || 0)}
          icon={<AlertCircle size={22} />}
          color="#fef2f2"
          iconColor="#dc2626"
          badge="Atenção requerida"
          badgeColor="#dc2626"
        />
      </div>

      {/* Main chart + alerts */}
      <div className="dc-dashboard-main">
        {/* Chart */}
        <div className="dc-card">
          <div className="dc-card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <span className="dc-card-title">
              {chartGroup === 'mes' ? 'Volume de Faturamento (R$)' : 
               chartGroup === 'concessionaria' ? 'Volume por Concessionária (R$)' :
               'Volume por Condomínio (R$)'}
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {/* Group selector */}
              <select
                value={chartGroup}
                onChange={e => handleChartFilterChange(chartMonths, e.target.value as ChartGroup)}
                style={{
                  height: 34, padding: '0 12px', borderRadius: 8,
                  border: '1px solid #e2e8f0', background: '#f8fafc',
                  fontSize: '0.82rem', fontWeight: 700, color: '#64748b',
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                <option value="mes">Por Mês</option>
                <option value="concessionaria">Por Concessionária</option>
                <option value="condominio">Por Condomínio</option>
              </select>
              {/* Period selector (only for monthly view) */}
              {chartGroup === 'mes' && (
                <select
                  value={chartMonths}
                  onChange={e => handleChartFilterChange(Number(e.target.value), chartGroup)}
                  style={{
                    height: 34, padding: '0 12px', borderRadius: 8,
                    border: '1px solid #e2e8f0', background: '#f8fafc',
                    fontSize: '0.82rem', fontWeight: 700, color: '#64748b',
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  <option value={6}>Últimos 6 meses</option>
                  <option value={12}>Últimos 12 meses</option>
                </select>
              )}
            </div>
          </div>
          <div style={{ padding: '24px', height: 280, position: 'relative' }}>
            {chartLoading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
                <div className="dc-loading-spinner" />
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              {useBarChart ? (
                <BarChart data={chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={8} interval={0} angle={(chartData || []).length > 8 ? -30 : 0} textAnchor={(chartData || []).length > 8 ? "end" : "middle"} tickFormatter={formatChartLabel} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v: any) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 13 }}
                    formatter={(v: any) => [formatCurrency(Number(v)), 'Total']}
                  />
                  <Bar dataKey="valor" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={chartData || []}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={8} tickFormatter={formatChartLabel} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v: any) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 13 }}
                    formatter={(v: any) => [formatCurrency(Number(v)), 'Total']}
                  />
                  <Area type="monotone" dataKey="valor" stroke="#2563eb" strokeWidth={2.5} fill="url(#grad)" dot={false} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts panel */}
        <div className="dc-card dc-card-p" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span className="dc-card-title">Alertas Críticos</span>
            <button className="dc-card-link" onClick={() => router.push('/alertas')}>Ver todos →</button>
          </div>
          <div className="dc-space-y-3">
            {stats?.alertas?.map((a: any) => (
              <div key={a.id} className="dc-alert-item" onClick={() => router.push('/alertas')}>
                <div className={`dc-alert-icon-wrap ${a.gravidade === 'alta' ? 'high' : 'medium'}`}>
                  <AlertCircle size={18} />
                </div>
                <div className="dc-alert-content">
                  <div className="dc-alert-msg">{a.mensagem}</div>
                  <div className="dc-alert-date">
                    <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
                    {a.created_at ? format(new Date(a.created_at), "dd/MM/yyyy 'às' HH:mm") : '—'}
                  </div>
                </div>
              </div>
            ))}
            {(stats?.alertas?.length === 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', color: '#94a3b8', gap: 8 }}>
                <CheckCircle2 size={36} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tudo sob controle</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: table + agent */}
      <div className="dc-dashboard-bottom">
        {/* Latest bills table */}
        <div className="dc-card">
          <div className="dc-card-header">
            <span className="dc-card-title">Últimas Faturas Recebidas</span>
            <button className="dc-card-link" onClick={() => router.push('/faturas')}>Ver todas →</button>
          </div>
          <div className="dc-table-wrapper">
            <table className="dc-table">
              <thead>
                <tr>
                  <th>Condomínio</th>
                  <th>Concessionária/Ref</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats?.faturas?.map((f: any) => (
                  <tr key={f.id} onClick={() => router.push('/faturas')} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="dc-cell-primary">{f.condominio?.nome || 'Processando...'}</div>
                      <div className="dc-cell-secondary">ID: {f.id.slice(0,8)}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="dc-type-badge dc-type-E">
                          {f.referencia.charAt(0)}
                        </div>
                        <div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>{f.referencia}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Original: {f.pdf_nome_original || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {f.vencimento ? format(new Date(f.vencimento), "dd/MM/yyyy") : '—'}
                    </td>
                    <td>
                      <span className="dc-cell-primary">{formatCurrency(f.valor)}</span>
                    </td>
                    <td>
                      <span className={`dc-badge ${f.status === 'processada' ? 'dc-badge-green' : 'dc-badge-amber'}`}>
                        <span className="dc-badge-dot" />
                        {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
                {(stats?.faturas?.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      Nenhuma fatura recebida recentemente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Agent monitoring */}
        <div className="dc-card dc-card-p" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ marginBottom: 18 }}>
            <span className="dc-card-title">Monitoramento do Agente IA</span>
          </div>
          <div className="dc-space-y-3">
             <div className="dc-pending-item">
              <div className="dc-pending-left">
                <div className="dc-pending-icon"><Zap size={18} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="dc-pending-name">Agente Processador</div>
                  <div className="dc-pending-desc">Status: Online · Varrendo Gmail</div>
                </div>
              </div>
              {user?.role === 'admin' && (
                <button 
                  className="dc-btn dc-btn-ghost" 
                  style={{ height: 32, padding: '0 12px', fontSize: '0.78rem' }}
                  onClick={async () => {
                    try {
                      await api.forceEmailScan();
                      alert("Varredura forçada enviada!");
                    } catch (err: any) {
                      alert(err.message || "Erro ao forçar varredura");
                    }
                  }}
                >
                  Forçar Varredura
                </button>
              )}
            </div>
          <div
            style={{
              marginTop: 24,
              padding: '14px',
              borderRadius: 10,
              border: '1px dashed #e2e8f0',
              textAlign: 'center',
              fontSize: '0.82rem',
              color: '#94a3b8',
              fontWeight: 600,
            }}
          >
            Monitorando e-mails a cada 5 minutos
          </div>
        </div>
      </div>
    </Shell>
  );
}

function StatCard({ title, value, icon, color, iconColor, badge, badgeColor, positive }: {
  title: string; value: string; icon: React.ReactNode;
  color: string; iconColor: string; badge: string; badgeColor: string; positive?: boolean;
}) {
  return (
    <div className="dc-stat-card">
      <div className="dc-stat-top">
        <div className="dc-stat-icon" style={{ background: color, color: iconColor }}>{icon}</div>
        <div className={`dc-stat-badge${positive ? ' positive' : ''}`} style={{ color: badgeColor, background: positive ? '#f0fdf4' : '#f1f5f9' }}>
          {positive ? <TrendingUp size={11} /> : <Clock size={11} />}
          {badge}
        </div>
      </div>
      <div>
        <div className="dc-stat-label">{title}</div>
        <div className="dc-stat-value">{value}</div>
      </div>
    </div>
  );
}
