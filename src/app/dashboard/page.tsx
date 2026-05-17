'use client';

import { useState, useEffect, useMemo } from 'react';
import Shell from '@/components/layout/Shell';
import {
  Building2, FileText, AlertCircle, Zap,
  TrendingUp, Clock, CheckCircle2, ChevronRight,
  Filter, Calendar, DollarSign, Download, Upload, ArrowUpRight,
  FileSignature, X, Paperclip
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

// Roles that cannot see the billing analysis chart
const BILLING_HIDDEN_ROLES = ['assistente', 'concessionarias', 'contabilidade', 'emissao', 'gerencia', 'orcamento', 'orçamento'];

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Chart controls
  const [chartMonths, setChartMonths] = useState(6);
  const [chartGroup, setChartGroup] = useState<ChartGroup>('mes');
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);

  // Quick Upload Modal State
  const [isQuickUploadOpen, setIsQuickUploadOpen] = useState(false);
  const [quickUploadPdf, setQuickUploadPdf] = useState<File | null>(null);
  const [quickUploadCondo, setQuickUploadCondo] = useState<string>('');
  const [quickUploadConc, setQuickUploadConc] = useState<string>('');
  const [quickUploadValor, setQuickUploadValor] = useState('');
  const [quickUploadVencimento, setQuickUploadVencimento] = useState('');
  const [savingQuickUpload, setSavingQuickUpload] = useState(false);

  const { data: condominios } = useSWR(isQuickUploadOpen ? 'condominios' : null, () => api.getCondominios());
  const { data: concessionarias } = useSWR(isQuickUploadOpen ? 'concessionarias' : null, () => api.getConcessionarias());

  const filteredConcessionarias = useMemo(() => {
    if (!concessionarias || !quickUploadCondo) return [];
    return concessionarias.filter((c: any) => c.condominio_id === quickUploadCondo);
  }, [concessionarias, quickUploadCondo]);

  // Redirection logic for restricted roles
  useEffect(() => {
    if (user) {
      const restrictedRoles = ['concessionarias', 'contabilidade', 'emissao', 'orçamento'];
      if (restrictedRoles.includes(user.role)) {
        router.replace('/condominios');
      }
    }
  }, [user, router]);

  // SWR: Fetch consolidated stats
  const {
    data: stats,
    isLoading: loadingStats,
    error: errorStats,
  } = useSWR<DashboardStats>('dashboard/stats', async () => {
    try {
      const data = await api.getDashboardStats();
      return {
        condominiosCount: data.kpis.condominios_count,
        faturas: data.kpis.faturas as Fatura[],
        alertas: data.kpis.alertas as Alerta[],
        activeAlerts: data.kpis.active_alerts,
        critical_alerts: data.kpis.critical_alerts,
        recebidasHoje: data.kpis.recebidas_hoje,
        totalFaturado: data.kpis.total_faturado,
        condosSemAta: data.kpis.condos_sem_ata,
      };
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      throw err;
    }
  }, { revalidateOnFocus: false, refreshInterval: 300000 });

  const { data: contasEsperadas } = useSWR('dashboard/contas',
    () => api.getDashboardContasEsperadas().catch(() => null),
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  const { data: portfolioStats, isLoading: loadingPortfolio } = useSWR('dashboard/portfolio-stats',
    () => (user?.role === 'admin' || user?.role === 'supervisor') ? api.getPortfolioStats() : null,
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  const { data: chartData, isLoading: chartLoading } = useSWR<ChartData[]>(
    ['dashboard/chart', chartMonths, chartGroup],
    () => api.getDashboardChart(chartMonths, chartGroup).catch(() => [])
  );

  const { data: contasPorCondo, isLoading: loadingPorCondo } = useSWR('dashboard/contas-por-condo',
    () => api.getContasPorCondominio().then(data => data.map(c => ({
      ...c,
      displayName: `${c.numero} - ${c.nome}`
    }))).catch(() => []),
    { revalidateOnFocus: false, refreshInterval: 300000 }
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleChartFilterChange = (months: number, group: ChartGroup) => {
    setChartMonths(months);
    setChartGroup(group);
  };

  const performancePct = useMemo(() => {
    if (!contasEsperadas || contasEsperadas.total_esperadas === 0) return 0;
    return Math.round((contasEsperadas.recebidas / contasEsperadas.total_esperadas) * 100);
  }, [contasEsperadas]);

  if ((loadingStats && !stats) || (loadingPortfolio && !portfolioStats)) {
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div className="dc-loading-spinner" />
        </div>
      </Shell>
    );
  }

  const isCoordinator = user?.role === 'admin' || user?.role === 'supervisor';
  const canSeeBillingChart = !BILLING_HIDDEN_ROLES.includes(user?.role || '');

  return (
    <Shell>
      {/* Header with quick stats and actions */}
      <div className="dc-page-header dc-animate-fade-in" style={{ alignItems: 'center' }}>
        <div>
          <h1 className="dc-page-title">{isCoordinator ? 'Dashboard de Coordenação' : 'Painel Operacional'}</h1>
          <p className="dc-page-subtitle">
            Análise em tempo real para <span style={{ fontWeight: 700, color: '#2563eb' }}>{user?.administradora || 'PropStarter'}</span>
          </p>
        </div>

        <div className="dc-page-header-actions">
          <div className="dc-dashboard-header-stats hide-mobile">
            <Clock size={16} style={{ color: '#2563eb' }} />
            {format(currentTime, "dd 'de' MMMM '·' HH:mm", { locale: ptBR })}
          </div>
          {user?.role === 'admin' && (
            <button className="dc-btn dc-btn-primary" onClick={() => router.push('/importacoes')}>
              <Upload size={16} />
              Importar
            </button>
          )}
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
        {user?.role === 'admin' ? (
          <StatCard
            title="Faturamento"
            value={formatCurrency(stats?.totalFaturado || 0)}
            subtitle="Volume no mês vigente"
            icon={<DollarSign size={24} />}
            gradient={['#f0fdf4', '#dcfce7']}
            iconColor="#16a34a"
            badge={format(new Date(), 'MMMM', { locale: ptBR })}
            positive
          />
        ) : (
          <StatCard
            title="Ata de Eleição"
            value={String(stats?.condosSemAta || 0)}
            subtitle="Condomínios s/ ata vinculada"
            icon={<FileSignature size={24} />}
            gradient={['#fef2f2', '#fee2e2']}
            iconColor="#dc2626"
            badge="Pendente"
            danger={Number(stats?.condosSemAta) > 0}
          />
        )}
        <StatCard
          title="Faturas Processadas"
          value={contasEsperadas ? `${contasEsperadas.recebidas}/${contasEsperadas.total_esperadas}` : '0/0'}
          subtitle={`${performancePct}% da meta mensal`}
          icon={<Zap size={24} />}
          gradient={['#fffbeb', '#fef3c7']}
          iconColor="#d97706"
          badge={format(new Date(), 'MMMM', { locale: ptBR })}
        />
        <StatCard
          title="Alertas Críticos"
          value={String(stats?.critical_alerts || 0)}
          subtitle="Alta prioridade pendente"
          icon={<AlertCircle size={24} />}
          gradient={['#fef2f2', '#fee2e2']}
          iconColor="#dc2626"
          badge="Ação Imediata"
          danger={Number(stats?.critical_alerts) > 0}
        />
      </div>

      <div className="dc-dashboard-main dc-animate-fade-in">
        {isCoordinator ? (
          /* Specialized Dashboard for Admin/Supervisor */
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="dc-card">
              <div className="dc-card-header">
                <div>
                  <span className="dc-card-title">Progresso por Carteira</span>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                    Acompanhamento de recebimento de faturas por equipe (Meta: 100%)
                  </p>
                </div>
              </div>
              <div style={{ padding: '24px' }}>
                <div className="dc-portfolio-grid">
                  {portfolioStats?.map((p: any) => (
                    <div key={p.carteira} className="dc-portfolio-item">
                      <div className="dc-portfolio-header">
                        <span className="dc-portfolio-name">{p.nome}</span>
                        <span className="dc-portfolio-pct">{p.progresso}%</span>
                      </div>
                      <div className="dc-progress-bar-bg">
                        <div
                          className="dc-progress-bar-fill"
                          style={{
                            width: `${p.progresso}%`,
                            background: p.progresso > 90 ? '#10b981' : p.progresso > 50 ? '#3b82f6' : '#f59e0b'
                          }}
                        />
                      </div>
                      <div className="dc-portfolio-footer">
                        <div className="dc-portfolio-stat">
                          <CheckCircle2 size={12} />
                          {p.contas_recebidas}/{p.contas_esperadas}
                        </div>
                        <div className="dc-portfolio-stat" style={{ color: p.alertas_pendentes > 0 ? '#dc2626' : '#64748b' }}>
                          <AlertCircle size={12} />
                          {p.alertas_pendentes} pendências
                        </div>
                        {p.condos_sem_ata > 0 && (
                          <div className="dc-portfolio-stat" style={{ color: '#f59e0b' }}>
                            <FileSignature size={12} />
                            {p.condos_sem_ata} s/ ata
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Analytics Section — hidden for restricted roles */}
            {canSeeBillingChart && (
              <div className="dc-card dc-card-vibrant dc-glass-card" style={{ gridColumn: '1 / -1' }}>
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
                      >Condomínio</button>
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
                          tickFormatter={(v: any) => `R$ ${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
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
                          tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 16) + '…' : v}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                          tickFormatter={(v: any) => `R$ ${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
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
            )}

            {/* Performance by Condominium Chart */}
            <div className="dc-card" style={{ gridColumn: '1 / -1' }}>
              <div className="dc-card-header">
                <div>
                  <span className="dc-card-title">Desempenho por Condomínio</span>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                    Relação entre contas esperadas (azul) e recebidas (verde) para o mês vigente
                  </p>
                </div>
                <div className="dc-badge" style={{ background: '#f1f5f9', color: '#64748b', fontWeight: 700 }}>
                  {format(new Date(), 'MMMM', { locale: ptBR }).toUpperCase()}
                </div>
              </div>
              <div style={{ padding: '24px 24px 0 24px', height: 350, position: 'relative', overflow: 'hidden' }}>
                {loadingPorCondo && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                    <div className="dc-loading-spinner" />
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contasPorCondo || []} margin={{ bottom: 80, left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="displayName"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }}
                      interval={0}
                      angle={-40}
                      textAnchor="end"
                      height={90}
                      tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 20) + '…' : v}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: '12px' }}
                      itemStyle={{ fontSize: '0.8rem', fontWeight: 700 }}
                    />
                    <Bar dataKey="esperadas" name="Esperadas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={15} />
                    <Bar dataKey="recebidas" name="Recebidas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={15} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Alertas e Atividade */}
      <div className="dc-dashboard-main dc-animate-fade-in" style={{ marginTop: 24 }}>
        <div className="dc-card">
          <div className="dc-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ padding: 8, background: '#fef2f2', borderRadius: 8, color: '#dc2626' }}>
                <AlertCircle size={20} />
              </div>
              <div>
                <span className="dc-card-title">Alertas Críticos Recentes</span>
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                  Pendências que requerem atenção imediata da equipe
                </p>
              </div>
            </div>
            <button className="dc-btn-mini-ghost" onClick={() => router.push('/alertas')}>Ver todos</button>
          </div>
          <div className="dc-table-wrapper" style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="dc-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>Tipo de Alerta</th>
                  <th>Condomínio / Info</th>
                  <th>Mensagem</th>
                  <th>Data</th>
                  <th style={{ paddingRight: 24, textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {stats?.alertas?.map((a: Alerta) => (
                  <tr key={a.id}>
                    <td style={{ paddingLeft: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`dc-badge ${a.gravidade === 'alta' ? 'dc-badge-red' : a.gravidade === 'media' ? 'dc-badge-amber' : 'dc-badge-blue'}`} style={{ padding: '4px 8px' }}>
                          {a.tipo}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="dc-cell-primary">{a.condominio?.nome || '—'}</div>
                      <div className="dc-cell-secondary">ID: {a.condominio?.numero || '—'}</div>
                    </td>
                    <td style={{ maxWidth: 300 }}>
                      <div className="dc-cell-primary" style={{ whiteSpace: 'normal', fontSize: '0.82rem', lineHeight: 1.4 }}>
                        {a.mensagem}
                      </div>
                    </td>
                    <td>
                      <div className="dc-cell-secondary" style={{ fontWeight: 600 }}>
                        {format(new Date(a.created_at), 'dd/MM/yyyy HH:mm')}
                      </div>
                    </td>
                    <td style={{ paddingRight: 24, textAlign: 'right' }}>
                      <button className="dc-btn-mini" onClick={() => router.push(`/alertas`)}>
                        Resolver <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {(!stats?.alertas || stats.alertas.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <CheckCircle2 size={32} strokeWidth={1.5} color="#10b981" />
                        <span style={{ fontWeight: 600 }}>Tudo em ordem! Nenhum alerta crítico pendente.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDraggingPdf(true); }}
          onDragLeave={() => setIsDraggingPdf(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingPdf(false);
            const file = e.dataTransfer.files?.[0];
            if (file && file.type === 'application/pdf') {
              setQuickUploadPdf(file);
              setIsQuickUploadOpen(true);
            } else {
              alert('Apenas arquivos PDF são suportados.');
            }
          }}
          className="dc-card dc-card-vibrant"
          style={{
            background: isDraggingPdf ? 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)' : 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
            borderColor: isDraggingPdf ? '#3b82f6' : '#1d4ed8',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            color: '#fff',
            padding: '32px',
            transform: isDraggingPdf ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
          onClick={() => document.getElementById('quick-upload-input')?.click()}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, background: 'rgba(255,255,255,0.1)',
              borderRadius: 16, display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px',
              color: '#93c5fd'
            }}>
              <Upload size={28} />
            </div>
            <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 10 }}>Upload Rápido de PDF</h3>
            <p style={{ fontSize: '0.88rem', color: '#93c5fd', lineHeight: 1.5, marginBottom: 24 }}>
              Arraste as faturas em PDF aqui para processamento automático via IA.
            </p>
            <input
              type="file"
              id="quick-upload-input"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setQuickUploadPdf(file);
                  setIsQuickUploadOpen(true);
                }
                e.target.value = '';
              }}
            />
            <button
              className="dc-btn"
              style={{ background: '#fff', color: '#1e40af', width: '100%', fontWeight: 800 }}
              onClick={(e) => { e.stopPropagation(); document.getElementById('quick-upload-input')?.click(); }}
            >
              Selecionar PDF
            </button>
          </div>
        </div>
      </div>

      {/* Faturas Recentes - Only for non-coordinators or if desired */}
      {!isCoordinator && (
        <div className="dc-animate-fade-in" style={{ marginTop: 24 }}>
          <div className="dc-card">
            <div className="dc-card-header">
              <span className="dc-card-title">Fluxo de Faturas Recentes</span>
            </div>
            <div className="dc-table-wrapper">
              <table className="dc-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 24 }}>Condomínio / ID</th>
                    <th>Cód. Concessionária</th>
                    <th>Vencimento</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th style={{ paddingRight: 24 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.faturas?.map((f: any) => (
                    <tr key={f.id}>
                      <td style={{ paddingLeft: 24 }}>
                        <div className="dc-cell-primary">{f.condominio?.nome || 'Processando...'}</div>
                        <div className="dc-cell-secondary"># {f.id.slice(0, 8)}</div>
                      </td>
                      <td>
                        <div className="dc-cell-primary" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                          {f.concessionaria?.instalacao || '—'}
                        </div>
                      </td>
                      <td>
                        <div className="dc-cell-primary" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                          {f.vencimento ? format(new Date(f.vencimento + 'T12:00:00'), 'dd/MM/yyyy') : '—'}
                        </div>
                      </td>
                      <td>
                        <div className="dc-cell-primary" style={{ fontSize: '0.8rem', color: '#64748b' }}>{f.concessionaria?.tipo || 'Outros'}</div>
                      </td>
                      <td>
                        <div className="dc-cell-primary">{formatCurrency(f.valor)}</div>
                        {f.variacao_percentual !== undefined && f.variacao_percentual !== null && (
                          <div className={`dc-cell-secondary ${f.variacao_percentual > 0 ? 'text-red' : 'text-green'}`} style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                            {f.variacao_percentual > 0 ? '+' : ''}{f.variacao_percentual.toFixed(1)}% vs anterior
                          </div>
                        )}
                      </td>
                      <td style={{ paddingRight: 24 }}>
                        <span className={`dc-badge ${f.status === 'processada' ? 'dc-badge-green' : f.status === 'erro' ? 'dc-badge-red' : 'dc-badge-amber'}`}>
                          <span className="dc-badge-dot" />
                          {f.status === 'processada' ? 'Processada Aut.' : f.status === 'erro' ? 'Erro' : 'Vinculo Manual'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!stats?.faturas || stats.faturas.length === 0) && (
                    <tr>
                      <td colSpan={20} style={{ textAlign: 'center', padding: '64px', color: '#94a3b8' }}>
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
        </div>
      )}

      {/* Modal Cadastro Manual de Fatura via Upload Rápido */}
      {isQuickUploadOpen && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 500 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">Cadastrar Fatura Manual</h2>
              <button className="dc-modal-close" onClick={() => setIsQuickUploadOpen(false)}><X size={20} /></button>
            </div>
            <div className="dc-modal-body dc-space-y-4">
              <div className="dc-form-group">
                <label>Condomínio</label>
                <select
                  className="dc-form-select"
                  value={quickUploadCondo}
                  onChange={(e) => {
                    setQuickUploadCondo(e.target.value);
                    setQuickUploadConc('');
                  }}
                  required
                >
                  <option value="">Selecione o Condomínio</option>
                  {condominios?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="dc-form-group">
                <label>Concessionária</label>
                <select
                  className="dc-form-select"
                  value={quickUploadConc}
                  onChange={(e) => setQuickUploadConc(e.target.value)}
                  disabled={!quickUploadCondo}
                  required
                >
                  <option value="">Selecione a Concessionária</option>
                  {filteredConcessionarias.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.tipo === 'Outros' ? c.nome_personalizado : c.tipo} {c.instalacao ? `(${c.instalacao})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="dc-form-group">
                <label>Valor (R$)</label>
                <input
                  type="text"
                  className="dc-form-input"
                  value={quickUploadValor}
                  onChange={(e) => {
                     let val = e.target.value.replace(/[^0-9.,]/g, '');
                     setQuickUploadValor(val);
                  }}
                  placeholder="0,00"
                  required
                />
              </div>

              <div className="dc-form-group">
                <label>Data de Vencimento</label>
                <input
                  type="date"
                  className="dc-form-input"
                  value={quickUploadVencimento}
                  onChange={(e) => setQuickUploadVencimento(e.target.value)}
                  required
                />
              </div>

              <div className="dc-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Paperclip size={14} color="#64748b" /> Arquivo Anexado
                </label>
                {quickUploadPdf && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', padding: '12px 16px', borderRadius: 10, border: '2px solid #10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                        <FileText size={18} />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{quickUploadPdf.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{(quickUploadPdf.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="dc-modal-footer">
              <button
                type="button"
                className="dc-btn dc-btn-secondary"
                onClick={() => setIsQuickUploadOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="dc-btn dc-btn-primary"
                disabled={savingQuickUpload || !quickUploadCondo || !quickUploadConc || !quickUploadValor || !quickUploadVencimento}
                onClick={async () => {
                  try {
                    setSavingQuickUpload(true);
                    let cleanVal = quickUploadValor.replace(/\./g, '').replace(',', '.');
                    if (cleanVal.split('.').length > 2) {
                       // Handle cases where multiple dots are present (e.g., 1.000.000,00)
                       const parts = quickUploadValor.split(',');
                       if (parts.length > 1) {
                           cleanVal = parts[0].replace(/\./g, '') + '.' + parts[1];
                       }
                    }
                    await api.createFaturaManual({
                      condominio_id: quickUploadCondo,
                      concessionaria_id: quickUploadConc,
                      valor: parseFloat(cleanVal),
                      vencimento: quickUploadVencimento,
                      pdf_file: quickUploadPdf || undefined,
                    });
                    setIsQuickUploadOpen(false);
                    setQuickUploadPdf(null);
                    setQuickUploadCondo('');
                    setQuickUploadConc('');
                    setQuickUploadValor('');
                    setQuickUploadVencimento('');
                    alert('Fatura cadastrada com sucesso!');
                  } catch (err: any) {
                    alert(err.message || 'Erro ao cadastrar fatura');
                  } finally {
                    setSavingQuickUpload(false);
                  }
                }}
                style={{ minWidth: 140 }}
              >
                {savingQuickUpload ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .dc-portfolio-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }
        .dc-portfolio-item {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
        }
        .dc-portfolio-item:hover {
          border-color: #2563eb;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
        }
        .dc-portfolio-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .dc-portfolio-name {
          font-weight: 700;
          color: #1e293b;
          font-size: 0.9rem;
        }
        .dc-portfolio-pct {
          font-weight: 800;
          color: #2563eb;
          font-size: 0.85rem;
        }
        .dc-progress-bar-bg {
          height: 8px;
          background: #f1f5f9;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .dc-progress-bar-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.6s ease-out;
        }
        .dc-portfolio-footer {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .dc-portfolio-stat {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
        }

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
