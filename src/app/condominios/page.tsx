'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Shell from '@/components/layout/Shell';
import { Plus, Search, Filter, Building2, MapPin, ExternalLink, MoreVertical, X, Zap, Trash2, Calendar, FileText, ArrowUpDown, ArrowDown, Download, ChevronLeft, History, Upload, FileSignature, Mail, Database, CreditCard, CheckCircle2, AlertCircle, Clock, Paperclip } from 'lucide-react';
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

  const monthsList = [
    { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' }, { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' }, { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' }
  ];

  const formatReferencia = (ref: string) => {
    if (!ref) return '—';
    const parts = ref.split('/');
    if (parts.length === 2 && !isNaN(Number(parts[0]))) {
      const m = parseInt(parts[0], 10);
      const mLabel = monthsList.find(i => parseInt(i.value, 10) === m)?.label || parts[0];
      return `${mLabel}, ${parts[1]}`;
    }
    return ref;
  };

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
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [docUploadModal, setDocUploadModal] = useState<{ type: 'ata' | 'avcb' | 'apolice', condoId: string } | null>(null);
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null);
  const [docDates, setDocDates] = useState({ inicio: '', fim: '' });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // History modal
  const [historyConc, setHistoryConc] = useState<any>(null);
  const [historyFaturas, setHistoryFaturas] = useState<any[]>([]);
  const [gmailHistory, setGmailHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'sistema' | 'gmail'>('sistema');
  const [selectedHistory, setSelectedHistory] = useState<Set<string>>(new Set());
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusModalCondo, setStatusModalCondo] = useState<any>(null);
  const [statusItems, setStatusItems] = useState<any[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Manual fatura modal
  const [isManualFaturaModalOpen, setIsManualFaturaModalOpen] = useState(false);
  const [manualFaturaConc, setManualFaturaConc] = useState<any>(null);
  const [manualFaturaData, setManualFaturaData] = useState({ valor: '', vencimento: '' });
  const [manualFaturaPdf, setManualFaturaPdf] = useState<File | null>(null);
  const [savingManualFatura, setSavingManualFatura] = useState(false);

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
      const concs = await api.getConcessionarias({ condominio_id: condo.id });
      setCondoConcs(concs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const triggerUploadFlow = (type: 'ata' | 'avcb' | 'apolice', condoId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setDocUploadFile(file);
    setDocUploadModal({ type, condoId });
    setDocDates({ inicio: '', fim: '' });
    if (event.target) event.target.value = '';
  };

  const confirmDocUpload = async () => {
    if (!docUploadFile || !docUploadModal) return;
    if (!docDates.inicio || !docDates.fim) {
      alert("Por favor, preencha as datas de início e fim da vigência.");
      return;
    }
    const { type, condoId } = docUploadModal;
    try {
      setUploadingDoc(true);

      // Direct Upload (Base64) to Backend
      if (type === 'ata') {
        await api.saveAtaEleicao(condoId, {
          file: docUploadFile,
          data_inicio: docDates.inicio,
          data_fim: docDates.fim
        });
        if (detailsCondo && detailsCondo.id === condoId) {
          setDetailsCondo({ ...detailsCondo, ata_eleicao_nome: docUploadFile.name, ata_eleicao_inicio: docDates.inicio, ata_eleicao_fim: docDates.fim });
        }
        alert('ATA enviada com sucesso!');
      } else if (type === 'avcb') {
        await api.saveAvcb(condoId, {
          file: docUploadFile,
          data_inicio: docDates.inicio,
          data_fim: docDates.fim
        });
        if (detailsCondo && detailsCondo.id === condoId) {
          setDetailsCondo({ ...detailsCondo, avcb_url: 'data:application/pdf;base64,...', avcb_inicio: docDates.inicio, avcb_fim: docDates.fim });
        }
        alert('AVCB enviado com sucesso!');
      } else if (type === 'apolice') {
        await api.saveApolice(condoId, {
          file: docUploadFile,
          data_inicio: docDates.inicio,
          data_fim: docDates.fim
        });
        if (detailsCondo && detailsCondo.id === condoId) {
          setDetailsCondo({ ...detailsCondo, apolice_seguro_url: 'data:application/pdf;base64,...', apolice_seguro_inicio: docDates.inicio, apolice_seguro_fim: docDates.fim });
        }
        alert('Apólice enviada com sucesso!');
      }
      mutate();
      setDocUploadModal(null);
      setDocUploadFile(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar documento');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (condoId: string, type: 'ata' | 'avcb' | 'apolice') => {
    if (!confirm('Deseja realmente excluir este documento?')) return;
    try {
      if (type === 'ata') {
        await api.deleteAtaEleicao(condoId);
        if (detailsCondo) setDetailsCondo({ ...detailsCondo, ata_eleicao_nome: null, ata_eleicao_inicio: null, ata_eleicao_fim: null });
      } else if (type === 'avcb') {
        await api.deleteAvcb(condoId);
        if (detailsCondo) setDetailsCondo({ ...detailsCondo, avcb_url: null, avcb_inicio: null, avcb_fim: null });
      } else if (type === 'apolice') {
        await api.deleteApolice(condoId);
        if (detailsCondo) setDetailsCondo({ ...detailsCondo, apolice_seguro_url: null, apolice_seguro_inicio: null, apolice_seguro_fim: null });
      }
      mutate();
      alert('Documento excluído com sucesso.');
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir documento');
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
      await api.downloadApolice(condoId);
    } catch (err: any) {
      alert(err.message || 'Erro ao baixar Apólice de Seguro');
    }
  };

  const handleOpenStatus = async (condo: any) => {
    if (!condo?.id) return;
    setStatusModalCondo(condo);
    setIsStatusModalOpen(true);
    setLoadingStatus(true);
    setStatusError(null);
    setStatusItems([]);

    try {
      const items = await api.getStatusContas(String(condo.id));
      setStatusItems(items);
    } catch (err: any) {
      console.error('Error loading status details:', err);
      const msg = err.message || '';
      setStatusError(msg.includes('fetch') ? 'Servidor indisponível. Tente novamente em alguns segundos.' : msg || 'Falha ao carregar dados');
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleOpenHistory = async (conc: any) => {
    setHistoryConc(conc);
    setHistoryFaturas([]);
    setActiveHistoryTab('sistema');
    try {
      setLoadingHistory(true);
      // 1. Fetch from Historico Table (Combined current + legacy)
      const condId = String(detailsCondo.id);
      const concId = String(conc.id);
      const dbFaturas = await api.getHistoricoFaturas(condId, concId);

      const sorted = [...dbFaturas].sort((a: any, b: any) => {
        const dateA = new Date(a.vencimento || 0);
        const dateB = new Date(b.vencimento || 0);
        return dateB.getTime() - dateA.getTime();
      });
      setHistoryFaturas(sorted);

      // 2. Fetch from Gmail (Background)
      if (conc.instalacao) {
        api.getGmailHistory(detailsCondo.id, conc.id).then(gmailFats => {
          setGmailHistory(gmailFats || []);
        }).catch(err => console.error("Gmail fetch error:", err));
      }
    } catch (err) {
      console.error(err);
      setHistoryFaturas([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleSelectFatura = (id: string) => {
    const next = new Set(selectedHistory);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedHistory(next);
  };

  const toggleSelectAll = () => {
    if (selectedHistory.size === historyFaturas.length) {
      setSelectedHistory(new Set());
    } else {
      setSelectedHistory(new Set(historyFaturas.map(f => f.id)));
    }
  };

  const handleDownloadFatura = async (fatura: any, filename: string, source: 'sistema' | 'gmail' = 'sistema') => {
    try {
      if (source === 'sistema') {
        const base64Data = fatura.base_64 || fatura.pdf_base64;

        if (base64Data) {
          // Download directly from base64 string
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          return;
        }

        // Fallback: Download from API via path
        await api.downloadFatura(fatura.id);
      } else {
        await api.downloadGmailFatura(fatura.id, filename);
      }
    } catch (err: any) {
      alert('❌ ' + (err.message || 'Erro ao baixar fatura'));
    }
  };

  const handleOpenEdit = (condo: any) => {
    setEditCondo({ ...condo });
  };

  const handleUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setCreating(true);
      const payload: any = {
        sindico: editCondo.sindico,
        cpf_sindico: editCondo.cpf_sindico,
        mandato_inicio: editCondo.mandato_inicio,
        mandato_fim: editCondo.mandato_fim,
        leitura_individualizada_ativa: editCondo.leitura_individualizada_ativa
      };

      if (isAdmin) {
        payload.nome = editCondo.nome;
        payload.endereco = editCondo.endereco;
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
          <p className="dc-page-subtitle">Gerencie sua base de clientes e acompanhe o status de cada Condomínio.</p>
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
          {filtered.length} Condomínio{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
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
                      <div
                        className="dc-progress-bar-wrap"
                        style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                        title="Clique para ver detalhes das contas"
                        onClick={(e) => { e.stopPropagation(); handleOpenStatus(condo); }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      >
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
                <input required disabled={readOnly} value={newCondo.nome} onChange={e => setNewCondo({ ...newCondo, nome: e.target.value })} placeholder="Ex: Edifício Horizonte" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Número/ID</label>
                  <input required disabled={readOnly} value={newCondo.numero} onChange={e => setNewCondo({ ...newCondo, numero: e.target.value })} placeholder="Ex: 101" />
                </div>
                <div className="dc-form-group">
                  <label>CNPJ</label>
                  <input required disabled={readOnly} value={newCondo.cnpj} onChange={e => setNewCondo({ ...newCondo, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
                </div>
              </div>
              <div className="dc-form-group">
                <label>Endereço Completo</label>
                <input required disabled={readOnly} value={newCondo.endereco} onChange={e => setNewCondo({ ...newCondo, endereco: e.target.value })} placeholder="Rua, Número, Bairro, Cidade - UF" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Nome do Síndico</label>
                  <input required value={newCondo.sindico} onChange={e => setNewCondo({ ...newCondo, sindico: e.target.value })} placeholder="Nome completo" />
                </div>
                <div className="dc-form-group">
                  <label>CPF do Síndico</label>
                  <input value={newCondo.cpf_sindico} onChange={e => setNewCondo({ ...newCondo, cpf_sindico: e.target.value })} placeholder="000.000.000-00" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Mandato Síndico (Início)</label>
                  <input type="date" value={newCondo.mandato_inicio} onChange={e => setNewCondo({ ...newCondo, mandato_inicio: e.target.value })} />
                </div>
                <div className="dc-form-group">
                  <label>Mandato Síndico (Fim)</label>
                  <input type="date" value={newCondo.mandato_fim} onChange={e => setNewCondo({ ...newCondo, mandato_fim: e.target.value })} />
                </div>
              </div>
              <div className="dc-form-group">
                <label>Leitura Individualizada</label>
                <div className="dc-segmented-control">
                  <button type="button" className={newCondo.leitura_individualizada_ativa ? 'active' : ''} onClick={() => setNewCondo({ ...newCondo, leitura_individualizada_ativa: true })}>Sim</button>
                  <button type="button" className={!newCondo.leitura_individualizada_ativa ? 'active active-negative' : ''} onClick={() => setNewCondo({ ...newCondo, leitura_individualizada_ativa: false })}>Não</button>
                </div>
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
                <input required disabled={!isAdmin} value={editCondo.nome} onChange={e => setEditCondo({ ...editCondo, nome: e.target.value })} className="dc-form-input" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Número/ID</label>
                  <input required disabled={!isAdmin} value={editCondo.numero} onChange={e => setEditCondo({ ...editCondo, numero: e.target.value })} className="dc-form-input" placeholder="Ex: 101" />
                </div>
                <div className="dc-form-group">
                  <label>CNPJ</label>
                  <input required disabled={!isAdmin} value={editCondo.cnpj} onChange={e => setEditCondo({ ...editCondo, cnpj: e.target.value })} className="dc-form-input" placeholder="00.000.000/0000-00" />
                </div>
              </div>
              <div className="dc-form-group">
                <label>Endereço Completo</label>
                <input required disabled={!isAdmin} value={editCondo.endereco} onChange={e => setEditCondo({ ...editCondo, endereco: e.target.value })} className="dc-form-input" />
              </div>
              <div className="dc-form-group">
                <label>Leitura Individualizada</label>
                <div className="dc-segmented-control">
                  <button type="button" className={editCondo.leitura_individualizada_ativa ? 'active' : ''} disabled={readOnly} onClick={() => setEditCondo({ ...editCondo, leitura_individualizada_ativa: true })}>Sim</button>
                  <button type="button" className={!editCondo.leitura_individualizada_ativa ? 'active active-negative' : ''} disabled={readOnly} onClick={() => setEditCondo({ ...editCondo, leitura_individualizada_ativa: false })}>Não</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Nome do Síndico</label>
                  <input required disabled={readOnly} value={editCondo.sindico} onChange={e => setEditCondo({ ...editCondo, sindico: e.target.value })} className="dc-form-input" />
                </div>
                <div className="dc-form-group">
                  <label>CPF do Síndico</label>
                  <input disabled={readOnly} value={editCondo.cpf_sindico || ''} onChange={e => setEditCondo({ ...editCondo, cpf_sindico: e.target.value })} className="dc-form-input" />
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
                /* HISTORY VIEW (CLEAN SABESP PORTAL STYLE) */
                <div style={{ marginTop: -8 }}>
                  {/* Banner Débito Automático */}
                  <div
                    style={{
                      background: '#f0f7ff',
                      border: '1px solid #c2e0ff',
                      borderRadius: 12,
                      padding: '14px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      marginBottom: 24,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ padding: 10, background: '#fff', borderRadius: 8, color: '#0066cc', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                      <CreditCard size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#004080', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{historyConc.debito_automatico ? 'Débito Automático Ativo' : 'Débito Automático Inativo'}</span>
                        <ChevronLeft size={16} style={{ transform: 'rotate(180deg)', opacity: 0.5 }} />
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#004080', opacity: 0.7, marginTop: 1 }}>
                        {historyConc.debito_automatico
                          ? 'Suas faturas são processadas automaticamente de maneira programada.'
                          : 'As faturas deste condomínio precisam ser pagas manualmente.'}
                      </div>
                    </div>
                  </div>

                  {/* Tab Switcher */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20, padding: 4, background: '#f1f5f9', borderRadius: 10 }}>
                    <button
                      onClick={() => setActiveHistoryTab('sistema')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: activeHistoryTab === 'sistema' ? '#fff' : 'transparent',
                        color: activeHistoryTab === 'sistema' ? '#0f172a' : '#64748b',
                        boxShadow: activeHistoryTab === 'sistema' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      Sistema
                    </button>
                    <button
                      onClick={() => setActiveHistoryTab('gmail')}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: 'none',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: activeHistoryTab === 'gmail' ? '#fff' : 'transparent',
                        color: activeHistoryTab === 'gmail' ? '#0f172a' : '#64748b',
                        boxShadow: activeHistoryTab === 'gmail' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      Arquivo Gmail
                    </button>
                  </div>

                  {/* Toolbar de Ações Rápidas (only for Sistema) */}
                  {activeHistoryTab === 'sistema' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <h5 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', margin: 0 }}>Faturas Registradas</h5>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{historyFaturas.length} documento(s) encontrado(s)</div>
                    </div>
                  )}

                  {loadingHistory ? (
                    <div style={{ padding: 80, textAlign: 'center' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></div>
                  ) : historyFaturas.length === 0 ? (
                    <div style={{ padding: 80, textAlign: 'center', color: '#94a3b8', background: '#fff', border: '1px solid #f3f4f6', borderRadius: 16 }}>
                      <FileText size={56} style={{ margin: '0 auto 20px', opacity: 0.15 }} />
                      <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#475569' }}>Nenhum registro no histórico</div>
                      <div style={{ fontSize: '0.9rem', marginTop: 10 }}>As faturas processadas aparecerão aqui automaticamente.</div>
                    </div>
                  ) : activeHistoryTab === 'sistema' ? (
                    /* CARD-BASED LIST */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {historyFaturas.map(f => {
                        const hasAutoDebit = f.debito_automatico === true || String(f.debito_automatico) === 'true';
                        const isLegacy = !f.status;
                        const status = f.status || 'processada'; // Default for legacy

                        let statusColor = '#10b981'; // Default green
                        let statusBg = '#f0fdf4';
                        let statusLabel = status.toUpperCase();

                        if (status === 'pendente') {
                          statusColor = '#f59e0b';
                          statusBg = '#fffbeb';
                        } else if (status === 'erro') {
                          statusColor = '#ef4444';
                          statusBg = '#fef2f2';
                        } else if (status === 'revisao') {
                          statusColor = '#3b82f6';
                          statusBg = '#eff6ff';
                        }

                        return (
                          <div key={f.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '18px 20px',
                            background: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: 14,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                            transition: 'transform 0.2s'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                              <div style={{
                                width: 48,
                                height: 48,
                                borderRadius: 12,
                                background: statusBg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: statusColor,
                                border: `1px solid ${statusBg === '#fff' ? '#e2e8f0' : 'transparent'}`
                              }}>
                                {status === 'processada' || isLegacy ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {f.referencia || 'Fatura'}
                                  {hasAutoDebit && <span style={{ padding: '2px 8px', borderRadius: 6, background: '#e0f2fe', color: '#0369a1', fontSize: '0.65rem', fontWeight: 800 }}>DÉBITO AUTO</span>}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span><Calendar size={13} style={{ display: 'inline', marginRight: 4 }} /> Vencimento: {f.vencimento ? format(new Date(f.vencimento + 'T12:00:00'), 'dd/MM/yyyy') : '—'}</span>
                                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#cbd5e1' }} />
                                  <span>Registrada em {f.created_at ? format(new Date(f.created_at), 'dd/MM/yyyy') : '—'}</span>
                                </div>

                                {f.email_remetente && (
                                  <div style={{
                                    fontSize: '0.75rem',
                                    color: '#94a3b8',
                                    marginTop: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    borderTop: '1px dashed #f1f5f9',
                                    paddingTop: 6
                                  }}>
                                    <Mail size={12} />
                                    <span style={{ maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      <strong>{f.email_remetente}</strong>: {f.email_assunto}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a' }}>R$ {formatCurrencyCeil(f.valor || 0)}</div>
                                <div style={{ fontSize: '0.72rem', color: statusColor, fontWeight: 700 }}>{statusLabel}</div>
                              </div>
                              <button
                                onClick={() => handleDownloadFatura(f, f.pdf_nome_original || `fatura_${f.referencia}.pdf`, 'sistema')}
                                className="dc-btn"
                                style={{
                                  height: 40,
                                  width: 40,
                                  padding: 0,
                                  borderRadius: 10,
                                  background: '#fff',
                                  border: '1px solid #10b981',
                                  color: '#10b981',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="Baixar PDF"
                              >
                                <Download size={18} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : activeHistoryTab === 'gmail' ? (
                    /* ARCHIVE VIEW */
                    <div style={{ padding: 16, background: '#fff', border: '1px solid #f3f4f6', borderRadius: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h5 style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1f2937', margin: 0 }}>Arquivo do Gmail</h5>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{gmailHistory.length} documento(s) encontrado(s)</div>
                      </div>
                      <div className="dc-space-y-3">
                        {gmailHistory.map((g, idx) => (
                          <div key={idx} style={{
                            padding: 14, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <Mail size={18} color="#ef4444" />
                              <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>{g.referencia}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Recebido: {new Date(g.created_at).toLocaleString('pt-BR')}</div>
                              </div>
                            </div>
                            <button onClick={() => handleDownloadFatura(g, g.pdf_nome_original || 'fatura_gmail.pdf', 'gmail')} className="dc-btn dc-btn-secondary" style={{ height: 32, fontSize: '0.72rem', background: '#fff' }}>
                              <Download size={14} /> Baixar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}


                </div>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                          <FileText size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>ATA de Eleição</div>
                          <div
                            style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={detailsCondo.ata_eleicao_nome || ''}
                          >
                            {detailsCondo.ata_eleicao_nome ? 'Documento vinculado' : 'Nenhum documento enviado.'}
                          </div>
                          {detailsCondo.ata_eleicao_nome && detailsCondo.ata_eleicao_inicio && detailsCondo.ata_eleicao_fim && (
                            <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Calendar size={12} /> Vigência: {format(new Date(String(detailsCondo.ata_eleicao_inicio).substring(0, 10) + 'T12:00:00'), 'dd/MM/yyyy')} até {format(new Date(String(detailsCondo.ata_eleicao_fim).substring(0, 10) + 'T12:00:00'), 'dd/MM/yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {detailsCondo.ata_eleicao_nome && (
                          <>
                            <button className="dc-btn dc-btn-secondary" onClick={() => handleDownloadAta(detailsCondo.id)}>
                              <Download size={14} /> Baixar
                            </button>
                            {!readOnly && (
                              <button className="dc-btn dc-btn-danger" onClick={() => handleDeleteDoc(detailsCondo.id, 'ata')} style={{ padding: '0 10px' }} title="Excluir">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </>
                        )}
                        {!readOnly && (
                          <label className="dc-btn dc-btn-primary" style={{ cursor: 'pointer' }}>
                            <Upload size={14} />
                            {detailsCondo.ata_eleicao_nome ? 'Substituir' : 'Vincular'}
                            <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => triggerUploadFlow('ata', detailsCondo.id, e)} />
                          </label>
                        )}
                      </div>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1' }}>
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>AVCB</div>
                          <div
                            style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={detailsCondo.avcb_url ? 'Documento vinculado' : 'Auto de Vistoria do Corpo de Bombeiros'}
                          >
                            {detailsCondo.avcb_url ? 'Documento vinculado' : 'Auto de Vistoria do Corpo de Bombeiros'}
                          </div>
                          {detailsCondo.avcb_url && detailsCondo.avcb_inicio && detailsCondo.avcb_fim && (
                            <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Calendar size={12} /> Vigência: {format(new Date(String(detailsCondo.avcb_inicio).substring(0, 10) + 'T12:00:00'), 'dd/MM/yyyy')} até {format(new Date(String(detailsCondo.avcb_fim).substring(0, 10) + 'T12:00:00'), 'dd/MM/yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {detailsCondo.avcb_url && (
                          <>
                            <button className="dc-btn dc-btn-secondary" onClick={() => handleDownloadAvcb(detailsCondo.id)}>
                              <Download size={14} /> Baixar
                            </button>
                            {!readOnly && (
                              <button className="dc-btn dc-btn-danger" onClick={() => handleDeleteDoc(detailsCondo.id, 'avcb')} style={{ padding: '0 10px' }} title="Excluir">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </>
                        )}
                        {!readOnly && (
                          <label className="dc-btn dc-btn-primary" style={{ cursor: 'pointer' }}>
                            <Upload size={14} />
                            {detailsCondo.avcb_url ? 'Substituir' : 'Vincular'}
                            <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => triggerUploadFlow('avcb', detailsCondo.id, e)} />
                          </label>
                        )}
                      </div>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#be185d' }}>
                          <HardHat size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>Apólice de Seguro</div>
                          <div
                            style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title={detailsCondo.apolice_seguro_url ? 'Documento vinculado' : 'Seguro obrigatório do condomínio'}
                          >
                            {detailsCondo.apolice_seguro_url ? 'Documento vinculado' : 'Seguro obrigatório do condomínio'}
                          </div>
                          {detailsCondo.apolice_seguro_url && detailsCondo.apolice_seguro_inicio && detailsCondo.apolice_seguro_fim && (
                            <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Calendar size={12} /> Vigência: {format(new Date(String(detailsCondo.apolice_seguro_inicio).substring(0, 10) + 'T12:00:00'), 'dd/MM/yyyy')} até {format(new Date(String(detailsCondo.apolice_seguro_fim).substring(0, 10) + 'T12:00:00'), 'dd/MM/yyyy')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {detailsCondo.apolice_seguro_url && (
                          <>
                            <button className="dc-btn dc-btn-secondary" onClick={() => handleDownloadApolice(detailsCondo.id)}>
                              <Download size={14} /> Baixar
                            </button>
                            {!readOnly && (
                              <button className="dc-btn dc-btn-danger" onClick={() => handleDeleteDoc(detailsCondo.id, 'apolice')} style={{ padding: '0 10px' }} title="Excluir">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </>
                        )}
                        {!readOnly && (
                          <label className="dc-btn dc-btn-primary" style={{ cursor: 'pointer' }}>
                            <Upload size={14} />
                            {detailsCondo.apolice_seguro_url ? 'Substituir' : 'Vincular'}
                            <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => triggerUploadFlow('apolice', detailsCondo.id, e)} />
                          </label>
                        )}
                      </div>
                    </div>
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

      {/* Modal Status de Contas */}
      {isStatusModalOpen && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 600 }}>
            <div className="dc-modal-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="dc-condo-icon" style={{ width: 40, height: 40 }}><Building2 size={20} /></div>
                  <div>
                    <h2 className="dc-modal-title" style={{ margin: 0 }}>Status de Contas</h2>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>{statusModalCondo?.nome}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {statusItems.some(i => i.fatura) && (
                  <button
                    className="dc-btn dc-btn-secondary"
                    style={{ height: 36, fontSize: '0.8rem', gap: 8, background: '#f8fafc' }}
                    onClick={async () => {
                      const ids = statusItems.filter(i => i.fatura).map(i => i.fatura.id);
                      if (ids.length > 0) {
                        try {
                          await api.downloadLoteFaturas(ids);
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }
                    }}
                  >
                    <Download size={14} /> Baixar Todas
                  </button>
                )}
                <button className="dc-modal-close" onClick={() => setIsStatusModalOpen(false)}><X size={20} /></button>
              </div>
            </div>

            <div className="dc-modal-body" style={{ padding: '24px 0', minHeight: 400 }}>
              <div style={{ padding: '0 24px 16px' }}>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Calendar size={16} color="#3b82f6" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                    Referência (Vencimento): {format(new Date(), 'MMMM / yyyy', { locale: ptBR })}
                  </span>
                </div>
              </div>

              {loadingStatus ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                  <div className="dc-loading-spinner" style={{ margin: '0 auto' }} />
                  <p style={{ marginTop: 12, fontSize: '0.9rem', color: '#64748b' }}>Buscando comprovantes...</p>
                </div>
              ) : statusError ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#ef4444' }}>
                  <AlertCircle size={40} style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontWeight: 700 }}>Erro ao carregar</p>
                  <p style={{ fontSize: '0.85rem', marginTop: 4 }}>{statusError}</p>
                </div>
              ) : statusItems.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                  <Zap size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p>Nenhuma concessionária ativa vinculada.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 24px' }}>
                  {statusItems.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      borderRadius: 14,
                      border: '1px solid',
                      borderColor: item.fatura ? '#bcf0da' : '#e2e8f0',
                      background: item.fatura ? '#f0fdf4' : '#fff',
                      boxShadow: item.fatura ? 'none' : '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        {item.fatura ? (
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <CheckCircle2 size={24} />
                          </div>
                        ) : (
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                            <Clock size={24} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>
                            {item.concessionaria.tipo === 'Outros' ? item.concessionaria.nome_personalizado : item.concessionaria.tipo}
                            {item.concessionaria.instalacao && (
                              <span style={{ fontWeight: 500, color: '#64748b', fontSize: '0.85rem', marginLeft: 8 }}>
                                {(() => {
                                  if (item.concessionaria.tipo === 'Sabesp') return `(Fornecimento: ${item.concessionaria.instalacao})`;
                                  if (item.concessionaria.tipo === 'Enel' || item.concessionaria.tipo === 'Comgás') return `(Instalação: ${item.concessionaria.instalacao})`;
                                  return `(Código: ${item.concessionaria.instalacao})`;
                                })()}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: item.fatura ? '#059669' : '#64748b', fontWeight: 500 }}>
                            {item.fatura ? `Recebida em ${format(new Date(item.fatura.created_at), 'dd/MM/yyyy')}` : `Vencimento planejado: Dia ${item.concessionaria.dia_vencimento}`}
                            {item.fatura && item.fatura.vencimento && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                                Vencimento: {format(new Date(item.fatura.vencimento + 'T12:00:00'), 'dd/MM/yyyy')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        {item.fatura ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>R$ {formatCurrencyCeil(item.fatura.valor || 0)}</div>
                            </div>
                            <button
                              className="dc-btn"
                              style={{
                                height: 40,
                                width: 40,
                                padding: 0,
                                borderRadius: 10,
                                background: '#fff',
                                border: '1px solid #10b981',
                                color: '#10b981',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onClick={() => handleDownloadFatura(item.fatura, item.fatura.pdf_nome_original || 'fatura.pdf')}
                              title="Baixar Fatura"
                            >
                              <Download size={18} />
                            </button>
                          </div>
                        ) : (
                          <button
                            style={{ padding: '6px 14px', borderRadius: 20, background: '#fff7ed', color: '#ea580c', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #ffedd5', cursor: 'pointer', transition: 'transform 0.2s' }}
                            onClick={() => { setManualFaturaConc(item.concessionaria); setManualFaturaData({ valor: '', vencimento: '' }); setManualFaturaPdf(null); setIsManualFaturaModalOpen(true); }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            title="Clique para cadastrar manualmente"
                          >
                            <AlertCircle size={15} /> Pendente
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dc-modal-footer">
              <button type="button" className="dc-btn dc-btn-secondary" style={{ width: '100%', height: 48 }} onClick={() => setIsStatusModalOpen(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastro Manual de Fatura */}
      {isManualFaturaModalOpen && manualFaturaConc && (
        <div className="dc-modal-overlay">
          <div className="dc-modal-content" style={{ maxWidth: 450 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">Cadastrar Fatura Manual</h2>
              <button className="dc-modal-close" onClick={() => setIsManualFaturaModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="dc-modal-body dc-space-y-4">
              <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                  {manualFaturaConc.tipo === 'Outros' ? manualFaturaConc.nome_personalizado : manualFaturaConc.tipo}
                </div>
                <div style={{ color: '#64748b', marginTop: 4 }}>
                  Condomínio: {statusModalCondo?.nome}
                </div>
                {manualFaturaConc.instalacao && (
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    {manualFaturaConc.tipo === 'Sabesp' ? `Fornecimento: ${manualFaturaConc.instalacao}` : `Instalação: ${manualFaturaConc.instalacao}`}
                  </div>
                )}
              </div>

              <div className="dc-form-group">
                <label>Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="dc-form-input"
                  value={manualFaturaData.valor}
                  onChange={(e) => setManualFaturaData(prev => ({ ...prev, valor: e.target.value }))}
                  placeholder="0,00"
                  required
                />
              </div>

              <div className="dc-form-group">
                <label>Data de Vencimento</label>
                <input
                  type="date"
                  className="dc-form-input"
                  value={manualFaturaData.vencimento}
                  onChange={(e) => setManualFaturaData(prev => ({ ...prev, vencimento: e.target.value }))}
                  required
                />
              </div>

              <div className="dc-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Paperclip size={14} color="#64748b" /> Anexar PDF da Fatura
                </label>
                <div style={{
                  position: 'relative',
                  border: `2px dashed ${manualFaturaPdf ? '#10b981' : '#cbd5e1'}`,
                  borderRadius: 10,
                  padding: manualFaturaPdf ? '12px 16px' : '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: manualFaturaPdf ? '#f0fdf4' : '#f8fafc',
                }}>
                  {manualFaturaPdf ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                          <FileText size={18} />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{manualFaturaPdf.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{(manualFaturaPdf.size / 1024).toFixed(1)} KB</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setManualFaturaPdf(null); }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4 }}
                        title="Remover arquivo"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <Upload size={24} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569' }}>Clique para selecionar um PDF</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>Máx. 10 MB • Formato PDF</div>
                      <input
                        type="file"
                        accept="application/pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setManualFaturaPdf(file);
                        }}
                      />
                    </label>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>Opcional — o arquivo ficará vinculado à fatura.</div>
              </div>

              <div style={{ padding: 10, background: '#eff6ff', borderRadius: 6, fontSize: '0.75rem', color: '#1e40af' }}>
                <strong>Informações automáticas:</strong><br/>
                • Status: <strong>Pendente</strong><br/>
                • Registrado por: <strong>{user?.nome}</strong><br/>
                • Data de registro: <strong>{format(new Date(), 'dd/MM/yyyy')}</strong>
              </div>
            </div>
            <div className="dc-modal-footer">
              <button
                type="button"
                className="dc-btn dc-btn-secondary"
                onClick={() => setIsManualFaturaModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="dc-btn dc-btn-primary"
                disabled={savingManualFatura || !manualFaturaData.valor || !manualFaturaData.vencimento}
                onClick={async () => {
                  if (!manualFaturaData.valor || !manualFaturaData.vencimento) {
                    alert('Por favor, preencha o valor e a data de vencimento.');
                    return;
                  }
                  try {
                    setSavingManualFatura(true);
                    await api.createFaturaManual({
                      condominio_id: statusModalCondo?.id,
                      concessionaria_id: manualFaturaConc.id,
                      valor: parseFloat(manualFaturaData.valor),
                      vencimento: manualFaturaData.vencimento,
                      pdf_file: manualFaturaPdf || undefined,
                    });
                    setIsManualFaturaModalOpen(false);
                    setManualFaturaPdf(null);
                    // Refresh status data
                    handleOpenStatus(statusModalCondo);
                    alert('Fatura cadastrada com sucesso!');
                  } catch (err: any) {
                    alert(err.message || 'Erro ao cadastrar fatura');
                  } finally {
                    setSavingManualFatura(false);
                  }
                }}
                style={{ minWidth: 140 }}
              >
                {savingManualFatura ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload Documento */}
      {docUploadModal && (
        <div className="dc-modal-overlay" style={{ zIndex: 10001 }}>
          <div className="dc-modal-content" style={{ maxWidth: 450 }}>
            <div className="dc-modal-header">
              <h2 className="dc-modal-title">Vigência do Documento</h2>
              <button className="dc-modal-close" onClick={() => { setDocUploadModal(null); setDocUploadFile(null); }}><X size={20} /></button>
            </div>
            <div className="dc-modal-body dc-space-y-4">
              <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', color: '#475569', marginBottom: 6 }}>
                <strong>Arquivo Selecionado:</strong> {docUploadFile?.name}
              </div>
              <div className="dc-form-group">
                <label>Início da Vigência</label>
                <input type="date" className="dc-form-input" value={docDates.inicio} onChange={e => setDocDates(prev => ({ ...prev, inicio: e.target.value }))} required />
              </div>
              <div className="dc-form-group">
                <label>Fim da Vigência</label>
                <input type="date" className="dc-form-input" value={docDates.fim} onChange={e => setDocDates(prev => ({ ...prev, fim: e.target.value }))} required />
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                  Preencha corretamente, pois o documento será automaticamente removido na data de validade.
                </div>
              </div>
            </div>
            <div className="dc-modal-footer">
              <button className="dc-btn dc-btn-secondary" onClick={() => { setDocUploadModal(null); setDocUploadFile(null); }}>Cancelar</button>
              <button className="dc-btn dc-btn-primary" onClick={confirmDocUpload} disabled={uploadingDoc} style={{ minWidth: 140 }}>
                {uploadingDoc ? 'Enviando...' : 'Confirmar e Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </Shell>
  );
}
