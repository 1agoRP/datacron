'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Download,
  FileSignature,
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
    if (!q) return contratos;
    return contratos.filter((c) =>
      [c.empresa, c.tipo_contrato, c.condominio_nome, c.cnpj_empresa]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [contratos, query]);

  const selected = useMemo(() => {
    if (!filtered.length) return null;
    return filtered.find((c) => c.id === selectedId) || filtered[0];
  }, [filtered, selectedId]);

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
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title">Contratos 360</h1>
          <p className="dc-page-subtitle">
            Controle contratos, assinaturas e mensalidades recebidas dos condominios no ano selecionado.
          </p>
        </div>
        <div className="dc-page-header-actions">
          <button className="dc-btn dc-btn-secondary" onClick={() => api.exportContratos('excel', ano)}>
            <Download size={16} /> Exportar
          </button>
          <button className="dc-btn dc-btn-primary" onClick={openCreate}>
            <Plus size={16} /> Novo contrato
          </button>
        </div>
      </div>

      <div className="dc-stats-grid">
        <div className="dc-stat-card">
          <div className="dc-stat-top">
            <span className="dc-stat-badge">Carteira</span>
            <FileSignature color="#2563eb" />
          </div>
          <div className="dc-stat-label">Contratos ativos</div>
          <div className="dc-stat-value">{stats?.ativos ?? 0}</div>
        </div>
        <div className="dc-stat-card">
          <div className="dc-stat-top">
            <span className="dc-stat-badge" style={{ color: '#d97706', background: '#fffbeb' }}>Assinatura</span>
            <AlertTriangle color="#d97706" />
          </div>
          <div className="dc-stat-label">Nao assinados</div>
          <div className="dc-stat-value">{stats?.nao_assinados ?? 0}</div>
        </div>
        <div className="dc-stat-card">
          <div className="dc-stat-top">
            <span className="dc-stat-badge positive">Recebido</span>
            <ReceiptText color="#16a34a" />
          </div>
          <div className="dc-stat-label">Recebido em {ano}</div>
          <div className="dc-stat-value" style={{ fontSize: '1.35rem' }}>{formatCurrency(stats?.total_recebido_ano || 0)}</div>
        </div>
        <div className="dc-stat-card">
          <div className="dc-stat-top">
            <span className="dc-stat-badge" style={{ color: '#dc2626', background: '#fef2f2' }}>Pendencias</span>
            <CalendarClock color="#dc2626" />
          </div>
          <div className="dc-stat-label">Mensalidades vencidas</div>
          <div className="dc-stat-value">{stats?.mensalidades_vencidas ?? 0}</div>
        </div>
      </div>

      <div className="contract-workspace">
        <section className="contract-list-panel">
          <div className="contract-toolbar">
            <div className="dc-filter-search">
              <Search />
              <input placeholder="Buscar contrato, empresa ou condominio..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <input
              className="dc-form-input contract-year"
              type="number"
              min={2000}
              max={2100}
              value={ano}
              onChange={(e) => setAno(Number(e.target.value || currentYear))}
            />
          </div>

          <div className="contract-list">
            {isLoading && <div style={{ padding: 24 }}>Carregando contratos...</div>}
            {!isLoading && filtered.length === 0 && (
              <div style={{ padding: 24, color: '#64748b' }}>Nenhum contrato encontrado.</div>
            )}
            {filtered.map((contrato) => (
              <button
                key={contrato.id}
                className={`contract-row${selected?.id === contrato.id ? ' active' : ''}`}
                onClick={() => setSelectedId(contrato.id)}
              >
                <div>
                  <div className="contract-row-title">{contrato.empresa}</div>
                  <div className="contract-row-subtitle">{contrato.condominio_nome} · {contrato.tipo_contrato}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={statusBadge(contrato.status)}>{contrato.status.replace('_', ' ')}</span>
                  <div className="contract-row-money">{formatCurrency(contrato.valor_atual || 0)}</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="contract-detail-panel">
          {selected ? (
            <>
              <div className="contract-detail-header">
                <div>
                  <div className="contract-eyebrow">{selected.condominio_nome}</div>
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
                <div><span>Assinado em</span><strong>{selected.data_assinatura || 'Nao assinado'}</strong></div>
                <div><span>Vigencia</span><strong>{selected.data_inicio} ate {selected.data_fim || 'indeterminado'}</strong></div>
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
