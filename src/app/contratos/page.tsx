'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  AlertTriangle,
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  Download,
  Filter,
  FileSignature,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import Shell from '@/components/layout/Shell';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { Condominio, Contrato, ContratoPagamento } from '@/types';

const currentYear = new Date().getFullYear();
type SortKey = 'data_fim' | 'condominio_nome' | 'empresa' | 'tipo_contrato' | 'valor_atual' | 'dia_vencimento' | 'pagamentos_pendentes';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'todos' | 'pendentes' | 'nao_assinados' | 'vencidos' | 'ativos';

const emptyForm = {
  condominio_id: '',
  empresa: '',
  razao_social: '',
  cnpj_empresa: '',
  email_contato: '',
  telefone_contato: '',
  tipo_contrato: '',
  data_inicio: '',
  data_fim: '',
  assinado: false,
  data_assinatura: '',
  valor_inicial: '',
  valor_atual: '',
  indice_reajuste: '',
  periodicidade: 'mensal',
  dia_vencimento: '10',
  observacoes: '',
};

function statusBadge(status: string) {
  if (status === 'vencido') return 'dc-badge dc-badge-red';
  if (status === 'a_vencer') return 'dc-badge dc-badge-amber';
  return 'dc-badge dc-badge-green';
}

function paymentClass(payment: ContratoPagamento) {
  if (payment.recebido) return 'contract-month paid';
  if (payment.vencido) return 'contract-month late';
  return 'contract-month open';
}

function formatDate(value?: string | null) {
  if (!value) return 'Indeterminado';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function monthCompact(payment: ContratoPagamento) {
  return payment.mes_label.slice(0, 3).toUpperCase();
}

export default function ContratosPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [ano, setAno] = useState(currentYear);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [paymentDraft, setPaymentDraft] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [sortKey, setSortKey] = useState<SortKey>('data_fim');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const isAdmin = user?.role === 'admin';

  const { data: contratos = [], isLoading, mutate } = useSWR(
    isAdmin ? ['contratos-dashboard', ano] : null,
    () => api.getContratosDashboard(ano)
  );
  const { data: stats, mutate: mutateStats } = useSWR(isAdmin ? ['contratos-stats', ano] : null, () => api.getContratoStats(ano));
  const { data: condominios = [] } = useSWR(isAdmin ? 'contratos-condominios' : null, () => api.getCondominios() as Promise<Condominio[]>);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [router, user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contratos.filter((c) => {
      const matchesText = !q || [c.empresa, c.tipo_contrato, c.condominio_nome, c.cnpj_empresa, c.razao_social]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'pendentes' && (c.pagamentos_pendentes || 0) > 0) ||
        (statusFilter === 'nao_assinados' && !c.assinado) ||
        (statusFilter === 'vencidos' && c.status === 'vencido') ||
        (statusFilter === 'ativos' && c.status === 'ativo');
      return matchesText && matchesStatus;
    });
  }, [contratos, query, statusFilter]);

  const sortedContracts = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (typeof av === 'number' || typeof bv === 'number') {
        return ((Number(av) || 0) - (Number(bv) || 0)) * direction;
      }
      return String(av || '').localeCompare(String(bv || ''), 'pt-BR', { numeric: true }) * direction;
    });
  }, [filtered, sortDirection, sortKey]);

  const selected = useMemo(() => {
    if (!sortedContracts.length) return null;
    return sortedContracts.find((c) => c.id === selectedId) || sortedContracts[0];
  }, [sortedContracts, selectedId]);

  const overdueCount = useMemo(() => contratos.filter((c) => (c.pagamentos || []).some((p) => p.vencido && !p.recebido)).length, [contratos]);

  const setSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setSortDirection(key === 'valor_atual' || key === 'pagamentos_pendentes' ? 'desc' : 'asc');
  };

  if (user && !isAdmin) {
    return null;
  }

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (contrato: Contrato) => {
    setEditing(contrato);
    setForm({
      condominio_id: contrato.condominio_id,
      empresa: contrato.empresa || '',
      razao_social: contrato.razao_social || '',
      cnpj_empresa: contrato.cnpj_empresa || '',
      email_contato: contrato.email_contato || '',
      telefone_contato: contrato.telefone_contato || '',
      tipo_contrato: contrato.tipo_contrato || '',
      data_inicio: contrato.data_inicio || '',
      data_fim: contrato.data_fim || '',
      assinado: !!contrato.assinado,
      data_assinatura: contrato.data_assinatura || '',
      valor_inicial: String(contrato.valor_inicial || ''),
      valor_atual: String(contrato.valor_atual || ''),
      indice_reajuste: contrato.indice_reajuste || '',
      periodicidade: contrato.periodicidade || 'mensal',
      dia_vencimento: String(contrato.dia_vencimento || 10),
      observacoes: contrato.observacoes || '',
    });
    setModalOpen(true);
  };

  const saveContract = async () => {
    if (!form.condominio_id || !form.empresa || !form.tipo_contrato || !form.data_inicio) {
      alert('Preencha condominio, empresa, tipo e data de inicio.');
      return;
    }
    const payload = {
      ...form,
      data_fim: form.data_fim || null,
      data_assinatura: form.data_assinatura || null,
      valor_inicial: Number(form.valor_inicial || 0),
      valor_atual: Number(form.valor_atual || 0),
      dia_vencimento: Number(form.dia_vencimento || 10),
    };
    if (editing) {
      await api.updateContrato(editing.id, payload as any);
    } else {
      await api.createContrato(payload as any);
    }
    setModalOpen(false);
    await mutate();
    await mutateStats();
  };

  const markPayment = async (payment: ContratoPagamento, recebido: boolean) => {
    if (!selected) return;
    const key = `${payment.ano}-${payment.mes}`;
    const typedValue = paymentDraft[key];
    await api.updateContratoPagamento(
      selected.id,
      payment.mes,
      {
        recebido,
        valor_previsto: payment.valor_previsto,
        valor_recebido: recebido ? Number(typedValue || payment.valor_recebido || payment.valor_previsto || 0) : undefined,
        data_recebimento: recebido ? new Date().toISOString().slice(0, 10) : null,
      },
      ano
    );
    await mutate();
    await mutateStats();
  };

  const removeContract = async (contrato: Contrato) => {
    if (!confirm(`Excluir contrato de ${contrato.empresa}?`)) return;
    await api.deleteContrato(contrato.id);
    setSelectedId(null);
    await mutate();
    await mutateStats();
  };

  return (
    <Shell>
      {/* ── Hero Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #059669 55%, #10b981 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        boxShadow: '0 8px 32px rgba(5,150,105,0.22)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative circles */}
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 80, bottom: -60, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            flexShrink: 0,
          }}>
            <FileSignature size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Contratos 360</h1>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', marginTop: 5 }}>
              Controle contratos, assinaturas e mensalidades recebidas dos condomínios no ano de {ano}.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <button
            className="dc-btn"
            onClick={() => api.exportContratos('excel', ano)}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', gap: 8 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          >
            <Download size={15} /> Exportar
          </button>
          <button
            className="dc-btn"
            onClick={openCreate}
            style={{ background: '#fff', color: '#059669', fontWeight: 800, gap: 8 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#ecfdf5')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            <Plus size={15} /> Novo Contrato
          </button>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="dc-stats-grid" style={{ marginBottom: 20 }}>
        {/* Card 1: Carteira */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', borderTop: '3px solid #2563eb',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <FileSignature size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: 20, letterSpacing: '0.03em' }}>CARTEIRA</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contratos ativos</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 4 }}>{stats?.ativos ?? 0}</div>
          </div>
        </div>

        {/* Card 2: Assinatura */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', borderTop: '3px solid #d97706',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <AlertTriangle size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#d97706', background: '#fffbeb', padding: '3px 10px', borderRadius: 20, letterSpacing: '0.03em' }}>ASSINATURA</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Não assinados</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 4 }}>{stats?.nao_assinados ?? 0}</div>
          </div>
        </div>

        {/* Card 3: Recebido */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', borderTop: '3px solid #16a34a',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <ReceiptText size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#16a34a', background: '#f0fdf4', padding: '3px 10px', borderRadius: 20, letterSpacing: '0.03em' }}>RECEBIDO</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recebido em {ano}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1.2, marginTop: 8 }}>{formatCurrency(stats?.total_recebido_ano || 0)}</div>
          </div>
        </div>

        {/* Card 4: Pendências */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', borderTop: '3px solid #dc2626',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <CalendarClock size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#dc2626', background: '#fef2f2', padding: '3px 10px', borderRadius: 20, letterSpacing: '0.03em' }}>PENDENCIAS</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mensalidades vencidas</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 4 }}>{stats?.mensalidades_vencidas ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="contract-board">
        <section className="contract-table-panel">
          <div className="contract-table-toolbar">
            <div className="dc-filter-search contract-search">
              <Search />
              <input placeholder="Buscar por condomínio, empresa, tipo, razão social ou CNPJ..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="contract-filter-group" aria-label="Filtros de contrato">
              {[
                ['todos', 'Todos', contratos.length],
                ['pendentes', 'Mensalidades pendentes', stats?.mensalidades_vencidas ?? 0],
                ['nao_assinados', 'Sem assinatura', stats?.nao_assinados ?? 0],
                ['vencidos', 'Contratos vencidos', stats?.vencidos ?? 0],
                ['ativos', 'Ativos', stats?.ativos ?? 0],
              ].map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  className={`contract-filter-chip${statusFilter === value ? ' active' : ''}`}
                  onClick={() => setStatusFilter(value as StatusFilter)}
                >
                  <Filter size={13} />
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>
            <input
              className="dc-form-input contract-year"
              type="number"
              min={2000}
              max={2100}
              value={ano}
              onChange={(e) => setAno(Number(e.target.value || currentYear))}
              aria-label="Ano dos pagamentos"
            />
          </div>

          <div className="contract-table-summary">
            <div><strong>{sortedContracts.length}</strong><span>contratos na visão</span></div>
            <div><strong>{overdueCount}</strong><span>com mês vencido</span></div>
            <div><strong>{formatCurrency(stats?.valor_mensal || 0)}</strong><span>valor mensal previsto</span></div>
            <div><strong>{formatCurrency(stats?.total_recebido_ano || 0)}</strong><span>recebido em {ano}</span></div>
          </div>

          <div className="contract-table-scroll">
            <table className="contract-table">
              <thead>
                <tr>
                  {[
                    ['data_fim', 'Venc. contrato'],
                    ['condominio_nome', 'Condomínio'],
                    ['empresa', 'Empresa'],
                    ['tipo_contrato', 'Tipo'],
                    ['valor_atual', 'Mensalidade'],
                    ['dia_vencimento', 'Dia mensal'],
                    ['pagamentos_pendentes', 'Pendências'],
                  ].map(([key, label]) => (
                    <th key={key}>
                      <button type="button" onClick={() => setSort(key as SortKey)}>
                        {label}
                        <ArrowUpDown size={13} className={sortKey === key ? 'active' : ''} />
                      </button>
                    </th>
                  ))}
                  <th>Assinatura</th>
                  <th>Pagamentos {ano}</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={10} className="contract-table-empty">Carregando contratos...</td>
                  </tr>
                )}
                {!isLoading && sortedContracts.length === 0 && (
                  <tr>
                    <td colSpan={10} className="contract-table-empty">Nenhum contrato encontrado para os filtros atuais.</td>
                  </tr>
                )}
                {sortedContracts.map((contrato) => {
                  const pendingPayments = contrato.pagamentos_pendentes || 0;
                  return (
                    <tr
                      key={contrato.id}
                      className={selected?.id === contrato.id ? 'selected' : ''}
                      onClick={() => setSelectedId(contrato.id)}
                    >
                      <td>
                        <span className={statusBadge(contrato.status)}>{contrato.status.replace('_', ' ')}</span>
                        <div className="contract-table-date">{formatDate(contrato.data_fim)}</div>
                      </td>
                      <td>
                        <strong>{contrato.condominio_nome || 'Sem condomínio'}</strong>
                        <span className="contract-muted">Início {formatDate(contrato.data_inicio)}</span>
                      </td>
                      <td>
                        <strong>{contrato.empresa}</strong>
                        <span className="contract-muted">{contrato.cnpj_empresa || contrato.razao_social || 'Sem CNPJ'}</span>
                      </td>
                      <td>{contrato.tipo_contrato}</td>
                      <td><strong>{formatCurrency(contrato.valor_atual || 0)}</strong></td>
                      <td>Dia {contrato.dia_vencimento || 10}</td>
                      <td>
                        <span className={`contract-pending-pill${pendingPayments > 0 ? ' danger' : ''}`}>
                          {pendingPayments > 0 ? `${pendingPayments} pendente${pendingPayments > 1 ? 's' : ''}` : 'Em dia'}
                        </span>
                      </td>
                      <td>
                        <span className={contrato.assinado ? 'dc-badge dc-badge-green' : 'dc-badge dc-badge-amber'}>
                          {contrato.assinado ? 'Assinado' : 'Pendente'}
                        </span>
                      </td>
                      <td>
                        <div className="contract-payment-strip">
                          {(contrato.pagamentos || []).map((payment) => (
                            <span
                              key={`${contrato.id}-${payment.mes}`}
                              className={`contract-payment-dot ${payment.recebido ? 'paid' : payment.vencido ? 'late' : 'open'}`}
                              title={`${payment.mes_label}: ${payment.recebido ? 'recebido' : payment.vencido ? 'vencido' : 'em aberto'}`}
                            >
                              {monthCompact(payment)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="contract-table-actions">
                          <button className="dc-btn dc-btn-secondary" type="button" onClick={(e) => { e.stopPropagation(); openEdit(contrato); }}>
                            <Pencil size={14} />
                          </button>
                          <button className="dc-btn dc-btn-danger" type="button" onClick={(e) => { e.stopPropagation(); removeContract(contrato); }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="contract-detail-panel compact">
          {selected ? (
            <>
              <div className="contract-detail-header">
                <div>
                  <div className="contract-eyebrow">Contrato selecionado · {selected.condominio_nome}</div>
                  <h2>{selected.empresa}</h2>
                  <div className="contract-detail-meta">
                    <span className={statusBadge(selected.status)}>{selected.status.replace('_', ' ')}</span>
                    <span className={selected.assinado ? 'dc-badge dc-badge-blue' : 'dc-badge dc-badge-amber'}>
                      {selected.assinado ? 'Assinado' : 'Pendente de assinatura'}
                    </span>
                  </div>
                </div>
                <div className="contract-detail-actions">
                  <button className="dc-btn dc-btn-secondary" onClick={() => openEdit(selected)}>Editar</button>
                  <button className="dc-btn dc-btn-danger" onClick={() => removeContract(selected)}><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="contract-insights">
                <div>
                  <span>Valor original</span>
                  <strong>{formatCurrency(selected.valor_inicial || 0)}</strong>
                </div>
                <div>
                  <span>Mensalidade atual</span>
                  <strong>{formatCurrency(selected.valor_atual || 0)}</strong>
                </div>
                <div>
                  <span>Recebido no ano</span>
                  <strong>{formatCurrency(selected.total_recebido_ano || 0)}</strong>
                </div>
                <div>
                  <span>Pagamentos</span>
                  <strong>{selected.pagamentos_recebidos || 0}/12</strong>
                </div>
              </div>

              <div className="contract-facts">
                <div><span>Assinado em</span><strong>{selected.data_assinatura ? formatDate(selected.data_assinatura) : 'Nao assinado'}</strong></div>
                <div><span>Vigencia</span><strong>{formatDate(selected.data_inicio)} ate {formatDate(selected.data_fim)}</strong></div>
                <div><span>Reajuste</span><strong>{selected.indice_reajuste || 'Sem indice'} · {selected.periodicidade}</strong></div>
                <div><span>Vencimento mensal</span><strong>Dia {selected.dia_vencimento || 10}</strong></div>
              </div>

              <div className="contract-payments-card">
                <div className="contract-section-title">Mensalidades de {ano}</div>
                <div className="contract-month-grid">
                  {(selected.pagamentos || []).map((payment) => {
                    const key = `${payment.ano}-${payment.mes}`;
                    return (
                      <div className={paymentClass(payment)} key={key}>
                        <div className="contract-month-head">
                          <strong>{payment.mes_label}</strong>
                          {payment.recebido ? <CheckCircle2 size={16} /> : payment.vencido ? <AlertTriangle size={16} /> : <CalendarClock size={16} />}
                        </div>
                        <div className="contract-month-expected">{formatCurrency(payment.valor_previsto)}</div>
                        <input
                          className="contract-month-input"
                          type="number"
                          placeholder="Valor recebido"
                          value={paymentDraft[key] ?? (payment.valor_recebido ? String(payment.valor_recebido) : '')}
                          onChange={(e) => setPaymentDraft({ ...paymentDraft, [key]: e.target.value })}
                        />
                        <button
                          className={payment.recebido ? 'contract-month-btn undo' : 'contract-month-btn'}
                          onClick={() => markPayment(payment, !payment.recebido)}
                        >
                          {payment.recebido ? 'Reabrir' : 'Recebi'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="contract-empty">
              <FileSignature size={42} />
              <strong>Nenhum contrato selecionado</strong>
              <span>Crie ou selecione um contrato para acompanhar assinatura e pagamentos.</span>
            </div>
          )}
        </section>
      </div>

      {modalOpen && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 860 }}>
            <div className="dc-modal-header">
              <div className="dc-modal-title">{editing ? 'Editar contrato' : 'Novo contrato'}</div>
              <button className="dc-modal-close" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="dc-modal-body">
              <div className="contract-form-grid">
                <label className="dc-form-group">
                  <span className="dc-form-label">Condominio</span>
                  <select className="dc-form-select" value={form.condominio_id} onChange={(e) => setForm({ ...form, condominio_id: e.target.value })}>
                    <option value="">Selecione</option>
                    {condominios.map((condo) => (
                      <option key={condo.id} value={condo.id}>{condo.numero} - {condo.nome}</option>
                    ))}
                  </select>
                </label>
                <label className="dc-form-group">
                  <span className="dc-form-label">Empresa</span>
                  <input className="dc-form-input" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
                </label>
                <label className="dc-form-group">
                  <span className="dc-form-label">Tipo de contrato</span>
                  <input className="dc-form-input" value={form.tipo_contrato} onChange={(e) => setForm({ ...form, tipo_contrato: e.target.value })} placeholder="Portaria, elevadores, limpeza..." />
                </label>
                <label className="dc-form-group">
                  <span className="dc-form-label">Razao social</span>
                  <input className="dc-form-input" value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
                </label>
                <label className="dc-form-group">
                  <span className="dc-form-label">CNPJ</span>
                  <input className="dc-form-input" value={form.cnpj_empresa} onChange={(e) => setForm({ ...form, cnpj_empresa: e.target.value })} />
                </label>
                <label className="dc-form-group">
                  <span className="dc-form-label">E-mail contato</span>
                  <input className="dc-form-input" value={form.email_contato} onChange={(e) => setForm({ ...form, email_contato: e.target.value })} />
                </label>
                <label className="dc-form-group">
                  <span className="dc-form-label">Inicio</span>
                  <input className="dc-form-input" type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
                </label>
                <label className="dc-form-group">
                  <span className="dc-form-label">Fim</span>
                  <input className="dc-form-input" type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
                </label>
                <label className="dc-form-group">
                  <span className="dc-form-label">Valor original</span>
                  <input className="dc-form-input" type="number" value={form.valor_inicial} onChange={(e) => setForm({ ...form, valor_inicial: e.target.value })} />
                </label>
                <label className="dc-form-group">
                  <span className="dc-form-label">Mensalidade atual</span>
                  <input className="dc-form-input" type="number" value={form.valor_atual} onChange={(e) => setForm({ ...form, valor_atual: e.target.value })} />
                </label>
                <label className="dc-form-group">
                  <span className="dc-form-label">Dia de vencimento</span>
                  <input className="dc-form-input" type="number" min={1} max={28} value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })} />
                </label>
                <label className="dc-form-group">
                  <span className="dc-form-label">Indice reajuste</span>
                  <input className="dc-form-input" value={form.indice_reajuste} onChange={(e) => setForm({ ...form, indice_reajuste: e.target.value })} />
                </label>
                <label className="contract-check">
                  <input type="checkbox" checked={form.assinado} onChange={(e) => setForm({ ...form, assinado: e.target.checked })} />
                  <span>Contrato assinado</span>
                </label>
                <label className="dc-form-group">
                  <span className="dc-form-label">Data assinatura</span>
                  <input className="dc-form-input" type="date" value={form.data_assinatura} onChange={(e) => setForm({ ...form, data_assinatura: e.target.value })} />
                </label>
                <label className="dc-form-group contract-form-wide">
                  <span className="dc-form-label">Observacoes</span>
                  <textarea className="dc-form-input" style={{ height: 88, paddingTop: 12 }} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
                </label>
              </div>
            </div>
            <div className="dc-modal-footer">
              <button className="dc-btn dc-btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="dc-btn dc-btn-primary" onClick={saveContract}><Save size={16} /> Salvar contrato</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
