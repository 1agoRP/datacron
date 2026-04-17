'use client';

import React, { useState, useMemo } from 'react';
import Shell from '@/components/layout/Shell';
import {
  Search, Download, Printer, TrendingDown, TrendingUp, Calendar, Eye, X,
  FileText, Mail, Clock, DollarSign, AlertCircle, CheckCircle2, Hash, Zap, ChevronDown, ChevronUp, ChevronRight
} from 'lucide-react';

import { api, API_BASE_URL } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import useSWR from 'swr';

export default function FaturasPage() {
  const { data: faturas = [], isLoading: loading } = useSWR(
    'faturas',
    () => api.getFaturas(),
    { revalidateOnFocus: true }
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(''); // e.g., "01", "02", ...
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'created_at', direction: 'desc' });
  const [selectedFatura, setSelectedFatura] = useState<any | null>(null);

  const monthsList = [
    { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' }, { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' }, { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' }
  ];

  const formatReferencia = (ref: string) => {
    if (!ref) return '—';
    // If format is 03/2026
    const parts = ref.split('/');
    if (parts.length === 2 && !isNaN(Number(parts[0]))) {
      const m = parseInt(parts[0], 10);
      const mLabel = monthsList.find(i => parseInt(i.value, 10) === m)?.label || parts[0];
      return `${mLabel}/${parts[1]}`;
    }
    return ref;
  };


  const filteredAndSorted = useMemo(() => {
    let result = faturas.filter(f => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match = (
          (f.referencia || '').toLowerCase().includes(q) ||
          (f.condominio?.nome || '').toLowerCase().includes(q) ||
          (f.condominio?.numero || '').toLowerCase().includes(q) ||
          (f.concessionaria?.tipo || '').toLowerCase().includes(q) ||
          (f.email_remetente || '').toLowerCase().includes(q) ||
          String(f.valor || '').includes(q)
        );
        if (!match) return false;
      }
      
      if (selectedYear || selectedMonth) {
        // Prioritize Referência for year/month filtering
        let refMonth = '';
        let refYear = '';
        if (f.referencia && f.referencia.includes('/')) {
          const parts = f.referencia.split('/');
          refMonth = parts[0].padStart(2, '0');
          refYear = parts[1];
        } else if (f.created_at) {
          const d = new Date(f.created_at);
          refMonth = (d.getMonth() + 1).toString().padStart(2, '0');
          refYear = d.getFullYear().toString();
        }

        if (selectedYear && refYear !== selectedYear) return false;
        if (selectedMonth && refMonth !== selectedMonth) return false;
      }

      return true;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let valA: any;
        let valB: any;

        switch (sortConfig.key) {
          case 'condominio': valA = a.condominio?.nome || ''; valB = b.condominio?.nome || ''; break;
          case 'numero': valA = a.condominio?.numero || ''; valB = b.condominio?.numero || ''; break;
          case 'tipo': valA = a.concessionaria?.tipo || ''; valB = b.concessionaria?.tipo || ''; break;
          case 'valor': valA = a.valor || 0; valB = b.valor || 0; break;
          case 'vencimento': valA = a.vencimento || ''; valB = b.vencimento || ''; break;
          case 'referencia': valA = a.referencia || ''; valB = b.referencia || ''; break;
          case 'status': valA = a.status || ''; valB = b.status || ''; break;
          case 'debito': valA = a.debito_automatico ? 1 : 0; valB = b.debito_automatico ? 1 : 0; break;
          default: valA = a.created_at || ''; valB = b.created_at || '';

        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [faturas, searchTerm, selectedYear, selectedMonth, sortConfig]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    
    // Always include current and next year for convenience
    const currentYear = new Date().getFullYear();
    years.add(currentYear.toString());
    years.add((currentYear + 1).toString());
    years.add((currentYear - 1).toString());

    faturas.forEach((f: any) => {
      // From Referência (e.g., "03/2026")
      if (f.referencia && f.referencia.includes('/')) {
        const parts = f.referencia.split('/');
        const y = parts[parts.length - 1];
        if (y && y.length === 4) years.add(y);
      }
      // From created_at as fallback
      if (f.created_at) {
        years.add(new Date(f.created_at).getFullYear().toString());
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [faturas]);



  const stats = useMemo(() => {
    const total = filteredAndSorted.reduce((acc: number, f: any) => acc + (f.valor || 0), 0);
    return { total, count: filteredAndSorted.length };
  }, [filteredAndSorted]);


  const handleExportExcel = async () => {
    try {
      await api.exportFaturas('excel');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDownloadPdf = (faturaId: string, filename: string) => {
    const token = localStorage.getItem('datacron_token');
    fetch(`${API_BASE_URL}/faturas/${faturaId}/pdf`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(resp => {
      if (!resp.ok) {
        throw new Error(resp.status === 404
          ? 'PDF não encontrado no servidor. O arquivo pode ter sido removido após um redeploy.'
          : `Erro ao baixar PDF: ${resp.status}`);
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
  const filterLabel = useMemo(() => {
    if (!selectedYear && !selectedMonth) return 'Todos os meses';
    const mLabel = monthsList.find(m => m.value === selectedMonth)?.label || '';
    return `${mLabel}${mLabel && selectedYear ? '/' : ''}${selectedYear}`;
  }, [selectedYear, selectedMonth]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <ChevronDown size={14} style={{ opacity: 0.2 }} />;
    return sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };




  return (
    <Shell>
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title">Faturas Processadas</h1>
          <p className="dc-page-subtitle">Histórico completo de consumo e pagamentos extraídos automaticamente.</p>
        </div>
        <div className="dc-page-header-actions">
          <button className="dc-btn dc-btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </button>
          <button className="dc-btn dc-btn-primary" onClick={handleExportExcel}>
            <Download size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Overview strip */}
      <div className="dc-overview-strip">
        <div className="dc-overview-card primary">
          <div className="dc-ov-label">Total Extraído</div>
          <div className="dc-ov-value">R$ {(Math.ceil(stats.total * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="dc-ov-badge up">
            <TrendingUp size={11} /> {stats.count} faturas no total
          </div>
        </div>
        <div className="dc-overview-card light">
          <div className="dc-ov-label" style={{ color: '#64748b' }}>Média por Fatura</div>
          <div className="dc-ov-value" style={{ color: '#0f172a' }}>
            R$ {(Math.ceil((stats.count > 0 ? stats.total / stats.count : 0) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="dc-ov-badge down">
            <TrendingDown size={11} /> Processado via IA
          </div>
        </div>
        <div className="dc-overview-card light">
          <div className="dc-ov-label" style={{ color: '#64748b' }}>Status do Processamento</div>
          <div className="dc-ov-value" style={{ color: '#0f172a' }}>
            {faturas.length > 0
              ? Math.round((faturas.filter((f: any) => f.status === 'processada').length / faturas.length) * 100)
              : 100}%
          </div>
          <div className="dc-ov-badge warn">
            <TrendingUp size={11} /> Eficiência Máxima
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="dc-filter-bar">
        <div className="dc-filter-search">
          <Search />
          <input
            placeholder="Buscar por condomínio, concessionária ou referência..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <button
            className="dc-btn dc-btn-secondary"
            style={{ height: 40, padding: '0 14px', fontSize: '0.85rem', minWidth: 160 }}
            onClick={() => setShowFilterPicker(!showFilterPicker)}
          >
            <Calendar size={15} /> {filterLabel}
          </button>
          {showFilterPicker && (
            <div style={{
              position: 'absolute', right: 0, top: 44, background: '#fff',
              border: '1px solid #e2e8f0', borderRadius: 12, padding: 16,
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 260
            }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>ANO</label>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #e2e8f0' }}
                >
                  <option value="">Todos os anos</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: 4 }}>MÊS</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {monthsList.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setSelectedMonth(m.value)}
                      style={{
                        padding: '6px', borderRadius: 6, fontSize: '0.8rem',
                        border: '1px solid',
                        borderColor: selectedMonth === m.value ? '#2563eb' : '#e2e8f0',
                        background: selectedMonth === m.value ? '#eff6ff' : '#fff',
                        color: selectedMonth === m.value ? '#2563eb' : '#1e293b'
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="dc-btn dc-btn-primary"
                  style={{ flex: 1, height: 34, fontSize: '0.82rem', justifyContent: 'center' }}
                  onClick={() => setShowFilterPicker(false)}
                >
                  Aplicar
                </button>
                <button
                  className="dc-btn dc-btn-secondary"
                  style={{ flex: 1, height: 34, fontSize: '0.82rem', justifyContent: 'center' }}
                  onClick={() => { setSelectedMonth(''); setSelectedYear(''); setShowFilterPicker(false); }}
                >
                  Limpar
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Table */}
      <div className="dc-card">
        <div className="dc-table-wrapper">
          <table className="dc-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('condominio')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Condomínio <SortIcon column="condominio" /></div>
                </th>
                <th onClick={() => handleSort('numero')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Nº <SortIcon column="numero" /></div>
                </th>
                <th onClick={() => handleSort('tipo')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Tipo <SortIcon column="tipo" /></div>
                </th>
                <th onClick={() => handleSort('referencia')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Referência <SortIcon column="referencia" /></div>
                </th>
                <th onClick={() => handleSort('vencimento')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Vencimento <SortIcon column="vencimento" /></div>
                </th>
                <th onClick={() => handleSort('valor')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Valor <SortIcon column="valor" /></div>
                </th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Status IA <SortIcon column="status" /></div>
                </th>
                <th onClick={() => handleSort('debito')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>Débito Automático <SortIcon column="debito" /></div>
                </th>
                <th style={{ textAlign: 'right' }}>Ações</th>

              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : filteredAndSorted.map((f: any) => {

                const isOk = f.status === 'processada';
                return (
                  <tr key={f.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          className="dc-type-badge dc-type-E"
                          style={{ width: 32, height: 32, borderRadius: 8, fontSize: '0.85rem', flexShrink: 0 }}
                        >
                          {(f.condominio?.nome || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="dc-cell-primary" style={{ fontSize: '0.85rem' }}>{f.condominio?.nome || 'Desconhecido'}</div>
                      </div>
                    </td>
                    <td>
                      <div className="dc-cell-secondary" style={{ fontWeight: 600 }}>{f.condominio?.numero || '—'}</div>
                    </td>
                    <td>
                       <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
                          {f.concessionaria?.tipo || 'Outros'}
                       </span>
                    </td>
                    <td>
                      <div className="dc-cell-primary" style={{ fontWeight: 600 }}>{formatReferencia(f.referencia)}</div>
                    </td>
                    <td>
                      <div className="dc-cell-primary">{f.vencimento ? format(new Date(f.vencimento + 'T12:00:00'), 'dd/MM/yyyy') : '—'}</div>
                    </td>
                    <td>
                      <div className="dc-cell-primary" style={{ fontWeight: 700 }}>R$ {(Math.ceil((f.valor || 0) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </td>
                    <td>
                      <span className={`dc-badge ${isOk ? 'dc-badge-green' : f.status === 'erro' ? 'dc-badge-red' : 'dc-badge-amber'}`} style={{ fontSize: '0.72rem' }}>
                        <span className="dc-badge-dot" />
                        {f.status ? f.status.charAt(0).toUpperCase() + f.status.slice(1) : 'Pendente'}
                      </span>
                    </td>
                    <td>
                      {f.debito_automatico ? (
                        <span className="dc-badge dc-badge-green" style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', borderColor: '#10b981' }}>
                           <span className="dc-badge-dot" style={{ background: '#10b981' }} /> Ativo
                        </span>
                      ) : (
                        <span className="dc-badge dc-badge-red" style={{ fontSize: '0.72rem' }}>
                           <span className="dc-badge-dot" /> Inativo
                        </span>
                      )}
                    </td>


                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        {f.pdf_desbloqueado && (
                          <button
                            className="dc-btn dc-btn-secondary"
                            style={{ height: 34, padding: '0 12px', fontSize: '0.78rem', gap: 6 }}
                            onClick={() => handleDownloadPdf(f.id, f.pdf_nome_original || `fatura_${f.id}.pdf`)}
                          >
                            <Download size={14} /> PDF
                          </button>
                        )}
                        <button
                         className="dc-btn dc-btn-dark"
                         style={{ height: 34, padding: '0 12px', fontSize: '0.78rem', gap: 6 }}
                         onClick={() => setSelectedFatura(f)}
                        >
                          <Eye size={14} /> Detalhes
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredAndSorted.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>

                     Nenhuma fatura encontrada.
                  </td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>

      {/* ── Details Modal ── */}
      {selectedFatura && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setSelectedFatura(null)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 16, width: '100%', maxWidth: 720,
              maxHeight: '90vh', overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #1e40af, #2563eb)',
              padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <FileText size={22} color="#fff" />
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.05rem' }}>
                    Detalhes da Fatura
                  </div>
                  <div style={{ color: '#93c5fd', fontSize: '0.82rem', fontWeight: 600 }}>
                    {selectedFatura.referencia} · ID: {selectedFatura.id?.substring(0, 8)}...
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedFatura(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
                  width: 36, height: 36, cursor: 'pointer', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>
              {/* Status badge */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <span className={`dc-badge ${selectedFatura.status === 'processada' ? 'dc-badge-green' : selectedFatura.status === 'erro' ? 'dc-badge-red' : 'dc-badge-amber'}`}
                  style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                  <span className="dc-badge-dot" />
                  {selectedFatura.status ? selectedFatura.status.charAt(0).toUpperCase() + selectedFatura.status.slice(1) : 'Pendente'}
                </span>
                {selectedFatura.pdf_desbloqueado && (
                  <span className="dc-badge dc-badge-blue" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                    PDF Desbloqueado
                  </span>
                )}
              </div>

              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <DetailItem icon={<Mail size={16} />} label="Remetente" value={selectedFatura.email_remetente || '—'} />
                <DetailItem icon={<FileText size={16} />} label="Assunto" value={selectedFatura.email_assunto || '—'} />
                <DetailItem icon={<DollarSign size={16} />} label="Valor" value={`R$ ${(Math.ceil((selectedFatura.valor || 0) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} highlight />
                <DetailItem icon={<Calendar size={16} />} label="Vencimento" value={selectedFatura.vencimento ? format(new Date(selectedFatura.vencimento + 'T12:00:00'), 'dd/MM/yyyy') : '—'} />
                <DetailItem icon={<Hash size={16} />} label="Referência" value={selectedFatura.referencia} />
                <DetailItem icon={<Clock size={16} />} label="Processado em" value={selectedFatura.created_at ? format(new Date(selectedFatura.created_at), "dd/MM/yyyy 'às' HH:mm") : '—'} />
                <DetailItem icon={<FileText size={16} />} label="PDF Original" value={selectedFatura.pdf_nome_original || '—'} />
                <DetailItem icon={<Zap size={16} />} label="Gmail Message ID" value={selectedFatura.gmail_message_id ? selectedFatura.gmail_message_id.substring(0, 16) + '...' : '—'} />
              </div>

              {/* Variação */}
              {selectedFatura.variacao_percentual !== null && selectedFatura.variacao_percentual !== undefined && (
                <div style={{
                  background: Math.abs(selectedFatura.variacao_percentual) > 20 ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${Math.abs(selectedFatura.variacao_percentual) > 20 ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: 12, padding: '12px 16px', marginBottom: 20,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  {Math.abs(selectedFatura.variacao_percentual) > 20 ? <AlertCircle size={18} color="#dc2626" /> : <CheckCircle2 size={18} color="#16a34a" />}
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: Math.abs(selectedFatura.variacao_percentual) > 20 ? '#dc2626' : '#16a34a' }}>
                    Variação: {selectedFatura.variacao_percentual > 0 ? '+' : ''}{(selectedFatura.variacao_percentual * 100).toFixed(1)}%
                  </span>
                </div>
              )}

              {/* Erro */}
              {selectedFatura.erro_msg && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
                  padding: '12px 16px', marginBottom: 20,
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: '0.85rem', color: '#991b1b', lineHeight: 1.5 }}>
                    {selectedFatura.erro_msg}
                  </span>
                </div>
              )}

              {/* Dados Extraídos */}
              {selectedFatura.dados_extraidos && Object.keys(selectedFatura.dados_extraidos).length > 0 && (
                <div>
                  <div style={{
                    fontWeight: 800, fontSize: '0.92rem', color: '#0f172a',
                    marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <Zap size={16} color="#2563eb" /> Dados Extraídos pela IA
                  </div>
                  <div style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
                    overflow: 'hidden',
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {Object.entries(selectedFatura.dados_extraidos).map(([key, val]: [string, any], i: number) => (
                          <tr key={key} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{
                              padding: '10px 16px', fontWeight: 700, fontSize: '0.82rem',
                              color: '#475569', background: i % 2 === 0 ? '#f1f5f9' : '#f8fafc',
                              whiteSpace: 'nowrap', width: '40%',
                              textTransform: 'capitalize',
                            }}>
                              {key.replace(/_/g, ' ')}
                            </td>
                            <td style={{
                              padding: '10px 16px', fontSize: '0.85rem', color: '#0f172a',
                              background: i % 2 === 0 ? '#f1f5f9' : '#f8fafc',
                              wordBreak: 'break-all',
                            }}>
                              {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '—')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions footer */}
              <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                {selectedFatura.pdf_desbloqueado && (
                  <button
                    className="dc-btn dc-btn-secondary"
                    style={{ height: 40, gap: 8 }}
                    onClick={() => handleDownloadPdf(selectedFatura.id, selectedFatura.pdf_nome_original || `fatura.pdf`)}
                  >
                    <Download size={15} /> Baixar PDF
                  </button>
                )}
                <button
                  className="dc-btn dc-btn-primary"
                  style={{ height: 40, gap: 8 }}
                  onClick={() => setSelectedFatura(null)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

function DetailItem({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? '#eff6ff' : '#f8fafc',
      border: `1px solid ${highlight ? '#bfdbfe' : '#e2e8f0'}`,
      borderRadius: 10, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ color: '#94a3b8' }}>{icon}</span>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontWeight: highlight ? 800 : 600, fontSize: highlight ? '1.1rem' : '0.88rem', color: highlight ? '#1e40af' : '#0f172a', wordBreak: 'break-all' }}>
        {value}
      </div>
    </div>
  );
}
