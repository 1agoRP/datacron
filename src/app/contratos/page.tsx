'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import Shell from '@/components/layout/Shell';
import {
  Plus, Building2, FileSignature, Calendar, DollarSign, X, Trash2,
  Search, Filter, Download, Upload, AlertTriangle, CheckCircle2,
  Clock, Eye, FileText, ArrowUpDown, ChevronDown
} from 'lucide-react';
import { api } from '@/lib/api';
import Select from 'react-select';
import useSWR from 'swr';

const DEFAULT_CONTRACT_TYPES = [
  'Manutenção de Elevadores',
  'Bombas',
  'Portaria',
  'Limpeza',
  'Segurança',
  'Outros',
];

const INDICES = ['IGPM', 'IPCA', 'INCC', 'IGP-DI', 'Outro'];
const PERIODICIDADES = ['mensal', 'bimestral', 'trimestral', 'semestral', 'anual'];

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
  ativo: { label: 'Ativo', class: 'dc-badge-green', icon: <CheckCircle2 size={12} /> },
  a_vencer: { label: 'A Vencer', class: 'dc-badge-amber', icon: <Clock size={12} /> },
  vencido: { label: 'Vencido', class: 'dc-badge-red', icon: <AlertTriangle size={12} /> },
};

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    background: state.isDisabled ? '#f1f5f9' : '#fff',
    border: `1px solid ${state.isFocused ? '#2563eb' : '#e2e8f0'}`,
    borderRadius: '8px',
    boxShadow: state.isFocused ? '0 0 0 1px #2563eb' : 'none',
    minHeight: '38px',
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#0f172a',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    '&:hover': { borderColor: state.isFocused ? '#2563eb' : '#cbd5e1' }
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    zIndex: 9999,
    fontSize: '0.85rem'
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? '#eff6ff' : state.isFocused ? '#f8fafc' : 'white',
    color: state.isSelected ? '#1d4ed8' : '#334155',
    cursor: 'pointer',
    padding: '8px 12px'
  }),
  singleValue: (base: any, state: any) => ({ ...base, color: state.isDisabled ? '#94a3b8' : '#0f172a' }),
  placeholder: (base: any) => ({ ...base, color: '#94a3b8' }),
  indicatorSeparator: (base: any) => ({...base, display: 'none'})
};

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const parts = d.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  } catch { return d; }
}

function formatCurrency(v: number | null | undefined): string {
  if (v == null) return '—';
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function ContratosPage() {
  // SWR for main data — automatic cache + background revalidation
  const { data: contratos = [], isLoading: loading, mutate: mutateContratos } = useSWR(
    'contratos',
    () => api.getContratos(),
    { revalidateOnFocus: true }
  );
  const { data: condos = [] } = useSWR(
    'contratosCondos',
    () => api.getCondominios(),
    { revalidateOnFocus: false }
  );
  const { data: stats } = useSWR<any>(
    'contratosStats',
    () => api.getContratosStats(),
    { revalidateOnFocus: true }
  );
  const { data: fetchedTypes } = useSWR(
    'contractTypes',
    () => api.getContractTypes().catch(() => null)
  );
  const contractTypes = useMemo(() => {
    if (fetchedTypes && Array.isArray(fetchedTypes)) {
      const filtered = fetchedTypes.filter((t: string) => t !== 'Outros');
      return [...filtered, 'Outros'];
    }
    return DEFAULT_CONTRACT_TYPES;
  }, [fetchedTypes]);

  const [tab, setTab] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // File storage state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const defaultForm = {
    condominio_id: '',
    empresa: '',
    razao_social: '',
    cnpj_empresa: '',
    email_contato: '',
    telefone_contato: '',
    tipo_contrato: 'Manutenção de Elevadores',
    tipo_personalizado: '',
    data_inicio: '',
    data_fim: '',
    valor_inicial: 0,
    valor_atual: 0,
    data_reajuste: '',
    indice_reajuste: '',
    ultimo_reajuste: '',
    periodicidade: 'mensal',
    observacoes: '',
  };
  const [form, setForm] = useState<any>({ ...defaultForm });

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form };

      // Clean empty optional fields
      if (!payload.data_fim) payload.data_fim = null;
      if (!payload.data_reajuste) payload.data_reajuste = null;
      if (!payload.indice_reajuste) payload.indice_reajuste = null;
      if (!payload.ultimo_reajuste) payload.ultimo_reajuste = null;
      if (!payload.tipo_personalizado) payload.tipo_personalizado = null;
      if (!payload.observacoes) payload.observacoes = null;
      if (!payload.razao_social) payload.razao_social = null;
      if (!payload.cnpj_empresa) payload.cnpj_empresa = null;
      if (!payload.email_contato) payload.email_contato = null;
      if (!payload.telefone_contato) payload.telefone_contato = null;
      if (!payload.valor_inicial) payload.valor_inicial = 0;
      if (!payload.valor_atual) payload.valor_atual = payload.valor_inicial;

      let savedContrato: any;
      if (editingId) {
        delete payload.condominio_id;
        savedContrato = await api.updateContrato(editingId, payload);
      } else {
        savedContrato = await api.createContrato(payload);
      }

      // Upload PDF if selected
      if (pdfFile && savedContrato?.id) {
        const fd = new FormData();
        fd.append('pdf_file', pdfFile);
        await api.uploadContratoArquivo(savedContrato.id, fd);
      }

      handleCloseModal();
      mutateContratos(); // SWR revalidation
      setSaving(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!confirm('Deseja realmente excluir este contrato? Ação irreversível!')) return;
    try {
      await api.deleteContrato(editingId);
      handleCloseModal();
      mutateContratos(); // SWR revalidation
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    }
  };

  const handleOpenCreate = () => {
    setForm({ ...defaultForm });
    setEditingId(null);
    setPdfFile(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setForm({
      condominio_id: c.condominio_id,
      empresa: c.empresa,
      razao_social: c.razao_social || '',
      cnpj_empresa: c.cnpj_empresa || '',
      email_contato: c.email_contato || '',
      telefone_contato: c.telefone_contato || '',
      tipo_contrato: c.tipo_contrato,
      tipo_personalizado: c.tipo_personalizado || '',
      data_inicio: c.data_inicio || '',
      data_fim: c.data_fim || '',
      valor_inicial: c.valor_inicial || 0,
      valor_atual: c.valor_atual || 0,
      data_reajuste: c.data_reajuste || '',
      indice_reajuste: c.indice_reajuste || '',
      ultimo_reajuste: c.ultimo_reajuste || '',
      periodicidade: c.periodicidade || 'mensal',
      observacoes: c.observacoes || '',
    });
    setEditingId(c.id);
    setPdfFile(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setPdfFile(null);
  };

  // IA PDF extraction
  const handlePdfUpload = async (file: File) => {
    setPdfFile(file);
    // IA extraction disabled for now
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      handlePdfUpload(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePdfUpload(file);
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let result = contratos.filter(c => {
      const matchesTab = tab === 'Todos' || c.tipo_contrato === tab;
      if (!matchesTab) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        (c.empresa || '').toLowerCase().includes(q) ||
        (c.tipo_contrato || '').toLowerCase().includes(q) ||
        (c.condominio_nome || '').toLowerCase().includes(q)
      );
    });

    if (sortField) {
      result = [...result].sort((a, b) => {
        let valA = a[sortField] ?? '';
        let valB = b[sortField] ?? '';
        if (sortField === 'valor_atual' || sortField === 'valor_inicial') {
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }
        const cmp = String(valA).localeCompare(String(valB), 'pt-BR', { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [contratos, tab, statusFilter, searchTerm, sortField, sortDir]);

  const tabs = ['Todos', ...contractTypes];



  return (
    <Shell>
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title">Contratos</h1>
          <p className="dc-page-subtitle">
            Gerencie contratos recorrentes dos condomínios com leitura inteligente de PDFs.
          </p>
        </div>
        <button className="dc-btn dc-btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Novo Contrato
        </button>
      </div>

      {/* KPI Cards */}
      <div className="dc-stats-grid">
        <KpiCard title="Total de Contratos" value={stats?.total ?? 0} color="#eff6ff" iconColor="#2563eb" icon={<FileSignature size={22} />} />
        <KpiCard title="Ativos" value={stats?.ativos ?? 0} color="#f0fdf4" iconColor="#16a34a" icon={<CheckCircle2 size={22} />} />
        <KpiCard title="A Vencer" value={stats?.a_vencer ?? 0} color="#fffbeb" iconColor="#d97706" icon={<Clock size={22} />} />
        <KpiCard title="Vencidos" value={stats?.vencidos ?? 0} color="#fef2f2" iconColor="#dc2626" icon={<AlertTriangle size={22} />} />
      </div>

      {/* Filter bar */}
      <div className="dc-filter-bar">
        <div className="dc-filter-search">
          <Search />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por condomínio, empresa ou tipo..."
          />
        </div>
        <div className="dc-tabs" style={{ border: 'none', margin: 0, padding: 0 }}>
          {tabs.map(t => (
            <button key={t} className={`dc-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ width: 160 }}>
          <Select
            value={statusFilter === "" ? { value: "", label: "Todos os Status" } : { value: statusFilter, label: statusFilter === "ativo" ? "Ativo" : statusFilter === "vencido" ? "Vencido" : statusFilter === "a_vencer" ? "A Vencer" : "Todos os Status" }}
            onChange={(option: any) => setStatusFilter(option?.value || '')}
            options={[
              { value: "", label: "Todos os Status" },
              { value: "ativo", label: "Ativo" },
              { value: "a_vencer", label: "A Vencer" },
              { value: "vencido", label: "Vencido" }
            ]}
            isSearchable={false}
            styles={{
              ...selectStyles,
              control: (base, state) => ({ ...selectStyles.control(base, state), background: '#f8fafc', height: 34, minHeight: 34, fontSize: '0.82rem', fontWeight: 700, color: '#64748b' })
            }}
          />
        </div>
        <div className="dc-filter-divider" />
        <span className="dc-filter-count">
          {filtered.length} contrato{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="dc-card">
        <div className="dc-table-wrapper">
          <table className="dc-table">
            <thead>
              <tr>
                <th>
                  <span onClick={() => toggleSort('condominio_nome')} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center' }}>
                    Condomínio <ArrowUpDown size={13} style={{ marginLeft: 4, color: sortField === 'condominio_nome' ? '#2563eb' : '#cbd5e1' }} />
                  </span>
                </th>
                <th>Empresa / Tipo</th>
                <th>Vigência</th>
                <th>
                  <span onClick={() => toggleSort('valor_atual')} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center' }}>
                    Valor Atual <ArrowUpDown size={13} style={{ marginLeft: 4, color: sortField === 'valor_atual' ? '#2563eb' : '#cbd5e1' }} />
                  </span>
                </th>
                <th>Reajuste</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : filtered.map(c => {
                const st = STATUS_CONFIG[c.status] || STATUS_CONFIG['ativo'];
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="dc-condo-icon" style={{ width: 38, height: 38, flexShrink: 0 }}>
                          <Building2 size={18} />
                        </div>
                        <div>
                          <div className="dc-cell-primary">{c.condominio_nome || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: '#f0f9ff', color: '#0369a1',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '0.85rem', flexShrink: 0,
                        }}>
                          {c.tipo_contrato[0]}
                        </div>
                        <div>
                          <div className="dc-cell-primary">{c.empresa}</div>
                          <div className="dc-cell-secondary">{c.tipo_contrato}{c.tipo_personalizado ? ` (${c.tipo_personalizado})` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="dc-cell-primary" style={{ fontSize: '0.82rem' }}>
                        {formatDate(c.data_inicio)} → {c.data_fim ? formatDate(c.data_fim) : 'Indeterminado'}
                      </div>
                    </td>
                    <td>
                      <div className="dc-cell-primary">{formatCurrency(c.valor_atual)}</div>
                      {c.valor_inicial !== c.valor_atual && (
                        <div className="dc-cell-secondary">Inicial: {formatCurrency(c.valor_inicial)}</div>
                      )}
                    </td>
                    <td>
                      <div className="dc-cell-primary" style={{ fontSize: '0.82rem' }}>
                        {c.indice_reajuste || '—'}
                      </div>
                      <div className="dc-cell-secondary">{c.periodicidade}</div>
                    </td>
                    <td>
                      <span className={`dc-badge ${st.class}`}>
                        <span className="dc-badge-dot" />
                        {st.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                        {c.arquivo_path ? (
                          <button
                            className="dc-btn dc-btn-ghost"
                            style={{ height: 34, padding: '0 10px', fontSize: '0.78rem' }}
                            onClick={async () => {
                              setDownloadingId(c.id);
                              try {
                                await api.downloadContratoArquivo(c.id);
                              } catch (err: any) {
                                alert(err.message || 'Erro ao baixar contrato');
                              } finally {
                                setDownloadingId(null);
                                }
                            }}
                            title="Baixar Arquivo Anexo do Contrato"
                          >
                            {downloadingId === c.id ? <div className="dc-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Download size={14} />}
                          </button>
                        ) : (
                          <span style={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: 700, padding: '0 8px' }}>
                            Sem contrato assinado
                          </span>
                        )}
                        <button
                          className="dc-btn dc-btn-dark"
                          style={{ height: 34, padding: '0 14px', fontSize: '0.78rem', gap: 6 }}
                          onClick={() => handleOpenEdit(c)}
                        >
                          <Eye size={14} /> Gerenciar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
                      <FileSignature size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#475569' }}>Nenhum contrato encontrado</div>
                      <div style={{ fontSize: '0.85rem', marginTop: 4 }}>Cadastre um novo contrato para começar.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination info */}
      <div className="dc-pagination">
        <span className="dc-pagination-info">
          Mostrando {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 640 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">{editingId ? 'Editar Contrato' : 'Novo Contrato'}</h2>
              <button className="dc-modal-close" onClick={handleCloseModal}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="dc-modal-body dc-space-y-4">

                {!editingId && (
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: `2px dashed ${dragOver ? '#2563eb' : pdfFile ? '#22c55e' : '#e2e8f0'}`,
                      borderRadius: 12,
                      padding: '20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: dragOver ? '#eff6ff' : pdfFile ? '#f0fdf4' : '#f8fafc',
                      transition: 'all 0.2s',
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    {pdfFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <FileText size={20} style={{ color: '#22c55e' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>{pdfFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload size={28} style={{ color: '#94a3b8', margin: '0 auto 8px' }} />
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#475569' }}>
                          Arraste o PDF do contrato ou clique para selecionar
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 4 }}>
                          O arquivo ficará anexado a este registro para consulta rápida.
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Section: Identificação */}
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginTop: 4 }}>
                  📌 Identificação
                </div>

                <div className="dc-form-group">
                  <label>Condomínio</label>
                  <Select
                    options={condos.map(c => ({ value: c.id, label: `${c.nome} (Nº ${c.numero})` }))}
                    value={form.condominio_id ? { value: form.condominio_id, label: condos.find(c => c.id === form.condominio_id) ? `${condos.find(c => c.id === form.condominio_id)?.nome} (Nº ${condos.find(c => c.id === form.condominio_id)?.numero})` : form.condominio_id } : null}
                    onChange={(option: any) => setForm({ ...form, condominio_id: option?.value || '' })}
                    placeholder="Busque por nome ou número..."
                    isDisabled={!!editingId}
                    styles={selectStyles}
                    noOptionsMessage={() => "Nenhum condomínio encontrado"}
                    isSearchable
                    filterOption={(option: any, inputValue: string) => {
                      if (!inputValue) return true;
                      const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                      return normalize(option.label).includes(normalize(inputValue));
                    }}
                  />
                </div>

                <div className="dc-form-group">
                  <label>Empresa Contratada</label>
                  <input
                    className="dc-form-input"
                    required
                    value={form.empresa}
                    onChange={e => setForm({ ...form, empresa: e.target.value })}
                    placeholder="Ex: ThyssenKrupp Elevadores"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="dc-form-group">
                    <label>Razão Social</label>
                    <input
                      className="dc-form-input"
                      value={form.razao_social}
                      onChange={e => setForm({ ...form, razao_social: e.target.value })}
                      placeholder="..."
                    />
                  </div>
                  <div className="dc-form-group">
                    <label>CNPJ Empresa</label>
                    <input
                      className="dc-form-input"
                      value={form.cnpj_empresa}
                      onChange={e => setForm({ ...form, cnpj_empresa: e.target.value })}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="dc-form-group">
                    <label>E-mail de Contato</label>
                    <input
                      className="dc-form-input"
                      type="email"
                      value={form.email_contato}
                      onChange={e => setForm({ ...form, email_contato: e.target.value })}
                      placeholder="financeiro@empresa.com.br"
                    />
                  </div>
                  <div className="dc-form-group">
                    <label>Celular/Telefone</label>
                    <input
                      className="dc-form-input"
                      value={form.telefone_contato}
                      onChange={e => setForm({ ...form, telefone_contato: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="dc-form-group">
                    <label>Tipo de Contrato</label>
                    <Select
                      options={contractTypes.map(t => ({ value: t, label: t }))}
                      value={{ value: form.tipo_contrato, label: form.tipo_contrato }}
                      onChange={(option: any) => setForm({ ...form, tipo_contrato: option?.value || 'Outros' })}
                      styles={selectStyles}
                      isSearchable
                      noOptionsMessage={() => "Nenhum tipo encontrado"}
                    />
                  </div>
                  {form.tipo_contrato === 'Outros' && (
                    <div className="dc-form-group">
                      <label>Especifique o Tipo</label>
                      <input
                        className="dc-form-input"
                        value={form.tipo_personalizado}
                        onChange={e => setForm({ ...form, tipo_personalizado: e.target.value })}
                        placeholder="Ex: Jardinagem"
                      />
                    </div>
                  )}
                </div>

                {/* Section: Vigência */}
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginTop: 8 }}>
                  📅 Vigência
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="dc-form-group">
                    <label>Data de Início</label>
                    <input
                      className="dc-form-input"
                      type="date"
                      required
                      value={form.data_inicio}
                      onChange={e => setForm({ ...form, data_inicio: e.target.value })}
                    />
                  </div>
                  <div className="dc-form-group">
                    <label>Data de Término</label>
                    <input
                      className="dc-form-input"
                      type="date"
                      value={form.data_fim}
                      onChange={e => setForm({ ...form, data_fim: e.target.value })}
                      placeholder="Deixe vazio para indeterminado"
                    />
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>Vazio = indeterminado</span>
                  </div>
                </div>

                {/* Section: Financeiro */}
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', paddingBottom: 6, marginTop: 8 }}>
                  💰 Financeiro
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="dc-form-group">
                    <label>Valor Inicial (R$)</label>
                    <input
                      className="dc-form-input"
                      type="number"
                      step="0.01"
                      required
                      value={form.valor_inicial}
                      onChange={e => setForm({ ...form, valor_inicial: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="dc-form-group">
                    <label>Valor Atual (R$)</label>
                    <input
                      className="dc-form-input"
                      type="number"
                      step="0.01"
                      value={form.valor_atual}
                      onChange={e => setForm({ ...form, valor_atual: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div className="dc-form-group">
                    <label>Índice de Reajuste</label>
                    <Select
                      options={[{value: '', label: 'Nenhum'}, ...INDICES.map(i => ({ value: i, label: i }))]}
                      value={form.indice_reajuste ? { value: form.indice_reajuste, label: form.indice_reajuste } : { value: '', label: 'Nenhum' }}
                      onChange={(option: any) => setForm({ ...form, indice_reajuste: option?.value || '' })}
                      styles={selectStyles}
                      isSearchable
                      placeholder="Selecine..."
                      noOptionsMessage={() => "Nenhum índice encontrado"}
                    />
                  </div>
                  <div className="dc-form-group">
                    <label>Data de Reajuste</label>
                    <input className="dc-form-input" type="date" value={form.data_reajuste} onChange={e => setForm({ ...form, data_reajuste: e.target.value })} />
                  </div>
                  <div className="dc-form-group">
                    <label>Periodicidade</label>
                    <Select
                      options={PERIODICIDADES.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
                      value={{ value: form.periodicidade, label: form.periodicidade.charAt(0).toUpperCase() + form.periodicidade.slice(1) }}
                      onChange={(option: any) => setForm({ ...form, periodicidade: option?.value || 'mensal' })}
                      styles={selectStyles}
                      isSearchable={false}
                    />
                  </div>
                </div>

                {/* Observações */}
                <div className="dc-form-group">
                  <label>Observações</label>
                  <textarea
                    className="dc-form-input"
                    value={form.observacoes}
                    onChange={e => setForm({ ...form, observacoes: e.target.value })}
                    placeholder="Notas adicionais sobre o contrato..."
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="dc-modal-footer" style={{ justifyContent: 'space-between' }}>
                {editingId ? (
                  <button type="button" className="dc-btn dc-btn-danger" onClick={handleDelete} style={{ gap: 8 }}>
                    <Trash2 size={15} /> Excluir
                  </button>
                ) : (
                  <div></div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="dc-btn dc-btn-secondary" onClick={handleCloseModal}>Cancelar</button>
                  <button type="submit" className="dc-btn dc-btn-primary" disabled={saving} style={{ gap: 10 }}>
                    {saving && <div className="dc-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} />}
                    {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar Contrato'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}

function KpiCard({ title, value, color, iconColor, icon }: {
  title: string; value: number; color: string; iconColor: string; icon: React.ReactNode;
}) {
  return (
    <div className="dc-stat-card">
      <div className="dc-stat-top">
        <div className="dc-stat-icon" style={{ background: color, color: iconColor }}>{icon}</div>
      </div>
      <div>
        <div className="dc-stat-label">{title}</div>
        <div className="dc-stat-value">{value}</div>
      </div>
    </div>
  );
}
