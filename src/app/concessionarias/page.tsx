'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Shell from '@/components/layout/Shell';
import { Plus, Building2, Mail, ShieldCheck, Calendar, Zap, ArrowUpRight, X, Trash2, Search, Filter, Key, Eye, EyeOff, ArrowUpDown, TrendingUp, History, Copy, Check, Power } from 'lucide-react';
import { api } from '@/lib/api';
import Select from 'react-select';
import useSWR from 'swr';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { isReadOnly } from '@/types';

const COLOR_MAP: Record<string, { bg: string; color: string }> = {
  enel: { bg: '#eff6ff', color: '#2563eb' },
  sabesp: { bg: '#ecfeff', color: '#0891b2' },
  'comgás': { bg: '#fff7ed', color: '#ea580c' },
  claro: { bg: '#fef2f2', color: '#ef4444' },
  vivo: { bg: '#faf5ff', color: '#9333ea' },
  tim: { bg: '#eff6ff', color: '#1e3a8a' },
  outros: { bg: '#f8fafc', color: '#475569' },
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
  indicatorSeparator: (base: any) => ({ ...base, display: 'none' })
};

function getColors(tipo: string) {
  return COLOR_MAP[tipo.toLowerCase()] ?? COLOR_MAP['outros'];
}

/**
 * Returns the correct nomenclature for the installation code based on the type.
 * Enel → Instalação, Sabesp → Fornecimento, Comgás → Código de Usuário
 */
function getCodigoLabel(tipo: string): string {
  switch (tipo.toLowerCase()) {
    case 'enel': return 'Instalação';
    case 'sabesp': return 'Fornecimento';
    case 'comgás': return 'Código de Usuário';
    default: return 'Código';
  }
}

/**
 * Extracts only digits from a CNPJ string (no dots, dashes, slashes).
 * Leading zeros are preserved.
 */
function cnpjToDigits(cnpj: string): string {
  return (cnpj || '').replace(/\D/g, '');
}

/**
 * Generates a password preview based on the rule and CNPJ digits.
 */
function generatePasswordPreview(regra: string, cnpjDigits: string, senhaManual: string): string {
  if (regra === 'manual') return senhaManual || '(não definida)';
  if (regra === '5_primeiros_cnpj') return cnpjDigits.slice(0, 5) || '(selecione condomínio)';
  if (regra === '4_primeiros_cnpj') return cnpjDigits.slice(0, 4) || '(selecione condomínio)';
  if (regra === '3_primeiros_cnpj') return cnpjDigits.slice(0, 3) || '(selecione condomínio)';
  if (regra === 'cnpj_completo') return cnpjDigits || '(selecione condomínio)';
  return '—';
}

export default function ConcessionariasPage() {
  // SWR for concessionárias — automatic cache + background revalidation
  const { data: concs = [], isLoading: loading, mutate: mutateConcs } = useSWR(
    'concessionarias',
    () => api.getConcessionarias(),
    { revalidateOnFocus: true }
  );

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const readOnly = isReadOnly(user);

  // SWR for condominios — needed for the create/edit modal dropdown
  const { data: condos = [] } = useSWR(
    'condominios',
    () => api.getCondominios(),
    { revalidateOnFocus: false }
  );

  const [tab, setTab] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sortField, setSortField] = useState<'nome' | 'numero' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const defaultConc = {
    condominio_id: '',
    tipo: 'Enel',
    instalacao: '',
    regra_senha: '5_primeiros_cnpj',
    dia_vencimento: 10,
    email_esperado: '',
    senha_manual: '',
    valor_medio: 0,
    nome_personalizado: '',
    leitura_individualizada: false,
    debito_automatico: true,
    senha_portal: '',
    email_emissao: '',
  };

  const [formConc, setFormConc] = useState<any>({ ...defaultConc });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Reajuste state
  const [isReajusteModalOpen, setIsReajusteModalOpen] = useState(false);
  const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false);
  const [formReajuste, setFormReajuste] = useState({ tipo_concessionaria: 'Enel', percentual: 0, mes_aplicacao: '' });
  const [pdfReajuste, setPdfReajuste] = useState<File | null>(null);
  const [aplicandoReajuste, setAplicandoReajuste] = useState(false);
  const { data: historicoReajustes = [], mutate: mutateHistorico } = useSWR(
    'historicoReajustes',
    () => api.getReajustesConcessionariaHistorico()
  );

  // Get CNPJ digits for the selected condominio
  const selectedCondoCnpjDigits = useMemo(() => {
    if (!formConc.condominio_id) return '';
    const condo = condos.find((c: any) => c.id === formConc.condominio_id);
    return condo ? cnpjToDigits(condo.cnpj) : '';
  }, [formConc.condominio_id, condos]);

  // Password preview
  const passwordPreview = useMemo(() => {
    return generatePasswordPreview(formConc.regra_senha, selectedCondoCnpjDigits, formConc.senha_manual);
  }, [formConc.regra_senha, selectedCondoCnpjDigits, formConc.senha_manual]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setCreating(true);
      
      const payload: any = { ...formConc };

      // Clean email fields
      if (!payload.email_esperado || !payload.email_esperado.trim() || !payload.email_esperado.includes('@')) {
        payload.email_esperado = null;
      }
      
      if (!payload.email_emissao || !payload.email_emissao.trim() || !payload.email_emissao.includes('@')) {
        payload.email_emissao = null;
      }

      // Handle password rule
      if (payload.regra_senha !== 'manual') {
        payload.senha_manual = null;
      }

      if (payload.valor_medio === undefined || payload.valor_medio === null || isNaN(payload.valor_medio)) {
        payload.valor_medio = 0;
      }

      if (editingId) {
        // Remove fields not in ConcessionariaUpdate schema
        delete payload.condominio_id;
        
        // RBAC: Only allowed roles can update instalacao (matched with backend)
        const allowedRoles = ['admin', 'supervisor', 'gerencia', 'assistente'];
        if (!allowedRoles.includes(user?.role || '')) {
          delete payload.instalacao;
        }

        await api.updateConcessionaria(editingId, payload);
      } else {
        await api.createConcessionaria(payload);
      }

      handleCloseModal();
      mutateConcs(); // SWR revalidation — instant UI update
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleAplicarReajuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formReajuste.tipo_concessionaria || formReajuste.percentual <= 0 || !formReajuste.mes_aplicacao) {
      alert("Preencha todos os campos obrigatórios corretamente.");
      return;
    }

    try {
      setAplicandoReajuste(true);
      const formData = new FormData();
      formData.append('tipo_concessionaria', formReajuste.tipo_concessionaria);
      formData.append('percentual', formReajuste.percentual.toString());
      formData.append('mes_aplicacao', formReajuste.mes_aplicacao);
      if (pdfReajuste) {
        formData.append('pdf_file', pdfReajuste);
      }

      await api.aplicarReajusteConcessionaria(formData);
      await mutateConcs();
      await mutateHistorico();
      setIsReajusteModalOpen(false);
      setPdfReajuste(null);
      setFormReajuste({ tipo_concessionaria: 'Enel', percentual: 0, mes_aplicacao: '' });
      alert('Reajuste aplicado com sucesso!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAplicandoReajuste(false);
    }
  };

  const handleOpenCreate = () => {
    setFormConc({ ...defaultConc });
    setEditingId(null);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!confirm('Deseja realmente excluir esta concessionária e todas as suas automações? Ação irreversível!')) return;

    try {
      await api.deleteConcessionaria(editingId);
      handleCloseModal();
      mutateConcs(); // SWR revalidation
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    }
  };



  const handleOpenEdit = (conc: any) => {
    setFormConc({
      condominio_id: conc.condominio_id,
      tipo: conc.tipo,
      instalacao: conc.instalacao,
      regra_senha: conc.regra_senha,
      dia_vencimento: conc.dia_vencimento,
      email_esperado: conc.email_esperado || '',
      senha_manual: conc.senha_manual || '',
      valor_medio: conc.valor_medio || 0,
      nome_personalizado: conc.nome_personalizado || '',
      leitura_individualizada: conc.leitura_individualizada || false,
      debito_automatico: conc.debito_automatico || false,
      email_emissao: conc.email_emissao || '',
      senha_portal: conc.senha_portal || ''
    });
    setEditingId(conc.id);
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setShowPassword(false);
  };

  const handleToggleDebito = async (concId: string, atual: boolean) => {
    try {
      if (readOnly) return;
      await api.updateConcessionaria(concId, { debito_automatico: !atual });
      mutateConcs();
    } catch (err: any) {
      alert('Erro ao alterar Débito Automático: ' + err.message);
    }
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const handleCopySenha = (text: string | null | undefined, id: string) => {
    navigator.clipboard.writeText(text || '');
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSort = (field: 'nome' | 'numero') => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let result = [...concs].filter((c: any) => {
      const matchesTab = tab === 'Todas' || c.tipo.toLowerCase() === tab.toLowerCase();
      if (!matchesTab) return false;

      // Use condominio data from the API response (selectinload)
      const condo = c.condominio;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        (condo?.nome || '').toLowerCase().includes(q) ||
        (condo?.numero || '').includes(q) ||
        c.instalacao.toLowerCase().includes(q) ||
        c.tipo.toLowerCase().includes(q)
      );
    });

    if (sortField) {
      result.sort((a: any, b: any) => {
        const condoA = a.condominio;
        const condoB = b.condominio;
        const valA = condoA ? condoA[sortField] : '';
        const valB = condoB ? condoB[sortField] : '';

        if (sortField === 'numero') {
          const numA = parseInt(valA as string) || 0;
          const numB = parseInt(valB as string) || 0;
          return sortDir === 'asc' ? numA - numB : numB - numA;
        }

        const cmp = String(valA).localeCompare(String(valB), 'pt-BR', { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [concs, tab, searchTerm, sortField, sortDir]);

  const tabs = ['Todas', 'Enel', 'Sabesp', 'Comgás', 'Claro', 'Vivo', 'TIM', 'Outros'];

  const SortIcon = ({ field }: { field: 'nome' | 'numero' }) => (
    <ArrowUpDown
      size={13}
      style={{
        marginLeft: 4, cursor: 'pointer',
        color: sortField === field ? '#2563eb' : '#cbd5e1',
        transition: 'color 0.15s',
      }}
    />
  );

  return (
    <Shell>
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title">Concessionárias</h1>
          <p className="dc-page-subtitle">
            Configure regras de senha, e-mails esperados e vencimentos de cada vinculação.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="dc-btn dc-btn-secondary" onClick={() => setIsHistoricoModalOpen(true)}>
            <History size={16} /> Histórico
          </button>
          {isAdmin && (
            <button className="dc-btn dc-btn-dark" onClick={() => setIsReajusteModalOpen(true)}>
              <TrendingUp size={16} /> Aplicar Reajuste
            </button>
          )}
          {!readOnly && (
            <button className="dc-btn dc-btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} /> Vincular Nova
            </button>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="dc-filter-bar">
        <div className="dc-filter-search">
          <Search />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por condomínio, código ou tipo..."
          />
        </div>
        <div className="dc-tabs" style={{ border: 'none', margin: 0, padding: 0 }}>
          {tabs.map(t => (
            <button key={t} className={`dc-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <div className="dc-filter-divider" />
        <span className="dc-filter-count">
          {filtered.length} vinculaç{filtered.length !== 1 ? 'ões' : 'ão'}
        </span>
      </div>

      {/* Table (replacing cards) */}
      <div className="dc-card">
        <div className="dc-table-wrapper">
          <table className="dc-table">
            <thead>
              <tr>
                <th>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span onClick={() => toggleSort('nome')} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center' }} title="Ordenar por Nome">
                      Condomínio <SortIcon field="nome" />
                    </span>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <span onClick={() => toggleSort('numero')} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center' }} title="Ordenar por Nº">
                      Nº <SortIcon field="numero" />
                    </span>
                  </div>
                </th>
                <th>Tipo / Código</th>
                <th>Regra de Senha</th>

                <th>Vencimento</th>
                <th>Déb. Aut.</th>
                <th>Valor Médio</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : filtered.map(conc => {
                const condo = conc.condominio;
                const colors = getColors(conc.tipo);
                const codigoLabel = getCodigoLabel(conc.tipo);
                return (
                  <tr key={conc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="dc-condo-icon" style={{ width: 38, height: 38, flexShrink: 0 }}>
                          <Building2 size={18} />
                        </div>
                        <div>
                          <div className="dc-cell-primary">{condo?.nome || '—'}</div>
                          <div className="dc-cell-secondary">Nº {condo?.numero}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: colors.bg, color: colors.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '0.85rem', flexShrink: 0,
                          }}
                        >
                          {conc.tipo[0]}
                        </div>
                        <div>
                          <div className="dc-cell-primary">{conc.tipo === 'Outros' && conc.nome_personalizado ? conc.nome_personalizado : conc.tipo}</div>
                          <div className="dc-cell-secondary">{codigoLabel}: {conc.instalacao}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="dc-cell-primary" style={{ fontSize: '0.82rem' }}>
                        {conc.regra_senha === 'manual' ? 'Senha Manual' : conc.regra_senha.replace(/_/g, ' ')}
                      </div>
                    </td>

                    <td>
                      <div className="dc-cell-primary">Dia {conc.dia_vencimento}</div>
                    </td>
                    <td>
                      <div
                        style={{
                          background: conc.debito_automatico ? '#10b981' : '#ef4444',
                          border: 'none',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px',
                          width: '40px',
                          cursor: 'default',
                          position: 'relative',
                          transition: 'background-color 0.2s'
                        }}
                        title={conc.debito_automatico ? 'Ativo' : 'Inativo (Atenção)'}
                      >
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#fff',
                          transform: conc.debito_automatico ? 'translateX(18px)' : 'translateX(0)',
                          transition: 'transform 0.2s'
                        }} />
                      </div>
                    </td>
                    <td>
                      <div className="dc-cell-primary">{formatCurrency(conc.valor_medio || 0)}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {!readOnly && (
                          <button
                            className="dc-btn dc-btn-dark"
                            style={{ height: 34, padding: '0 14px', fontSize: '0.78rem', gap: 6 }}
                            onClick={() => handleOpenEdit(conc)}
                          >
                            <ShieldCheck size={14} /> Gerenciar Regras
                          </button>
                        )}
                        {readOnly && (
                          <button
                            className="dc-btn dc-btn-dark"
                            style={{ height: 34, padding: '0 14px', fontSize: '0.78rem', gap: 6 }}
                            onClick={() => handleOpenEdit(conc)}
                          >
                            <Eye size={14} /> Ver Detalhes
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
                      <Zap size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#475569' }}>Nenhuma concessionária encontrada</div>
                      <div style={{ fontSize: '0.85rem', marginTop: 4 }}>Vincule uma concessionária a um condomínio para começar.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="dc-pagination">
        <span className="dc-pagination-info">
          Mostrando {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {isModalOpen && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 540 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">{readOnly ? 'Detalhes da Concessionária' : editingId ? 'Gerenciar Regras' : 'Vincular Concessionária'}</h2>
              <button className="dc-modal-close" onClick={handleCloseModal}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="dc-modal-body dc-space-y-4">
                <div className="dc-form-group">
                  <label>Condomínio</label>
                  <Select
                    options={condos.map(c => ({ value: c.id, label: `${c.nome} (Nº ${c.numero})` }))}
                    value={formConc.condominio_id ? { value: formConc.condominio_id, label: condos.find(c => c.id === formConc.condominio_id) ? `${condos.find(c => c.id === formConc.condominio_id)?.nome} (Nº ${condos.find(c => c.id === formConc.condominio_id)?.numero})` : formConc.condominio_id } : null}
                    onChange={(option: any) => setFormConc({ ...formConc, condominio_id: option?.value || '' })}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="dc-form-group">
                    <label>Tipo</label>
                    <select disabled={readOnly} value={formConc.tipo} onChange={e => setFormConc({ ...formConc, tipo: e.target.value })} className="dc-input dc-form-select">
                      <option value="Enel">Enel</option>
                      <option value="Sabesp">Sabesp</option>
                      <option value="Comgás">Comgás</option>
                      <option value="Claro">Claro</option>
                      <option value="Vivo">Vivo</option>
                      <option value="TIM">TIM</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  {formConc.tipo === 'Outros' ? (
                    <div className="dc-form-group">
                      <label>Nome da Concessionária</label>
                      <input className="dc-form-input" required value={formConc.nome_personalizado || ''} onChange={e => setFormConc({ ...formConc, nome_personalizado: e.target.value })} placeholder="Ex: Sanasa" disabled={!!editingId || readOnly} />
                    </div>
                  ) : null}
                  <div className="dc-form-group">
                    <label>{getCodigoLabel(formConc.tipo)}</label>
                    <input className="dc-form-input" required value={formConc.instalacao || ''} onChange={e => setFormConc({ ...formConc, instalacao: e.target.value })} placeholder="Ex: 82736412" disabled={readOnly || (!!editingId && !['admin', 'supervisor', 'gerencia', 'assistente'].includes(user?.role || ''))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="dc-form-group">
                    <label>Regra de Senha PDF</label>
                    <select disabled={readOnly} value={formConc.regra_senha} onChange={e => setFormConc({ ...formConc, regra_senha: e.target.value })} className="dc-input dc-form-select">
                      <option value="5_primeiros_cnpj">5 Primeiros CNPJ (Enel/Claro)</option>
                      <option value="4_primeiros_cnpj">4 Primeiros CNPJ (Vivo)</option>
                      <option value="3_primeiros_cnpj">3 Primeiros CNPJ (Sabesp/Comgas)</option>
                      <option value="cnpj_completo">CNPJ Completo</option>
                      <option value="manual">Senha Manual</option>
                    </select>
                  </div>
                  <div className="dc-form-group">
                    <label>Dia de Vencimento</label>
                    <input className="dc-form-input" type="number" required disabled={readOnly} value={formConc.dia_vencimento} onChange={e => setFormConc({ ...formConc, dia_vencimento: parseInt(e.target.value) })} placeholder="Ex: 10" />
                  </div>
                </div>

                {/* Password section */}
                {formConc.regra_senha === 'manual' && (
                  <div className="dc-form-group">
                    <label>Senha do PDF (Manual)</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="dc-form-input"
                        type={showPassword ? 'text' : 'password'}
                        required
                        disabled={readOnly}
                        value={formConc.senha_manual || ''}
                        onChange={e => setFormConc({ ...formConc, senha_manual: e.target.value })}
                        placeholder="Digite a senha do arquivo"
                        style={{ paddingRight: 40 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="dc-form-group">
                  <label>Senha do Portal (Opcional)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="dc-form-input"
                      type={showPassword ? 'text' : 'password'}
                      disabled={readOnly}
                      value={formConc.senha_portal || ''}
                      onChange={e => setFormConc({ ...formConc, senha_portal: e.target.value })}
                      placeholder="Senha de acesso ao site da concessionária"
                      style={{ paddingRight: 40 }}
                    />
                  </div>
                </div>

                {/* Password Preview */}
                <div style={{
                  background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10,
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <Key size={18} style={{ color: '#0369a1', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                      Senha Gerada (Preview)
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0c4a6e', fontFamily: 'monospace', letterSpacing: '0.15em' }}>
                      {passwordPreview}
                    </div>
                    {formConc.regra_senha !== 'manual' && selectedCondoCnpjDigits && (
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>
                        CNPJ (somente dígitos): {selectedCondoCnpjDigits}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="dc-form-group">
                    <label>E-mail do Remetente (Opcional)</label>
                    <input className="dc-form-input" disabled={readOnly} value={formConc.email_esperado || ''} onChange={e => setFormConc({ ...formConc, email_esperado: e.target.value })} placeholder="Ex: fatura@enel.com.br" />
                  </div>
                  <div className="dc-form-group">
                    <label>Valor Médio Mensal (R$)</label>
                    <input className="dc-form-input" type="number" step="0.01" required disabled={readOnly} value={formConc.valor_medio} onChange={e => setFormConc({ ...formConc, valor_medio: parseFloat(e.target.value) || 0 })} placeholder="Ex: 500.50" />
                  </div>
                </div>

                <div style={{ display: 'block', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="dc-form-group">
                    <label>Débito Automático</label>
                    <div className="dc-segmented-control">
                      <button
                        type="button"
                        className={formConc.debito_automatico ? 'active' : ''}
                        disabled={readOnly}
                        onClick={() => setFormConc({ ...formConc, debito_automatico: true })}
                      >Sim</button>
                      <button
                        type="button"
                        className={!formConc.debito_automatico ? 'active active-negative' : ''}
                        disabled={readOnly}
                        onClick={() => setFormConc({ ...formConc, debito_automatico: false })}
                      >Não</button>
                    </div>
                  </div>
                </div>
                {/* E-mail emissão: shown when the selected condo has leitura individualizada ativa */}
                {formConc.condominio_id && condos.find((c: any) => c.id === formConc.condominio_id)?.leitura_individualizada_ativa && (
                  <div className="dc-form-group">
                    <label>E-mail para Emissão (Leitura Individualizada)</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="dc-form-input"
                        disabled={readOnly}
                        value={formConc.email_emissao || ''}
                        onChange={e => setFormConc({ ...formConc, email_emissao: e.target.value })}
                        placeholder="Ex: emissao@administradora.com.br"
                        style={{ paddingLeft: 40 }}
                      />
                      <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>As faturas serão enviadas automaticamente para este e-mail assim que desbloqueadas.</p>
                  </div>
                )}
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
                    <button type="submit" className="dc-btn dc-btn-primary" disabled={creating} style={{ gap: 10 }}>
                      {creating && <div className="dc-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} />}
                      {creating ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Confirmar Inclusão'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Reajuste Modal */}
      {isReajusteModalOpen && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 440 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">Aplicar Reajuste</h2>
              <button className="dc-modal-close" onClick={() => setIsReajusteModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAplicarReajuste} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="dc-form-group">
                <label>Tipo de Concessionária</label>
                <select value={formReajuste.tipo_concessionaria} onChange={e => setFormReajuste({ ...formReajuste, tipo_concessionaria: e.target.value })} className="dc-input dc-form-select">
                  <option value="Enel">Enel</option>
                  <option value="Sabesp">Sabesp</option>
                  <option value="Comgás">Comgás</option>
                  <option value="Claro">Claro</option>
                  <option value="Vivo">Vivo</option>
                  <option value="TIM">TIM</option>
                  <option value="Outros">Outros</option>
                </select>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>O valor médio de todas as concessionárias deste tipo será atualizado.</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Percentual (%)</label>
                  <input type="number" step="0.01" className="dc-form-input" required value={formReajuste.percentual || ''} onChange={e => setFormReajuste({ ...formReajuste, percentual: parseFloat(e.target.value) })} placeholder="Ex: 5.32" />
                </div>
                <div className="dc-form-group">
                  <label>Mês Presumido</label>
                  <input type="month" className="dc-form-input" required value={formReajuste.mes_aplicacao} onChange={e => setFormReajuste({ ...formReajuste, mes_aplicacao: e.target.value })} />
                </div>
              </div>

              <div className="dc-form-group">
                <label>Documento Comprobatório (Opcional)</label>
                <input type="file" accept="application/pdf" className="dc-form-input" onChange={e => setPdfReajuste(e.target.files?.[0] || null)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button type="button" className="dc-btn dc-btn-secondary" onClick={() => setIsReajusteModalOpen(false)}>Cancelar</button>
                <button type="submit" className="dc-btn dc-btn-primary" disabled={aplicandoReajuste}>
                  {aplicandoReajuste ? <div className="dc-loading-spinner" /> : <TrendingUp size={16} />}
                  Aplicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Histórico Modal */}
      {isHistoricoModalOpen && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 640 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">Histórico de Reajustes</h2>
              <button className="dc-modal-close" onClick={() => setIsHistoricoModalOpen(false)}><X size={20} /></button>
            </div>
            <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
              <table className="dc-table">
                <thead>
                  <tr>
                    <th>Data de Aplicação</th>
                    <th>Concessionária</th>
                    <th>Percentual</th>
                    <th>Mês/Ano</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoReajustes.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Nenhum reajuste aplicado.</td></tr>
                  ) : historicoReajustes.map((r: any) => (
                    <tr key={r.id}>
                      <td>{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                      <td>{r.tipo_concessionaria}</td>
                      <td style={{ color: '#059669', fontWeight: 600 }}>+{r.percentual.toFixed(2).replace('.', ',')}%</td>
                      <td>{r.mes_aplicacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
