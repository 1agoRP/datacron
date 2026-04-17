'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Shell from '@/components/layout/Shell';
import { Plus, Search, Filter, Building2, MapPin, ExternalLink, MoreVertical, X, Zap, Trash2, Calendar, FileText, ArrowUpDown, Download, ChevronLeft, History, Upload, FileSignature, Mail, Database } from 'lucide-react';
import { api, API_BASE_URL } from '@/lib/api';
import { format } from 'date-fns';
import { ShieldAlert, Flame, ShieldCheck, HardHat } from 'lucide-react';
import { ptBR } from 'date-fns/locale';
import useSWR from 'swr';
import { formatCurrencyCeil } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { isReadOnly } from '@/types';

type SortField = 'nome' | 'numero';
type SortDir = 'asc' | 'desc';

export default function CondominiosPage() {
  const { data: fetchCondos, isLoading: loading, mutate } = useSWR(['condominios', 'full'], () => api.getCondominios({ limit: 1000 }));
  const condos = fetchCondos || [];
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const readOnly = isReadOnly(user);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCondo, setNewCondo] = useState({
    nome: '',
    numero: '',
    endereco: '',
    cnpj: '',
    sindico: '',
    cpf_sindico: '',
    mandato_inicio: '',
    mandato_fim: '',
    leitura_individualizada_ativa: false
  });
  const [creating, setCreating] = useState(false);

  // Sort
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterSindico, setFilterSindico] = useState('');

  // Modals state
  const [detailsCondo, setDetailsCondo] = useState<any>(null);
  const [editCondo, setEditCondo] = useState<any>(null);
  const [condoConcs, setCondoConcs] = useState<any[]>([]);
  const [condoContratos, setCondoContratos] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [uploadingAta, setUploadingAta] = useState(false);
  const [uploadingAvcb, setUploadingAvcb] = useState(false);
  const [uploadingApolice, setUploadingApolice] = useState(false);

  // History modal
  const [historyConc, setHistoryConc] = useState<any>(null);
  const [historyFaturas, setHistoryFaturas] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Removed manual fetchData in favor of useSWR

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setCreating(true);
      await api.createCondominio(newCondo);
      setIsModalOpen(false);
      setNewCondo({ nome: '', numero: '', endereco: '', cnpj: '', sindico: '', cpf_sindico: '', mandato_inicio: '', mandato_fim: '', leitura_individualizada_ativa: false });
      mutate();
      setCreating(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao criar');
      setCreating(false);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let result = condos.filter(c =>
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.numero.includes(searchTerm) ||
      c.cnpj.includes(searchTerm)
    );

    // Apply síndico filter
    if (filterSindico.trim()) {
      result = result.filter(c => (c.sindico || '').toLowerCase().includes(filterSindico.toLowerCase()));
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';
      if (sortField === 'numero') {
        const numA = parseInt(valA as string) || 0;
        const numB = parseInt(valB as string) || 0;
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }
      const cmp = String(valA).localeCompare(String(valB), 'pt-BR', { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [condos, searchTerm, filterSindico, sortField, sortDir]);

  const handleOpenDetails = async (condo: any) => {
    setDetailsCondo(condo);
    setHistoryConc(null);
    try {
      setLoadingDetails(true);
      const [concs, contratos] = await Promise.all([
        api.getConcessionarias({ condominio_id: condo.id }),
        api.getContratos()
      ]);
      setCondoConcs(concs);
      setCondoContratos(contratos.filter((c: any) => c.condominio_id === condo.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUploadAvcb = async (condoId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvcb(true);
      const formData = new FormData();
      formData.append('pdf_file', file);
      await api.uploadAvcb(condoId, formData);
      alert('AVCB enviado com sucesso!');
      mutate();
      if (detailsCondo && detailsCondo.id === condoId) {
        setDetailsCondo({ ...detailsCondo, avcb_url: 'uploaded' }); // Mark as uploaded to trigger UI change
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar AVCB');
    } finally {
      setUploadingAvcb(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleUploadApolice = async (condoId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingApolice(true);
      const formData = new FormData();
      formData.append('pdf_file', file);
      await api.uploadApoliceSeguro(condoId, formData);
      alert('Apólice de Seguro enviada com sucesso!');
      mutate();
      if (detailsCondo && detailsCondo.id === condoId) {
        setDetailsCondo({ ...detailsCondo, apolice_seguro_url: 'uploaded' }); // Mark as uploaded to trigger UI change
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar Apólice');
    } finally {
      setUploadingApolice(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleUploadAta = async (condoId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAta(true);
      const formData = new FormData();
      formData.append('pdf_file', file);
      await api.uploadAtaEleicao(condoId, formData);
      alert('ATA de Eleição enviada com sucesso!');
      mutate();
      if (detailsCondo && detailsCondo.id === condoId) {
         setDetailsCondo({ ...detailsCondo, ata_eleicao_nome: file.name });
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar ATA');
    } finally {
      setUploadingAta(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleDownloadAta = async (condoId: string) => {
    try {
      await api.downloadAtaEleicao(condoId);
    } catch (err: any) {
      alert(err.message || 'Erro ao baixar ATA');
    }
  };

  const handleDownloadAvcb = async (condoId: string) => {
    try {
      await api.downloadAvcb(condoId);
    } catch (err: any) {
      alert(err.message || 'Erro ao baixar AVCB');
    }
  };

  const handleDownloadApolice = async (condoId: string) => {
    try {
      await api.downloadApoliceSeguro(condoId);
    } catch (err: any) {
      alert(err.message || 'Erro ao baixar Apólice de Seguro');
    }
  };

  const handleOpenHistory = async (conc: any) => {
    setHistoryConc(conc);
    try {
      setLoadingHistory(true);
      // Busca faturas exclusivamente do Banco de Dados
      const dbFaturas = await api.getFaturasByCondominio(detailsCondo.id, conc.id);

      // Ordena por data (mais recente primeiro)
      dbFaturas.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.vencimento || 0);
        const dateB = new Date(b.created_at || b.vencimento || 0);
        return dateB.getTime() - dateA.getTime();
      });

      setHistoryFaturas(dbFaturas);
    } catch (err) {
      console.error(err);
      setHistoryFaturas([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDownloadFatura = (faturaId: string, filename: string) => {
    const token = localStorage.getItem('datacron_token');
    fetch(`${API_BASE_URL}/faturas/${faturaId}/pdf`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(resp => {
      if (!resp.ok) {
        throw new Error(resp.status === 404
          ? 'PDF não encontrado no servidor.'
          : `Erro ao baixar: ${resp.status}`);
      }
      return resp.blob();
    }).then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `fatura_${faturaId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    }).catch(err => {
      alert('❌ ' + (err.message || 'Erro ao baixar fatura'));
    });
  };

  const handleOpenEdit = (condo: any) => {
    setEditCondo({ ...condo });
  };

  const handleUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setCreating(true);
      const payload: any = {
        nome: editCondo.nome,
        endereco: editCondo.endereco,
        sindico: editCondo.sindico,
        cpf_sindico: editCondo.cpf_sindico,
        mandato_inicio: editCondo.mandato_inicio,
        mandato_fim: editCondo.mandato_fim,
        leitura_individualizada_ativa: editCondo.leitura_individualizada_ativa
      };
      
      if (isAdmin) {
        payload.numero = editCondo.numero;
        payload.cnpj = editCondo.cnpj;
      }

      await api.updateCondominio(editCondo.id, payload);
      setEditCondo(null);
      mutate();
      setCreating(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar');
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este condomínio? Ação irreversível!')) return;
    try {
      await api.deleteCondominio(id);
      setEditCondo(null);
      mutate();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => (
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
          <h1 className="dc-page-title">Condomínios</h1>
          <p className="dc-page-subtitle">Gerencie sua base de clientes e acompanhe o status de cada unidade.</p>
        </div>
        {isAdmin && (
          <button className="dc-btn dc-btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Adicionar Condomínio
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="dc-filter-bar">
        <div className="dc-filter-search">
          <Search />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, número ou CNPJ..."
          />
        </div>
        <button 
          className={`dc-btn ${showFilters ? 'dc-btn-primary' : 'dc-btn-secondary'}`} 
          style={{ height: 40, padding: '0 16px', fontSize: '0.85rem' }}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={15} /> Filtro Síndicos {showFilters ? '✕' : ''}
        </button>
        <div className="dc-filter-divider" />
        <span className="dc-filter-count">
          {filtered.length} condomínio{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Expandable filters */}
      {showFilters && (
        <div style={{
          display: 'flex', gap: 16, padding: '14px 20px', marginBottom: 16,
          background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0',
          alignItems: 'flex-end', flexWrap: 'wrap',
        }}>
          <div className="dc-form-group" style={{ flex: 1, minWidth: 200, margin: 0 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Síndico(a)</label>
            <input
              className="dc-form-input"
              value={filterSindico}
              onChange={e => setFilterSindico(e.target.value)}
              placeholder="Filtrar por nome do síndico..."
              style={{ height: 36 }}
            />
          </div>
          <button
            className="dc-btn dc-btn-secondary"
            style={{ height: 36, fontSize: '0.8rem', padding: '0 14px' }}
            onClick={() => { setFilterSindico(''); }}
          >
            Limpar Filtros
          </button>
        </div>
      )}

      {/* Table */}
      <div className="dc-card">
        <div className="dc-table-wrapper">
          <table className="dc-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort('nome')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Condomínio <SortIcon field="nome" />
                </th>
                <th>Status de Contas</th>
                <th onClick={() => toggleSort('numero')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Nº <SortIcon field="numero" />
                </th>
                <th>Síndico(a) / CNPJ</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : filtered.map((condo: any) => {
                const total = condo.contas_esperadas || 0;
                const rec = condo.contas_recebidas || 0;
                const pct = total > 0 ? Math.round((rec / total) * 100) : 0;
                return (
                  <tr key={condo.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div className="dc-condo-icon">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <div className="dc-cell-primary">{condo.nome}</div>
                          <div className="dc-cell-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={11} style={{ color: '#94a3b8' }} />
                            {condo.endereco}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="dc-progress-bar-wrap">
                        <div className="dc-progress-bar-labels">
                          <span className="dc-progress-bar-label">{rec}/{total} contas</span>
                          <span className="dc-progress-bar-pct">{pct}%</span>
                        </div>
                        <div className="dc-progress-track">
                          <div className="dc-progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#475569', fontSize: '0.95rem' }}>{condo.numero}</span>
                    </td>
                    <td>
                      <div className="dc-cell-primary">{condo.sindico}</div>
                      <div className="dc-cell-secondary">{condo.cnpj}</div>
                    </td>
                    <td>
                      <div className="dc-row-actions" style={{ justifyContent: 'flex-end', display: 'flex', gap: 6 }}>
                        {condo.avcb_url && (
                          <button className="dc-icon-action" style={{ background: '#fef2f2', color: '#ef4444', borderColor: '#fecaca' }} title="Baixar AVCB" onClick={() => handleDownloadAvcb(condo.id)}>
                            <Flame size={15} />
                          </button>
                        )}
                        {condo.apolice_seguro_url && (
                          <button className="dc-icon-action" style={{ background: '#fefce8', color: '#eab308', borderColor: '#fef08a' }} title="Baixar Apólice de Seguro" onClick={() => handleDownloadApolice(condo.id)}>
                            <ShieldAlert size={15} />
                          </button>
                        )}
                        {condo.ata_eleicao_nome && (
                          <button className="dc-icon-action dc-badge-green" style={{ background: '#f0fdf4' }} title={`Baixar ATA: ${condo.ata_eleicao_nome}`} onClick={() => handleDownloadAta(condo.id)}>
                            <FileSignature size={15} />
                          </button>
                        )}
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginLeft: 4 }}>
                          <button className="dc-icon-action" title="Abrir detalhes" onClick={() => handleOpenDetails(condo)}><ExternalLink size={15} /></button>
                          {!readOnly && (
                            <button className="dc-icon-action" title="Editar / Opções" onClick={() => handleOpenEdit(condo)}><MoreVertical size={15} /></button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div style={{ padding: '60px 24px', textAlign: 'center', color: '#94a3b8' }}>
                      <Building2 size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#475569' }}>Nenhum condomínio cadastrado</div>
                      <div style={{ fontSize: '0.85rem', marginTop: 4 }}>Comece adicionando seu primeiro cliente.</div>
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

      {/* Modal Adicionar */}
      {isModalOpen && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 500 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">Novo Condomínio</h2>
              <button className="dc-modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="dc-modal-body dc-space-y-4">
              <div className="dc-form-group">
                <label>Nome do Condomínio</label>
                <input required disabled={readOnly} value={newCondo.nome} onChange={e => setNewCondo({...newCondo, nome: e.target.value})} placeholder="Ex: Edifício Horizonte" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Número/ID</label>
                  <input required disabled={readOnly} value={newCondo.numero} onChange={e => setNewCondo({...newCondo, numero: e.target.value})} placeholder="Ex: 101" />
                </div>
                <div className="dc-form-group">
                  <label>CNPJ</label>
                  <input required disabled={readOnly} value={newCondo.cnpj} onChange={e => setNewCondo({...newCondo, cnpj: e.target.value})} placeholder="00.000.000/0000-00" />
                </div>
              </div>
              <div className="dc-form-group">
                <label>Endereço Completo</label>
                <input required disabled={readOnly} value={newCondo.endereco} onChange={e => setNewCondo({...newCondo, endereco: e.target.value})} placeholder="Rua, Número, Bairro, Cidade - UF" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Nome do Síndico</label>
                  <input required value={newCondo.sindico} onChange={e => setNewCondo({...newCondo, sindico: e.target.value})} placeholder="Nome completo" />
                </div>
                <div className="dc-form-group">
                  <label>CPF do Síndico</label>
                  <input value={newCondo.cpf_sindico} onChange={e => setNewCondo({...newCondo, cpf_sindico: e.target.value})} placeholder="000.000.000-00" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Mandato Síndico (Início)</label>
                  <input type="date" value={newCondo.mandato_inicio} onChange={e => setNewCondo({...newCondo, mandato_inicio: e.target.value})} />
                </div>
                <div className="dc-form-group">
                  <label>Mandato Síndico (Fim)</label>
                  <input type="date" value={newCondo.mandato_fim} onChange={e => setNewCondo({...newCondo, mandato_fim: e.target.value})} />
                </div>
              </div>
              <div className="dc-form-group">
                <label className="dc-checkbox-wrapper">
                  <input type="checkbox" checked={newCondo.leitura_individualizada_ativa} onChange={e => setNewCondo({...newCondo, leitura_individualizada_ativa: e.target.checked})} />
                  <span>Este condomínio possui Leitura Individualizada?</span>
                </label>
              </div>
              <div className="dc-modal-footer">
                <button type="button" className="dc-btn dc-btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="dc-btn dc-btn-primary" disabled={creating} style={{ gap: 10 }}>
                  {creating && <div className="dc-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff', borderTopColor: 'transparent' }} />}
                  {creating ? 'Criando...' : 'Criar Condomínio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {editCondo && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 500 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">Editar Condomínio</h2>
              <button className="dc-modal-close" onClick={() => setEditCondo(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdate} className="dc-modal-body dc-space-y-4">
              <div className="dc-form-group">
                <label>Nome do Condomínio</label>
                <input required disabled={!isAdmin} value={editCondo.nome} onChange={e => setEditCondo({...editCondo, nome: e.target.value})} className="dc-form-input" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Número/ID</label>
                  <input required disabled={!isAdmin} value={editCondo.numero} onChange={e => setEditCondo({...editCondo, numero: e.target.value})} className="dc-form-input" placeholder="Ex: 101" />
                </div>
                <div className="dc-form-group">
                  <label>CNPJ</label>
                  <input required disabled={!isAdmin} value={editCondo.cnpj} onChange={e => setEditCondo({...editCondo, cnpj: e.target.value})} className="dc-form-input" placeholder="00.000.000/0000-00" />
                </div>
              </div>
              <div className="dc-form-group">
                <label>Endereço Completo</label>
                <input required disabled={!isAdmin} value={editCondo.endereco} onChange={e => setEditCondo({...editCondo, endereco: e.target.value})} className="dc-form-input" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Mandato Síndico (Início)</label>
                  <input type="date" disabled={readOnly} value={editCondo.mandato_inicio || ''} onChange={e => setEditCondo({...editCondo, mandato_inicio: e.target.value})} className="dc-form-input" />
                </div>
                <div className="dc-form-group">
                  <label>Mandato Síndico (Fim)</label>
                  <input type="date" disabled={readOnly} value={editCondo.mandato_fim || ''} onChange={e => setEditCondo({...editCondo, mandato_fim: e.target.value})} className="dc-form-input" />
                </div>
              </div>
              <div className="dc-form-group">
                 <label className="dc-checkbox-wrapper">
                  <input type="checkbox" disabled={readOnly} checked={editCondo.leitura_individualizada_ativa || false} onChange={e => setEditCondo({...editCondo, leitura_individualizada_ativa: e.target.checked})} />
                  <span>Ativar Leitura Individualizada para este Condomínio</span>
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Nome do Síndico</label>
                  <input required disabled={readOnly} value={editCondo.sindico} onChange={e => setEditCondo({...editCondo, sindico: e.target.value})} className="dc-form-input" />
                </div>
                <div className="dc-form-group">
                  <label>CPF do Síndico</label>
                  <input disabled={readOnly} value={editCondo.cpf_sindico || ''} onChange={e => setEditCondo({...editCondo, cpf_sindico: e.target.value})} className="dc-form-input" />
                </div>
              </div>
              
              <div className="dc-modal-footer" style={{ justifyContent: 'space-between', padding: '16px 0 0 0', marginTop: 10 }}>
                <div>
                  {isAdmin && (
                    <button type="button" className="dc-btn dc-btn-danger" style={{ gap: 8 }} onClick={() => handleDelete(editCondo.id)}>
                      <Trash2 size={15} /> Excluir
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="dc-btn dc-btn-secondary" onClick={() => setEditCondo(null)}>Cancelar</button>
                  <button type="submit" className="dc-btn dc-btn-primary" disabled={creating} style={{ minWidth: 140 }}>
                    {creating ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {detailsCondo && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 700 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">
                {historyConc ? (
                  <button 
                    onClick={() => setHistoryConc(null)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}
                  >
                    <ChevronLeft size={20} /> Histórico — {historyConc.tipo}
                  </button>
                ) : 'Detalhes do Condomínio'}
              </h2>
              <button className="dc-modal-close" onClick={() => { setDetailsCondo(null); setHistoryConc(null); }}><X size={20} /></button>
            </div>
            <div className="dc-modal-body dc-space-y-4" style={{ maxHeight: 500, overflowY: 'auto' }}>
              {historyConc ? (
                /* HISTORY VIEW */
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem' }}>
                      {historyConc.tipo[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, color: '#0c4a6e' }}>{historyConc.tipo} — {historyConc.instalacao}</div>
                      <div style={{ fontSize: '0.82rem', color: '#0369a1' }}>{detailsCondo.nome} · Dia {historyConc.dia_vencimento}</div>
                    </div>
                  </div>

                  {loadingHistory ? (
                    <div style={{ padding: 40, textAlign: 'center' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></div>
                  ) : historyFaturas.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                      <FileText size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                      <div style={{ fontWeight: 700 }}>Nenhuma fatura registrada para esta concessionária</div>
                    </div>
                  ) : (
                    <table className="dc-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr>
                          <th>Referência</th>
                          <th>Vencimento</th>
                          <th>Valor</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>PDF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyFaturas.map(f => {
                          const isGmail = f.status === 'gmail_archive';
                          return (
                            <tr key={f.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {isGmail ? <Mail size={14} color="#64748b" /> : <Database size={14} color="#3b82f6" />}
                                  <span className="dc-cell-primary" style={{ fontSize: '0.75rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {f.referencia || '—'}
                                  </span>
                                </div>
                              </td>
                              <td>{f.vencimento ? (isGmail ? f.vencimento.split(' ').slice(0, 4).join(' ') : format(new Date(f.vencimento), 'dd/MM/yyyy')) : '—'}</td>
                              <td><span className="dc-cell-primary">{f.valor > 0 ? formatCurrencyCeil(f.valor) : '—'}</span></td>
                              <td>
                                <span className={`dc-badge ${isGmail ? 'dc-badge-amber' : f.status === 'processada' ? 'dc-badge-green' : 'dc-badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                                  {isGmail ? 'Gmail' : (f.status || 'pendente').toUpperCase()}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                  <button
                                    className={`dc-btn ${isGmail ? 'dc-btn-secondary' : 'dc-btn-secondary'}`}
                                    style={{ height: 30, padding: '0 10px', fontSize: '0.75rem', gap: 4, opacity: isGmail ? 0.6 : 1 }}
                                    disabled={!isGmail && !f.pdf_path}
                                    onClick={() => {
                                      if (isGmail) {
                                        alert('Esta fatura está no Gmail. Aguarde a próxima varredura automática para processamento ou use a Central de Recebimento.');
                                      } else {
                                        handleDownloadFatura(f.id, f.pdf_nome_original || `fatura_${f.id}.pdf`);
                                      }
                                    }}
                                  >
                                    <Download size={12} /> {isGmail ? 'No Gmail' : 'Baixar'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </>
              ) : (
                /* DETAILS VIEW */
                <>
                  {/* Info Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div className="dc-condo-icon" style={{ width: 48, height: 48 }}>
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{detailsCondo.nome}</h3>
                      <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                        <span>Cód: Nº {detailsCondo.numero}</span>
                        <span>CNPJ: {detailsCondo.cnpj}</span>
                      </div>
                    </div>
                  </div>

                  {/* Specifics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>SÍNDICO(A) RESPONSÁVEL</div>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{detailsCondo.sindico}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>ENDEREÇO</div>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{detailsCondo.endereco}</div>
                    </div>
                  </div>

                  {/* Documentos */}
                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileSignature size={16} color="#3b82f6" /> Documentos Importantes
                    </h4>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                          <FileText size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>ATA de Eleição</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {detailsCondo.ata_eleicao_nome ? detailsCondo.ata_eleicao_nome : 'Nenhum documento enviado.'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {detailsCondo.ata_eleicao_nome && (
                          <button className="dc-btn dc-btn-secondary" onClick={() => handleDownloadAta(detailsCondo.id)}>
                            <Download size={14} /> Baixar
                          </button>
                        )}
                        {!readOnly && (
                          <label className="dc-btn dc-btn-primary" style={{ cursor: 'pointer' }}>
                            {uploadingAta ? <div className="dc-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff' }} /> : <Upload size={14} />} 
                            {detailsCondo.ata_eleicao_nome ? 'Substituir' : 'Vincular'}
                            <input type="file" accept="application/pdf" style={{ display: 'none' }} disabled={uploadingAta} onChange={(e) => handleUploadAta(detailsCondo.id, e)} />
                          </label>
                        )}
                      </div>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1' }}>
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>AVCB</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {detailsCondo.avcb_url ? 'Documento vinculado' : 'Auto de Vistoria do Corpo de Bombeiros'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {detailsCondo.avcb_url && (
                          <button className="dc-btn dc-btn-secondary" onClick={() => handleDownloadAvcb(detailsCondo.id)}>
                            <Download size={14} /> Baixar
                          </button>
                        )}
                        {!readOnly && (
                          <label className="dc-btn dc-btn-primary" style={{ cursor: 'pointer' }}>
                            {uploadingAvcb ? <div className="dc-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff' }} /> : <Upload size={14} />} 
                            {detailsCondo.avcb_url ? 'Substituir' : 'Vincular'}
                            <input type="file" accept="application/pdf" style={{ display: 'none' }} disabled={uploadingAvcb} onChange={(e) => handleUploadAvcb(detailsCondo.id, e)} />
                          </label>
                        )}
                      </div>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#be185d' }}>
                          <HardHat size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>Apólice de Seguro</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {detailsCondo.apolice_seguro_url ? 'Documento vinculado' : 'Seguro obrigatório do condomínio'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {detailsCondo.apolice_seguro_url && (
                          <button className="dc-btn dc-btn-secondary" onClick={() => handleDownloadApolice(detailsCondo.id)}>
                            <Download size={14} /> Baixar
                          </button>
                        )}
                        {!readOnly && (
                          <label className="dc-btn dc-btn-primary" style={{ cursor: 'pointer' }}>
                            {uploadingApolice ? <div className="dc-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff' }} /> : <Upload size={14} />} 
                            {detailsCondo.apolice_seguro_url ? 'Substituir' : 'Vincular'}
                            <input type="file" accept="application/pdf" style={{ display: 'none' }} disabled={uploadingApolice} onChange={(e) => handleUploadApolice(detailsCondo.id, e)} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contratos Vinculados */}
                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileSignature size={16} color="#10b981" /> Contratos Vinculados
                    </h4>
                    {loadingDetails ? (
                       <div style={{ padding: '20px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></div>
                    ) : condoContratos.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8, fontSize: '0.9rem', color: '#64748b', border: '1px dashed #cbd5e1' }}>
                        Nenhum contrato ativo vinculado.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {condoContratos.map(contrato => (
                          <div key={contrato.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <div style={{ width: 38, height: 38, borderRadius: 8, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontWeight: 800 }}>
                                {contrato.tipo_contrato[0]}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{contrato.empresa}</div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{contrato.tipo_contrato} {contrato.tipo_personalizado ? `(${contrato.tipo_personalizado})` : ''}</div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span className={`dc-badge ${contrato.status === 'ativo' ? 'dc-badge-green' : contrato.status === 'vencido' ? 'dc-badge-red' : 'dc-badge-amber'}`}>
                                {contrato.status}
                              </span>
                              <div className="dc-cell-secondary" style={{ marginTop: 4 }}>
                                {formatCurrencyCeil(contrato.valor_atual || 0)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Concessionarias List */}
                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Zap size={16} color="#eab308" /> Concessionárias Vinculadas
                    </h4>
                    {loadingDetails ? (
                       <div style={{ padding: '20px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></div>
                    ) : condoConcs.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', background: '#f8fafc', borderRadius: 8, fontSize: '0.9rem', color: '#64748b', border: '1px dashed #cbd5e1' }}>
                        Este condomínio ainda não possui automações vinculadas.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {condoConcs.map(conc => (
                          <div key={conc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <div style={{ width: 38, height: 38, borderRadius: 8, background: conc.tipo === 'Sabesp' ? '#ecfeff' : conc.tipo === 'Enel' ? '#eff6ff' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: conc.tipo === 'Sabesp' ? '#0891b2' : conc.tipo === 'Enel' ? '#2563eb' : '#ea580c', fontWeight: 800 }}>
                                {conc.tipo[0]}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>{conc.tipo === 'Outros' && conc.nome_personalizado ? conc.nome_personalizado : conc.tipo}</div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Instalação: {conc.instalacao}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <button
                                className="dc-btn dc-btn-secondary"
                                style={{ height: 32, padding: '0 12px', fontSize: '0.78rem', gap: 6 }}
                                onClick={() => handleOpenHistory(conc)}
                              >
                                <History size={13} /> Histórico
                              </button>
                              <div style={{ textAlign: 'right' }}>
                                <span className="dc-badge dc-badge-green">Ativo</span>
                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                                  <Calendar size={13} /> Dia {conc.dia_vencimento}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="dc-modal-footer">
              <button type="button" className="dc-btn dc-btn-secondary" onClick={() => { setDetailsCondo(null); setHistoryConc(null); }}>Fechar Visualização</button>
            </div>
          </div>
        </div>
      )}

    </Shell>
  );
}
