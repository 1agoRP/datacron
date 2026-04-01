'use client';

import React, { useState } from 'react';
import Shell from '@/components/layout/Shell';
import {
  Mail, Search, Filter, CheckCircle2, AlertCircle,
  ShieldCheck, FileCheck, Activity, Layers, MoreVertical,
  Download, FileDigit, FileText
} from 'lucide-react';
import { api, API_BASE_URL } from '@/lib/api';
import { format } from 'date-fns';
import useSWR from 'swr';

export default function RecebimentosPage() {
  // SWR for logs and status — automatic cache + background revalidation
  const { data: logs = [], isLoading: loading, mutate: mutateLogs } = useSWR(
    'emailLogs',
    () => api.getEmailLogs() as Promise<any[]>,
    { revalidateOnFocus: true }
  );
  const { data: status } = useSWR<any>(
    'emailStatus',
    () => api.getAgentStatus(),
    { revalidateOnFocus: true }
  );

  const [scanning, setScanning] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleForceScan = async () => {
    try {
      setScanning(true);
      await api.forceEmailScan();
      alert('Varredura iniciada com sucesso! Os resultados aparecerão nos logs em instantes.');
      setTimeout(() => mutateLogs(), 3000); // revalidate after scan
      setScanning(false);
    } catch (err: any) {
      alert('Erro ao iniciar varredura: ' + (err.message || 'Erro desconhecido'));
      setScanning(false);
    }
  };

  return (
    <Shell>
      <div className="dc-page-header">
        <div>
          <h1 className="dc-page-title">Central de Recebimento</h1>
          <p className="dc-page-subtitle">
            Status em tempo real do processamento de e-mails e faturas pelo Agente Datacron.
          </p>
        </div>
        <div className="dc-page-header-actions">
          <button 
            className="dc-btn dc-btn-primary" 
            onClick={handleForceScan}
            disabled={scanning}
          >
            <Mail size={16} /> {scanning ? 'Varrendo...' : 'Forçar Varredura'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="dc-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <div className="dc-stat-card">
          <div className="dc-stat-top">
            <span className="dc-stat-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Logs</span>
            <div className="dc-stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Mail size={24} />
            </div>
          </div>
          <div>
            <div className="dc-stat-label">E-MAILS PROCESSADOS</div>
            <div className="dc-stat-value">{logs.length}</div>
          </div>
        </div>
        
        <div className="dc-stat-card">
          <div className="dc-stat-top">
            <span className="dc-stat-badge positive">Sucesso</span>
            <div className="dc-stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <FileCheck size={24} />
            </div>
          </div>
          <div>
            <div className="dc-stat-label">FATURAS IDENTIFICADAS</div>
            <div className="dc-stat-value">{logs.filter(l => l.condominio_nome).length}</div>
          </div>
        </div>

        <div className="dc-stat-card">
          <div className="dc-stat-top">
            <span className="dc-stat-badge" style={{ background: '#ecfeff', color: '#0891b2' }}>Cron</span>
            <div className="dc-stat-icon" style={{ background: '#ecfeff', color: '#0891b2' }}>
              <ShieldCheck size={24} />
            </div>
          </div>
          <div>
            <div className="dc-stat-label">ÚLTIMA VARREDURA</div>
            <div className="dc-stat-value" style={{ fontSize: '1.65rem' }}>
              {status?.jobs?.[0]?.next_run ? format(new Date(status.jobs[0].next_run), "HH:mm") : 'Em breve'}
            </div>
          </div>
        </div>

        <div className="dc-stat-card">
          <div className="dc-stat-top">
            <span className="dc-stat-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>Falhas</span>
            <div className="dc-stat-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <AlertCircle size={24} />
            </div>
          </div>
          <div>
            <div className="dc-stat-label">ERROS DETECTADOS</div>
            <div className="dc-stat-value" style={{ color: logs.filter(l => l.status === 'nao_identificado' || l.status === 'erro').length > 0 ? '#dc2626' : '#0f172a' }}>
              {logs.filter(l => l.status === 'nao_identificado' || l.status === 'erro').length}
            </div>
          </div>
        </div>

        {/* NEW CARDS */}
        <div className="dc-stat-card">
          <div className="dc-stat-top">
            <span className="dc-stat-badge" style={{ background: '#faf5ff', color: '#9333ea' }}>PDFs</span>
            <div className="dc-stat-icon" style={{ background: '#faf5ff', color: '#9333ea' }}>
              <FileText size={24} />
            </div>
          </div>
          <div>
            <div className="dc-stat-label">PDFs EXTRAÍDOS</div>
            <div className="dc-stat-value">{logs.filter(l => l.fatura_url).length}</div>
          </div>
        </div>

        <div className="dc-stat-card">
          <div className="dc-stat-top">
            <span className="dc-stat-badge" style={{ background: '#fff7ed', color: '#ea580c' }}>Valor</span>
            <div className="dc-stat-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>
              <Activity size={24} />
            </div>
          </div>
          <div>
            <div className="dc-stat-label">VALOR PROCESSADO</div>
            <div className="dc-stat-value" style={{ fontSize: '1.5rem' }}>
              R$ {logs.reduce((sum, l) => sum + (l.fatura_valor || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <div className="dc-stat-card">
          <div className="dc-stat-top">
            <span className="dc-stat-badge" style={{ background: '#f0fdf4', color: '#16a34a' }}>%</span>
            <div className="dc-stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <CheckCircle2 size={24} />
            </div>
          </div>
          <div>
            <div className="dc-stat-label">TAXA DE IDENTIFICAÇÃO</div>
            <div className="dc-stat-value">
              {logs.length > 0 ? Math.round((logs.filter(l => l.condominio_nome).length / logs.length) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="dc-filter-bar">
        <div className="dc-filter-search" style={{ flex: 1 }}>
          <Search />
          <input 
            placeholder="Buscar por remetente, assunto ou condomínio..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Processing feed */}
      <div className="dc-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc',
          }}
        >
          <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
            Atividade Recente
          </span>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            Agente {status?.ativo ? 'Online' : 'Aguardando'} · 100% Operacional
          </span>
        </div>

        {loading ? (
             <div style={{ textAlign: 'center', padding: '40px' }}><div className="dc-loading-spinner" style={{ margin: '0 auto' }} /></div>
        ) : logs.filter(item => {
          if (!searchTerm.trim()) return true;
          const q = searchTerm.toLowerCase();
          return (
            (item.remetente || '').toLowerCase().includes(q) ||
            (item.assunto || '').toLowerCase().includes(q) ||
            (item.condominio_nome || '').toLowerCase().includes(q) ||
            (item.codigo_identificacao || '').toLowerCase().includes(q)
          );
        }).map(item => (
          <div key={item.id} className="dc-processing-item">
            {/* Sender column */}
            <div className="dc-proc-sender-col">
              <div className="dc-proc-sender-row">
                <div className={`dc-proc-status-icon ${item.status}`}>
                  {item.status === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                </div>
                <div className="dc-proc-sender-info">
                  <div className="dc-proc-dest-label" style={{ marginBottom: 2 }}>E-mail</div>
                  <div className="dc-proc-sender-name" title={item.remetente}>{item.remetente}</div>
                  <div className="dc-proc-sender-time" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    {item.recebido_em ? format(new Date(item.recebido_em), "dd/MM HH:mm") : '—'}
                    {item.codigo_identificacao && (
                      <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FileDigit size={10} /> Código {item.codigo_identificacao}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="dc-proc-subject">"{item.assunto}"</div>
            </div>

            {/* Body column */}
            <div className="dc-proc-body">
              <div className="dc-proc-dest-label">Condomínio</div>
              <div className="dc-proc-dest-name">
                {item.condominio_nome ? (
                  <><Layers size={15} style={{ color: '#2563eb' }} /> {item.condominio_nome}</>
                ) : (
                  <><AlertCircle size={15} style={{ color: '#dc2626' }} /> <span style={{ color: '#dc2626' }}>{item.status === 'ok' ? 'Processado' : 'Não Identificado'}</span></>
                )}
              </div>
              <div className="dc-proc-steps" style={{ flexWrap: 'wrap' }}>
                  <span className={`dc-proc-step ${item.status === 'erro' || item.status === 'nao_identificado' ? 'error' : 'done'}`}>
                    {item.status === 'processado' || item.status === 'identificado' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    {item.status === 'erro' ? (item.erro_msg || 'Falha no processamento') : 
                     item.status === 'processado' ? 'Dados extraídos com sucesso' : 
                     item.status === 'identificado' ? 'Condomínio vinculado' : 
                     item.status === 'nao_identificado' ? 'Não identificado' : 'Processando...'}
                  </span>
                  {item.fatura_valor !== null && item.fatura_valor !== undefined && item.fatura_valor > 0 && (
                    <span className="dc-proc-step done" style={{ color: '#0f172a', borderColor: '#e2e8f0' }}>
                      💰 R$ {item.fatura_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                  {item.fatura_vencimento && (
                    <span className="dc-proc-step done" style={{ color: '#0f172a', borderColor: '#e2e8f0' }}>
                      📅 Venc: {new Date(item.fatura_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  )}
              </div>
            </div>

            {/* Action */}
            <div className="dc-proc-action-btn" style={{ position: 'relative' }}>
              <button 
                className="dc-icon-action" 
                onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)}
              >
                <MoreVertical size={16} />
              </button>
              
              {menuOpen === item.id && (
                <div className="dc-dropdown-menu" style={{ position: 'absolute', right: 0, top: 30, display: 'block', minWidth: 220, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 0', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                  <button 
                    className="dc-dropdown-item"
                    disabled={!item.fatura_url}
                    onClick={() => {
                      if (item.fatura_url) {
                         const token = localStorage.getItem('datacron_token');
                         fetch(`${API_BASE_URL}${item.fatura_url.replace('/api', '')}`, {
                             headers: { 'Authorization': `Bearer ${token}` }
                         }).then(resp => {
                             if (!resp.ok) {
                               throw new Error(resp.status === 404
                                 ? 'PDF não encontrado no servidor. O arquivo pode ter sido removido após um redeploy.'
                                 : `Erro ao baixar: ${resp.status}`);
                             }
                             return resp.blob();
                         }).then(blob => {
                             const url = window.URL.createObjectURL(blob);
                             const a = document.createElement('a');
                             a.href = url;
                             a.download = `fatura_${item.codigo_identificacao || 'extraida'}.pdf`;
                             document.body.appendChild(a);
                             a.click();
                             window.URL.revokeObjectURL(url);
                             a.remove();
                         }).catch(err => {
                             alert('❌ ' + (err.message || 'Erro ao baixar fatura'));
                         });
                      }
                      setMenuOpen(null);
                    }}
                    style={{ 
                      opacity: item.fatura_url ? 1 : 0.5, 
                      width: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '8px 16px',
                      background: 'none',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      cursor: item.fatura_url ? 'pointer' : 'not-allowed',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      if(item.fatura_url) e.currentTarget.style.background = '#f1f5f9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                    }}
                  >
                    <Download size={15} style={{ marginRight: 8, flexShrink: 0 }} />
                    {item.fatura_url 
                      ? (item.fatura_desbloqueada ? 'Baixar Fatura Desbloqueada' : 'Baixar Arquivo Original') 
                      : 'Fatura Indisponível'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {!loading && logs.length === 0 && (
             <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                Nenhuma atividade registrada ainda.
             </div>
        )}
      </div>
    </Shell>
  );
}
