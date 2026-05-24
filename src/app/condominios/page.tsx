'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Shell from '@/components/layout/Shell';
import { Plus, Search, Filter, Building2, MapPin, ExternalLink, MoreVertical, X, Zap, Trash2, Calendar, FileText, ArrowUpDown, Download, ChevronLeft, History, Upload, FileSignature, Mail, CreditCard, CheckCircle2, AlertCircle, Clock, Paperclip } from 'lucide-react';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { ShieldAlert, Flame, ShieldCheck, HardHat } from 'lucide-react';
import useSWR from 'swr';
import { formatCurrencyCeil } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Condominio, Concessionaria, isReadOnly } from '@/types';

type SortField = 'nome' | 'numero';
type SortDir = 'asc' | 'desc';
type CondoDraft = Omit<Pick<Condominio, 'nome' | 'numero' | 'endereco' | 'cnpj' | 'sindico'>, 'id'> & {
  cpf_sindico: string;
  administradora: string;
  carteira: string;
  mandato_inicio: string;
  mandato_fim: string;
  leitura_individualizada_ativa: boolean;
};
type EditableCondo = Omit<Condominio, 'carteira'> & { carteira?: number | string | null };

const MONTHS_LIST = [
  { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' }, { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' }, { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' }
];

export default function CondominiosPage() {
  const { data: fetchCondos, isLoading: loading, mutate } = useSWR(['condominios', 'full'], () => api.getCondominios({ limit: 1000 }));
  const condos = useMemo(() => fetchCondos || [], [fetchCondos]);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const readOnly = isReadOnly(user);
  const canDeleteFatura = user?.role === 'admin' || user?.role === 'gerencia' || user?.role === 'assistente';

  const monthsList = MONTHS_LIST;

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCondo, setNewCondo] = useState<CondoDraft>({
    nome: '',
    numero: '',
    endereco: '',
    cnpj: '',
    sindico: '',
    cpf_sindico: '',
    administradora: '',
    carteira: '',
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
  const [detailsCondo, setDetailsCondo] = useState<Condominio | null>(null);
  const [editCondo, setEditCondo] = useState<EditableCondo | null>(null);
  const [condoConcs, setCondoConcs] = useState<Concessionaria[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [docUploadModal, setDocUploadModal] = useState<{ type: 'ata' | 'avcb' | 'apolice', condoId: string } | null>(null);
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null);
  const [docDates, setDocDates] = useState({ inicio: '', fim: '' });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // History modal
  const [historyConc, setHistoryConc] = useState<any>(null);
  const [historyFaturas, setHistoryFaturas] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusModalCondo, setStatusModalCondo] = useState<any>(null);
  const [statusItems, setStatusItems] = useState<any[]>([]);
  const [extraStatusItems, setExtraStatusItems] = useState<any[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Manual fatura modal
  const [isManualFaturaModalOpen, setIsManualFaturaModalOpen] = useState(false);
  const [manualFaturaConc, setManualFaturaConc] = useState<any>(null);
  const [manualFaturaData, setManualFaturaData] = useState({ valor: '', vencimento: '' });
  const [manualFaturaPdf, setManualFaturaPdf] = useState<File | null>(null);
  const [savingManualFatura, setSavingManualFatura] = useState(false);
  const [isDraggingFatura, setIsDraggingFatura] = useState(false);

  const [refMonth, setRefMonth] = useState(monthsList[new Date().getMonth()].value);
  const [refYear, setRefYear] = useState(new Date().getFullYear().toString());

  // Removed manual fetchData in favor of useSWR

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setCreating(true);
      await api.createCondominio({
        ...newCondo,
        carteira: newCondo.carteira ? Number(newCondo.carteira) : null,
        cpf_sindico: newCondo.cpf_sindico || null,
      });
      setIsModalOpen(false);
      setNewCondo({ nome: '', numero: '', endereco: '', cnpj: '', sindico: '', cpf_sindico: '', administradora: '', carteira: '', mandato_inicio: '', mandato_fim: '', leitura_individualizada_ativa: false });
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

  const selectedReferencia = useMemo(() => {
    const month = monthsList.find((item) => item.value === refMonth)?.label || monthsList[new Date().getMonth()].label;
    return `${month}/${refYear}`;
  }, [monthsList, refMonth, refYear]);

  const portfolioStats = useMemo(() => {
    const now = new Date();
    const inNext45Days = (dateValue?: string | null) => {
      if (!dateValue) return false;
      const target = new Date(String(dateValue).substring(0, 10) + 'T12:00:00');
      const days = Math.ceil((target.getTime() - now.getTime()) / 86400000);
      return days >= 0 && days <= 45;
    };
    const expired = (dateValue?: string | null) => {
      if (!dateValue) return false;
      return new Date(String(dateValue).substring(0, 10) + 'T12:00:00') < now;
    };

    const expected = condos.reduce((acc, condo) => acc + (condo.contas_esperadas || 0), 0);
    const received = condos.reduce((acc, condo) => acc + (condo.contas_recebidas || 0), 0);
    const docAttention = condos.filter((condo) =>
      !condo.ata_eleicao_nome ||
      !condo.avcb_url ||
      !condo.apolice_seguro_url ||
      expired(condo.mandato_fim) ||
      expired(condo.avcb_fim) ||
      expired(condo.apolice_seguro_fim) ||
      inNext45Days(condo.mandato_fim) ||
      inNext45Days(condo.avcb_fim) ||
      inNext45Days(condo.apolice_seguro_fim)
    ).length;

    return {
      total: condos.length,
      expected,
      received,
      completion: expected > 0 ? Math.round((received / expected) * 100) : 0,
      individualized: condos.filter((condo) => condo.leitura_individualizada_ativa).length,
      docAttention,
    };
  }, [condos]);

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

  const loadStatus = useCallback(async (condo: Condominio) => {
    if (!condo?.id) return;
    setLoadingStatus(true);
    setStatusError(null);
    setStatusItems([]);
    setExtraStatusItems([]);

    try {
      const data = await api.getStatusContas(String(condo.id), { mes: refMonth, ano: refYear });
      if (data && data.items) {
        setStatusItems(data.items);
        setExtraStatusItems(data.extras || []);
      } else {
        // Fallback for old API format if it returns just an array
        setStatusItems(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.error('Error loading status details:', err);
      const msg = err.message || '';
      setStatusError(msg.includes('fetch') ? 'Servidor indisponível. Tente novamente em alguns segundos.' : msg || 'Falha ao carregar dados');
    } finally {
      setLoadingStatus(false);
    }
  }, [refMonth, refYear]);

  const handleOpenStatus = (condo: Condominio) => {
    setStatusModalCondo(condo);
    setIsStatusModalOpen(true);
  };

  useEffect(() => {
    if (isStatusModalOpen && statusModalCondo) {
      void loadStatus(statusModalCondo);
    }
  }, [isStatusModalOpen, statusModalCondo, loadStatus]);

  const handleDeleteFatura = async (faturaId: string) => {
    if (!confirm('Deseja realmente excluir esta fatura? Esta ação não pode ser desfeita.')) return;
    try {
      await api.deleteFatura(faturaId);
      // Refresh the status items
      if (statusModalCondo) {
        handleOpenStatus(statusModalCondo);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir fatura');
    }
  };

  const handleOpenHistory = async (conc: any) => {
    if (!detailsCondo) return;
    setHistoryConc(conc);
    setHistoryFaturas([]);
    try {
      setLoadingHistory(true);
      const condId = String(detailsCondo.id);
      const concId = String(conc.id);
      const dbFaturas = await api.getHistoricoFaturas(condId, concId);
      const sorted = [...dbFaturas].sort((a: any, b: any) => {
        const dateA = new Date(a.vencimento || 0);
        const dateB = new Date(b.vencimento || 0);
        return dateB.getTime() - dateA.getTime();
      });
      setHistoryFaturas(sorted);
    } catch (err) {
      console.error(err);
      setHistoryFaturas([]);
    } finally {
      setLoadingHistory(false);
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
    if (!editCondo) return;
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
        payload.administradora = editCondo.administradora;
        payload.carteira = editCondo.carteira ? Number(editCondo.carteira) : null;
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

  const handleDownloadAll = async () => {
    try {
      await api.downloadAllInvoices(selectedReferencia);
    } catch (err: any) {
      alert(err.message || 'Erro ao baixar todas as faturas');
    }
  };

  return (
    <Shell>
      {/* ── Hero Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 55%, #3b82f6 100%)',
        borderRadius: 20,
        padding: '28px 32px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        boxShadow: '0 8px 32px rgba(37,99,235,0.22)',
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
            <Building2 size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.03em', lineHeight: 1.1 }}>Condomínios</h1>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)', marginTop: 5 }}>
              {portfolioStats.total} condomínio{portfolioStats.total !== 1 ? 's' : ''} ativos · Referência: <strong style={{ color: '#fff' }}>{selectedReferencia}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <button
            className="dc-btn"
            onClick={handleDownloadAll}
            title="Baixar todas as faturas do mês"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', gap: 8 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
          >
            <Download size={15} /> Baixar Faturas
          </button>
          {isAdmin && (
            <button
              className="dc-btn"
              onClick={() => setIsModalOpen(true)}
              style={{ background: '#fff', color: '#2563eb', fontWeight: 800, gap: 8 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
            >
              <Plus size={15} /> Novo Condomínio
            </button>
          )}
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
              <Building2 size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '3px 10px', borderRadius: 20, letterSpacing: '0.03em' }}>CARTEIRA</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Condomínios ativos</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 4 }}>{portfolioStats.total}</div>
          </div>
        </div>

        {/* Card 2: Contas */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          borderTop: `3px solid ${portfolioStats.completion === 100 ? '#10b981' : portfolioStats.completion > 0 ? '#f59e0b' : '#e2e8f0'}`,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <CheckCircle2 size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', background: '#f1f5f9', padding: '3px 10px', borderRadius: 20 }}>{portfolioStats.received}/{portfolioStats.expected} contas</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recebidas em {selectedReferencia}</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 4 }}>{portfolioStats.completion}<span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#94a3b8' }}>%</span></div>
            <div style={{ marginTop: 8, height: 4, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${portfolioStats.completion}%`, borderRadius: 99, background: portfolioStats.completion === 100 ? '#10b981' : '#f59e0b', transition: 'width 0.5s ease' }} />
            </div>
          </div>
        </div>

        {/* Card 3: Atenção Docs */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          borderTop: `3px solid ${portfolioStats.docAttention > 0 ? '#f59e0b' : '#10b981'}`,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: portfolioStats.docAttention > 0 ? '#fffbeb' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: portfolioStats.docAttention > 0 ? '#d97706' : '#16a34a' }}>
              <AlertCircle size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20,
              background: portfolioStats.docAttention > 0 ? '#fffbeb' : '#f0fdf4',
              color: portfolioStats.docAttention > 0 ? '#d97706' : '#16a34a',
            }}>DOCS</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Documentos críticos</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 4 }}>{portfolioStats.docAttention}</div>
            <div style={{ fontSize: '0.72rem', color: portfolioStats.docAttention > 0 ? '#d97706' : '#059669', fontWeight: 600, marginTop: 4 }}>
              {portfolioStats.docAttention > 0 ? 'Atenção requerida' : 'Tudo em dia ✓'}
            </div>
          </div>
        </div>

        {/* Card 4: Leitura Individual */}
        <div style={{
          background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)', borderTop: '3px solid #8b5cf6',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
              <Zap size={20} />
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#8b5cf6', background: '#f5f3ff', padding: '3px 10px', borderRadius: 20 }}>OPERAÇÃO</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leitura individualizada</div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1, marginTop: 4 }}>{portfolioStats.individualized}</div>
            <div style={{ fontSize: '0.72rem', color: '#8b5cf6', fontWeight: 600, marginTop: 4 }}>
              {portfolioStats.total > 0 ? `${Math.round((portfolioStats.individualized / portfolioStats.total) * 100)}% da carteira` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px',
        background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
        marginBottom: 16, flexWrap: 'wrap',
        boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, número ou CNPJ..."
            style={{
              width: '100%', height: 38, padding: '0 14px 0 36px',
              borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc',
              fontSize: '0.875rem', fontFamily: 'inherit', color: '#0f172a',
              transition: 'all 0.2s', outline: 'none',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Referência pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px 0 10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, height: 38, flexShrink: 0 }}>
          <Calendar size={13} style={{ color: '#64748b', flexShrink: 0 }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>Ref.:</span>
          <select
            style={{ height: 30, border: 'none', background: 'transparent', fontSize: '0.83rem', fontFamily: 'inherit', fontWeight: 700, color: '#0f172a', cursor: 'pointer', outline: 'none', paddingRight: 4 }}
            value={refMonth}
            onChange={(e) => setRefMonth(e.target.value)}
            aria-label="Mês de referência"
          >
            {monthsList.map((month) => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
          <input
            style={{ width: 56, height: 30, border: 'none', background: 'transparent', fontSize: '0.83rem', fontFamily: 'inherit', fontWeight: 700, color: '#0f172a', outline: 'none', textAlign: 'center' }}
            type="number" min="2020" max="2100"
            value={refYear}
            onChange={(e) => setRefYear(e.target.value)}
            aria-label="Ano de referência"
          />
        </div>

        {/* Filter toggle */}
        <button
          style={{
            height: 38, padding: '0 14px', borderRadius: 10,
            fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            border: `1px solid ${showFilters ? '#2563eb' : '#e2e8f0'}`,
            background: showFilters ? '#eff6ff' : '#f8fafc',
            color: showFilters ? '#2563eb' : '#64748b',
            transition: 'all 0.15s',
          }}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={13} /> Síndico {showFilters ? '✕' : ''}
        </button>

        <div style={{ width: 1, height: 24, background: '#e2e8f0', flexShrink: 0 }} />

        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
          <span style={{ color: '#0f172a' }}>{filtered.length}</span> {filtered.length !== 1 ? 'condomínios' : 'condomínio'}
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

      {/* ── Table ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }}>
                <th onClick={() => toggleSort('nome')} style={{ padding: '13px 20px', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                  Condomínio <SortIcon field="nome" />
                </th>
                <th style={{ padding: '13px 20px', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Status de Contas</th>
                <th onClick={() => toggleSort('numero')} style={{ padding: '13px 20px', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
                  Nº <SortIcon field="numero" />
                </th>
                <th style={{ padding: '13px 20px', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Síndico(a)</th>
                <th style={{ padding: '13px 20px', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap', textAlign: 'right' }}>Documentos / Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '60px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : filtered.map((condo: any) => {
                const total = condo.contas_esperadas || 0;
                const rec = condo.contas_recebidas || 0;
                const pct = total > 0 ? Math.round((rec / total) * 100) : 0;
                const pendentes = total - rec;

                // Semântica de cor por estado
                const isComplete = total > 0 && rec >= total;
                const isPartial = total > 0 && rec > 0 && rec < total;
                const isEmpty = total === 0 || rec === 0;

                const barColor = isComplete ? '#10b981' : isPartial ? '#f59e0b' : '#e2e8f0';
                const pillBg = isComplete ? '#f0fdf4' : isPartial ? '#fffbeb' : '#f8fafc';
                const pillBorder = isComplete ? '#bbf7d0' : isPartial ? '#fde68a' : '#e2e8f0';
                const pillColor = isComplete ? '#059669' : isPartial ? '#d97706' : '#94a3b8';
                const PillIcon = isComplete ? CheckCircle2 : isPartial ? Clock : AlertCircle;
                const pillLabel = isComplete ? 'Completo' : isPartial ? 'Parcial' : (total === 0 ? 'Sem vínculos' : 'Pendente');

                return (
                  <tr key={condo.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.12s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fafbff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '14px 20px', fontSize: '0.875rem', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#2563eb', flexShrink: 0,
                        }}>
                          <Building2 size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.4 }}>{condo.nome}</div>
                          <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <MapPin size={11} style={{ color: '#94a3b8', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{condo.endereco}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      <div
                        onClick={(e) => { e.stopPropagation(); handleOpenStatus(condo); }}
                        title="Clique para ver detalhes das contas"
                        style={{
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                          padding: '6px 8px',
                          borderRadius: 10,
                          transition: 'background 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f1f5f9';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* Pill de status */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 20,
                            background: pillBg, border: `1px solid ${pillBorder}`,
                            color: pillColor, fontSize: '0.75rem', fontWeight: 700,
                          }}>
                            <PillIcon size={12} />
                            {pillLabel}
                          </div>
                          {pendentes > 0 && total > 0 && (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                              {rec}/{total}
                            </span>
                          )}
                          {isComplete && total > 0 && (
                            <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                              {total}/{total}
                            </span>
                          )}
                        </div>
                        {/* Barra de progresso com cor semântica */}
                        {total > 0 && (
                          <div style={{ height: 5, borderRadius: 99, background: '#e2e8f0', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${pct}%`,
                              borderRadius: 99,
                              background: barColor,
                              transition: 'width 0.4s ease',
                            }} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 36, height: 28, padding: '0 10px',
                        borderRadius: 8, background: '#f1f5f9',
                        fontWeight: 900, color: '#475569', fontSize: '0.85rem',
                        border: '1px solid #e2e8f0',
                      }}>{condo.numero}</span>
                    </td>
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{condo.sindico}</div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: 2, fontFamily: 'monospace' }}>{condo.cnpj}</div>
                    </td>
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                        {/* Doc chips */}
                        {condo.avcb_url && (
                          <button
                            onClick={() => handleDownloadAvcb(condo.id)}
                            title="Baixar AVCB"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#fee2e2')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#fef2f2')}
                          >
                            <Flame size={11} /> AVCB
                          </button>
                        )}
                        {condo.apolice_seguro_url && (
                          <button
                            onClick={() => handleDownloadApolice(condo.id)}
                            title="Baixar Apólice"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: '#fefce8', color: '#ca8a04', border: '1px solid #fde68a', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#fef08a')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#fefce8')}
                          >
                            <ShieldAlert size={11} /> Apólice
                          </button>
                        )}
                        {condo.ata_eleicao_nome && (
                          <button
                            onClick={() => handleDownloadAta(condo.id)}
                            title={`Baixar ATA: ${condo.ata_eleicao_nome}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#dcfce7')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#f0fdf4')}
                          >
                            <FileSignature size={11} /> ATA
                          </button>
                        )}
                        {/* Divider if any docs */}
                        {(condo.avcb_url || condo.apolice_seguro_url || condo.ata_eleicao_nome) && (
                          <div style={{ width: 1, height: 20, background: '#e2e8f0' }} />
                        )}
                        {/* Action buttons */}
                        <button
                          style={{ width: 32, height: 32, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer', transition: 'all 0.15s' }}
                          title="Abrir detalhes"
                          onClick={() => handleOpenDetails(condo)}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        >
                          <ExternalLink size={14} />
                        </button>
                        {!readOnly && (
                          <button
                            style={{ width: 32, height: 32, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', cursor: 'pointer', transition: 'all 0.15s' }}
                            title="Editar / Opções"
                            onClick={() => handleOpenEdit(condo)}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                          >
                            <MoreVertical size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div style={{ padding: '80px 24px', textAlign: 'center', color: '#94a3b8' }}>
                      <div style={{ width: 72, height: 72, borderRadius: 20, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#cbd5e1' }}>
                        <Building2 size={36} />
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#475569' }}>Nenhum condomínio encontrado</div>
                      <div style={{ fontSize: '0.85rem', marginTop: 6, color: '#94a3b8' }}>
                        {searchTerm ? `Nenhum resultado para "${searchTerm}"` : 'Comece adicionando seu primeiro cliente.'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer count */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, paddingRight: 4 }}>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''} exibido{filtered.length !== 1 ? 's' : ''}
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
                  <label>Administradora</label>
                  <input disabled={readOnly} value={newCondo.administradora} onChange={e => setNewCondo({ ...newCondo, administradora: e.target.value })} placeholder="Ex: Prop Starter" />
                </div>
                <div className="dc-form-group">
                  <label>Carteira</label>
                  <input type="number" min="0" disabled={readOnly} value={newCondo.carteira} onChange={e => setNewCondo({ ...newCondo, carteira: e.target.value })} placeholder="Ex: 1" />
                </div>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="dc-form-group">
                  <label>Administradora</label>
                  <input disabled={!isAdmin} value={editCondo.administradora || ''} onChange={e => setEditCondo({ ...editCondo, administradora: e.target.value })} className="dc-form-input" />
                </div>
                <div className="dc-form-group">
                  <label>Carteira</label>
                  <input type="number" min="0" disabled={!isAdmin} value={editCondo.carteira || ''} onChange={e => setEditCondo({ ...editCondo, carteira: e.target.value })} className="dc-form-input" />
                </div>
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
            <div className="dc-modal-body dc-space-y-4" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
              {historyConc ? (
                /* HISTORY VIEW */
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
                    }}
                  >
                    <div style={{ padding: 10, background: '#fff', borderRadius: 8, color: '#0066cc', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                      <CreditCard size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, color: '#004080', fontSize: '0.9rem' }}>
                        {historyConc.debito_automatico ? 'Débito Automático Ativo' : 'Débito Automático Inativo'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#004080', opacity: 0.7, marginTop: 1 }}>
                        {historyConc.debito_automatico
                          ? 'Faturas processadas automaticamente.'
                          : 'As faturas deste condomínio precisam ser pagas manualmente.'}
                      </div>
                    </div>
                  </div>

                  {/* Toolbar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h5 style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', margin: 0 }}>Histórico de Faturas</h5>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{historyFaturas.length} documento(s) encontrado(s)</div>
                  </div>

                  {loadingHistory ? (
                    <div style={{ padding: 80, textAlign: 'center' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></div>
                  ) : (
                    <>
                      {historyFaturas.length === 0 ? (
                        <div style={{ padding: 80, textAlign: 'center', color: '#94a3b8', background: '#fff', border: '1px solid #f3f4f6', borderRadius: 16 }}>
                          <FileText size={56} style={{ margin: '0 auto 20px', opacity: 0.15 }} />
                          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#475569' }}>Nenhum registro no histórico</div>
                          <div style={{ fontSize: '0.9rem', marginTop: 10 }}>As faturas processadas aparecerão aqui automaticamente.</div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {historyFaturas.map(f => {
                            const hasAutoDebit = f.debito_automatico === true || String(f.debito_automatico) === 'true';
                            const isLegacy = !f.status;
                            const status = f.status || 'processada';

                            let statusColor = '#10b981';
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
                      )}
                    </>
                  )}

                </div>
              ) : (
                /* DETAILS VIEW — REDESIGN */
                <>
                  {/* ── Hero Header ── */}
                  <div style={{
                    background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 60%, #fff 100%)',
                    borderRadius: 14,
                    border: '1px solid #dbeafe',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    marginBottom: 4,
                  }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: 16,
                      background: 'linear-gradient(135deg, #2563eb, #60a5fa)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', flexShrink: 0,
                      boxShadow: '0 4px 16px rgba(37,99,235,0.25)',
                    }}>
                      <Building2 size={28} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>{detailsCondo.nome}</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: '#fff', border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                          # {detailsCondo.numero}
                        </span>
                        {detailsCondo.carteira && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: '#fff', border: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                            Carteira {detailsCondo.carteira}
                          </span>
                        )}
                        {detailsCondo.leitura_individualizada_ativa && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, background: '#ecfdf5', border: '1px solid #6ee7b7', fontSize: '0.75rem', fontWeight: 700, color: '#059669' }}>
                            <Zap size={11} /> Leitura Individual
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Info Cards ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                    {/* Síndico */}
                    <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Síndico(a)</div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{detailsCondo.sindico || '—'}</div>
                        {detailsCondo.mandato_fim && (() => {
                          const now = new Date();
                          const fim = new Date(String(detailsCondo.mandato_fim).substring(0,10) + 'T12:00:00');
                          const dias = Math.ceil((fim.getTime() - now.getTime()) / 86400000);
                          const expirado = dias < 0;
                          const proximo = dias >= 0 && dias <= 45;
                          return (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                              background: expirado ? '#fef2f2' : proximo ? '#fffbeb' : '#f0fdf4',
                              color: expirado ? '#ef4444' : proximo ? '#d97706' : '#059669',
                              border: `1px solid ${expirado ? '#fecaca' : proximo ? '#fde68a' : '#bbf7d0'}` }}>
                              <Calendar size={10} />
                              Mandato: {expirado ? 'Expirado' : `até ${format(fim, 'dd/MM/yyyy')}`}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Endereço */}
                    <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}>
                        <MapPin size={18} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Endereço</div>
                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.85rem', lineHeight: 1.4 }}>{detailsCondo.endereco || '—'}</div>
                      </div>
                    </div>

                    {/* CNPJ */}
                    <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea', flexShrink: 0 }}>
                        <FileText size={18} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>CNPJ</div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem', fontFamily: 'monospace' }}>{detailsCondo.cnpj || '—'}</div>
                      </div>
                    </div>

                    {/* Administradora */}
                    <div style={{ padding: '14px 16px', borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', flexShrink: 0 }}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Administradora</div>
                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{detailsCondo.administradora || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Não informada</span>}</div>
                      </div>
                    </div>
                  </div>

                  {/* Documentos */}
                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileSignature size={16} color="#3b82f6" /> Documentos Importantes
                    </h4>
                    <div 
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                      onDragLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = '#fff';
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type === 'application/pdf') {
                          triggerUploadFlow('ata', detailsCondo.id, { target: { files: [file] } } as any);
                        }
                      }}
                      style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, transition: 'all 0.2s' }}
                    >
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

                    <div 
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                      onDragLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = '#fff';
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type === 'application/pdf') {
                          triggerUploadFlow('avcb', detailsCondo.id, { target: { files: [file] } } as any);
                        }
                      }}
                      style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, transition: 'all 0.2s' }}
                    >
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

                    <div 
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                      onDragLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = '#fff';
                        const file = e.dataTransfer.files?.[0];
                        if (file && file.type === 'application/pdf') {
                          triggerUploadFlow('apolice', detailsCondo.id, { target: { files: [file] } } as any);
                        }
                      }}
                      style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}
                    >
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


                  {/* ── Concessionárias ── */}
                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Zap size={15} color="#eab308" /> Concessionárias Vinculadas
                      {condoConcs.length > 0 && (
                        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 20 }}>
                          {condoConcs.length} ativa{condoConcs.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </h4>
                    {loadingDetails ? (
                      <div style={{ padding: '20px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></div>
                    ) : condoConcs.length === 0 ? (
                      <div style={{ padding: 28, textAlign: 'center', background: '#f8fafc', borderRadius: 12, fontSize: '0.9rem', color: '#64748b', border: '2px dashed #e2e8f0' }}>
                        <Zap size={28} style={{ margin: '0 auto 8px', opacity: 0.25 }} />
                        <div style={{ fontWeight: 700 }}>Nenhuma automação vinculada</div>
                        <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Configure concessionárias para este condomínio.</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {condoConcs.map(conc => {
                          const concName = conc.tipo === 'Outros' && conc.nome_personalizado ? conc.nome_personalizado : conc.tipo;
                          const avatarBg =
                            conc.tipo === 'Sabesp' ? 'linear-gradient(135deg,#06b6d4,#0891b2)' :
                            conc.tipo === 'Enel'   ? 'linear-gradient(135deg,#3b82f6,#2563eb)' :
                            conc.tipo === 'Comgás' ? 'linear-gradient(135deg,#f97316,#ea580c)' :
                            'linear-gradient(135deg,#8b5cf6,#7c3aed)';
                          const instLabel =
                            conc.tipo === 'Sabesp' ? `Fornecimento: ${conc.instalacao}` :
                            conc.tipo === 'Enel' || conc.tipo === 'Comgás' ? `Instalação: ${conc.instalacao}` :
                            `Código: ${conc.instalacao}`;
                          return (
                            <div key={conc.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '14px 16px',
                              border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff',
                              transition: 'box-shadow 0.15s',
                            }}
                              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)')}
                              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{
                                  width: 44, height: 44, borderRadius: 12,
                                  background: avatarBg,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: '#fff', fontWeight: 900, fontSize: '1rem',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                }}>
                                  {concName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{concName}</div>
                                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{instLabel}</div>
                                  <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 3,
                                      padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                                      background: conc.debito_automatico ? '#eff6ff' : '#f8fafc',
                                      color: conc.debito_automatico ? '#2563eb' : '#64748b',
                                      border: `1px solid ${conc.debito_automatico ? '#bfdbfe' : '#e2e8f0'}`,
                                    }}>
                                      <CreditCard size={10} />
                                      {conc.debito_automatico ? 'Débito Auto' : 'Manual'}
                                    </span>
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 3,
                                      padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                                      background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0',
                                    }}>
                                      <CheckCircle2 size={10} /> Ativo
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Vencimento</div>
                                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Dia {conc.dia_vencimento}</div>
                                </div>
                                <button
                                  className="dc-btn dc-btn-primary"
                                  style={{ height: 36, padding: '0 14px', fontSize: '0.8rem', gap: 6, background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', boxShadow: 'none' }}
                                  onClick={() => handleOpenHistory(conc)}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                >
                                  <History size={13} /> Histórico
                                </button>
                              </div>
                            </div>
                          );
                        })}
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
                      const mainIds = statusItems.filter(i => i.fatura).map(i => i.fatura.id);
                      const extraIds = extraStatusItems.map(i => i.fatura.id);
                      const ids = [...mainIds, ...extraIds];
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
                    Referência (Vencimento): {selectedReferencia}
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
                            {canDeleteFatura && (
                              <button
                                className="dc-btn"
                                style={{
                                  height: 40,
                                  width: 40,
                                  padding: 0,
                                  borderRadius: 10,
                                  background: '#fff',
                                  border: '1px solid #fee2e2',
                                  color: '#ef4444',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                onClick={() => handleDeleteFatura(item.fatura.id)}
                                title="Excluir Fatura"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
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
                  {extraStatusItems.length > 0 && (
                    <div style={{ marginTop: 24, borderTop: '1px solid #f1f5f9', paddingTop: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#64748b' }}>
                        <Paperclip size={16} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                          Segundo faturamento para {selectedReferencia}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {extraStatusItems.map((item, idx) => (
                          <div key={`extra-${idx}`} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: 12,
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                <FileText size={18} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                                  {item.concessionaria.tipo}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  Vencimento: {item.fatura.vencimento ? format(new Date(item.fatura.vencimento), 'dd/MM/yyyy') : 'N/D'} • R$ {item.fatura.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="dc-icon-action"
                                style={{ width: 32, height: 32, padding: 0, background: '#fff' }}
                                onClick={() => handleDownloadFatura(item.fatura, item.fatura.pdf_nome_original || 'fatura.pdf')}
                                title="Baixar Fatura"
                              >
                                <Download size={14} />
                              </button>
                              {canDeleteFatura && (
                                <button
                                  className="dc-icon-action"
                                  style={{ width: 32, height: 32, padding: 0, background: '#fff', color: '#ef4444', borderColor: '#fee2e2' }}
                                  onClick={() => handleDeleteFatura(item.fatura.id)}
                                  title="Excluir Fatura"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingFatura(true); }}
                  onDragLeave={() => setIsDraggingFatura(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFatura(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && file.type === 'application/pdf') {
                      setManualFaturaPdf(file);
                    }
                  }}
                  onClick={() => document.getElementById('manual-fatura-upload')?.click()}
                  style={{
                    position: 'relative',
                    border: `2px dashed ${manualFaturaPdf ? '#10b981' : isDraggingFatura ? '#3b82f6' : '#cbd5e1'}`,
                    borderRadius: 10,
                    padding: manualFaturaPdf ? '12px 16px' : '24px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: manualFaturaPdf ? '#f0fdf4' : isDraggingFatura ? '#eff6ff' : '#f8fafc',
                    transform: isDraggingFatura ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  <input
                    type="file"
                    id="manual-fatura-upload"
                    accept="application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => setManualFaturaPdf(e.target.files?.[0] || null)}
                  />
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
