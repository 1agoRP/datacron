'use client';

import React, { useState } from 'react';
import Shell from '@/components/layout/Shell';
import {
  Mail, Search, Filter, CheckCircle2, AlertCircle,
  ShieldCheck, FileCheck, Activity, Layers, MoreVertical,
  Download, FileDigit, FileText
} from 'lucide-react';
import { api, API_BASE_URL } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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
  
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const { data: inboxData, mutate: mutateInbox } = useSWR(
    'inboxCount',
    () => api.getInboxCount(),
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
      setTimeout(() => {
        mutateLogs();
        mutateInbox();
      }, 3000); // revalidate after scan
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
            Faturas processadas automaticamente pelo Agente Datacron e disponíveis para download.
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
            <span className="dc-stat-badge" style={{ background: '#eff6ff', color: '#2563eb' }}>Inbox</span>
            <div className="dc-stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Mail size={24} />
            </div>
          </div>
          <div>
            <div className="dc-stat-label">E-MAILS NA INBOX</div>
            <div className="dc-stat-value">{inboxData?.inbox_count ?? '—'}</div>
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
            <div className="dc-stat-label">FATURAS PROCESSADAS</div>
            <div className="dc-stat-value">{logs.length}</div>
          </div>
        </div>

        <div className="dc-stat-card">
          <div className="dc-stat-top">
            <span className="dc-stat-badge" style={{ background: '#faf5ff', color: '#9333ea' }}>PDFs</span>
            <div className="dc-stat-icon" style={{ background: '#faf5ff', color: '#9333ea' }}>
              <FileText size={24} />
            </div>
          </div>
          <div>
            <div className="dc-stat-label">PDFs DESBLOQUEADOS</div>
            <div className="dc-stat-value">{logs.filter(l => l.fatura_desbloqueada).length}</div>
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
              {formatCurrency(logs.reduce((sum, l) => sum + (l.fatura_valor || 0), 0))}
            </div>
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
            <div className="dc-stat-label">PRÓXIMA VARREDURA</div>
            <div className="dc-stat-value" style={{ fontSize: '1.65rem' }}>
              {status?.jobs?.[0]?.next_run ? format(new Date(status.jobs[0].next_run), "HH:mm") : 'Em breve'}
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <div className="dc-proc-dest-label">E-mail</div>
                  </div>
                  <div className="dc-proc-sender-name" title={item.remetente}>{item.remetente}</div>
                  <div className="dc-proc-sender-time" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ color: '#475569', fontSize: '0.75rem' }}>
                      {item.recebido_em ? format(new Date(item.recebido_em), "dd/MM HH:mm") : '—'}
                    </span>
                    {item.codigo_identificacao && (
                      <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, color: '#0f172a', fontWeight: 700, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #e2e8f0' }}>
                        <FileDigit size={12} /> CÓDIGO {item.codigo_identificacao}
                      </span>
                    )}
                    <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontFamily: 'monospace' }}>
                      ID: {item.gmail_message_id.substring(0, 10)}...
                    </span>
                  </div>
                  
                  {/* Códigos Extraídos do Corpo */}
                  {(item.dados_extraidos?.instalacao || item.dados_extraidos?.num_cliente) && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {item.dados_extraidos?.instalacao && (
                        <div style={{ fontSize: '0.7rem', color: '#1e293b', fontWeight: 800, background: '#f0f9ff', border: '1px solid #bae6fd', padding: '4px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                          <span style={{ color: '#0369a1' }}>N° DA INSTALAÇÃO/UC:</span> {item.dados_extraidos.instalacao}
                        </div>
                      )}
                      {item.dados_extraidos?.num_cliente && (
                        <div style={{ fontSize: '0.7rem', color: '#1e293b', fontWeight: 800, background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '4px 8px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                          <span style={{ color: '#15803d' }}>N° DO CLIENTE:</span> {item.dados_extraidos.num_cliente}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="dc-proc-subject" style={{ fontSize: '0.8rem', fontWeight: 500, color: '#475569', marginTop: 8, fontStyle: 'italic' }}>
                "{item.assunto}"
              </div>
            </div>

            {/* Body column */}
            <div className="dc-proc-body">
              <div className="dc-proc-dest-label">Condomínio</div>
              <div className="dc-proc-dest-name">
                {item.condominio_nome ? (
                  <><Layers size={15} style={{ color: '#2563eb' }} /> {item.condominio_nome}</>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626' }}>
                    <AlertCircle size={15} /> 
                    <span style={{ fontWeight: 800 }}>Aguardando Vinculação</span>
                  </div>
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
                      💰 {formatCurrency(item.fatura_valor)}
                    </span>
                  )}
                  {item.fatura_vencimento && (
                    <span className="dc-proc-step done" style={{ color: '#0f172a', borderColor: '#e2e8f0' }}>
                      📅 Venc: {new Date(item.fatura_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  )}
              </div>
            </div>

            {/* Action Area */}
            <div className="dc-proc-action-area" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {item.fatura_url ? (
                <button 
                  className="dc-btn dc-btn-light"
                  style={{ 
                    padding: '8px 16px', 
                    fontSize: '0.8rem', 
                    fontWeight: 700,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: item.fatura_desbloqueada ? '#f0fdf4' : '#f8fafc',
                    color: item.fatura_desbloqueada ? '#16a34a' : '#475569',
                    border: `1px solid ${item.fatura_desbloqueada ? '#bbf7d0' : '#e2e8f0'}`,
                  }}
                  onClick={() => {
                    const token = localStorage.getItem('datacron_token');
                    fetch(`${API_BASE_URL}${item.fatura_url.replace('/api', '')}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).then(resp => {
                        if (!resp.ok) throw new Error('PDF não encontrado');
                        return resp.blob();
                    }).then(blob => {
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `fatura_${item.codigo_identificacao || 'extracao'}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    }).catch(err => alert('Erro no download: ' + err.message));
                  }}
                >
                  <Download size={14} />
                  {item.fatura_desbloqueada ? 'Baixar Desbloqueada' : 'Baixar Original'}
                </button>
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                  Fatura Indisponível
                </div>
              )}
            </div>
          </div>
        ))}

        {!loading && logs.length === 0 && (
             <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                Nenhuma fatura processada encontrada na sua carteira.
             </div>
        )}
      </div>
    </Shell>
  );
}
