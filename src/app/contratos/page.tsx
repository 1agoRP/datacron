'use client';

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import {
  Plus, Building2, FileSignature, Calendar, DollarSign, X, Trash2,
  Search, Filter, Download, Upload, AlertTriangle, CheckCircle2,
  Clock, Eye, FileText, ArrowUpDown, ChevronDown, Store, Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import Select from 'react-select';
import useSWR from 'swr';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { isReadOnly } from '@/types';

const CONTRACT_TYPES = [
  'Elevadores',
  'Bombas',
  'Gerador',
  'Limpeza',
  'Portaria',
  'CFTV/Portões/Interfone',
  'Segurança',
  'Jardim',
  'Piscina',
  'Controle de Acesso',
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

  const { user } = useAuth();
  const readOnly = isReadOnly(user);


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
    tipo_contrato: 'Elevadores',
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

  // CNPJ lookup state
  const [cnpjInput, setCnpjInput] = useState('');
  const [cnpjLookupState, setCnpjLookupState] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');
  const [cnpjLookupError, setCnpjLookupError] = useState<string | null>(null);

  // Supplier registration popup
  const [showFornecedorPopup, setShowFornecedorPopup] = useState(false);
  const [savingFornecedor, setSavingFornecedor] = useState(false);
  const [categorias, setCategorias] = useState<string[]>([]);
  const defaultFornecedorForm = {
    documentoFornecedor: '',
    nomeFornecedor: '',
    emailFornecedor: '',
    whatsappFornecedor: '',
    categoriaFornecedor: '',
  };
  const [fornecedorForm, setFornecedorForm] = useState<any>({ ...defaultFornecedorForm });

  const canManageFornecedores = user && ['admin', 'gerencia', 'assistente'].includes(user.role);

  // Fetch categories when popup opens
  useEffect(() => {
    if (showFornecedorPopup) {
      api.getFornecedorCategorias().then(setCategorias).catch(() => setCategorias([]));
    }
  }, [showFornecedorPopup]);

  // Format CNPJ as user types: 00.000.000/0000-00
  const formatCnpjInput = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCnpjInput(e.target.value);
    setCnpjInput(formatted);
    setCnpjLookupState('idle');
    setCnpjLookupError(null);
  };

  const handleCnpjLookup = async () => {
    const digits = cnpjInput.replace(/\D/g, '');
    if (digits.length !== 14) {
      setCnpjLookupError('Digite um CNPJ válido com 14 dígitos.');
      return;
    }
    setCnpjLookupState('loading');
    setCnpjLookupError(null);
    try {
      const data = await api.buscarFornecedorPorCnpj(digits);
      // Autofill fields from database
      setForm((prev: any) => ({
        ...prev,
        empresa: data.nomeFornecedor || prev.empresa,
        razao_social: data.nomeFornecedor || prev.razao_social,
        cnpj_empresa: data.documentoFornecedor || cnpjInput,
        email_contato: data.emailFornecedor || prev.email_contato,
        telefone_contato: data.whatsappFornecedor || prev.telefone_contato,
      }));
      setCnpjLookupState('found');
    } catch (err: any) {
      if (err.message?.includes('não encontrado') || err.message?.includes('404')) {
        setCnpjLookupState('not_found');
        setCnpjLookupError('Empresa não cadastrada. ');
      } else {
        setCnpjLookupState('not_found');
        setCnpjLookupError(err.message || 'Erro ao consultar CNPJ.');
      }
    }
  };

  const handleOpenFornecedorPopup = () => {
    setFornecedorForm({ ...defaultFornecedorForm, documentoFornecedor: cnpjInput });
    setShowFornecedorPopup(true);
  };

  const handleSaveFornecedor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFornecedor(true);
    try {
      const data = await api.criarFornecedor({
        documentoFornecedor: fornecedorForm.documentoFornecedor,
        nomeFornecedor: fornecedorForm.nomeFornecedor,
        emailFornecedor: fornecedorForm.emailFornecedor || undefined,
        whatsappFornecedor: fornecedorForm.whatsappFornecedor || undefined,
        categoriaFornecedor: fornecedorForm.categoriaFornecedor || undefined,
      });
      // After saving, autofill the contrato form and close popup
      setForm((prev: any) => ({
        ...prev,
        empresa: data.nomeFornecedor || fornecedorForm.nomeFornecedor,
        razao_social: data.nomeFornecedor || fornecedorForm.nomeFornecedor,
        cnpj_empresa: data.documentoFornecedor || fornecedorForm.documentoFornecedor,
        email_contato: data.emailFornecedor || fornecedorForm.emailFornecedor,
        telefone_contato: data.whatsappFornecedor || fornecedorForm.whatsappFornecedor,
      }));
      setCnpjLookupState('found');
      setCnpjLookupError(null);
      setShowFornecedorPopup(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao cadastrar fornecedor');
    } finally {
      setSavingFornecedor(false);
    }
  };

  const FORNECEDOR_CATEGORIAS_LABELS: Record<string, string> = {
    '100001': 'Administração',
    '100005': 'Contabilidade',
    '100006': 'Jurídico',
    '100009': 'Engenharia',
    '100024': 'Limpeza',
    '100026': 'Portaria',
    '100027': 'Segurança',
    '100028': 'Jardim',
    '100034': 'Elevadores',
    '100045': 'Elétrica',
    '100046': 'Hidráulica',
    '100054': 'Pintura',
    '100055': 'Alvenaria',
    '100062': 'Desinsetização',
    '100068': 'Tecnologia',
    '100079': 'Materiais de Limpeza',
    '100080': 'Materiais de Construção',
    '100081': 'Manutenção',
    '100082': 'CFTV/Câmeras',
    '100083': 'Interfone',
    '100084': 'TI / Redes',
    '100086': 'Piscina',
    '100087': 'Bombas',
    '100088': 'Aquecedor',
    '100089': 'Filtros',
    '100090': 'Automação',
    '100094': 'Gerador',
    '100095': 'Energia',
    '100099': 'Ar-condicionado',
    '100111': 'Vigilância',
    '100119': 'Portão Automático',
    '100123': 'Consultoria',
    '100125': 'RH',
    '100126': 'Seguros',
    '100128': 'Tratamento de Água',
    '100131': 'Coleta de Resíduos',
  };

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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setPdfFile(null);
    setCnpjInput('');
    setCnpjLookupState('idle');
    setCnpjLookupError(null);
  };

  const handleOpenCreate = () => {
    setForm({ ...defaultForm });
    setEditingId(null);
    setPdfFile(null);
    setCnpjInput('');
    setCnpjLookupState('idle');
    setCnpjLookupError(null);
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

  const tabs = ['Todos', ...CONTRACT_TYPES];



  return (
    <Shell>
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title">Contratos</h1>
          <p className="dc-page-subtitle">
            Gerencie contratos recorrentes dos condomínios com leitura inteligente de PDFs.
          </p>
        </div>
        {!readOnly && (
          <button className="dc-btn dc-btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} /> Novo Contrato
          </button>
        )}
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
                          <Eye size={14} /> {readOnly ? 'Ver Detalhes' : 'Gerenciar'}
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
              <h2 className="dc-modal-title">{readOnly ? 'Detalhes do Contrato' : editingId ? 'Editar Contrato' : 'Novo Contrato'}</h2>
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

                {/* CNPJ lookup section — only for new contracts */}
                {!editingId && (
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontWeight: 700, fontSize: '0.82rem', color: '#475569', display: 'block', marginBottom: 6 }}>CNPJ da Empresa Contratada</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="dc-form-input"
                        value={cnpjInput}
                        onChange={handleCnpjChange}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCnpjLookup(); } }}
                        placeholder="00.000.000/0000-00"
                        style={{ flex: 1 }}
                        disabled={cnpjLookupState === 'loading'}
                      />
                      <button
                        type="button"
                        className="dc-btn dc-btn-primary"
                        style={{ height: 38, padding: '0 16px', fontSize: '0.82rem', whiteSpace: 'nowrap', flexShrink: 0 }}
                        onClick={handleCnpjLookup}
                        disabled={cnpjLookupState === 'loading'}
                      >
                        {cnpjLookupState === 'loading'
                          ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                          : 'Consultar'}
                      </button>
                    </div>

                    {cnpjLookupState === 'found' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: '#16a34a', fontSize: '0.82rem', fontWeight: 600 }}>
                        <CheckCircle2 size={14} /> Empresa encontrada e campos preenchidos automaticamente.
                      </div>
                    )}

                    {cnpjLookupState === 'not_found' && (
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: '0.82rem', fontWeight: 600 }}>
                          <AlertTriangle size={14} />
                          {cnpjLookupError || 'Fornecedor não encontrado.'}
                          {canManageFornecedores && (
                            <button
                              type="button"
                              onClick={handleOpenFornecedorPopup}
                              style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', marginLeft: 4 }}
                            >
                              Cadastrar empresa
                            </button>
                          )}
                          {!canManageFornecedores && (
                            <span style={{ color: '#94a3b8', fontWeight: 500 }}>Solicite ao Admin ou Gerente que cadastre a empresa.</span>
                          )}
                        </div>
                      </div>
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
                    disabled={readOnly}
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
                      disabled={readOnly}
                      value={form.razao_social}
                      onChange={e => setForm({ ...form, razao_social: e.target.value })}
                      placeholder="..."
                    />
                  </div>
                  <div className="dc-form-group">
                    <label>CNPJ Empresa</label>
                    <input
                      className="dc-form-input"
                      disabled={readOnly}
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
                      disabled={readOnly}
                      value={form.email_contato}
                      onChange={e => setForm({ ...form, email_contato: e.target.value })}
                      placeholder="financeiro@empresa.com.br"
                    />
                  </div>
                  <div className="dc-form-group">
                    <label>Celular/Telefone</label>
                    <input
                      className="dc-form-input"
                      disabled={readOnly}
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
                      options={CONTRACT_TYPES.map(t => ({ value: t, label: t }))}
                      value={{ value: form.tipo_contrato, label: form.tipo_contrato }}
                      onChange={(option: any) => setForm({ ...form, tipo_contrato: option?.value || 'Outros' })}
                      styles={selectStyles}
                      isSearchable
                      isDisabled={readOnly}
                      noOptionsMessage={() => "Nenhum tipo encontrado"}
                    />
                  </div>
                  {form.tipo_contrato === 'Outros' && (
                    <div className="dc-form-group">
                      <label>Especifique o Tipo</label>
                      <input
                        className="dc-form-input"
                        disabled={readOnly}
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
                      disabled={readOnly}
                      value={form.data_inicio}
                      onChange={e => setForm({ ...form, data_inicio: e.target.value })}
                    />
                  </div>
                  <div className="dc-form-group">
                    <label>Data de Término</label>
                    <input
                      className="dc-form-input"
                      type="date"
                      disabled={readOnly}
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
                      disabled={readOnly}
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
                      disabled={readOnly}
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
                      isDisabled={readOnly}
                      placeholder="Selecine..."
                      noOptionsMessage={() => "Nenhum índice encontrado"}
                    />
                  </div>
                  <div className="dc-form-group">
                    <label>Data de Reajuste</label>
                    <input className="dc-form-input" type="date" disabled={readOnly} value={form.data_reajuste} onChange={e => setForm({ ...form, data_reajuste: e.target.value })} />
                  </div>
                  <div className="dc-form-group">
                    <label>Periodicidade</label>
                    <Select
                      options={PERIODICIDADES.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
                      value={{ value: form.periodicidade, label: form.periodicidade.charAt(0).toUpperCase() + form.periodicidade.slice(1) }}
                      onChange={(option: any) => setForm({ ...form, periodicidade: option?.value || 'mensal' })}
                      styles={selectStyles}
                      isSearchable={false}
                      isDisabled={readOnly}
                    />
                  </div>
                </div>

                {/* Observações */}
                <div className="dc-form-group">
                  <label>Observações</label>
                  <textarea
                    className="dc-form-input"
                    disabled={readOnly}
                    value={form.observacoes}
                    onChange={e => setForm({ ...form, observacoes: e.target.value })}
                    placeholder="Notas adicionais sobre o contrato..."
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="dc-modal-footer" style={{ justifyContent: 'space-between' }}>
                {editingId && !readOnly ? (
                  <button type="button" className="dc-btn dc-btn-danger" onClick={handleDelete} style={{ gap: 8 }}>
                    <Trash2 size={15} /> Excluir
                  </button>
                ) : (
                  <div></div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="dc-btn dc-btn-secondary" onClick={handleCloseModal}>{readOnly ? 'Fechar' : 'Cancelar'}</button>
                  {!readOnly && (
                    <button type="submit" className="dc-btn dc-btn-primary" disabled={saving} style={{ gap: 10 }}>
                      {saving && <div className="dc-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} />}
                      {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar Contrato'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Registration Popup */}
      {showFornecedorPopup && (
        <div className="dc-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="dc-modal-content" style={{ maxWidth: 500, zIndex: 10001 }}>
            <div className="dc-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Store size={18} style={{ color: '#2563eb' }} />
                <h2 className="dc-modal-title">Cadastrar Nova Empresa</h2>
              </div>
              <button className="dc-modal-close" onClick={() => setShowFornecedorPopup(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveFornecedor} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="dc-modal-body dc-space-y-4">
                <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px', fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 600 }}>
                  📋 Os dados desta empresa serão salvos no banco de fornecedores e usados para preencher contratos futuros.
                </div>

                <div className="dc-form-group">
                  <label>CNPJ *</label>
                  <input
                    className="dc-form-input"
                    required
                    value={fornecedorForm.documentoFornecedor}
                    onChange={e => setFornecedorForm({ ...fornecedorForm, documentoFornecedor: formatCnpjInput(e.target.value) })}
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div className="dc-form-group">
                  <label>Nome / Razão Social *</label>
                  <input
                    className="dc-form-input"
                    required
                    value={fornecedorForm.nomeFornecedor}
                    onChange={e => setFornecedorForm({ ...fornecedorForm, nomeFornecedor: e.target.value })}
                    placeholder="Ex: ThyssenKrupp Elevadores S.A."
                  />
                </div>

                <div className="dc-form-group">
                  <label>E-mail</label>
                  <input
                    className="dc-form-input"
                    type="email"
                    value={fornecedorForm.emailFornecedor}
                    onChange={e => setFornecedorForm({ ...fornecedorForm, emailFornecedor: e.target.value })}
                    placeholder="financeiro@empresa.com.br"
                  />
                </div>

                <div className="dc-form-group">
                  <label>WhatsApp / Telefone</label>
                  <input
                    className="dc-form-input"
                    value={fornecedorForm.whatsappFornecedor}
                    onChange={e => setFornecedorForm({ ...fornecedorForm, whatsappFornecedor: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="dc-form-group">
                  <label>Categoria</label>
                  <Select
                    options={[
                      ...categorias.map(c => ({ value: c, label: `${c} — ${FORNECEDOR_CATEGORIAS_LABELS[c] || c}` })),
                      { value: 'outros', label: 'Outros' },
                    ]}
                    value={fornecedorForm.categoriaFornecedor
                      ? { value: fornecedorForm.categoriaFornecedor, label: `${fornecedorForm.categoriaFornecedor} — ${FORNECEDOR_CATEGORIAS_LABELS[fornecedorForm.categoriaFornecedor] || fornecedorForm.categoriaFornecedor}` }
                      : null}
                    onChange={(opt: any) => setFornecedorForm({ ...fornecedorForm, categoriaFornecedor: opt?.value || '' })}
                    styles={selectStyles}
                    isSearchable
                    placeholder="Selecione ou busque..."
                    noOptionsMessage={() => 'Nenhuma categoria encontrada'}
                    isClearable
                  />
                </div>
              </div>

              <div className="dc-modal-footer" style={{ justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="dc-btn dc-btn-secondary" onClick={() => setShowFornecedorPopup(false)}>Cancelar</button>
                  <button type="submit" className="dc-btn dc-btn-primary" disabled={savingFornecedor} style={{ gap: 10 }}>
                    {savingFornecedor && <div className="dc-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} />}
                    {savingFornecedor ? 'Salvando...' : 'Cadastrar Empresa'}
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
