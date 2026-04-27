'use client';

import React, { useState, useMemo } from 'react';
import Shell from '@/components/layout/Shell';
import { 
  Plus, Search, Trash2, ArrowUpDown, TrendingUp, 
  Download, Eye, FileText, X, Zap, 
  User as UserIcon, Calendar, Info
} from 'lucide-react';
import { api } from '@/lib/api';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { ReajusteMercado, ReajusteConcessionaria, isReadOnly } from '@/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORIAS_MERCADO = ['Trabalhista', 'Dissídio', 'IGPM', 'IPCA', 'INCC', 'Outros'];

export default function ReajustesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const readOnly = isReadOnly(user);

  // Main navigation tabs
  const [activeMainTab, setActiveMainTab] = useState<'mercado' | 'concessionarias'>('mercado');

  // MARKET DATA
  const { data: reajustesMercado = [], isLoading: loadingMercado, mutate: mutateMercado } = useSWR(
    'reajustes_mercado',
    () => api.getReajustesMercado(),
    { revalidateOnFocus: true }
  );

  // CONCESSIONARIA DATA
  const { data: reajustesConc = [], isLoading: loadingConc, mutate: mutateConc } = useSWR(
    'reajustes_concessionarias',
    () => api.getReajustesConcessionariaHistorico(),
    { revalidateOnFocus: true }
  );

  // Filters & Sorting
  const [tabMercado, setTabMercado] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    categoria: 'Trabalhista',
    categoria_personalizada: '',
    percentual: 0,
    vigencia: '',
    descricao: ''
  });

  const filteredMercado = useMemo(() => {
    let result = [...reajustesMercado];

    if (tabMercado !== 'Todos') {
      result = result.filter((r: ReajusteMercado) => r.categoria === tabMercado);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.categoria.toLowerCase().includes(q) ||
        (r.categoria_personalizada || '').toLowerCase().includes(q) ||
        (r.descricao || '').toLowerCase().includes(q)
      );
    }

    if (sortField) {
      result.sort((a: any, b: any) => {
        let valA = a[sortField];
        let valB = b[sortField];
        
        if (sortField === 'vigencia') {
            const dA = new Date(valA + '-01T12:00:00').getTime() || 0;
            const dB = new Date(valB + '-01T12:00:00').getTime() || 0;
            return sortDir === 'asc' ? dA - dB : dB - dA;
        }

        if (sortField === 'percentual') {
            return sortDir === 'asc' ? valA - valB : valB - valA;
        }

        const cmp = String(valA || '').localeCompare(String(valB || ''), 'pt-BR', { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    } else {
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [reajustesMercado, tabMercado, searchTerm, sortField, sortDir]);

  const filteredConc = useMemo(() => {
    let result = [...reajustesConc];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.tipo_concessionaria.toLowerCase().includes(q) ||
        (r.aplicado_por || '').toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [reajustesConc, searchTerm]);

  const handleOpenCreate = () => {
    setForm({
      categoria: 'Trabalhista',
      categoria_personalizada: '',
      percentual: 0,
      vigencia: format(new Date(), 'yyyy-MM'),
      descricao: ''
    });
    setPdfFile(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const formData = new FormData();
      formData.append('categoria', form.categoria);
      if (form.categoria_personalizada) formData.append('categoria_personalizada', form.categoria_personalizada);
      formData.append('percentual', form.percentual.toString());
      formData.append('vigencia', form.vigencia);
      if (form.descricao) formData.append('descricao', form.descricao);
      if (pdfFile) formData.append('pdf_file', pdfFile);

      await api.createReajusteMercado(formData);
      setIsModalOpen(false);
      mutateMercado();
      alert('Reajuste registrado com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar reajuste');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este registro? Ação irreversível.')) return;
    try {
      await api.deleteReajusteMercado(id);
      mutateMercado();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    }
  };

  const handleDownloadMercado = async (r: ReajusteMercado) => {
    try {
      await api.downloadDocumentoReajusteMercado(r.id);
    } catch (err: any) {
      alert('Erro ao baixar documento: ' + err.message);
    }
  };

  const handleDownloadConc = async (r: ReajusteConcessionaria) => {
    try {
      await api.downloadDocumentoReajusteConcessionaria(r.id);
    } catch (err: any) {
      alert('Erro ao baixar documento: ' + err.message);
    }
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => (
    <ArrowUpDown
      size={13}
      style={{ 
        marginLeft: 4, cursor: 'pointer', 
        color: sortField === field ? '#2563eb' : '#cbd5e1',
        transition: 'color 0.15s',
      }}
    />
  );

  const tabsMercado = ['Todos', ...CATEGORIAS_MERCADO];

  return (
    <Shell>
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title">Módulo de Reajustes</h1>
          <p className="dc-page-subtitle">Acompanhe índices de mercado e histórico de reajustes aplicados às concessionárias.</p>
        </div>
        {isAdmin && activeMainTab === 'mercado' && (
          <button className="dc-btn dc-btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} /> Registrar Índice
          </button>
        )}
      </div>

      {/* Main Tabs Selection */}
      <div className="dc-tabs" style={{ marginBottom: 20 }}>
        <button 
          className={`dc-tab${activeMainTab === 'mercado' ? ' active' : ''}`} 
          onClick={() => { setActiveMainTab('mercado'); setSortField(null); }}
          style={{ fontSize: '1rem', padding: '12px 24px' }}
        >
          <TrendingUp size={18} style={{ marginRight: 8 }} /> Índices de Mercado
        </button>
        <button 
          className={`dc-tab${activeMainTab === 'concessionarias' ? ' active' : ''}`} 
          onClick={() => { setActiveMainTab('concessionarias'); setSortField(null); }}
          style={{ fontSize: '1rem', padding: '12px 24px' }}
        >
          <Zap size={18} style={{ marginRight: 8 }} /> Reajustes de Concessionárias
        </button>
      </div>

      <div className="dc-filter-bar">
        <div className="dc-filter-search">
          <Search />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={`Buscar em ${activeMainTab === 'mercado' ? 'índices' : 'reajustes'}...`}
          />
        </div>
        
        {activeMainTab === 'mercado' && (
          <div className="dc-tabs" style={{ border: 'none', margin: 0, padding: 0 }}>
            {tabsMercado.map(t => (
              <button key={t} className={`dc-tab${tabMercado === t ? ' active' : ''}`} onClick={() => setTabMercado(t)}>
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="dc-filter-divider" />
        <span className="dc-filter-count">
          {activeMainTab === 'mercado' ? filteredMercado.length : filteredConc.length} registro{ (activeMainTab === 'mercado' ? filteredMercado.length : filteredConc.length) !== 1 ? 's' : ''}
        </span>
      </div>

      {activeMainTab === 'mercado' ? (
        /* TABLE: MERCADO */
        <div className="dc-card">
          <div className="dc-table-wrapper">
            <table className="dc-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('categoria')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Categoria <SortIcon field="categoria" />
                  </th>
                  <th onClick={() => toggleSort('percentual')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Percentual <SortIcon field="percentual" />
                  </th>
                  <th onClick={() => toggleSort('vigencia')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Vigência <SortIcon field="vigencia" />
                  </th>
                  <th>Descrição / Obs</th>
                  <th>Documento</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingMercado ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></td></tr>
                ) : filteredMercado.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: '#f0fdf4', color: '#16a34a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '0.85rem', flexShrink: 0,
                        }}>
                          {r.categoria[0]}
                        </div>
                        <div>
                          <div className="dc-cell-primary">{r.categoria}</div>
                          {r.categoria === 'Outros' && r.categoria_personalizada && (
                              <div className="dc-cell-secondary">{r.categoria_personalizada}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#059669', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <TrendingUp size={14} /> +{(r.percentual || 0).toFixed(2).replace('.', ',')}%
                      </div>
                    </td>
                    <td>
                      <div className="dc-cell-primary">
                        {r.vigencia ? format(parseISO(r.vigencia + '-01'), 'MMMM yyyy', { locale: ptBR }) : '—'}
                      </div>
                    </td>
                    <td>
                      <div className="dc-cell-secondary" style={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.descricao || '—'}
                      </div>
                    </td>
                    <td>
                      {(r.documento_base64) ? (
                        <button className="dc-btn dc-btn-ghost" style={{ padding: '0 8px', height: 28 }} onClick={() => handleDownloadMercado(r)}>
                          <FileText size={14} color="#3b82f6" />
                          <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Baixar</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sem anexo</span>
                      )}
                    </td>
                    <td>
                      {isAdmin && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button className="dc-icon-action" style={{ color: '#ef4444', background: '#fef2f2' }} title="Excluir" onClick={() => handleDelete(r.id)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!loadingMercado && filteredMercado.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '60px 24px', color: '#94a3b8' }}>
                      <TrendingUp size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#475569' }}>Nenhum índice registrado</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TABLE: CONCESSIONARIAS */
        <div className="dc-card">
          <div className="dc-table-wrapper">
            <table className="dc-table">
              <thead>
                <tr>
                  <th>Concessionária</th>
                  <th>Reajuste (%)</th>
                  <th>Mês Aplicação</th>
                  <th>Impacto</th>
                  <th>Aplicado Por</th>
                  <th>Documento</th>
                </tr>
              </thead>
              <tbody>
                {loadingConc ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></td></tr>
                ) : filteredConc.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="dc-condo-icon" style={{ width: 32, height: 32 }}>
                          <Zap size={16} />
                        </div>
                        <div className="dc-cell-primary">{r.tipo_concessionaria}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '1.05rem' }}>
                        +{(r.percentual || 0).toFixed(2).replace('.', ',')}%
                      </div>
                    </td>
                    <td>
                      <div className="dc-cell-primary">
                        {r.mes_aplicacao ? format(parseISO(r.mes_aplicacao + '-01'), 'MMMM yyyy', { locale: ptBR }) : '—'}
                      </div>
                    </td>
                    <td>
                      <div className="dc-cell-secondary">
                        <Info size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {r.registros_afetados} vinculações atualizadas
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="dc-user-avatar" style={{ width: 24, height: 24, fontSize: '0.65rem' }}>
                          {r.aplicado_por?.substring(0,2).toUpperCase() || 'OP'}
                        </div>
                        <div className="dc-cell-secondary">{r.aplicado_por}</div>
                      </div>
                    </td>
                    <td>
                      {(r.documento_base64) ? (
                        <button className="dc-btn dc-btn-ghost" style={{ padding: '0 8px', height: 28 }} onClick={() => handleDownloadConc(r)}>
                          <FileText size={14} color="#3b82f6" />
                          <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Baixar</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sem anexo</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!loadingConc && filteredConc.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '60px 24px', color: '#94a3b8' }}>
                      <History size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#475569' }}>Nenhum reajuste de concessionária no histórico</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Criar Índice Mercado */}
      {isModalOpen && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 500 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">Novo Índice de Mercado</h2>
              <button className="dc-modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="dc-modal-body dc-space-y-4">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Categoria/Índice</label>
                  <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="dc-input dc-form-select">
                    {CATEGORIAS_MERCADO.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {form.categoria === 'Outros' && (
                  <div className="dc-form-group">
                    <label>Especificar Índice/Categoria</label>
                    <input className="dc-form-input" required value={form.categoria_personalizada} onChange={e => setForm({...form, categoria_personalizada: e.target.value})} placeholder="Ex: Dissídio Segurança" />
                  </div>
                )}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="dc-form-group">
                    <label>Percentual (%)</label>
                    <input type="number" step="0.01" className="dc-form-input" required value={form.percentual || ''} onChange={e => setForm({...form, percentual: parseFloat(e.target.value)})} placeholder="Ex: 5" />
                  </div>
                  <div className="dc-form-group">
                    <label>Mês de Vigência</label>
                    <input type="month" className="dc-form-input" required value={form.vigencia} onChange={e => setForm({...form, vigencia: e.target.value})} />
                  </div>
                </div>

                <div className="dc-form-group">
                  <label>Descrição Opcional</label>
                  <textarea className="dc-form-input" rows={2} value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Ex: Aplicável aos contratos de portaria terceirizada" />
                </div>

                <div className="dc-form-group">
                  <label>Documento/Comprovante (PDF)</label>
                  <input type="file" accept="application/pdf" className="dc-form-input" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                </div>
              </div>

              <div className="dc-modal-footer">
                <button type="button" className="dc-btn dc-btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="dc-btn dc-btn-primary" disabled={creating} style={{ minWidth: 140 }}>
                  {creating && <div className="dc-loading-spinner" />} 
                  {creating ? 'Salvando...' : 'Registrar Índice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}

const History = ({ size, style, opacity }: { size: number, style?: any, opacity?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    style={{ ...style, opacity }}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </svg>
);
