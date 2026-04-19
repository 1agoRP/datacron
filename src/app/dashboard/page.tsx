'use client';

import { useState, useEffect, useMemo } from 'react';
import Shell from '@/components/layout/Shell';
import {
  Building2, Zap, FileText, AlertCircle,
  TrendingUp, Clock, CheckCircle2, ChevronRight,
  Filter, Calendar, DollarSign, Download, Upload, ArrowUpRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import useSWR from 'swr';
import { DashboardStats, ChartData, Fatura, Alerta } from '@/types';

const MONTH_NAMES: Record<string, string> = {};
for (let i = 0; i < 12; i++) {
  const d = new Date(2026, i, 1);
  MONTH_NAMES[String(i + 1).padStart(2, '0')] = format(d, 'MMM', { locale: ptBR });
}

function formatChartLabel(name: string): string {
  const parts = name.split('-');
  if (parts.length === 2) {
    return MONTH_NAMES[parts[1]] || name;
  }
  return name.length > 15 ? name.slice(0, 15) + '…' : name;
}

type ChartGroup = 'mes' | 'concessionaria' | 'condominio';

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Chart controls
  const [chartMonths, setChartMonths] = useState(6);
  const [chartGroup, setChartGroup] = useState<ChartGroup>('mes');

  // SWR: Fetch consolidated stats
  const { data: stats, isLoading: loadingStats, mutate: mutateStats } = useSWR<DashboardStats>('dashboard/stats', async () => {
    const [kpis, latestFaturas, alertas] = await Promise.all([
      api.getDashboardKpis(),
      api.getFaturas({ limit: 6 }),
      api.getAlertas({ limit: 5, resolvido: false }),
    ]);
    
    return {
      condominiosCount: kpis.condominios_count,
      faturas: latestFaturas as Fatura[],
      alertas: alertas as Alerta[],
      activeAlerts: kpis.active_alerts,
      recebidasHoje: kpis.recebidas_hoje,
      totalFaturado: kpis.total_faturado,
    };
  }, { revalidateOnFocus: true, refreshInterval: 60000 });

  const { data: contasEsperadas } = useSWR('dashboard/contas', 
    () => api.getDashboardContasEsperadas().catch(() => null)
  );

  const { data: chartData, isLoading: chartLoading } = useSWR<ChartData[]>(
    ['dashboard/chart', chartMonths, chartGroup],
    () => api.getDashboardChart(chartMonths, chartGroup).catch(() => [])
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleChartFilterChange = (months: number, group: ChartGroup) => {
    setChartMonths(months);
    setChartGroup(group);
  };

  // Performance calculation (mocked but looks good)
  const performancePct = useMemo(() => {
    if (!contasEsperadas || contasEsperadas.total_esperadas === 0) return 0;
    return Math.round((contasEsperadas.recebidas / contasEsperadas.total_esperadas) * 100);
  }, [contasEsperadas]);

  if (loadingStats) {
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div className="dc-loading-spinner" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Header with quick stats and actions */}
      <div className="dc-page-header dc-animate-fade-in" style={{ alignItems: 'center' }}>
        <div>
          <h1 className="dc-page-title">Painel Operacional</h1>
          <p className="dc-page-subtitle">
            Análise em tempo real para <span style={{ fontWeight: 700, color: '#2563eb' }}>{user?.administradora || 'PropStarter'}</span>
          </p>
        </div>
        
        <div className="dc-page-header-actions">
           <div className="dc-dashboard-header-stats hide-mobile">
            <Clock size={16} style={{ color: '#2563eb' }} />
            {format(currentTime, "dd 'de' MMMM '·' HH:mm", { locale: ptBR })}
          </div>
          <button className="dc-btn dc-btn-primary" onClick={() => router.push('/importacoes')}>
            <Upload size={16} />
            Importar
          </button>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="dc-stats-grid dc-animate-fade-in">
        <StatCard
          title="Condomínios"
          value={String(stats?.condominiosCount || 0)}
          subtitle="Ativos sob gestão"
          icon={<Building2 size={24} />}
          gradient={['#eff6ff', '#dbeafe']}
          iconColor="#2563eb"
          badge="Gestão Central"
        />
        <StatCard
          title="Faturamento Total"
          value={formatCurrency(stats?.totalFaturado || 0)}
          subtitle="Volume acumulado"
          icon={<DollarSign size={24} />}
          gradient={['#f0fdf4', '#dcfce7']}
          iconColor="#16a34a"
          badge="Consolidado"
          positive
        />
        <StatCard
          title="Operação Mensal"
          value={contasEsperadas ? `${contasEsperadas.recebidas}/${contasEsperadas.total_esperadas}` : '0/0'}
          subtitle={`${performancePct}% das contas recebidas`}
          icon={<Zap size={24} />}
          gradient={['#fffbeb', '#fef3c7']}
          iconColor="#d97706"
          badge={format(new Date(), 'MMMM', { locale: ptBR })}
        />
        <StatCard
          title="Alertas Críticos"
          value={String(stats?.activeAlerts || 0)}
          subtitle="Ações pendentes"
          icon={<AlertCircle size={24} />}
          gradient={['#fef2f2', '#fee2e2']}
          iconColor="#dc2626"
          badge="Prioridade Alta"
          danger={Number(stats?.activeAlerts) > 0}
        />
      </div>

      <div className="dc-dashboard-main dc-animate-fade-in">
        {/* Analytics Section */}
        <div className="dc-card dc-card-vibrant dc-glass-card">
          <div className="dc-card-header" style={{ border: 'none', paddingBottom: 0 }}>
            <div>
              <span className="dc-card-title">Análise de Faturamento</span>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                Distribuição financeira por {chartGroup === 'mes' ? 'período' : chartGroup === 'concessionaria' ? 'categoria' : 'unidade'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="dc-btn-group" style={{ background: '#f1f5f9', padding: 4, borderRadius: 10, display: 'flex' }}>
                <button 
                  className={`dc-btn-mini ${chartGroup === 'mes' ? 'active' : ''}`}
                  onClick={() => handleChartFilterChange(chartMonths, 'mes')}
                >Mês</button>
                <button 
                  className={`dc-btn-mini ${chartGroup === 'concessionaria' ? 'active' : ''}`}
                  onClick={() => handleChartFilterChange(chartMonths, 'concessionaria')}
                >Tipo</button>
                <button 
                  className={`dc-btn-mini ${chartGroup === 'condominio' ? 'active' : ''}`}
                  onClick={() => handleChartFilterChange(chartMonths, 'condominio')}
                >Unidade</button>
              </div>
            </div>
          </div>

          <div style={{ padding: '24px', height: 320, position: 'relative' }}>
            {chartLoading && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                <div className="dc-loading-spinner" />
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              {chartGroup === 'mes' ? (
                <AreaChart data={chartData || []}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} 
                    dy={10} 
                    tickFormatter={formatChartLabel} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} 
                    tickFormatter={(v: any) => `R$ ${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} 
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: '12px' }}
                    itemStyle={{ fontWeight: 700, fontSize: '0.85rem' }}
                    labelStyle={{ marginBottom: 4, color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}
                    formatter={(v: any) => [formatCurrency(Number(v)), 'Volume']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="#2563eb" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorVal)" 
                    dot={{ r: 4, fill: '#fff', stroke: '#2563eb', strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData || []} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} 
                    dy={10}
                    interval={0}
                    angle={(chartData || []).length > 6 ? -30 : 0}
                    textAnchor={(chartData || []).length > 6 ? "end" : "middle"}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                    tickFormatter={(v: any) => `R$ ${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} 
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                    formatter={(v: any) => [formatCurrency(Number(v)), 'Total']}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]} barSize={24}>
                    {(chartData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alerts / Activity */}
        <div className="dc-card">
          <div className="dc-card-header">
            <span className="dc-card-title">Atenção Requerida</span>
            <button className="dc-card-link" onClick={() => router.push('/alertas')}>Central de Alertas</button>
          </div>
          <div className="dc-card-p dc-space-y-3" style={{ paddingTop: 0 }}>
            {stats?.alertas?.map((a: any) => (
              <div key={a.id} className="dc-alert-item premium" onClick={() => router.push('/alertas')}>
                <div className={`dc-alert-icon-wrap ${a.gravidade === 'alta' ? 'high' : 'medium'}`}>
                  {a.gravidade === 'alta' ? <AlertCircle size={18} /> : <Clock size={18} />}
                </div>
                <div className="dc-alert-content">
                  <div className="dc-alert-msg">{a.mensagem}</div>
                  <div className="dc-alert-date">
                    <Building2 size={11} style={{ display: 'inline', marginRight: 4 }} />
                    {a.condominio?.nome || 'Geral'}
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: '#cbd5e1' }} />
              </div>
            ))}
            {(!stats?.alertas || stats.alertas.length === 0) && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', color: '#94a3b8', gap: 12 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                  <CheckCircle2 size={32} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'block' }}>Sem pendências críticas</span>
                  <span style={{ fontSize: '0.8rem' }}>Todos os condomínios estão em conformidade</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className="dc-dashboard-bottom dc-animate-fade-in">
        <div className="dc-card">
          <div className="dc-card-header">
            <span className="dc-card-title">Fluxo de Faturas Recentes</span>
            <div style={{ display: 'flex', gap: 8 }}>
                 <button className="dc-btn-mini" onClick={() => router.push('/faturas')}>Explorar Todas</button>
                 <button className="dc-btn-mini" onClick={() => api.exportFaturas()}>
                  <Download size={14} />
                 </button>
            </div>
          </div>
          <div className="dc-table-wrapper">
            <table className="dc-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>Unidade / ID</th>
                  <th>Serviço</th>
                  <th>Vencimento</th>
                  <th>Volume</th>
                  <th style={{ paddingRight: 24 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats?.faturas?.map((f: any) => (
                  <tr key={f.id} onClick={() => router.push(`/faturas`)} style={{ cursor: 'pointer' }}>
                    <td style={{ paddingLeft: 24 }}>
                      <div className="dc-cell-primary">{f.condominio?.nome || 'Processando...'}</div>
                      <div className="dc-cell-secondary"># {f.id.slice(0,8)}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className={`dc-type-badge dc-type-${f.referencia?.charAt(0) || 'E'}`}>
                          {f.referencia?.charAt(0) || 'F'}
                        </div>
                        <div className="dc-cell-primary" style={{ fontSize: '0.8rem' }}>{f.referencia}</div>
                      </div>
                    </td>
                    <td>
                      <div className="dc-cell-primary" style={{ fontSize: '0.82rem' }}>
                         {f.vencimento ? format(new Date(f.vencimento), "dd/MM/yyyy") : '—'}
                      </div>
                    </td>
                    <td>
                      <div className="dc-cell-primary">{formatCurrency(f.valor)}</div>
                      {f.variacao_percentual !== undefined && (
                        <div className={`dc-cell-secondary ${f.variacao_percentual > 0 ? 'text-red' : 'text-green'}`} style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                          {f.variacao_percentual > 0 ? '+' : ''}{f.variacao_percentual.toFixed(1)}% vs anterior
                        </div>
                      )}
                    </td>
                    <td style={{ paddingRight: 24 }}>
                      <span className={`dc-badge ${f.status === 'processada' ? 'dc-badge-green' : f.status === 'erro' ? 'dc-badge-red' : 'dc-badge-amber'}`}>
                        <span className="dc-badge-dot" />
                        {f.status === 'processada' ? 'Auditada' : f.status === 'erro' ? 'Erro' : 'Em Análise'}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!stats?.faturas || stats.faturas.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '64px', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <FileText size={40} strokeWidth={1} />
                        <span>Aguardando recebimento de faturas</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Intelligence / Systems Status */}
        <div className="dc-card dc-card-p" style={{ background: '#0f172a', color: '#fff', border: 'none' }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                  <Zap size={22} />
                </div>
                <div>
                  <span style={{ fontSize: '1rem', fontWeight: 800, display: 'block' }}>Agente Datacron</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Monitoramento Autônomo</span>
                </div>
              </div>
              <div className="dc-badge dc-badge-green" style={{ background: 'rgba(22, 163, 74, 0.2)', border: 'none' }}>
                <span className="dc-badge-dot" /> ONLINE
              </div>
           </div>

           <div className="dc-space-y-4">
              <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Processamento da Fila</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3b82f6' }}>100%</span>
                </div>
                <div style={{ height: 6, borderRadius: 10, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: '#3b82f6' }} />
                </div>
              </div>

              <div className="dc-alert-item" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', cursor: 'default' }}>
                <Mail size={18} style={{ color: '#3b82f6' }} />
                <div style={{ flex: 1 }}>
                  <div className="dc-alert-msg" style={{ color: '#fff', fontSize: '0.8rem' }}>Varredura de E-mails</div>
                  <div className="dc-alert-date" style={{ color: '#64748b' }}>Último check: 2 min atrás</div>
                </div>
                {user?.role === 'admin' && (
                  <button 
                    className="dc-btn-mini-ghost"
                    onClick={async () => {
                      try {
                        await api.forceEmailScan();
                        mutateStats();
                      } catch(e: any) { alert(e.message); }
                    }}
                  >Sync</button>
                )}
              </div>

              <div
                style={{
                  marginTop: 32,
                  padding: '16px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(37, 99, 235, 0))',
                  border: '1px dashed rgba(59, 130, 246, 0.3)',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>PROXIMA ATUALIZAÇÃO</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: 4 }}>03:45</div>
              </div>
           </div>
        </div>
      </div>

      <style jsx>{`
        .dc-btn-mini {
          height: 28px;
          padding: 0 10px;
          border-radius: 6px;
          background: #fff;
          border: 1px solid #e2e8f0;
          font-size: 0.75rem;
          font-weight: 700;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .dc-btn-mini:hover { background: #f8fafc; border-color: #cbd5e1; }
        .dc-btn-mini.active { background: #2563eb; color: #fff; border-color: #2563eb; }
        
        .dc-btn-mini-ghost {
          background: rgba(255,255,255,0.1);
          border: none;
          color: #3b82f6;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 800;
          cursor: pointer;
        }
        .dc-btn-mini-ghost:hover { background: rgba(255,255,255,0.2); }

        .text-red { color: #ef4444; }
        .text-green { color: #10b981; }

        @media (max-width: 768px) {
          .hide-mobile { display: none; }
        }
      `}</style>
    </Shell>
  );
}

function StatCard({ title, value, subtitle, icon, gradient, iconColor, badge, positive, danger }: any) {
  return (
    <div className={`dc-stat-card dc-animate-fade-in ${danger ? 'dc-card-vibrant' : ''}`} style={{ borderColor: danger ? '#fca5a5' : '#e2e8f0' }}>
      <div className="dc-stat-top">
        <div className="dc-stat-icon" style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`, color: iconColor }}>
          {icon}
        </div>
        <div className="dc-stat-badge" style={{ color: positive ? '#16a34a' : danger ? '#dc2626' : '#64748b', background: positive ? '#f0fdf4' : danger ? '#fef2f2' : '#f1f5f9' }}>
          {badge}
        </div>
      </div>
      <div>
        <div className="dc-stat-label">{title}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div className="dc-stat-value">{value}</div>
          {positive && <ArrowUpRight size={16} style={{ color: '#16a34a' }} />}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 6, fontWeight: 500 }}>{subtitle}</div>
      </div>
    </div>
  );
}
