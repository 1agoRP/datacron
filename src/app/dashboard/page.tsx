'use client';

import { useState, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import {
  Building2, Zap, FileText, AlertCircle,
  TrendingUp, TrendingDown, ArrowUpRight,
  Clock, CheckCircle2, Mail, MoreVertical, Search
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Removed static chart data directly generating inside the component.

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    
    const fetchData = async () => {
      try {
        const condominios = await api.getCondominios();
        const allFaturas = await api.getFaturas();
        const faturas = allFaturas.slice(0, 5);
        const alertas = await api.getAlertas({ limit: 5, resolvido: false });
        const alertsCount = await api.getAlertas({ resolvido: false }); // for active alerts count

        // Generates chart data dynamically from faturas (last 6 months)
        const generateChartData = (fList: any[]) => {
          const months: { name: string, month: number, year: number, valor: number }[] = [];
          const today = new Date();
          for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push({
              name: format(d, 'MMM', { locale: ptBR }),
              month: d.getMonth(),
              year: d.getFullYear(),
              valor: 0
            });
          }
      
          fList.forEach(f => {
            // Using ISO dates like vencimento instead of text references
            const dateStr = f.vencimento || f.created_at;
            if (!dateStr) return;
            
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return;
            
            const m = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
            if (m) {
              m.valor += Number(f.valor) || 0;
            }
          });
      
          return months;
        };

        setStats({
          chartData: generateChartData(allFaturas),
          condominiosCount: condominios.length,
          faturas,
          alertas,
          activeAlerts: alertsCount.length,
          recebidasHoje: allFaturas.filter((f: any) => {
            const date = new Date(f.created_at);
            const today = new Date();
            return date.toDateString() === today.toDateString();
          }).length
        });
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => clearInterval(timer);
  }, []);

  const q = searchTerm.toLowerCase();

  const showKpis = !q || "condomínios contas recebidas alertas ativos hoje".includes(q);
  const showChart = !q || "volume faturamento gráfico chart".includes(q);

  const filteredAlertas = stats?.alertas?.filter((a: any) => a.mensagem.toLowerCase().includes(q)) || [];
  const showAlertsCard = !q || "alertas críticos críticos atenção".includes(q) || filteredAlertas.length > 0;

  const filteredFaturas = stats?.faturas?.filter((f: any) => 
    (f.condominio?.nome || '').toLowerCase().includes(q) ||
    (f.referencia || '').toLowerCase().includes(q) ||
    (f.status || '').toLowerCase().includes(q)
  ) || [];
  const showFaturasCard = !q || "últimas faturas recebidas contas receber".includes(q) || filteredFaturas.length > 0;

  const showAgenteCard = !q || "monitoramento agente ia processador email robo bot varredura".includes(q);

  if (loading) {
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div className="dc-loading-spinner" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell showSearch={true} searchTerm={searchTerm} onSearchChange={setSearchTerm}>
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
      {showKpis && (
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
            value="..."
            icon={<Zap size={22} />}
            color="#fffbeb"
            iconColor="#d97706"
            badge="Ciclo Mensal"
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
      )}

      {/* Main chart + alerts */}
      <div className="dc-dashboard-main">
        {/* Chart */}
        {showChart && (
          <div className="dc-card">
            <div className="dc-card-header">
              <span className="dc-card-title">Volume de Faturamento (R$)</span>
              <select
                style={{
                  height: 34,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#64748b',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                <option>Últimos 6 meses</option>
                <option>Últimos 12 meses</option>
              </select>
            </div>
            <div style={{ padding: '24px', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.chartData || []}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={v => `R$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', fontSize: 13 }}
                    formatter={(v: any) => [`R$ ${Number(v).toLocaleString('pt-BR')}`, 'Total']}
                  />
                  <Area type="monotone" dataKey="valor" stroke="#2563eb" strokeWidth={2.5} fill="url(#grad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {!showChart && <div />} {/* Layout spacer */}

        {/* Alerts panel */}
        {showAlertsCard && (
          <div className="dc-card dc-card-p" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span className="dc-card-title">{(q && !("alertas críticos".includes(q))) ? 'Resultados em Alertas Críticos' : 'Alertas Críticos'}</span>
              <button className="dc-card-link" onClick={() => window.location.href='/alertas'}>Ver todos →</button>
            </div>
            <div className="dc-space-y-3">
              {(q ? filteredAlertas : stats?.alertas)?.map((a: any) => (
                <div key={a.id} className="dc-alert-item" onClick={() => window.location.href='/alertas'}>
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
              {((q ? filteredAlertas : stats?.alertas)?.length === 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', color: '#94a3b8', gap: 8 }}>
                  <CheckCircle2 size={36} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tudo sob controle</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: table + pending */}
      <div className="dc-dashboard-bottom">
        {/* Latest bills table */}
        {showFaturasCard && (
          <div className="dc-card" style={{ gridColumn: (!showAgenteCard && showFaturasCard) ? '1 / -1' : 'auto' }}>
            <div className="dc-card-header">
              <span className="dc-card-title">{(q && !("últimas faturas recebidas".includes(q))) ? 'Resultados em Faturas Recentes' : 'Últimas Faturas Recebidas'}</span>
              <button className="dc-card-link" onClick={() => window.location.href='/faturas'}>Ver todas →</button>
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
                  {(q ? filteredFaturas : stats?.faturas)?.map((f: any) => (
                    <tr key={f.id} onClick={() => window.location.href=`/faturas`} style={{ cursor: 'pointer' }}>
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
                        <span className="dc-cell-primary">R$ {f.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td>
                        <span className={`dc-badge ${f.status === 'processada' ? 'dc-badge-green' : 'dc-badge-amber'}`}>
                          <span className="dc-badge-dot" />
                          {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {((q ? filteredFaturas : stats?.faturas)?.length === 0) && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                        {q ? 'Nenhuma fatura condizente encontrada.' : 'Nenhuma fatura recebida recentemente'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending reviews */}
        {showAgenteCard && (
          <div className="dc-card dc-card-p" style={{ display: 'flex', flexDirection: 'column', gap: 0, gridColumn: (showAgenteCard && !showFaturasCard) ? '1 / -1' : 'auto' }}>
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
                <button 
                  className="dc-btn dc-btn-ghost" 
                  style={{ height: 32, padding: '0 12px', fontSize: '0.78rem' }}
                  onClick={async () => {
                     await api.forceEmailScan();
                     alert("Varredura forçada enviada!");
                  }}
                >
                  Forçar Varredura
                </button>
              </div>
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
        )}
      </div>

      {q && !showKpis && !showChart && !showAlertsCard && !showFaturasCard && !showAgenteCard && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <Search size={48} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
          <h2 style={{ color: '#0f172a', marginBottom: 8 }}>Nenhum resultado encontrado</h2>
          <p>Não encontramos informações para "<b>{searchTerm}</b>" no dashboard.</p>
        </div>
      )}
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
