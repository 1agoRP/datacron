'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Shell from '@/components/layout/Shell';
import { Plus, Building2, Mail, ShieldCheck, Calendar, Zap, ArrowUpRight, X, Trash2, Search, Filter, Key, Eye, EyeOff, ArrowUpDown } from 'lucide-react';
import { api } from '@/lib/api';
import Select from 'react-select';

const COLOR_MAP: Record<string, { bg: string; color: string }> = {
  enel:   { bg: '#eff6ff', color: '#2563eb' },
  sabesp: { bg: '#ecfeff', color: '#0891b2' },
  'comgás': { bg: '#fff7ed', color: '#ea580c' },
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
  indicatorSeparator: (base: any) => ({...base, display: 'none'})
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
  if (regra === '3_primeiros_cnpj') return cnpjDigits.slice(0, 3) || '(selecione condomínio)';
  if (regra === 'cnpj_completo') return cnpjDigits || '(selecione condomínio)';
  return '—';
}

export default function ConcessionariasPage() {
  const [concs, setConcs] = useState<any[]>([]);
  const [condos, setCondos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    valor_medio: 0
  };

  const [formConc, setFormConc] = useState<any>({ ...defaultConc });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [concData, condoData] = await Promise.all([
        api.getConcessionarias(),
        api.getCondominios()
      ]);
      setConcs(concData);
      setCondos(condoData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get CNPJ digits for the selected condominio
  const selectedCondoCnpjDigits = useMemo(() => {
    if (!formConc.condominio_id) return '';
    const condo = condos.find(c => c.id === formConc.condominio_id);
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

      // Clean email
      if (!payload.email_esperado || !payload.email_esperado.includes('@')) {
        payload.email_esperado = undefined;
      }

      // Always keep senha_manual if rule is manual; otherwise send undefined to not overwrite
      if (payload.regra_senha !== 'manual') {
        payload.senha_manual = undefined;
      }
      
      if (!payload.valor_medio) payload.valor_medio = 0;

      // Remove fields not in ConcessionariaUpdate schema for editing
      if (editingId) {
        delete payload.condominio_id;
        delete payload.instalacao;
        await api.updateConcessionaria(editingId, payload);
      } else {
        await api.createConcessionaria(payload);
      }
      
      handleCloseModal();
      fetchData();
      setCreating(false);
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
        console.warn('Network error during save, retrying silently in 2s...');
        setTimeout(() => handleSave(), 2000);
        return; // maintain the loading (creating = true) state
      }
      alert(err.message);
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!confirm('Deseja realmente excluir esta concessionária e todas as suas automações? Ação irreversível!')) return;
    
    try {
      await api.deleteConcessionaria(editingId);
      handleCloseModal();
      fetchData();
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
        console.warn('Network error during delete, retrying silently in 2s...');
        setTimeout(() => handleDelete(), 2000);
        return;
      }
      alert(err.message);
    }
  };

  const handleOpenCreate = () => {
    setFormConc({ ...defaultConc });
    setEditingId(null);
    setShowPassword(false);
    setIsModalOpen(true);
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
      valor_medio: conc.valor_medio || 0
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

  const toggleSort = (field: 'nome' | 'numero') => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let result = concs.filter(c => {
      const matchesTab = tab === 'Todas' || c.tipo.toLowerCase() === tab.toLowerCase();
      if (!matchesTab) return false;
      
      const condo = condos.find(cd => cd.id === c.condominio_id);
      
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
      result.sort((a, b) => {
        const condoA = condos.find(cd => cd.id === a.condominio_id);
        const condoB = condos.find(cd => cd.id === b.condominio_id);
        let valA = condoA ? condoA[sortField] : '';
        let valB = condoB ? condoB[sortField] : '';
        
        if (sortField === 'numero') {
          valA = parseInt(valA as string) || 0;
          valB = parseInt(valB as string) || 0;
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }
        
        const cmp = String(valA).localeCompare(String(valB), 'pt-BR', { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [concs, condos, tab, searchTerm, sortField, sortDir]);

  const tabs = ['Todas', 'Enel', 'Sabesp', 'Comgás', 'Outros'];

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
        <button className="dc-btn dc-btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> Vincular Nova
        </button>
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
                <th>Valor Médio</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : filtered.map(conc => {
                const condo = condos.find(c => c.id === conc.condominio_id);
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
                          <div className="dc-cell-primary">{conc.tipo}</div>
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
                      <div className="dc-cell-primary">R$ {(conc.valor_medio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </td>
                    <td>
                      <span className="dc-badge dc-badge-green">
                        <span className="dc-badge-dot" />
                        Ativo
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="dc-btn dc-btn-dark"
                          style={{ height: 34, padding: '0 14px', fontSize: '0.78rem', gap: 6 }}
                          onClick={() => handleOpenEdit(conc)}
                        >
                          <ShieldCheck size={14} /> Gerenciar Regras
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
              <h2 className="dc-modal-title">{editingId ? 'Gerenciar Regras' : 'Vincular Concessionária'}</h2>
              <button className="dc-modal-close" onClick={handleCloseModal}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="dc-modal-body dc-space-y-4">
                <div className="dc-form-group">
                  <label>Condomínio</label>
                  <Select
                    options={condos.map(c => ({ value: c.id, label: `${c.nome} (Nº ${c.numero})` }))}
                    value={formConc.condominio_id ? { value: formConc.condominio_id, label: condos.find(c => c.id === formConc.condominio_id) ? `${condos.find(c => c.id === formConc.condominio_id)?.nome} (Nº ${condos.find(c => c.id === formConc.condominio_id)?.numero})` : formConc.condominio_id } : null}
                    onChange={(option: any) => setFormConc({...formConc, condominio_id: option?.value || ''})}
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
                    <select value={formConc.tipo} onChange={e => setFormConc({...formConc, tipo: e.target.value})} className="dc-input dc-form-select">
                      <option value="Enel">Enel</option>
                      <option value="Sabesp">Sabesp</option>
                      <option value="Comgás">Comgás</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div className="dc-form-group">
                    <label>{getCodigoLabel(formConc.tipo)}</label>
                    <input className="dc-form-input" required value={formConc.instalacao} onChange={e => setFormConc({...formConc, instalacao: e.target.value})} placeholder="Ex: 82736412" disabled={!!editingId} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="dc-form-group">
                    <label>Regra de Senha PDF</label>
                    <select value={formConc.regra_senha} onChange={e => setFormConc({...formConc, regra_senha: e.target.value})} className="dc-input dc-form-select">
                      <option value="5_primeiros_cnpj">5 Primeiros CNPJ (Enel)</option>
                      <option value="3_primeiros_cnpj">3 Primeiros CNPJ (Sabesp/Comgas)</option>
                      <option value="cnpj_completo">CNPJ Completo</option>
                      <option value="manual">Senha Manual</option>
                    </select>
                  </div>
                  <div className="dc-form-group">
                    <label>Dia de Vencimento</label>
                    <input className="dc-form-input" type="number" required value={formConc.dia_vencimento} onChange={e => setFormConc({...formConc, dia_vencimento: parseInt(e.target.value)})} placeholder="Ex: 10" />
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
                        value={formConc.senha_manual}
                        onChange={e => setFormConc({...formConc, senha_manual: e.target.value})}
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
                    <input className="dc-form-input" value={formConc.email_esperado} onChange={e => setFormConc({...formConc, email_esperado: e.target.value})} placeholder="Ex: fatura@enel.com.br" />
                  </div>
                  <div className="dc-form-group">
                    <label>Valor Médio Mensal (R$)</label>
                    <input className="dc-form-input" type="number" step="0.01" required value={formConc.valor_medio} onChange={e => setFormConc({...formConc, valor_medio: parseFloat(e.target.value) || 0})} placeholder="Ex: 500.50" />
                  </div>
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
                  <button type="submit" className="dc-btn dc-btn-primary" disabled={creating} style={{ gap: 10 }}>
                    {creating && <div className="dc-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} />}
                    {creating ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Confirmar Inclusão'}
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
