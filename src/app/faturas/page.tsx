'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Shell from '@/components/layout/Shell';
import {
  Search, Download, Printer, TrendingDown, TrendingUp, Calendar, Eye, X,
  FileText, Mail, Clock, DollarSign, AlertCircle, CheckCircle2, Hash, Zap
} from 'lucide-react';
import { api, API_BASE_URL } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function FaturasPage() {
  const [faturas, setFaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedFatura, setSelectedFatura] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await api.getFaturas();
        setFaturas(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return faturas.filter(f => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match = (
          (f.referencia || '').toLowerCase().includes(q) ||
          (f.email_remetente || '').toLowerCase().includes(q) ||
          (f.email_assunto || '').toLowerCase().includes(q) ||
          (f.pdf_nome_original || '').toLowerCase().includes(q) ||
          String(f.valor || '').includes(q)
        );
        if (!match) return false;
      }
      if (selectedMonth && f.created_at) {
        const faturaDate = new Date(f.created_at);
        const faturaMonth = `${faturaDate.getFullYear()}-${String(faturaDate.getMonth() + 1).padStart(2, '0')}`;
        if (faturaMonth !== selectedMonth) return false;
      }
      return true;
    });
  }, [faturas, searchTerm, selectedMonth]);

  const stats = useMemo(() => {
    const total = filtered.reduce((acc: number, f: any) => acc + (f.valor || 0), 0);
    return { total, count: filtered.length };
  }, [filtered]);

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

  const monthLabel = selectedMonth ? (() => {
    const [year, month] = selectedMonth.split('-');
    const d = new Date(Number(year), Number(month) - 1);
    return format(d, 'MMMM/yyyy', { locale: ptBR });
  })() : 'Todos os meses';

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
          <div className="dc-ov-value">R$ {stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          <div className="dc-ov-badge up">
            <TrendingUp size={11} /> {stats.count} faturas no total
          </div>
        </div>
        <div className="dc-overview-card light">
          <div className="dc-ov-label" style={{ color: '#64748b' }}>Média por Fatura</div>
          <div className="dc-ov-value" style={{ color: '#0f172a' }}>
            R$ {(stats.count > 0 ? stats.total / stats.count : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
            style={{ height: 40, padding: '0 14px', fontSize: '0.85rem' }}
            onClick={() => setShowMonthPicker(!showMonthPicker)}
          >
            <Calendar size={15} /> {monthLabel}
          </button>
          {showMonthPicker && (
            <div style={{
              position: 'absolute', right: 0, top: 44, background: '#fff',
              border: '1px solid #e2e8f0', borderRadius: 10, padding: 12,
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 50, minWidth: 200
            }}>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(e.target.value); setShowMonthPicker(false); }}
                style={{
                  width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
                  borderRadius: 8, fontSize: '0.9rem', fontFamily: 'inherit'
                }}
              />
              <button
                className="dc-btn dc-btn-secondary"
                style={{ width: '100%', marginTop: 8, height: 34, fontSize: '0.82rem', justifyContent: 'center' }}
                onClick={() => { setSelectedMonth(''); setShowMonthPicker(false); }}
              >
                Mostrar Todos
              </button>
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
                <th>Condomínio / Concessionária</th>
                <th>Referência</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status IA</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : filtered.map((f: any) => {
                const isOk = f.status === 'processada';
                return (
                  <tr key={f.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          className="dc-type-badge dc-type-E"
                          style={{ width: 40, height: 40, borderRadius: 10, fontSize: '1rem' }}
                        >
                          {(f.email_assunto || f.referencia || 'F').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="dc-cell-primary">
                            {f.email_assunto
                              ? f.email_assunto.substring(0, 50) + (f.email_assunto.length > 50 ? '...' : '')
                              : 'Fatura Processada'}
                          </div>
                          <div className="dc-cell-secondary">
                             {f.email_remetente || 'Remetente desconhecido'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="dc-cell-primary">{f.referencia}</div>
                      <div className="dc-cell-secondary">{f.pdf_nome_original || 'Digitalizado via IA'}</div>
                    </td>
                    <td>
                      <div className="dc-cell-primary">{f.vencimento ? format(new Date(f.vencimento + 'T12:00:00'), 'dd/MM/yyyy') : '—'}</div>
                      <div className="dc-cell-secondary">Ciclo Mensal</div>
                    </td>
                    <td>
                      <div className="dc-cell-primary">R$ {(f.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </td>
                    <td>
                      <span className={`dc-badge ${isOk ? 'dc-badge-green' : f.status === 'erro' ? 'dc-badge-red' : 'dc-badge-amber'}`}>
                        <span className="dc-badge-dot" />
                        {f.status ? f.status.charAt(0).toUpperCase() + f.status.slice(1) : 'Pendente'}
                      </span>
                      <div className="dc-cell-secondary" style={{ marginTop: 4 }}>
                        {f.created_at ? format(new Date(f.created_at), "dd/MM 'às' HH:mm") : '—'}
                      </div>
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
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
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
                <DetailItem icon={<DollarSign size={16} />} label="Valor" value={`R$ ${(selectedFatura.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} highlight />
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
